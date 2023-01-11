import { ApplyOptions } from "@sapphire/decorators";
import { fetch, FetchResultTypes } from "@sapphire/fetch";
import { Listener } from "@sapphire/framework";
import {
  Message,
  PartialMessage,
  MessageReaction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import path from "path";
import type { AntiVirusOptions } from "../types/antivirus.js";
import {
  createJob,
  JobProgress,
  getResults,
  knownEngines,
  AVEngineName,
} from "../utils/jotti.js";

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
        .map(
          async (attachment): Promise<[string, Buffer]> => [
            path.basename(new URL(attachment.url).pathname),
            await fetch(attachment.url, FetchResultTypes.Buffer),
          ]
        )
    );

    if (files.length == 0) return;

    await downloadReact.remove();
    const uploadReact = await msg.react("📡");
    const jobs = await Promise.all(
      files.map(
        async (attachment): Promise<[string, string]> => [
          attachment[0],
          await createJob(attachment[1], attachment[0]),
        ]
      )
    );

    await uploadReact.remove();
    const analyzeReact = await msg.react("🔎");

    const results = await Promise.all(
      jobs.map(
        async (job): Promise<[string, string, JobProgress]> => [
          job[0],
          job[1],
          await getResults(job[1]),
        ]
      )
    );

    await analyzeReact.remove();

    const embeds = results.map((result) =>
      new EmbedBuilder()
        .setTitle("Malware Scan")
        .setDescription(`Malware scan results for "${result[0]}"...`)
        .setURL(`https://virusscan.jotti.org/en-US/filescanjob/${result[1]}`)
        .setAuthor({
          name: "Jotti",
          iconURL: "https://virusscan.jotti.org/img/favicon.ico",
          url: "https://virusscan.jotti.org/",
        })
        .setFields(
          knownEngines.map((scanner) => {
            const name = AVEngineName[scanner];
            if (!result[2].filescanner[scanner])
              return { name, value: "unknown" };

            const value = result[2].filescanner[scanner].resulttext;
            return {
              name,
              value,
            };
          })
        )
    );

    await msg.reply({
      embeds,
    });
  });
  if (analysisQueue.length == 1) startQueue();
}

@ApplyOptions<Listener.Options>({
  name: "antivirusManualListener",
  event: "messageReactionAdd",
})
export class AntiVirusManualListener extends Listener {
  async run(messageReaction: MessageReaction) {
    const {
      emoji,
      message,
      message: { channel },
    } = messageReaction;

    if (emoji.identifier != "🕷") return;
    if (
      !channel.isDMBased() &&
      (!channel
        .permissionsFor(this.container.client.user?.id || "")
        ?.has(PermissionFlagsBits.AddReactions) ||
        !channel
          .permissionsFor(this.container.client.user?.id || "")
          ?.has(PermissionFlagsBits.SendMessages))
    )
      return;
    const enabled = message.inGuild()
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
