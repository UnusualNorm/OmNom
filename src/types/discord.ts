import type Bridge from "discord-cross-hosting";
import type { ClusterClient } from "discord-hybrid-sharding";
import type { Knex } from "knex";

declare module "discord.js" {
  interface Client {
    machine?: Bridge.Shard;
    cluster?: ClusterClient<Client>;
    db: Knex;
  }
}
