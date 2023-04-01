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
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const term = interaction.options.getString("term");
      if (!term) return interaction.editReply("Please provide a term!");

      const url = `http://api.urbandictionary.com/v0/define?term=${encodeURIComponent(
        term
      )}`;
      const out = await fetch(url);
      const res: { list: UrbanEntry[] } = await out.json();

      const entry = res.list[0];
      if (!entry)
        return interaction.editReply("No definition found for that term... :(");

      // Some words are surrounded by square brackets,
      // This shows that they are words that are also in the dictionary,
      // We do not want to show these in the definition or example
      const definition = entry.definition.replace(/\[.*\]/, (word) =>
        word.replace(/\[|\]/g, "")
      );
      const example = entry.example.replace(/\[|\]/g, (word) =>
        word.replace(/\[|\]/g, "")
      );

      const embed = new EmbedBuilder()
        .setAuthor({
          name: entry.author,
          url: `https://www.urbandictionary.com/author.php?author=${encodeURIComponent(
            entry.author
          )}`,
          iconURL: "https://www.urbandictionary.com/favicon-32x32.png",
        })
        .setDescription(`${definition}\n\n${example}`)
        .setFooter({
          text: `👍 ${entry.thumbs_up} | 👎 ${entry.thumbs_down}`,
        })
        .setTitle(entry.word)
        .setURL(entry.permalink);

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(`[ERROR] (urban) ${error}`);
      return interaction.editReply("Something went wrong!");
    }
  }

  override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("urban")
          .setDescription("Look up a definition from the Urban Dictionary!")
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
}
