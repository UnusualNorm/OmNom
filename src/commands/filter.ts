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
  ],
})
export class AntiVirusCommand extends Subcommand {
  override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("filter")
          .setDescription(
            `Change ${
              this.container.client.user?.username || "Bot"
            } filter settings!`
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
      filter.name.startsWith(focusedValue)
    );

    const autoCompleteMap = autoComplete.map((choice) => ({
      name: choice.friendlyName,
      value: choice.name,
    }));

    interaction.respond(autoCompleteMap);
  }

  // The listener is currently capable of handling multiple filters per target. Just need to implement it here.
  public async apply(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild())
      return interaction.reply("This is a guild-only command...");

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
      .where("id", target.id)
      .where("guild", interaction.guildId)
      .where("type", targetType)
      .delete()
      .insert({
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
      return interaction.reply("This is a guild-only command...");

    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild))
      return interaction.reply({
        content: "You do not have valid permissions to use this command...",
        ephemeral: true,
      });

    // TODO: Figure out how to allow for channel/guild targets also.
    const target = interaction.options.getMentionable("target");
    let targetType: "role" | "user";
    if (target instanceof Role) targetType = "role";
    else if (target instanceof User) targetType = "user";
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
      .where("id", target.id)
      .where("guild", interaction.guildId)
      .where("type", targetType)
      .delete();

    return interaction.editReply(
      `Removed all filters from <@${target instanceof Role ? "&" : ""}${
        target.id
      }>`
    );
  }
}
