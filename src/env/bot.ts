import "dotenv-defaults/config.js";
import env from "env-var";

export default {
  DISCORD_TOKEN: env.get("DISCORD_TOKEN").required().asString(),
};
