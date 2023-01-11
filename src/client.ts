// WIP: Need to optimize database more

import env from "./env.js";
import { dirname } from "path";
import { fileURLToPath } from "url";
import hosting from "discord-cross-hosting";
import { Manager } from "discord-hybrid-sharding";

const { Client } = hosting;
const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new Client({
  agent: "bot",
  host: env.BRIDGE_HOST,
  port: env.BRIDGE_PORT,
  handshake: env.BRIDGE_HANDSHAKE || false,
  authToken: env.BRIDGE_TOKEN,
  rollingRestarts: env.BRIDGE_HANDSHAKE || false,
});

client.on("debug", console.debug);
client.connect();

const manager = new Manager(`${__dirname}/shard.js`, {
  totalShards: env.CLUSTER_TOTAL_SHARDS || "auto",
  totalClusters: env.CLUSTER_TOTAL_CLUSTERS || "auto",
});

manager.on("debug", console.debug);
client.listen(manager);

client
  .requestShardData()
  .then((e) => {
    if (!e) return;
    if (!e.shardList) return;
    manager.totalShards = e.totalShards;
    manager.totalClusters = e.shardList.length;
    manager.shardList = e.shardList;
    manager.clusterList = e.clusterList;
    manager.spawn({ timeout: -1 });
  })
  .catch(console.error);
