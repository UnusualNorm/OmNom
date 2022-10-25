import env from "./env";
import { Bridge } from "discord-cross-hosting";

const server = new Bridge({
  port: parseInt(env.BRIDGE_PORT),
  authToken: env.BRIDGE_TOKEN,
  totalMachines: parseInt(env.BRIDGE_TOTAL_MACHINES),
  totalShards: parseInt(env.BRIDGE_TOTAL_SHARDS) || "auto",
  shardsPerCluster: parseInt(env.BRIDGE_SHARDS_PER_CLUSTER),
  token: env.DISCORD_TOKEN,
});

server.on("debug", console.debug);
server.on("ready", (url) => console.log("Server is ready: " + url));
server.start();
