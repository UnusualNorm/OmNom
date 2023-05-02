import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import {
  ChannelType,
  Message,
  MessageFlags,
  MessageType,
  PermissionFlagsBits,
  Webhook,
} from "discord.js";
import env from "../env/bot.js";
import { KoboldAIHorde, type JobStatusResponse } from "../utils/kobold.js";
import { getWebhook } from "../utils/webhook.js";
import emojiRegex from "emoji-regex";
import { EmojiRegex } from "@sapphire/discord.js-utilities";

const jobRequestCancels = new Map<string, () => void>();
const horde = new KoboldAIHorde(
  env.KOBOLD_KEY,
  {
    models: env.CHATBOT_MODELS.split(","),
  },
  {
    singleline: env.CHATBOT_SINGLELINE,
  }
);

function wcMatch(rule: string, text: string) {
  return new RegExp(
    "^" +
      rule
        .replaceAll(/([.+?^=!:${}()|[\]/\\])/g, "\\$1")
        .replaceAll("*", "(.*)") +
      "$"
  ).test(text);
}

async function replaceAsync(
  str: string,
  regex: RegExp,
  asyncFn: (match: string, ...args: unknown[]) => Promise<string>
) {
  const promises: Promise<string>[] = [];
  str.replace(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
    return match;
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift() || "");
}

@ApplyOptions<Listener.Options>({
  name: "chatbot",
  event: "messageCreate",
})
export class ChatbotListener extends Listener {
  async parseUserInput(message: Message) {
    return (
      (await replaceAsync(
        // Make all emojis :emoji: instead of <:emoji:id>
        message.content
          // Make it single-line
          .replaceAll("\n", " ")
          // Make all emojis :emoji:
          .replaceAll(
            /<(?:(?<animated>a)?:(?<name>\w{2,32}):)?(?<id>\d{17,21})>/g,
            (...args) => `:${args[2]}:`
          ),
        /<@!?(?<id>\d{17,20})>/g,
        // Make all user mentions @User instead of <@id>
        async (...args) => {
          const id = args[1] as string;

          // Fetch the user
          const user = await this.container.client.users.fetch(id);

          // If the user is not found, return a generic @
          if (!user) return "@User";

          // If the user is found, return their username
          return `@${user.username}`;
        }
      )) +
      // Add all attachments to the end
      message.attachments.map((attachment) => ` ${attachment.url}`).join("")
    );
  }

  async createPrompt(
    name: string,
    persona: string,
    hello: string,
    memory: Message[]
  ) {
    const helloName = memory.find((message) => message.author.username !== name)
      ?.author.username;

    // If we have a persona, add it to the prompt
    let prompt = persona ? `${name}'s Persona: ${persona}\n` : "";

    // The docs say to add this as a delimiter
    prompt += "<START>\n";

    // If we have a hello message, add it to the prompt
    !hello || (prompt += `${helloName || "User"}: Hello ${name}!\n`);
    !hello || (prompt += `${name}: ${hello}\n`);

    // Add all the messages in the memory to the prompt
    prompt += (
      await Promise.all(
        memory.map(
          async (message) =>
            `${message.author.username}: ${await this.parseUserInput(message)}`
        )
      )
    ).join("\n");

    // Add the chat bot's name to the prompt
    prompt += `\n${name}:`;
    return prompt;
  }

  private parseInput(message: string): [string, ...string[]] {
    // The AI likes to impersonate the user, remember to check for that
    const lines = message.trim().split("\n");

    // The first line is always the bot's response
    const botLine = lines.splice(0, 1)[0] as string;

    // Get all lines that start with the bot's name
    let foundImpersonation = false;
    const botLines = lines
      .filter((line) => {
        if (foundImpersonation) return false;
        if (line.startsWith(`${this.name}: `)) return true;
        foundImpersonation = true;
        return false;
      })
      .map((line) => line.replace(`${this.name}: `, "").trim());

    return [botLine, ...botLines];
  }

  public async run(message: Message) {
    if (message.webhookId || message.author.bot) return;

    if (message.partial) await message.fetch();

    if (message.channel.isThread() && !message.channel.parent) return;

    if (
      message.content == env.CHATBOT_LIMITER &&
      (message.channel.type == ChannelType.DM ||
        message.channel
          .permissionsFor(this.container.client.id || "")
          ?.has(PermissionFlagsBits.AddReactions))
    ) {
      jobRequestCancels.get(message.channel.id)?.();

      const isEmoji =
        emojiRegex().test(env.CHATBOT_REACTION) ||
        EmojiRegex.test(env.CHATBOT_REACTION);

      return isEmoji
        ? message.react(env.CHATBOT_REACTION)
        : message.reply(env.CHATBOT_REACTION);
    }

    const chatbotConfigOverrides = !message.channel.isDMBased()
      ? await this.container.client
          .db("chatbots")
          .select()
          .where("id", message.channel.id)
          .first()
      : undefined;

    const chatbotConfig = {
      name: this.container.client.user?.username || "Robot",
      persona: env.CHATBOT_PERSONA,
      hello: env.CHATBOT_HELLO,
      ...chatbotConfigOverrides,
    };

    // Determine if we need to use webhooks (if we need to change the name or avatar)
    const useWebhooks =
      message.inGuild() && (!!chatbotConfig?.name || !!chatbotConfig?.avatar);

    // Do not run if the bot does not have the required permissions, we do not need to worry if we're in a DM
    if (
      message.channel.type != ChannelType.DM &&
      !message.channel
        .permissionsFor(this.container.client.id || "")
        ?.has(
          [
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ].concat(useWebhooks ? PermissionFlagsBits.ManageWebhooks : [])
        )
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

      // This should support wildcard keywords
      const includesKeyword = (chatbotConfig?.keywords?.split(",") ?? []).some(
        (keyword) => wcMatch(keyword, message.content)
      );

      // If the message contains a keyword, continue
      if (includesKeyword) break runCheck;

      // Otherwise, stop
      return;
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

      // Otherwise, stop
      return;
    }

    // Start typing
    await message.channel.sendTyping();

    let messages: Message[];
    if (message.channel.messages.cache.size >= env.CHATBOT_LIMIT)
      messages = message.channel.messages.cache.first(
        env.CHATBOT_LIMIT
      ) as Message[];
    // Otherwise, fetch the messages
    // TODO: Add a flag to show that this channel just has a small amount of messages
    //       it currently always fetches messages if the cache is not full
    else
      messages = [
        ...(
          await message.channel.messages.fetch({
            limit: Math.min(env.CHATBOT_LIMIT, 100),
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
      (m) => Date.now() - m.createdAt.getTime() <= env.CHATBOT_MEMORY * 60000
    );

    // If any messages are the limiter, we need to remove all previous messages
    const limiterIndex = messages.findIndex(
      (m) => m.content == env.CHATBOT_LIMITER
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
    const prompt = await this.createPrompt(
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
      job = await horde.getJob(jobId);

      // If the job failed, return
      if (!job.is_possible || job.faulted) return;
    }

    // Delete the cancel function if we finished without a cancel request
    if (!cancelled) jobRequestCancels.delete(message.channel.id);

    const botMessages = this.parseInput(job.generations[0]?.text || "...");

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
