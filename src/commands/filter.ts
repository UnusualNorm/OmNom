import { Command, RegisterBehavior } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
  Role,
  User,
} from "discord.js";

import type { Filter } from "../types/filter";
import * as rawFilters from "../filters/index.js";
const filters = Object.values(rawFilters) as Filter[];

@ApplyOptions<Subcommand.Options>({
  name: "filter",
  subcommands: [
    {
      name: "apply",
      chatInputRun: "apply",
    },
    {
      name: "remove",
      chatInputRun: "remove",
    },
    {
      name: "status",
      chatInputRun: "status",
    },
    {
      name: "preview",
      chatInputRun: "preview",
    },
  ],
})
export class AntiVirusCommand extends Subcommand {
  override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("filter")
          .setDescription(
            `Change ${this.container.client.user!.username} filter settings!`
          )
          .addSubcommand((builder) =>
            builder
              .setName("apply")
              .setDescription("Apply a filter to a target!")
              .addStringOption((builder) =>
                builder
                  .setName("filter")
                  .setRequired(true)
                  .setAutocomplete(true)
                  .setDescription("The filter to apply to the target.")
              )
              .addMentionableOption((builder) =>
                builder
                  .setName("target")
                  .setRequired(true)
                  .setDescription("The target to apply the filter to.")
              )
          )
          .addSubcommand((builder) =>
            builder
              .setName("remove")
              .setDescription("Remove the filter from a target!")
              .addMentionableOption((builder) =>
                builder
                  .setName("target")
                  .setRequired(true)
                  .setDescription("The target to remove the filter from.")
              )
          )
          .addSubcommand((builder) =>
            builder
              .setName("status")
              .setDescription("Check how many channels support filtering!")
          )
          .addSubcommand((builder) =>
            builder
              .setName("preview")
              .setDescription("See how a filter affects your messages!")
              .addStringOption((builder) =>
                builder
                  .setName("filter")
                  .setRequired(true)
                  .setAutocomplete(true)
                  .setDescription("The filter to apply to the text.")
              )
              .addStringOption((builder) =>
                builder
                  .setName("text")
                  .setRequired(true)
                  .setDescription("The text to apply the filter to.")
              )
          ),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
      }
    );
  }

  public override autocompleteRun(interaction: AutocompleteInteraction) {
    // This assumes that we only want to autocomplete filters.
    const focusedValue = interaction.options.getFocused().toString();
    const autoComplete = filters.filter((filter) =>
      filter.friendlyName.toLowerCase().startsWith(focusedValue.toLowerCase())
    );

    const autoCompleteMap = autoComplete.map((choice) => ({
      name: choice.friendlyName,
      value: choice.name,
    }));

    interaction.respond(autoCompleteMap);
  }

  public async preview(interaction: ChatInputCommandInteraction) {
    const filterName = interaction.options.getString("filter");
    const filter = filters.find((filter) => filter.name == filterName);

    if (!filter)
      return interaction.editReply(`Invalid filter: ${filterName}...`);

    await interaction.deferReply();
    const text = interaction.options.getString("text");
    const preview = await filter.preview(text || "");
    return interaction.editReply(preview);
  }

  public status(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild())
      return interaction.reply({
        content: "This is a guild-only command...",
        ephemeral: true,
      });

    const channels = interaction.guild!.channels.cache.filter(
      (channel) =>
        channel.isTextBased() &&
        channel
          .permissionsFor(this.container.client.user!.id)
          ?.has(PermissionFlagsBits.ViewChannel)
    );

    const supportedChannels = channels.filter(
      (channel) =>
        channel
          .permissionsFor(this.container.client.user!.id)
          ?.has(PermissionFlagsBits.ManageMessages) &&
        channel
          .permissionsFor(this.container.client.user!.id)
          ?.has(PermissionFlagsBits.ManageWebhooks)
    );

    return interaction.reply({
      content: `${this.container.client.user!.username} filters work in ${
        supportedChannels.size
      }/${channels.size} channels!`,
      ephemeral: true,
    });
  }

  // The listener is currently capable of handling multiple filters per target. Just need to implement it here.
  public async apply(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild())
      return interaction.reply({
        content: "This is a guild-only command...",
        ephemeral: true,
      });

    const filterName = interaction.options.getString("filter");
    if (!Object.values(filters).find((filter) => filter.name == filterName))
      return interaction.reply({
        content: "Please supply a valid filter...",
        ephemeral: true,
      });

    // TODO: Figure out how to allow for channel/guild targets also.
    const target = interaction.options.getMentionable("target");
    let targetType: "role" | "user";
    if (target instanceof Role) targetType = "role";
    else if (target instanceof User || target instanceof GuildMember)
      targetType = "user";
    else
      return interaction.reply({
        content: "Please supply a valid target...",
        ephemeral: true,
      });

    await interaction.deferReply({
      ephemeral: true,
    });

    await this.container.client
      .db("filters")
      .delete()
      .where("id", target.id)
      .where("guild", interaction.guildId)
      .where("type", targetType);

    await this.container.client.db("filters").insert({
      id: target.id,
      guild: interaction.guildId,
      type: targetType,
      filter: filterName as string,
    });

    return interaction.editReply(
      `Applied filter "${filterName}" to <@${
        target instanceof Role ? "&" : ""
      }${target.id}>`
    );
  }

  public async remove(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild())
      return interaction.reply({
        content: "This is a guild-only command...",
        ephemeral: true,
      });

    // TODO: Figure out how to allow for channel/guild targets also.
    const target = interaction.options.getMentionable("target");
    let targetType: "role" | "user";
    if (target instanceof Role) targetType = "role";
    else if (target instanceof User || target instanceof GuildMember)
      targetType = "user";
    else
      return interaction.reply({
        content: "Please supply a valid target...",
        ephemeral: true,
      });

    await interaction.deferReply({
      ephemeral: true,
    });

    await this.container.client
      .db("filters")
      .delete()
      .where("id", target.id)
      .where("guild", interaction.guildId)
      .where("type", targetType);

    return interaction.editReply(
      `Removed all filters from <@${target instanceof Role ? "&" : ""}${
        target.id
      }>`
    );
  }
}
