import "dotenv-defaults/config";
import Validator from "validatorjs";

const envRules = {
  BRIDGE_HOST: "string",
  BRIDGE_PORT: "required|integer|min:1|max:65535",
  BRIDGE_TOKEN: "required|string",
  BRIDGE_TOTAL_MACHINES: "required|integer",
  BRIDGE_TOTAL_SHARDS: "integer|min:1",
  BRIDGE_SHARDS_PER_CLUSTER: "integer|min:1",
  BRIDGE_HANDSHAKE: "string", // Boolean
  BRIDGE_ROLLING_RESTARTS: "string", // Boolean
  CLUSTER_TOTAL_SHARDS: "integer|min:1",
  CLUSTER_TOTAL_CLUSTERS: "integer|min:1",
  DISCORD_TOKEN: "required|string",
};

const env: typeof envRules = process.env as typeof envRules;
const envValidator = new Validator(env, envRules);

if (envValidator.fails()) throw new TypeError("Uh-oh, your config is WRONG!\n"+JSON.stringify(envValidator.errors.errors));
export default env;
