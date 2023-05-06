import { container } from "@sapphire/framework";
import filters from "../filters.js";
import type { Filter } from "../types/filter.js";
import {
  PermissionFlagsBits,
  type GuildTextBasedChannel,
  type WebhookMessageCreateOptions,
} from "discord.js";
import type { Filter as FilterEntry } from "@prisma/client";

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

export async function getAppliedFilters(
  guildId: string,
  channelId?: string,
  userId?: string,
  roleIds: string[] = []
): Promise<FilterEntry[]> {
  const filters = await container.client.db.filter.findMany({
    where: {
      OR: [
        { id: guildId, guild: guildId, type: "guild" },
        { id: channelId, guild: guildId, type: "channel" },
        { id: userId, guild: guildId, type: "user" },
        ...roleIds.map((roleId) => ({
          id: roleId,
          guild: guildId,
          type: "role",
        })),
      ],
    },
  });

  return filters;
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

export async function getFiltersToApply(
  guildId: string,
  channelId?: string,
  userId?: string,
  roleIds: string[] = []
): Promise<Filter[]> {
  const filterEntries = await getAppliedFilters(
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
    channel
      .permissionsFor(container.client.id ?? "")
      ?.has([
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ManageWebhooks,
      ]) ?? false
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
