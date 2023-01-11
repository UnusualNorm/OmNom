import { Command, RegisterBehavior } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import type { ChatInputCommandInteraction } from "discord.js";

@ApplyOptions<Subcommand.Options>({
  name: "antivirus",
  subcommands: [
    {
      name: "manual",
      chatInputRun: "manual",
    },
    {
      name: "auto",
      chatInputRun: "auto",
    },
    {
      name: "force",
      chatInputRun: "force",
    },
  ],
})
export class AntiVirusCommand extends Subcommand {
  override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("antivirus")
          .setDescription("Change OmNom Anti-Virus settings!")
          .addSubcommand((builder) =>
            builder
              .setName("manual")
              .setDescription('Allow manually starting a virus check with "🕷".')
              .addBooleanOption((builder) =>
                builder
                  .setName("enabled")
                  .setDescription("Whether or not to enable this feature.")
              )
          )
          .addSubcommand((builder) =>
            builder
              .setName("auto")
              .setDescription("Automatically check files for viruses.")
              .addBooleanOption((builder) =>
                builder
                  .setName("enabled")
                  .setDescription("Whether or not to enable this feature.")
              )
          )
          .addSubcommand((builder) =>
            builder
              .setName("force")
              .setDescription(
                "Force checking every file for viruses, not just executables. Requires that AutoChecking be enabled."
              )
              .addBooleanOption((builder) =>
                builder
                  .setName("enabled")
                  .setDescription("Whether or not to enable this feature.")
              )
          ),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
        idHints: ["1062550250918780990"],
      }
    );
  }

  public async manual(interaction: ChatInputCommandInteraction) {
    let enabled = interaction.options.getBoolean("enabled");
    if (!interaction.inGuild())
      return interaction.reply("This is a guild-only command...");

    // Just incase of network/disk hiccups
    await interaction.deferReply({
      ephemeral: true,
    });

    // Fetch the entry from the database
    const option = 

    // If the correct value is already stored
    if (enabled != null && enabled == option)
      return interaction.editReply(
        `Succesfully toggled manual virus checking ${
          enabled ? "on!" : "off..."
        }`
      );

    // If "enabled" is not supplied, just flip what we already have
    if (enabled == null) enabled = !option;

    // If an entry is already in the database, update it, otherwise create one
    if (option == undefined)
      await this.container.client.db<AntiVirusOptions>("antivirus").insert({
        id: interaction.guildId,
        manual: enabled,
        auto: false,
        force: false,
      });
    else
      await this.container.client
        .db<AntiVirusOptions>("antivirus")
        .where("id", interaction.guildId)
        .update({ manual: enabled });

    return interaction.editReply(
      `Succesfully toggled manual virus checking ${enabled ? "on!" : "off..."}`
    );
  }
}
