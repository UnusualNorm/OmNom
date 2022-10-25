import env from "./env";
import { Client } from "discord-cross-hosting";
import { Manager } from "discord-hybrid-sharding";

const client = new Client({
  agent: "bot",
  host: env.BRIDGE_HOST,
  port: parseInt(env.BRIDGE_PORT),
  handshake: env.BRIDGE_HANDSHAKE.toLowerCase() === "true" ? true : false,
  authToken: env.BRIDGE_TOKEN,
  rollingRestarts: env.BRIDGE_HANDSHAKE.toLowerCase() === "true" ? true : false,
});

client.on("debug", console.debug);
client.connect();

const manager = new Manager(`${__dirname}/shard.js`, {
  totalShards: parseInt(env.CLUSTER_TOTAL_SHARDS) || "auto",
  totalClusters: parseInt(env.CLUSTER_TOTAL_CLUSTERS) || "auto",
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
