import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Message, PermissionFlagsBits, Webhook } from "discord.js";
import { getCreateWebhook, messageToWebhookOptions } from "../utils/webhook.js";
import { getAppliedFilters } from "../utils/filter.js";

import type { Filter } from "../types/filter.js";
import * as rawFilters from "../filters/index.js";

const filters = Object.values(rawFilters) as Filter[];
const filterOrder = ["user", "role", "channel", "guild"];
const webhookCache = new Map<string, Webhook>();

@ApplyOptions<Listener.Options>({
  name: "filter",
  event: "messageCreate",
})
export class FilterListener extends Listener {
  public async run(message: Message) {
    if (
      !message.inGuild() ||
      !message.channel
        .permissionsFor(this.container.client.user!.id)
        ?.has(PermissionFlagsBits.ManageWebhooks) ||
      !message.channel
        .permissionsFor(this.container.client.user!.id)
        ?.has(PermissionFlagsBits.ManageMessages)
    )
      return;

    let webhook = webhookCache.get(message.channelId);
    if (!webhook) {
      webhook = await getCreateWebhook(message.channel);
      webhookCache.set(message.channelId, webhook);
    }

    const filterNames = (
      await getAppliedFilters(
        message.guildId,
        message.channelId,
        message.author.id,
        message.member?.roles.cache.map((role) => role.id)
      )
    )
      .sort((a, b) => filterOrder.indexOf(a.type) - filterOrder.indexOf(b.type))
      .map((filter) => filter.filter);
    if (filterNames.length == 0) return;

    let newMessage = messageToWebhookOptions(message);
    for (const filterName of [...new Set(filterNames)])
      newMessage =
        (await filters
          .find((filter) => filter.name == filterName)
          ?.run(newMessage)) || newMessage;

    await webhook.send({
      ...newMessage,
      allowedMentions: {
        parse: [],
      },
    });
    await message.delete();
  }
}
