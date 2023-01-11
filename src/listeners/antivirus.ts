import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import type { MessageReaction } from "discord.js";
import type { AntiVirusOptions } from '../types/antivirus.js';

@ApplyOptions<Listener.Options>({
  name: "antivirusManualListener",
  event: "messageReactionAdd",
})
export class AntiVirusManualListener extends Listener {
  async run(messageReaction: MessageReaction) {
    if (messageReaction.emoji.identifier != "🕷") return;
    
    const enabled = (
      messageReaction?(await this.container.client
        .db<AntiVirusOptions>("antivirus")
        .where("id", messageReaction.guildId)
        .select("manual")
        .first()
    )?.manual):true;

    if (!enabled) return;
  }
}
