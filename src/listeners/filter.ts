import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Message, PermissionFlagsBits } from "discord.js";
import { getCreateWebhook, messageToWebhookOptions } from "../utils/webhook.js";
import { getAppliedFilters } from "../utils/filter.js";

import filters from "../filters.js";
const filterOrder = ["user", "role", "channel", "guild"];

@ApplyOptions<Listener.Options>({
  name: "filter",
  event: "messageCreate",
})
export class FilterListener extends Listener {
  public async run(message: Message) {
    if (message.partial) await message.fetch();

    if (
      !message.inGuild() ||
      !message.channel
        .permissionsFor(this.container.client.user?.id ?? "")
        ?.has(PermissionFlagsBits.ManageWebhooks) ||
      !message.channel
        .permissionsFor(this.container.client.user?.id ?? "")
        ?.has(PermissionFlagsBits.ManageMessages)
    )
      return;

    const webhook = await getCreateWebhook(message.channel);

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
