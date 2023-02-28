import "dotenv/config.js";
import env from "env-var";

export default {
  BRIDGE_PORT: env.get("BRIDGE_PORT").asIntPositive(),
  BRIDGE_TOKEN: env.get("BRIDGE_TOKEN").asString(),
  BRIDGE_TOTAL_MACHINES: env
    .get("BRIDGE_TOTAL_MACHINES")
    .required()
    .asIntPositive(),
  BRIDGE_TOTAL_SHARDS: env.get("BRIDGE_TOTAL_SHARDS").asIntPositive(),
  BRIDGE_SHARDS_PER_CLUSTER: env
    .get("BRIDGE_SHARDS_PER_CLUSTER")
    .asIntPositive(),
  DISCORD_TOKEN: env.get("DISCORD_TOKEN").required().asString(),
};
