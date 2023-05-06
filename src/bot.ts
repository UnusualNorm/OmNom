import "@sapphire/plugin-subcommands/register";
import { ActivityType, GatewayIntentBits, Partials } from "discord.js";
import { SapphireClient } from "@sapphire/framework";
import { ClusterClient, type ClusterClientData } from "discord-hybrid-sharding";
import hosting from "discord-cross-hosting";
import env from "./env/bot.js";
import db from "./utils/db.js";

const { Shard } = hosting;
let clientInitData: ClusterClientData | undefined;
try {
  clientInitData = ClusterClient.getInfo();
} catch (e) {
  // Do nothing.
}

import "@sapphire/plugin-logger/register";

const client = new SapphireClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Reaction, Partials.Channel, Partials.Message],
  shards: clientInitData?.SHARD_LIST,
  shardCount: clientInitData?.TOTAL_SHARDS,
});

client.on("ready", () => {
  client.user?.setPresence({
    shardId: client.cluster?.id,
    status: "online",
    activities: [
      {
        type: ActivityType.Playing,
        name:
          "with top-notch A.I.!" +
          (client.cluster ? ` - Shard #${client.cluster?.id}` : ""),
      },
    ],
  });
});

client.db = db;
if (clientInitData) {
  client.cluster = new ClusterClient(client);
  client.machine = new Shard(client.cluster);
}

client.login(env.DISCORD_TOKEN);
