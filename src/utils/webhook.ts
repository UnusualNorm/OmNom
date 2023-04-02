import type { WebhookMessageCreateOptions } from "discord.js";

import {
  ForumChannel,
  Message,
  NewsChannel,
  StageChannel,
  TextChannel,
  ThreadChannel,
  VoiceChannel,
} from "discord.js";

export async function getCreateWebhook(
  channel:
    | TextChannel
    | VoiceChannel
    | NewsChannel
    | ForumChannel
    | ThreadChannel
    | StageChannel
) {
  const textChannel:
    | TextChannel
    | VoiceChannel
    | NewsChannel
    | ForumChannel
    | StageChannel =
    channel instanceof ThreadChannel ? channel.parent! : channel;

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
): WebhookMessageCreateOptions {
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
