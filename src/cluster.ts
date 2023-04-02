import env from "./env/cluster.js";
import { dirname } from "path";
import { fileURLToPath } from "url";
import hosting from "discord-cross-hosting";
import { ClusterManager } from "discord-hybrid-sharding";
import { join } from "path";

const { Client } = hosting;
const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new Client({
  agent: "bot",
  host: env.BRIDGE_HOST || "localhost",
  port: env.BRIDGE_PORT || 4444,
  handshake: env.BRIDGE_HANDSHAKE || false,
  authToken: env.BRIDGE_TOKEN || "token",
  rollingRestarts: env.BRIDGE_HANDSHAKE || false,
});

client.on("debug", console.debug);
client.connect();

const manager = new ClusterManager(join(__dirname, "bot.js"), {
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
    manager.shardList = e.shardList.flat();
    manager.clusterList = e.clusterList;
    manager.spawn({ timeout: -1 });
  })
  .catch(console.error);
