import { container } from "@sapphire/framework";

export async function getAppliedFilters(
  guildId: string,
  channelId?: string,
  userId?: string,
  roleIds: string[] = []
) {
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

  return query;
}
