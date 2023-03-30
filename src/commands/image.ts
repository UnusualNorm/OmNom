import { Command, RegisterBehavior } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";
import gis from "async-g-i-s";

export class ImageCommand extends Command {
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      const search = interaction.options.getString("search");
      if (!search)
        return interaction.reply({
          content: "Please input a search query!",
          ephemeral: true,
        });

      await interaction.deferReply();
      const results = await gis(search);
      const randomResultI = Math.floor(Math.random() * results.length);
      const randomResult = results[randomResultI];

      if (!randomResult)
        return interaction.editReply({
          content: `Failed to find an image for the search "${search}"!`,
        });

      return interaction.editReply({ content: randomResult.url });
    } catch (error) {
      console.error(`[ERROR] (image) ${error}`);
      return interaction.editReply("Something went wrong!");
    }
  }

  override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("image")
          .setDescription("Look up a random image on Google!")
          .addStringOption((option) =>
            option
              .setName("search")
              .setRequired(true)
              .setDescription("The search query to Google!")
          ),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
      }
    );
  }
}
