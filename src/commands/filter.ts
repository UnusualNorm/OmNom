import { Command, RegisterBehavior } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  ForumChannel,
  GuildMember,
  NewsChannel,
  PermissionFlagsBits,
  Role,
  StageChannel,
  TextChannel,
  User,
  VoiceChannel,
} from "discord.js";

import filters from "../filters.js";

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
export class FilterCommand extends Subcommand {
  override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("filter")
          .setDescription(
            `Change ${this.container.client.user?.username} filter settings!`
          )
          .addSubcommand((builder) =>
            builder
              .setName("apply")
              .setDescription("Apply a filter to a target!")
              .addStringOption((builder) =>
                builder
                  .setName("filter")
                  .setRequired(true)
                  .setDescription("The filter to apply to the target.")
                  .setChoices(
                    ...Array.from(filters.values()).map((filter) => ({
                      name: filter.name,
                      value: filter.id,
                    }))
                  )
              )
              .addMentionableOption((builder) =>
                builder
                  .setName("target")
                  .setDescription(
                    "The target to apply the filter to. Leave blank to use the current channel."
                  )
              )
          )
          .addSubcommand((builder) =>
            builder
              .setName("remove")
              .setDescription("Remove the filter from a target!")
              .addMentionableOption((builder) =>
                builder
                  .setName("target")
                  .setDescription(
                    "The target to remove the filter from. Leave blank to use the current channel."
                  )
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
                  .setChoices(
                    ...Array.from(filters.values()).map((filter) => ({
                      name: filter.name,
                      value: filter.id,
                    }))
                  )
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
    // This assumes that we only want to autocomplete filters...
    const focusedValue = interaction.options.getFocused().toString();
    const autoComplete = Array.from(filters.values()).filter((filter) =>
      filter.name.toLowerCase().startsWith(focusedValue.toLowerCase())
    );

    const autoCompleteMap = autoComplete.map((choice) => ({
      name: choice.name,
      value: choice.id,
    }));

    return interaction.respond(autoCompleteMap);
  }

  public async preview(interaction: ChatInputCommandInteraction) {
    const filterName = interaction.options.getString("filter", true);
    const filter = filters.get(filterName);

    if (!filter)
      return interaction.editReply(`Invalid filter: ${filterName}...`);

    await interaction.deferReply();

    try {
      const text = interaction.options.getString("text", true);
      const preview = await filter.preview(text, interaction.user.username);
      return interaction.editReply(preview);
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply(
        "There was an error previewing the filter..."
      );
    }
  }

  public status(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild())
      return interaction.reply({
        content: "This is a guild-only command...",
        ephemeral: true,
      });

    const supportedChannels = interaction.guild?.channels.cache.filter(
      (channel) =>
        channel.isTextBased() &&
        channel
          .permissionsFor(this.container.client.user?.id || "")
          ?.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.ManageWebhooks,
          ])
    );

    return interaction.reply({
      content: `${this.container.client.user?.username} filters work in ${supportedChannels?.size}/${interaction.guild?.channels.cache.size} channels!`,
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
    const filter = filters.find((filter) => filter.id == filterName);
    if (!filter)
      return interaction.reply({
        content: "Please supply a valid filter...",
        ephemeral: true,
      });

    const target =
      interaction.options.getMentionable("target") ?? interaction.channel;

    let targetType: "role" | "user" | "channel";
    if (target instanceof Role) targetType = "role";
    else if (target instanceof User || target instanceof GuildMember)
      targetType = "user";
    else if (
      target instanceof NewsChannel ||
      target instanceof StageChannel ||
      target instanceof TextChannel ||
      target instanceof VoiceChannel ||
      target instanceof ForumChannel
    )
      targetType = "channel";
    else
      return interaction.reply({
        content: "Please supply a valid target...",
        ephemeral: true,
      });

    await interaction.deferReply({
      ephemeral: true,
    });

    try {
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
        `Applied filter "${filter.name}" to <@${
          targetType == "role" ? "&" : targetType == "channel" ? "#" : ""
        }${target.id}>`
      );
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply("There was an error applying the filter...");
    }
  }

  public async remove(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild())
      return interaction.reply({
        content: "This is a guild-only command...",
        ephemeral: true,
      });

    const target =
      interaction.options.getMentionable("target") ?? interaction.channel;

    let targetType: "role" | "user" | "channel";
    if (target instanceof Role) targetType = "role";
    else if (target instanceof User || target instanceof GuildMember)
      targetType = "user";
    else if (
      target instanceof NewsChannel ||
      target instanceof StageChannel ||
      target instanceof TextChannel ||
      target instanceof VoiceChannel ||
      target instanceof ForumChannel
    )
      targetType = "channel";
    else
      return interaction.reply({
        content: "Please supply a valid target...",
        ephemeral: true,
      });

    await interaction.deferReply({
      ephemeral: true,
    });

    try {
      const removed = await this.container.client
        .db("filters")
        .delete()
        .where("id", target.id)
        .where("guild", interaction.guildId)
        .where("type", targetType);

      if (!removed)
        return interaction.editReply(
          `There are already no filters applied to <@${
            targetType == "role" ? "&" : targetType == "channel" ? "#" : ""
          }${target.id}>..`
        );

      return interaction.editReply(
        `Removed all filters from <@${
          targetType == "role" ? "&" : targetType == "channel" ? "#" : ""
        }${target.id}>!`
      );
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply("There was an error removing the filter...");
    }
  }
}
