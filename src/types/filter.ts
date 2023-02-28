import type { WebhookCreateMessageOptions } from "discord.js";

export interface Filter {
  friendlyName: string;
  name: string;
  description: string;

  run(
    message: WebhookCreateMessageOptions
  ): WebhookCreateMessageOptions | Promise<WebhookCreateMessageOptions>;

  preview(text: string): string | Promise<string>;
}
