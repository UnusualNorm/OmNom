import "dotenv/config.js";
import env from "env-var";

export default {
  DISCORD_TOKEN: env.get("DISCORD_TOKEN").required().asString(),
  TENOR_KEY: env.get("TENOR_KEY").asString(),
  KOBOLD_KEY: env.get("KOBOLD_KEY").asString() ?? "0000000000",
  CHATBOT_PERSONA:
    env.get("CHATBOT_PERSONA").asString() ?? "A friendly AI chatbot.",
  CHATBOT_HELLO:
    env.get("CHATBOT_HELLO").asString() ??
    "Hey there! How can I help you today?",
  CHATBOT_MEMORY: env.get("CHATBOT_MEMORY").asIntPositive() ?? Infinity,
  CHATBOT_LIMIT: env.get("CHATBOT_LIMIT").asIntPositive() ?? Infinity,
  // A comma separated list of models to use
  CHATBOT_MODELS:
    env.get("CHATBOT_MODELS").asString() ??
    "PygmalionAI/pygmalion-6b,KoboldAI/OPT-13B-Erebus,Alpaca-30B-Int4-128G",
  CHATBOT_LIMITER: env.get("CHATBOT_LIMITER").asString() ?? "<CLEAR>",
  CHATBOT_REACTION: env.get("CHATBOT_REACTION").asString() ?? "⌛",
};
