import env from "env-var";

export default {
  BRIDGE_HOST: env.get("BRIDGE_HOST").asString(),
  BRIDGE_PORT: env.get("BRIDGE_PORT").asIntPositive(),
  BRIDGE_TOKEN: env.get("BRIDGE_TOKEN").asString(),
  BRIDGE_SHARDS_PER_CLUSTER: env
    .get("BRIDGE_SHARDS_PER_CLUSTER")
    .asIntPositive(),
  BRIDGE_HANDSHAKE: env.get("BRIDGE_HANDSHAKE").asBool(),
  BRIDGE_ROLLING_RESTARTS: env.get("BRIDGE_ROLLING_RESTARTS").asBool(),
  CLUSTER_TOTAL_SHARDS: env.get("CLUSTER_TOTAL_SHARDS").asIntPositive(),
  CLUSTER_TOTAL_CLUSTERS: env.get("CLUSTER_TOTAL_CLUSTERS").asIntPositive(),
};
