import "./types/discord.js"; // Hehehe-hohoho, FIX THIS PLEASE
import "@sapphire/plugin-subcommands/register";
import { ActivityType, GatewayIntentBits } from "discord.js";
import { SapphireClient } from "@sapphire/framework";
// import hosting from "discord-cross-hosting";
// import sharding from "discord-hybrid-sharding";
import env from "./env.js";
import db from "./utils/db.js";

// const { Shard } = hosting;
// const { Client } = sharding;

// const clientInitData = Client.getInfo();
const client = new SapphireClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessageReactions,
  ],
  // shards: clientInitData.SHARD_LIST,
  // shardCount: clientInitData.TOTAL_SHARDS,
});

client.on("ready", () => {
  client.user?.setPresence({
    // shardId: client.cluster.id,
    status: "online",
    activities: [
      {
        type: ActivityType.Playing,
        name: "with top-notch A.I.!",
        //name: `with top-notch A.I.! - Shard #${client.cluster.id}`,
      },
    ],
  });
});

// client.cluster = new Client(client);
// client.machine = new Shard(client.cluster);
client.db = db;

client.login(env.DISCORD_TOKEN);
