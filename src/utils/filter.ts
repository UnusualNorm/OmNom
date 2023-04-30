import { container } from "@sapphire/framework";
import filters from "../filters.js";
import type { Filter } from "../types/filter.js";
import type { Filter as FilterEntry } from "knex/types/tables";
import {
  PermissionFlagsBits,
  type GuildTextBasedChannel,
  type WebhookMessageCreateOptions,
} from "discord.js";

const filterOrder = ["user", "role", "channel", "guild"];

export function sortFilterEntries(entries: FilterEntry[]): FilterEntry[] {
  return entries.sort(
    (a, b) => filterOrder.indexOf(a.type) - filterOrder.indexOf(b.type)
  );
}

export function serializeFilterEntries(entries: FilterEntry[]): Filter[] {
  return entries
    .map((entry) => filters.get(entry.filter))
    .filter((filter) => !!filter) as Filter[];
}

export async function getAllAppliedFilters(
  guildId: string,
  channelId?: string,
  userId?: string,
  roleIds: string[] = []
): Promise<FilterEntry[]> {
  let query = container.client
    .db("filters")
    .select()
    .orWhere((builder) =>
      builder
        .where("id", guildId)
        .where("guild", guildId)
        .where("type", "guild")
    )
    .orWhere((builder) =>
      builder
        .where("id", channelId)
        .where("guild", guildId)
        .where("type", "channel")
    )
    .orWhere((builder) =>
      builder.where("id", userId).where("guild", guildId).where("type", "user")
    );

  roleIds.forEach(
    (roleId) =>
      (query = query.orWhere((builder) =>
        builder
          .where("id", roleId)
          .where("guild", guildId)
          .where("type", "role")
      ))
  );

  return await query;
}

export function removeDuplicateFilterEntries(
  entries: FilterEntry[]
): FilterEntry[] {
  const uniqueEntries = new Map<string, FilterEntry>();

  for (const entry of entries) {
    const key = `${entry.type}-${entry.id}`;
    if (!uniqueEntries.has(key)) uniqueEntries.set(key, entry);
  }

  return [...uniqueEntries.values()];
}

export async function getAppliedFilters(
  guildId: string,
  channelId?: string,
  userId?: string,
  roleIds: string[] = []
): Promise<Filter[]> {
  const filterEntries = await getAllAppliedFilters(
    guildId,
    channelId,
    userId,
    roleIds
  );

  const organizedFilterEntries = sortFilterEntries(filterEntries);
  const uniqueFilters = removeDuplicateFilterEntries(organizedFilterEntries);
  return serializeFilterEntries(uniqueFilters);
}

export function hasPermissions(channel: GuildTextBasedChannel): boolean {
  return (
    !channel
      .permissionsFor(container.client.user?.id ?? "")
      ?.has(PermissionFlagsBits.ManageWebhooks) ||
    !channel
      .permissionsFor(container.client.user?.id ?? "")
      ?.has(PermissionFlagsBits.ManageMessages)
  );
}

export async function applyFilters(
  message: WebhookMessageCreateOptions,
  filters: Filter[]
): Promise<WebhookMessageCreateOptions> {
  let newMessage = message;
  for (const filter of filters) newMessage = await filter.run(newMessage);
  return newMessage;
}
