import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { ChannelType, Message, PermissionFlagsBits } from "discord.js";
import env from "../env/bot.js";
import { JobStatusResponse, KoboldAIHorde } from "../utils/kobold.js";

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
          // If the user is in the cache, return their username
          if (this.container.client.users.cache.has(id))
            return `@${this.container.client.users.cache.get(id)?.username}`;

          // If the user is not in the cache, fetch them
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

  async createPrompt(memory: Message[]) {
    const name = this.container.client.user?.username;
    const helloName = memory.find((message) => message.author.username !== name)
      ?.author.username;

    // If we have a persona, add it to the prompt
    let prompt = env.CHATBOT_PERSONA
      ? `${name}'s Persona: ${env.CHATBOT_PERSONA}\n`
      : "";

    // The docs say to add this as a delimiter
    prompt += "<START>\n";

    // If we have a hello message, add it to the prompt
    !env.CHATBOT_HELLO ||
      (prompt += `${helloName || "User"}: Hello ${name}!\n`);
    !env.CHATBOT_HELLO || (prompt += `${name}: ${env.CHATBOT_HELLO}\n`);

    // Add all the messages in the memory to the prompt
    prompt += memory
      .map((message) => `${message.author.username}: ${message.content}`)
      .join("\n");

    // Add the chat bot's name to the prompt
    prompt += `\n${name}:`;
    return prompt;
  }

  public async run(message: Message) {
    // Do not run if the message is from a webhook or a bot
    if (
      message.webhookId ||
      message.author.id == this.container.client.user?.id
    )
      return;

    // Do not run if the bot does not have the required permissions
    if (
      message.inGuild() &&
      (!message.channel
        .permissionsFor(this.container.client.user!.id)
        ?.has(PermissionFlagsBits.SendMessages) ||
        !message.channel
          .permissionsFor(this.container.client.user!.id)
          ?.has(PermissionFlagsBits.ReadMessageHistory))
    )
      return;

    // Do not run if the message is sent by us,
    // Unless we are currently generating a message
    if (
      message.author.id == this.container.client.user?.id &&
      !jobRequestCancels.has(message.channel.id)
    )
      return;

    const reference = message.reference ? await message.fetchReference() : null;

    // Do not run if we are not in a DM, and the message does not mention the bot
    // This allows dm messages to be processed automatically
    // While guild messages must be manually triggered with a mention

    // If we are currently generating a message, we ignore all above rules,
    // Otherwise we would get desynced messages
    if (
      message.channel.type != ChannelType.DM &&
      !message.content.includes(`<@${this.container.client.id}>`) &&
      !(reference?.author.id == this.container.client.user!.id) &&
      jobRequestCancels.has(message.channel.id)
    )
      return;

    // Start typing
    const typingInterval = setInterval(
      () => message.channel.sendTyping(),
      5000
    );

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
      (m) => m.createdAt.getTime() > Date.now() - memoryTimeLimit
    );

    // createPrompt expects the most recent message to be last,
    // Currently the messages are in reverse order
    messages = messages.reverse();

    // Construct the prompt
    const prompt = await this.createPrompt(messages);

    // Cancel the current job if it exists
    jobRequestCancels.get(message.channel.id)?.();

    // Make sure we catch any cancel requests
    let cancelled = false;
    jobRequestCancels.set(message.channel.id, () => (cancelled = true));

    // Create a new job
    const jobId = await horde.createJob(prompt);

    // Cancel the job if we received a cancel request
    if (cancelled) {
      clearInterval(typingInterval);
      await horde.cancelJob(jobId);
      return;
    }

    // Now that the job is created, we can make the cancel function cancel the job
    jobRequestCancels.set(message.channel.id, () => {
      cancelled = true;
      clearInterval(typingInterval);
      horde.cancelJob(jobId);
    });

    // Get the response
    let job: JobStatusResponse | undefined;
    while (!job?.done) {
      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Return if we received a cancel request
      if (cancelled) return;

      // Get the job
      job = await horde.getJob(jobId);

      // If the job failed, return
      if (!job.is_possible || job.faulted) return;
    }

    // Stop typing
    clearInterval(typingInterval);

    // Send the response
    message.channel.send(job.generations[0]?.text || "...");

    // Delete the cancel function if we finished without a cancel request
    if (!cancelled) jobRequestCancels.delete(message.channel.id);
    return;
  }
}
