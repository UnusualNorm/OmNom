import Bridge from "discord-cross-hosting";
import Cluster from "discord-hybrid-sharding";

declare module "discord.js" {
  interface Client {
    machine: Bridge.Shard;
    cluster: Cluster.Client;
  }
}
