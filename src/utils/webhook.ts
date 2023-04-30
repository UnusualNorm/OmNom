import { isThreadChannel } from "@sapphire/discord.js-utilities";
import {
  ForumChannel,
  Message,
  NewsChannel,
  StageChannel,
  TextChannel,
  ThreadChannel,
  VoiceChannel,
  type GuildTextBasedChannel,
  type Webhook,
  type WebhookMessageCreateOptions,
} from "discord.js";

export function getWebhook(
  channel: GuildTextBasedChannel,
  create?: false
): Promise<Webhook | undefined>;

export function getWebhook(
  channel: GuildTextBasedChannel,
  create: true
): Promise<Webhook>;

export async function getWebhook(
  channel: GuildTextBasedChannel,
  create?: boolean
): Promise<Webhook | undefined> {
  if (isThreadChannel(channel) && !channel.parent)
    throw new Error("Thread channel has no parent...");

  const textChannel:
    | TextChannel
    | VoiceChannel
    | NewsChannel
    | ForumChannel
    | StageChannel = isThreadChannel(channel) ? channel.parent! : channel;

  const webhooks = await textChannel.fetchWebhooks();
  const foundWebhook = webhooks.find((wh) => wh.token);

  if (foundWebhook) return foundWebhook;
  if (!create) return;

  const user = textChannel.client.user;
  return textChannel.createWebhook({
    name: user.username,
    avatar: user.avatarURL(),
  });
}

export function messageToWebhookOptions(
  message: Message
): WebhookMessageCreateOptions {
  const { channel, content, author, member, attachments, tts } = message;

  const avatarURL =
    member?.displayAvatarURL() || author.avatarURL() || undefined;
  const username = member?.nickname || author.username;

  return {
    avatarURL,
    username,
    content,
    files: Array.from(attachments.values()),
    tts,
    threadId: channel.isThread() ? channel.parentId ?? undefined : undefined,
  };
}
