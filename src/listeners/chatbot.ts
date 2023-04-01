import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { ChannelType, Message, PermissionFlagsBits, Webhook } from "discord.js";
import env from "../env/bot.js";
import { JobStatusResponse, KoboldAIHorde } from "../utils/kobold.js";
import { getCreateWebhook } from "../utils/webhook.js";

const models = env.CHATBOT_MODELS.split(",");
const memoryTimeLimit = env.CHATBOT_MEMORY * 60000;
const memoryLengthLimit = Math.min(env.CHATBOT_LIMIT, 100);

const jobRequestCancels = new Map<string, () => void>();
const horde = new KoboldAIHorde(env.KOBOLD_KEY, {
  models,
});

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
    prompt += memory
      .map((message) => `${message.author.username}: ${message.content}`)
      .join("\n");

    // Add the chat bot's name to the prompt
    prompt += `\n${name}:`;
    return prompt;
  }

  private parseInput(message: string) {
    // The AI likes to impersonate the user, remember to check for that
    const lines = message.trim().split("\n");

    // The first line is always the bot's response
    const botLine = lines.splice(0, 1)[0]!;

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
    // Do not run if the message is in a thread without a parent
    if (message.channel.isThread() && !message.channel.parent) return;

    // If the message is the limiter, react to it
    if (
      message.content == env.CHATBOT_LIMITER &&
      (message.channel.type == ChannelType.DM ||
        message.channel
          .permissionsFor(this.container.client.user?.id || "")
          ?.has(PermissionFlagsBits.AddReactions))
    )
      return message.react("👍");

    // Do not run if the message is from a webhook or a bot
    if (
      message.webhookId ||
      message.author.id == this.container.client.user?.id
    )
      return;

    // Get the chatbot config for this channel
    const chatbotConfig = await this.container.client
      .db("chatbots")
      .select()
      .where("id", message.channel.id)
      .first();

    if (!chatbotConfig && !message.channel.isDMBased()) {
      const globalChatbot = await this.container.client
        .db("global_chatbots")
        .select()
        .where("id", message.channel.guildId)
        .first();
      if (!globalChatbot?.enabled) return;
    }

    const chatbotName =
      chatbotConfig?.name || this.container.client.user?.username || "Robot";
    const chatbotAvatar = chatbotConfig?.avatar;
    const chabotKeywords = [chatbotName].concat(
      chatbotConfig?.keywords?.split(",") ?? []
    );
    const chatbotPersona = chatbotConfig?.persona ?? env.CHATBOT_PERSONA;
    const chatbotHello = chatbotConfig?.hello ?? env.CHATBOT_HELLO;

    // Determine if we need to use webhooks
    const useWebhooks =
      message.inGuild() && (!!chatbotConfig?.name || !!chatbotConfig?.avatar);

    // Do not run if the bot does not have the required permissions, we do not need to worry if we're in a DM
    if (
      message.channel.type != ChannelType.DM &&
      !message.channel
        .permissionsFor(this.container.client.user?.id || "")
        ?.has(
          [
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            // We also need ManageWebhooks if we are using webhooks
          ].concat(useWebhooks ? PermissionFlagsBits.ManageWebhooks : [])
        )
    )
      return;

    // Create a regex for the keywords, and check if the message contains them
    // This should support wildcards
    const keywordsRegex = new RegExp(
      chabotKeywords.map((keyword) => keyword.replace("*", "\\S*")).join("|"),
      "i"
    );

    // Do not run if the message is sent by us,
    // Unless we are currently generating a message
    if (
      (message.author.id == this.container.client.user?.id ||
        message.webhookId) &&
      !jobRequestCancels.has(message.channel.id)
    )
      return;

    const reference = message.reference ? await message.fetchReference() : null;

    if (
      // If we are currently generating a message, we ignore all below rules,
      // Otherwise we would get desynced messages
      !(
        jobRequestCancels.has(message.channel.id) ||
        (useWebhooks
          ? // If we are using webhooks, we run if the content contains a keyword
            keywordsRegex.test(message.content) ||
            // Or if the message is a reply to a message sent by a webhook with the same name
            (reference?.webhookId &&
              reference.author.username == chatbotConfig?.name)
          : chatbotConfig ||
            // Always run if the message is a DM
            message.channel.type == ChannelType.DM ||
            // Guild messages must be manually triggered with a mention or reference
            message.mentions.has(this.container.client.user?.id || "") ||
            reference?.author.id == this.container.client.user?.id)
      )
    )
      return;

    // Start typing
    await message.channel.sendTyping();

    // If we have a cache at or over our size limit, use that
    let messages: Message[];
    if (message.channel.messages.cache.size >= memoryLengthLimit)
      messages = message.channel.messages.cache.first(
        memoryLengthLimit
      )! as Message[];
    // Otherwise, fetch the messages
    // TODO: Add a flag to show that this channel just has a small amount of messages
    //       it currently always fetches messages if the cache is not full
    else
      messages = [
        ...(
          await message.channel.messages.fetch({
            limit: memoryLengthLimit,
          })
        ).values(),
      ];

    // Filter the messages that our bot should not remember
    messages = messages.filter(
      (m) => m.createdAt.getTime() >= Date.now() - memoryTimeLimit
    );

    // createPrompt expects the most recent message to be last,
    // Currently the messages are in reverse order
    messages = messages.reverse();

    // If any messages are the limiter, we need to remove all previous messages
    const limiterIndex = messages.findIndex(
      (m) => m.content == env.CHATBOT_LIMITER
    );
    if (limiterIndex != -1) messages = messages.slice(limiterIndex + 1);

    // Construct the prompt
    const prompt = await this.createPrompt(
      chatbotName,
      chatbotPersona,
      chatbotHello,
      messages
    );

    console.log(prompt);

    // Cancel the current job if it exists
    jobRequestCancels.get(message.channel.id)?.();

    // Make sure we catch any cancel requests
    let cancelled = false;
    jobRequestCancels.set(message.channel.id, () => (cancelled = true));

    // Create a new job
    const jobId = await horde.createJob(prompt);

    // Cancel the job if we received a cancel request
    if (cancelled) {
      await horde.cancelJob(jobId);
      return;
    }

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
        // I don't know if this is just a type error, but maybe it is possible to have a thread without a parent?
        // Whatever, I separated that check at the beginning so I don't waste my time.
        webhook = await getCreateWebhook(message.channel.parent!);
      } else webhook = await getCreateWebhook(message.channel);

    // Send the messages
    for (const botMessage of botMessages)
      if (useWebhooks)
        await webhook?.send({
          username: chatbotName,
          avatarURL: chatbotAvatar,
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
