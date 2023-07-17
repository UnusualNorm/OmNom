import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Message } from "discord.js";
import { getWebhook, messageToWebhookOptions } from "../utils/webhook.js";
import {
  applyFilters,
  getFiltersToApply,
  hasPermissions,
} from "../utils/filter.js";

@ApplyOptions<Listener.Options>({
  name: "filter",
  event: "messageCreate",
})
export class FilterListener extends Listener {
  public async run(message: Message) {
    if (message.partial) await message.fetch();
    if (message.author.id == this.container.client.id) return;
    if (message.channel.partial) await message.channel.fetch();

    if (!message.inGuild() || !hasPermissions(message.channel)) return;

    const webhook = await getWebhook(message.channel, true);
    if (message.webhookId == webhook.id) return;

    const filters = await getFiltersToApply(
      message.guildId,
      message.channelId,
      message.author.id,
      message.member?.roles.cache.map((role) => role.id)
    );

    if (filters.length == 0) return;

    const filteredMessage = await applyFilters(
      messageToWebhookOptions(message),
      filters
    );

    await webhook.send({
      ...filteredMessage,
      allowedMentions: {
        parse: [],
      },
    });

    return message.delete();
  }
}
