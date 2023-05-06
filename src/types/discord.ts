import type Bridge from "discord-cross-hosting";
import type { ClusterClient } from "discord-hybrid-sharding";
import type { PrismaClient } from "@prisma/client";

declare module "discord.js" {
  interface Client {
    machine?: Bridge.Shard;
    cluster?: ClusterClient<Client>;
    db: PrismaClient;
  }
}
