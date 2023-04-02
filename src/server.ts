import type { BridgeOptions } from "discord-cross-hosting";

import env from "./env/server.js";
import { Bridge } from "discord-cross-hosting";

const opts: BridgeOptions = {
  port: env.BRIDGE_PORT || 4444,
  authToken: env.BRIDGE_TOKEN || "token",
  totalMachines: env.BRIDGE_TOTAL_MACHINES,
  totalShards: env.BRIDGE_TOTAL_SHARDS || ("auto" as const),
  token: env.DISCORD_TOKEN,
};

if (env.BRIDGE_SHARDS_PER_CLUSTER)
  opts.shardsPerCluster = env.BRIDGE_SHARDS_PER_CLUSTER;

const server = new Bridge(opts);

server.on("debug", console.debug);
server.on("ready", (url) => console.log("Server is ready: " + url));
server.start();
