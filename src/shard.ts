import "./types/discord"; // Hehehe-hohoho, FIX THIS PLEASE
import { Shard } from "discord-cross-hosting";
import { Client } from "discord-hybrid-sharding";
import { SapphireClient } from "@sapphire/framework";
import env from "./env";

const clientInitData = Client.getInfo();
const client = new SapphireClient({
  intents: ["GUILDS"],
  shards: clientInitData.SHARD_LIST,
  shardCount: clientInitData.TOTAL_SHARDS,
});

client.cluster = new Client(client);
client.machine = new Shard(client.cluster);

client.login(env.DISCORD_TOKEN);
