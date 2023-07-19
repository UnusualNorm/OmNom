import type { WebhookMessageCreateOptions } from "discord.js";

export interface Filter {
  id: string;
  name: string;
  description: string;
  partial?: boolean;

  test?(message: WebhookMessageCreateOptions): boolean;

  run(
    message: WebhookMessageCreateOptions
  ): WebhookMessageCreateOptions | Promise<WebhookMessageCreateOptions>;

  preview(text: string, username: string): string | Promise<string>;
}
