import { RegisterBehavior } from "@sapphire/framework";
import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import gis from "async-g-i-s";
import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";

@ApplyOptions<Subcommand.Options>({
  name: "image",
  subcommands: [
    {
      name: "search",
      chatInputRun: "search",
    },
    {
      name: "safety",
      chatInputRun: "safety",
    },
  ],
})
export class ImageCommand extends Subcommand {
  override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("image")
          .setDescription("Look up a random image on Google!")
          .addSubcommand((builder) =>
            builder
              .setName("search")
              .setDescription("Search for an image using Google!")
              .addStringOption((option) =>
                option
                  .setName("query")
                  .setDescription("The image query to search for!")
                  .setRequired(true)
              )
          )
          .addSubcommand((builder) =>
            builder
              .setName("safety")
              .setDescription("Toggle safe search on Google!")
              .addBooleanOption((option) =>
                option
                  .setName("enabled")
                  .setDescription("Enable safe search.")
                  .setRequired(true)
              )
          ),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
      }
    );
  }

  public async search(interaction: ChatInputCommandInteraction) {
    const search = interaction.options.getString("query", true);

    await interaction.deferReply();

    try {
      const safetyConfig = interaction.inGuild()
        ? await this.container.client.db.imageSafety.findUnique({
            where: {
              id: interaction.guildId,
            },
          })
        : undefined;

      const results = await gis(search, {
        safe: safetyConfig?.safe ?? true ? "on" : "off",
      });
      const randomResult = results[Math.floor(Math.random() * results.length)];

      if (!randomResult)
        return interaction.editReply({
          content: `Failed to find an image for the search, "${search}"...`,
        });

      const embed = new EmbedBuilder().setImage(randomResult.url);

      return interaction.editReply({
        content: `Introducing... "${search}"!`,
        embeds: [embed],
      });
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply(
        "There was an error while searching for an image..."
      );
    }
  }

  public async safety(interaction: ChatInputCommandInteraction) {
    const enabled = interaction.options.getBoolean("enabled", true);

    if (!interaction.inGuild())
      return interaction.reply({
        content: "This command can only be used in a guild!",
        ephemeral: true,
      });

    await interaction.deferReply({
      ephemeral: true,
    });

    try {
      // Update the image safety. Insert if it doesn't exist.
      await this.container.client.db.imageSafety.upsert({
        where: {
          id: interaction.guildId,
        },
        create: {
          id: interaction.guildId,
          safe: enabled,
        },
        update: {
          safe: enabled,
        },
      });

      // Send a confirmation message.
      return interaction.editReply({
        content: `Successfully ${
          enabled ? "enabled" : "disabled"
        } safe search!`,
      });
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply({
        content: "An error occurred while toggling safe search...",
      });
    }
  }
}
