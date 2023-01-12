import { ApplyOptions } from "@sapphire/decorators";
import { fetch, FetchResultTypes } from "@sapphire/fetch";
import { Listener } from "@sapphire/framework";
import {
  Message,
  PartialMessage,
  MessageReaction,
  EmbedBuilder,
  PermissionFlagsBits,
  PartialMessageReaction,
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
  if (message.partial) message = await message.fetch();
  const queueReact = await message.react("⏳");

  analysisQueue.push(async () => {
    await queueReact.remove();
    const attachments = Array.from(message.attachments.values()).filter(
      (attachment) =>
        force || attachment.contentType?.startsWith("application/")
    );
    if (attachments.length == 0) return;

    const downloadReact = await message.react("🛰");
    const files = await Promise.all(
      attachments.map(
        async (attachment): Promise<[string, Buffer]> => [
          path.basename(new URL(attachment.url).pathname),
          await fetch(attachment.url, FetchResultTypes.Buffer),
        ]
      )
    );

    await downloadReact.remove();
    const uploadReact = await message.react("📡");
    const jobs = await Promise.all(
      files.map(
        async (attachment): Promise<[string, string]> => [
          attachment[0],
          await createJob(attachment[1], attachment[0]),
        ]
      )
    );

    await uploadReact.remove();
    const analyzeReact = await message.react("🔎");

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

    await message.reply({
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
  async run(messageReaction: MessageReaction | PartialMessageReaction) {
    if (messageReaction.partial)
      messageReaction = await messageReaction.fetch();

    const {
      emoji,
      message,
      message: { channel },
    } = messageReaction;
    if (message.author?.bot) return;

    if (emoji.identifier != encodeURIComponent("🔍")) return;
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
