import knex from "knex";

const db = knex({
  client: "sqlite3",
  useNullAsDefault: true,
  connection: {
    filename: "./data.db",
  },
});

if (!(await db.schema.hasTable("antivirus")))
  await db.schema.createTable("antivirus", (table) => {
    table.integer("id").unique();
    table.boolean("manual");
    table.boolean("auto");
    table.boolean("force");
  });

export default db;
