import { Command, RegisterBehavior } from "@sapphire/framework";
import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export interface UrbanEntry {
  definition: string;
  permalink: string;
  thumbs_up: number;
  sound_urls: string[];
  author: string;
  word: string;
  defid: number;
  current_vote: string;
  written_on: string;
  example: string;
  thumbs_down: number;
}

export class UrbanCommand extends Command {
  override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("urban")
          .setDescription("Look up a definition on the Urban Dictionary!")
          .addStringOption((option) =>
            option
              .setName("term")
              .setRequired(true)
              .setDescription("The term to look up!")
          ),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
      }
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const term = interaction.options.getString("term", true);
    const url = `http://api.urbandictionary.com/v0/define?term=${encodeURIComponent(
      term
    )}`;

    await interaction.deferReply();

    try {
      const res: { list: UrbanEntry[] } = await (await fetch(url)).json();
      if (res.list.length === 0)
        return interaction.editReply(
          `No definition found for the term, "${term}"... :(`
        );

      const entry = res.list[Math.floor(Math.random() * res.list.length)];

      // Some words are surrounded by square brackets,
      // This shows that they are words that are also in the dictionary,
      // We do not want to show these in the definition or example
      const definition = entry?.definition.replace(/\[.*\]/, (word) =>
        word.replace(/\[|\]/g, "")
      );
      const example = entry?.example.replace(/\[|\]/g, (word) =>
        word.replace(/\[|\]/g, "")
      );

      const embed = new EmbedBuilder()
        .setAuthor({
          name: entry?.author || "Unknown",
          url: `https://www.urbandictionary.com/author.php?author=${encodeURIComponent(
            entry?.author || "Unknown"
          )}`,
          iconURL: "https://www.urbandictionary.com/favicon-32x32.png",
        })
        .setDescription(`${definition}\n\n${example}`)
        .setFooter({
          text: `👍 ${entry?.thumbs_up} | 👎 ${entry?.thumbs_down}`,
        })
        .setTitle(entry?.word || "Unknown")
        .setURL(entry?.permalink || "https://www.urbandictionary.com/");

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply(
        "An error occured while fetching the definition!"
      );
    }
  }
}
