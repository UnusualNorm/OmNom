import type { WebhookMessageCreateOptions } from "discord.js";

export interface Filter {
  friendlyName: string;
  name: string;
  description: string;

  run(
    message: WebhookMessageCreateOptions
  ): WebhookMessageCreateOptions | Promise<WebhookMessageCreateOptions>;

  preview(text: string, username: string): string | Promise<string>;
}
