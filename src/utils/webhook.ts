import { isThreadChannel } from "@sapphire/discord.js-utilities";
import type {
  ForumChannel,
  Message,
  NewsChannel,
  TextChannel,
  ThreadChannel,
  VoiceChannel,
  WebhookCreateMessageOptions,
} from "discord.js";

export async function getCreateWebhook(
  channel:
    | TextChannel
    | VoiceChannel
    | NewsChannel
    | ForumChannel
    | ThreadChannel
) {
  const textChannel:
    | TextChannel
    | VoiceChannel
    | NewsChannel
    | ForumChannel
    | ThreadChannel = isThreadChannel(channel) ? channel.parent! : channel;

  const webhooks = await textChannel.fetchWebhooks();
  const foundWebhook = webhooks.find((wh) => wh.token);
  if (foundWebhook) return foundWebhook;

  const user = textChannel.client.user;
  return textChannel.createWebhook({
    name: user.username,
    avatar: user.avatarURL(),
  });
}

export function messageToWebhookOptions(
  message: Message
): WebhookCreateMessageOptions {
  const { channel, content, author, member, attachments, tts } = message;

  const avatarURL = member?.displayAvatarURL() || author.avatarURL() || "";
  const username = member?.nickname || author.username;

  return {
    avatarURL,
    username,
    content,
    files: Array.from(attachments.values()),
    tts,
    threadId: channel.isThread() ? channel.parentId || undefined : undefined,
  };
}
