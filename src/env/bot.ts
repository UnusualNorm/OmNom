import "dotenv/config.js";
import env from "env-var";

export default {
  DISCORD_TOKEN: env.get("DISCORD_TOKEN").required().asString(),
  TENOR_KEY: env.get("TENOR_KEY").asString(),
  KOBOLD_KEY: env.get("KOBOLD_KEY").asString(),
  CHATBOT_PERSONA:
    env.get("CHATBOT_PERSONA").asString() ?? "A friendly AI chatbot.",
  CHATBOT_HELLO:
    env.get("CHATBOT_HELLO").asString() ??
    "Hey there! How can I help you today?",
  CHATBOT_MEMORY: env.get("CHATBOT_MEMORY").asIntPositive() ?? Infinity,
  CHATBOT_LIMIT: env.get("CHATBOT_LIMIT").asIntPositive() ?? Infinity,
  // A comma separated list of models to use
  CHATBOT_MODELS:
    env.get("CHATBOT_MODELS").asString() ?? "PygmalionAI/pygmalion-6b",
};
