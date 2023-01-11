import { ApplyOptions } from "@sapphire/decorators";
import { fetch, FetchResultTypes } from "@sapphire/fetch";
import { Listener } from "@sapphire/framework";
import type { Message, PartialMessage, MessageReaction } from "discord.js";
import path from "path";
import type { AntiVirusOptions } from "../types/antivirus.js";
import { createJob, JobProgress, getResults } from "../utils/jotti.js";

const analysisQueue: (() => Promise<void>)[] = [];

async function startQueue() {
  while (analysisQueue.length > 0) {
    await analysisQueue[0]?.call({});
    analysisQueue.shift();
  }
}

async function startAnalysis(
  message: Message | PartialMessage,
  force: boolean
) {
  const msg = message.partial ? await message.fetch() : message;
  const queueReact = await msg.react("⏳");

  analysisQueue.push(async () => {
    await queueReact.remove();
    const downloadReact = await msg.react("🛰");
    const files = await Promise.all(
      Array.from(message.attachments.values())
        .filter(
          (attachment) =>
            force || attachment.contentType?.startsWith("application/")
        )
        .map(async (attachment): Promise<[string, Buffer]> => ([
          path.basename(new URL(attachment.url).pathname),
          await fetch(attachment.url, FetchResultTypes.Buffer),
        ]))
    );

    await downloadReact.remove();
    const uploadReact = await msg.react("📡");
    const jobs = await Promise.all(
      files.map(async (attachment): Promise<[string, string]> => ([attachment[0], await createJob(attachment[1], attachment[0])]))
    );

    await uploadReact.remove();
    const analyzeReact = await msg.react('🔎');
    
    const results = await Promise.all(
      jobs.map(async (job): Promise<[string, JobProgress]> => ([attachment[0], await getResults(job)]))
    )

    await analyzeReact.remove();
  });
  if (analysisQueue.length == 1) startQueue();
}

@ApplyOptions<Listener.Options>({
  name: "antivirusManualListener",
  event: "messageReactionAdd",
})
export class AntiVirusManualListener extends Listener {
  async run(messageReaction: MessageReaction) {
    if (messageReaction.emoji.identifier != "🕷") return;

    const enabled = messageReaction.message.inGuild()
      ? (
          await this.container.client
            .db<AntiVirusOptions>("antivirus")
            .where("id", messageReaction.message.guildId)
            .select("manual")
            .first()
        )?.manual
      : true;

    if (!enabled) return;

    return startAnalysis(messageReaction.message, true);
  }
}
