import knex from "knex";

declare module "knex/types/tables" {
  interface Filter {
    id: string;
    guild: string;
    type: "guild" | "role" | "channel" | "user";
    filter: string;
  }

  interface Tables {
    filters: Filter;
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

export default db;
