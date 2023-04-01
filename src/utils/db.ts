import knex from "knex";

declare module "knex/types/tables" {
  interface Filter {
    id: string;
    guild: string;
    type: "guild" | "role" | "channel" | "user";
    filter: string;
  }

  interface Chatbot {
    id: string;
    name?: string;
    avatar?: string;
    persona?: string;
    hello?: string;
    keywords?: string;
  }

  interface GlobalChatbot {
    id: string;
    enabled: boolean;
  }

  interface ImageSafety {
    id: string;
    safe: boolean;
  }

  interface Tables {
    filters: Filter;
    chatbots: Chatbot;
    global_chatbots: GlobalChatbot;
    image_safety: ImageSafety;
  }
}

const db = knex({
  client: "sqlite3",
  useNullAsDefault: true,
  connection: {
    filename: "./data.db",
  },
});

if (!(await db.schema.hasTable("filters")))
  await db.schema.createTable("filters", (table) => {
    table.string("id");
    table.string("type");
    table.string("guild");
    table.string("filter");
  });

if (!(await db.schema.hasTable("chatbots")))
  await db.schema.createTable("chatbots", (table) => {
    table.string("id").unique();
    table.string("name");
    table.string("avatar");
    table.string("persona");
    table.string("hello");
    table.string("keywords");
  });

if (!(await db.schema.hasTable("global_chatbots")))
  await db.schema.createTable("global_chatbots", (table) => {
    table.string("id").unique();
    table.boolean("enabled");
  });

if (!(await db.schema.hasTable("image_safety")))
  await db.schema.createTable("image_safety", (table) => {
    table.string("id").unique();
    table.boolean("safe");
  });

export default db;
