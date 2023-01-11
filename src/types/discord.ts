import type Bridge from "discord-cross-hosting";
import type Cluster from "discord-hybrid-sharding";
import type { Knex } from "knex";

declare module "discord.js" {
  interface Client {
    machine: Bridge.Shard;
    cluster: Cluster.Client;
    db: Knex;
  }
}
