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
  public async search(interaction: ChatInputCommandInteraction) {
    try {
      const search = interaction.options.getString("query", true);
      if (!search)
        return interaction.reply({
          content: "Please input a search query!",
          ephemeral: true,
        });

      await interaction.deferReply();
      const results = await gis(search, { safe: "on" });
      const randomResultI = Math.floor(Math.random() * results.length);
      const randomResult = results[randomResultI];

      if (!randomResult)
        return interaction.editReply({
          content: `Failed to find an image for the search "${search}"!`,
        });

      const embed = new EmbedBuilder().setImage(randomResult.url);

      return interaction.editReply({
        content: `Introducing... "${search}"!`,
        embeds: [embed],
      });
    } catch (error) {
      console.error(`[ERROR] (image) ${error}`);
      return interaction.editReply("Something went wrong!");
    }
  }

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
          ),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
      }
    );
  }
}
