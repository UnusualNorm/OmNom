import "dotenv-defaults/config.js";
import env from "env-var";

export default {
  BRIDGE_HOST: env.get("BRIDGE_HOST").required().asString(),
  BRIDGE_PORT: env.get("BRIDGE_PORT").required().asIntPositive(),
  BRIDGE_TOKEN: env.get("BRIDGE_TOKEN").required().asString(),
  BRIDGE_TOTAL_MACHINES: env
    .get("BRIDGE_TOTAL_MACHINES")
    .required()
    .asIntPositive(),
  BRIDGE_TOTAL_SHARDS: env.get("BRIDGE_TOTAL_SHARDS").asIntPositive(),
  BRIDGE_SHARDS_PER_CLUSTER: env
    .get("BRIDGE_SHARDS_PER_CLUSTER")
    .asIntPositive(),
  BRIDGE_HANDSHAKE: env.get("BRIDGE_HANDSHAKE").asBool(),
  BRIDGE_ROLLING_RESTARTS: env.get("BRIDGE_ROLLING_RESTARTS").asBool(),
  CLUSTER_TOTAL_SHARDS: env.get("CLUSTER_TOTAL_SHARDS").asIntPositive(),
  CLUSTER_TOTAL_CLUSTERS: env.get("CLUSTER_TOTAL_CLUSTERS").asIntPositive(),
  DISCORD_TOKEN: env.get("DISCORD_TOKEN").required().asString(),
};
