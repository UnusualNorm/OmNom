import "@sapphire/plugin-subcommands/register";
import { ActivityType, GatewayIntentBits, Partials } from "discord.js";
import { SapphireClient } from "@sapphire/framework";
import hosting from "discord-cross-hosting";
import sharding from "discord-hybrid-sharding";
import env from "./env/bot.js";
import db from "./utils/db.js";

const { Shard } = hosting;
const { Client } = sharding;

const clientInitData = Client.getInfo() as sharding.data | undefined;
const client = new SapphireClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Reaction],
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
  client.cluster = new Client(client);
  client.machine = new Shard(client.cluster);
}

client.login(env.DISCORD_TOKEN);
