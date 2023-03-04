import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Message, PermissionFlagsBits } from "discord.js";

import { getCreateWebhook, messageToWebhookOptions } from "../utils/webhook.js";

import type { Filter } from "../types/filter.js";
import * as rawFilters from "../filters/index.js";
const filters = Object.values(rawFilters) as Filter[];

const filterOrder = ["user", "role", "channel", "guild"];

@ApplyOptions<Listener.Options>({
  name: "filter",
  event: "messageCreate",
})
export class FilterListener extends Listener {
  public async run(message: Message) {
    if (!message.inGuild()) return;
    if (
      !message.channel
        .permissionsFor(this.container.client.user!.id)
        ?.has(PermissionFlagsBits.ManageWebhooks) ||
      !message.channel
        .permissionsFor(this.container.client.user!.id)
        ?.has(PermissionFlagsBits.ManageMessages)
    )
      return;

    const webhook = await getCreateWebhook(message.channel);
    let filtersQuery = this.container.client
      .db("filters")
      .select()
      .orWhere((builder) =>
        builder
          .where("id", message.guildId)
          .where("guild", message.guildId)
          .where("type", "guild")
      )
      .orWhere((builder) =>
        builder
          .where("id", message.channelId)
          .where("guild", message.guildId)
          .where("type", "channel")
      )
      .orWhere((builder) =>
        builder
          .where("id", message.author.id)
          .where("guild", message.guildId)
          .where("type", "user")
      );

    message.member?.roles.cache.forEach(
      (role) =>
        (filtersQuery = filtersQuery.orWhere((builder) =>
          builder
            .where("id", role.id)
            .where("guild", message.guildId)
            .where("type", "role")
        ))
    );

    const filterNames = (await filtersQuery)
      .sort((a, b) => filterOrder.indexOf(a.type) - filterOrder.indexOf(b.type))
      .map((filter) => filter.filter);
    if (filterNames.length == 0) return;

    let newMessage = messageToWebhookOptions(message);
    for (const filterName of filterNames)
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
