import "dotenv/config.js";
import env from "env-var";

export default {
  DISCORD_TOKEN: env.get("DISCORD_TOKEN").required().asString(),
  TENOR_KEY: env.get("TENOR_KEY").asString(),
  KOBOLD_KEY: env.get("KOBOLD_KEY").asString() ?? "0000000000",

  CHATBOT_PERSONA: env
    .get("CHATBOT_PERSONA")
    .asString() /* Default value handled in src/utils/chatbot.ts */,
  CHATBOT_GREETING:
    env.get("CHATBOT_GREETING").asString() ??
    "Hello! How may I help you today?",
  CHATBOT_MEMORY_DURATION:
    env.get("CHATBOT_MEMORY_DURATION").asIntPositive() ?? Infinity,
  CHATBOT_MEMORY_LIMIT:
    env.get("CHATBOT_MEMORY_LIMIT").asIntPositive() ?? Infinity,
  // A comma separated list of models to use
  CHATBOT_MODELS:
    env.get("CHATBOT_MODELS").asString() ??
    "PygmalionAI/pygmalion-6b,PygmalionAI/pygmalion-7b",
  CHATBOT_FORGET_COMMAND:
    env.get("CHATBOT_FORGET_COMMAND").asString() ?? "<CLEAR>",
  CHATBOT_FORGET_REACTION:
    env.get("CHATBOT_FORGET_REACTION").asString() ?? "🧠",
  CHATBOT_SINGLE_LINE: env.get("CHATBOT_SINGLE_LINE").asBool() ?? true,
  CHATBOT_FETCH_ONLY: env.get("CHATBOT_FETCH_ONLY").asBool() ?? false,
  CHATBOT_TRUSTED_ONLY: env.get("CHATBOT_TRUSTED_ONLY").asBool() ?? false,
  CHATBOT_TEMPERATURE: env.get("CHATBOT_TEMPERATURE").asFloatPositive() ?? 0.62,
  CHATBOT_TOP_A: env.get("CHATBOT_TOP_A").asFloatPositive() ?? 0,
  CHATBOT_TOP_K: env.get("CHATBOT_TOP_K").asIntPositive() ?? 0,
  CHATBOT_TOP_P: env.get("CHATBOT_TOP_P").asFloatPositive() ?? 0.9,
  CHATBOT_REPEAT_PENALTY:
    env.get("CHATBOT_REPEAT_PENALTY").asFloatPositive() ?? 1.08,
};
