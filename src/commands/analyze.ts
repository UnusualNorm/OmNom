import { Command, RegisterBehavior } from "@sapphire/framework";
//import { Message } from "discord.js";

export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("analyze")
          .setDescription(
            "Analyse and categorize a users behavior on a subject!"
          ),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
      }
    );
  }

  public override async chatInputRun() {
    //interaction: Command.ChatInputInteraction
    throw new Error("huh...");
  }
}
