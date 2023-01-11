import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import type { MessageReaction } from "discord.js";

@ApplyOptions<Listener.Options>({
  name: "antivirusManualListener",
  event: "messageReactionAdd",
})
export class AntiVirusManualListener extends Listener {
  async run(messageReaction: MessageReaction) {
    if (messageReaction.emoji.identifier != "🕷") return;

    // Fetch the entry from the database
    const enabled = (
      await this.container.client
        .db<AntiVirusOptions>("antivirus")
        .where("id", interaction.guildId)
        .select("manual")
        .first()
    )?.manual;

    if (!enabled) return;
  }
}
