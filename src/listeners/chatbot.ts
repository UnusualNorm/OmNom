import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import {
  Message,
  MessageFlags,
  MessageType,
  PermissionFlagsBits,
  Webhook,
} from "discord.js";
import env from "../env/bot.js";
import { KoboldAIHorde, type JobStatusResponse } from "../utils/kobold.js";
import { getWebhook } from "../utils/webhook.js";
import { wcMatch } from "../utils/regex.js";
import {
  createPrompt,
  forgetReactionIsEmoji,
  hasReactionPermissions,
  parseBotInput,
} from "../utils/chatbot.js";

const jobRequestCancels = new Map<string, () => void>();
const horde = new KoboldAIHorde(
  env.KOBOLD_KEY,
  {
    models: env.CHATBOT_MODELS.split(","),
    trusted_workers: env.CHATBOT_TRUSTED_ONLY,
  },
  {
    singleline: env.CHATBOT_SINGLE_LINE,
    temperature: env.CHATBOT_TEMPERATURE,
  }
);

@ApplyOptions<Listener.Options>({
  name: "chatbot",
  event: "messageCreate",
})
export class ChatbotListener extends Listener {
  public async run(message: Message) {
    if (message.webhookId || message.author.bot) return;

    if (message.partial) await message.fetch();

    if (message.channel.isThread() && !message.channel.parent) return;

    // If we need to reset the bot's memory
    if (message.content == env.CHATBOT_FORGET_COMMAND) {
      if (!hasReactionPermissions(message.channel)) return;

      jobRequestCancels.get(message.channel.id)?.();

      return forgetReactionIsEmoji
        ? message.react(env.CHATBOT_FORGET_REACTION)
        : message.reply(env.CHATBOT_FORGET_REACTION);
    }

    const chatbotConfigOverrides = message.inGuild()
      ? await this.container.client
          .db("chatbots")
          .select()
          .where("id", message.channel.id)
          .first()
      : // If we're not in a guild, we're a global chatbot, don't override anything
        undefined;

    const chatbotConfig = {
      name: this.container.client.user?.username || "Robot",
      persona: env.CHATBOT_PERSONA,
      hello: env.CHATBOT_GREETING,
      ...chatbotConfigOverrides,
    };

    // Determine if we need to use webhooks (if we need to change the name or avatar)
    const useWebhooks =
      // We shouldn't need to check if we're in a guild, but typescript is complaining
      message.inGuild() &&
      (chatbotConfigOverrides?.name || chatbotConfigOverrides?.avatar);

    // Do not run if the bot does not have the required permissions
    if (
      !message.inGuild() ||
      !message.channel
        .permissionsFor(this.container.client.id || "")
        ?.has([
          PermissionFlagsBits.ReadMessageHistory,
          useWebhooks
            ? PermissionFlagsBits.ManageWebhooks
            : PermissionFlagsBits.SendMessages,
        ])
    )
      return;

    const reference = message.reference ? await message.fetchReference() : null;

    runCheck: if (
      jobRequestCancels.has(message.channel.id) ||
      message.channel.isDMBased()
    )
      break runCheck;
    // If we're a set chatbot, check if the message includes keywords
    else if (chatbotConfigOverrides) {
      // If we're being directly mentioned, continue
      if (
        message.mentions.has(this.container.client.id || "") ||
        (useWebhooks
          ? reference?.webhookId &&
            reference.author.username == chatbotConfig.name
          : reference?.author.id == this.container.client.id)
      )
        break runCheck;

      const includesKeyword = (chatbotConfig?.keywords?.split(",") ?? []).some(
        (keyword) => wcMatch(keyword, message.content)
      );

      if (includesKeyword) break runCheck;
      else return;
    } else {
      const globalChatbot = await this.container.client
        .db("global_chatbots")
        .select()
        .where("id", message.channel.guildId)
        .first();

      // If the global chatbot is not enabled, stop
      if (!globalChatbot?.enabled) return;

      // If we have been mentioned, continue
      if (
        message.mentions.has(this.container.client.id || "") ||
        reference?.author.id == this.container.client.id
      )
        break runCheck;
      else return;
    }

    await message.channel.sendTyping();

    let messages: Message[];
    if (
      !env.CHATBOT_FETCH_ONLY &&
      message.channel.messages.cache.size >= env.CHATBOT_MEMORY_LIMIT
    )
      messages = message.channel.messages.cache.first(
        env.CHATBOT_MEMORY_LIMIT
      ) as Message[];
    // TODO: Add a flag to show that this channel just has a small amount of messages
    //       it currently always fetches messages if the cache is not full
    else
      messages = [
        ...(
          await message.channel.messages.fetch({
            limit: Math.min(env.CHATBOT_MEMORY_LIMIT, 100),
          })
        ).values(),
      ];

    // Filter the messages that are not regular messages
    messages = messages.filter(
      (message) =>
        message.type == MessageType.Default ||
        (MessageType.ChatInputCommand &&
          !message.flags.has(MessageFlags.Ephemeral))
    );

    // Filter the messages that our bot should not remember
    messages = messages.filter(
      (m) =>
        Date.now() - m.createdAt.getTime() <=
        env.CHATBOT_MEMORY_DURATION * 60000
    );

    // If any messages are the limiter, we need to remove all previous messages
    const limiterIndex = messages.findIndex(
      (m) => m.content == env.CHATBOT_FORGET_COMMAND
    );

    if (limiterIndex >= 0) messages = messages.slice(0, limiterIndex);

    // createPrompt expects the most recent message to be last,
    // Currently the messages are in reverse order
    messages = messages.reverse();

    // Make sure that a non-bot message is the first message
    const firstMessageIndex = messages.findIndex(
      (m) =>
        !(useWebhooks
          ? m.webhookId && m.author.username == chatbotConfig.name
          : m.author.id == this.container.client.id)
    );
    if (firstMessageIndex >= 0) messages = messages.slice(firstMessageIndex);

    // Construct the prompt
    const prompt = await createPrompt(
      chatbotConfig.name,
      chatbotConfig.persona,
      chatbotConfig.hello,
      messages
    );

    // Cancel the current job if it exists
    jobRequestCancels.get(message.channel.id)?.();

    // Make sure we catch any cancel requests
    let cancelled = false;
    jobRequestCancels.set(message.channel.id, () => (cancelled = true));

    // Create a new job
    const jobId = await horde.createJob(prompt);

    // Cancel the job if we received a cancel request
    if (cancelled) return horde.cancelJob(jobId);

    // Now that the job is created, we can make the cancel function cancel the job
    jobRequestCancels.set(message.channel.id, () => {
      cancelled = true;
      horde.cancelJob(jobId);
    });

    // Get the response
    let job: JobStatusResponse | undefined;
    while (!job?.done) {
      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Continue typing
      await message.channel.sendTyping();

      // Return if we received a cancel request
      if (cancelled) return;

      // Get the job
      let resolved = false;
      job = await Promise.race<JobStatusResponse | undefined>([
        // Get the job, when we get it, tell our typing loop to stop
        horde.getJob(jobId),
        // Continue typing until we get a response
        new Promise((resolve) => {
          const interval = setInterval(() => {
            if (resolved) {
              clearInterval(interval);
              resolve(undefined);
            } else if (cancelled) clearInterval(interval);
            else message.channel.sendTyping();
          }, 1500);
        }),
      ]).catch((err) => {
        resolved = true;
        this.container.logger.error(err);
        return undefined;
      });
      resolved = true;

      // If the job failed, return
      if (!job?.is_possible || job.faulted) return;
    }

    // Delete the cancel function if we finished without a cancel request
    if (!cancelled) jobRequestCancels.delete(message.channel.id);

    const botMessages = parseBotInput(
      this.name,
      job.generations[0]?.text || "..."
    );

    let threadId: string | undefined;
    let webhook: Webhook | undefined;
    if (useWebhooks)
      if (message.channel.isThread()) {
        threadId = message.channel.id;
        webhook = await getWebhook(message.channel);
      } else webhook = await getWebhook(message.channel);

    // Send the messages
    for (const botMessage of botMessages)
      if (useWebhooks)
        await webhook?.send({
          username: chatbotConfig.name,
          avatarURL: chatbotConfig.avatar,
          allowedMentions: {
            parse: [],
          },
          content: botMessage,
          threadId,
        });
      else await message.channel.send(botMessage);

    return;
  }
}
