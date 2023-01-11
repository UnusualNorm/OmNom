import { isMessageInstance } from "@sapphire/discord.js-utilities";
import { Command, RegisterBehavior } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";

export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("ping")
          .setDescription("Check in and see how the bot's doing!"),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
      }
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const msg = await interaction.reply({
      content: `Ping?`,
      ephemeral: true,
      fetchReply: true,
    });

    if (isMessageInstance(msg)) {
      const diff = msg.createdTimestamp - interaction.createdTimestamp;
      const ping = Math.round(this.container.client.ws.ping);
      return interaction.editReply(
        `Pong 🏓! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`
      );
    }
    return interaction.editReply("Failed to retrieve ping :(");
  }
}
