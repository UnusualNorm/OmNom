import "dotenv/config.js";
import env from "env-var";

export default {
  DISCORD_TOKEN: env.get("DISCORD_TOKEN").required().asString(),
  TENOR_KEY: env.get("TENOR_KEY").asString(),
  KOBOLD_KEY: env.get("KOBOLD_KEY").asString() ?? "0000000000",
  CHATBOT_PERSONA:
    env.get("CHATBOT_PERSONA").asString() ??
    "a highly intelligent language model trained to comply with user requests",
  CHATBOT_HELLO:
    env.get("CHATBOT_HELLO").asString() ?? "Hello! How may I help you today?",
  CHATBOT_MEMORY: env.get("CHATBOT_MEMORY").asIntPositive() ?? Infinity,
  CHATBOT_LIMIT: env.get("CHATBOT_LIMIT").asIntPositive() ?? Infinity,
  // A comma separated list of models to use
  CHATBOT_MODELS:
    env.get("CHATBOT_MODELS").asString() ??
    "PygmalionAI/pygmalion-6b,PygmalionAI/pygmalion-7b",
  CHATBOT_LIMITER: env.get("CHATBOT_LIMITER").asString() ?? "<CLEAR>",
  CHATBOT_REACTION: env.get("CHATBOT_REACTION").asString() ?? "⌛",
  CHATBOT_SINGLELINE: env.get("CHATBOT_SINGLELINE").asBool() ?? true,
  CHATBOT_FETCH_ONLY: env.get("CHATBOT_FETCH_ONLY").asBool() ?? false,
};
