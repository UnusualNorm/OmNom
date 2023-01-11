import { container } from "@sapphire/framework";

export interface AntiVirusOptions {
  id: string;
  manual: boolean;
  auto: boolean;
  force: boolean;
}

export const getOption = async <Options>(
  tableName: string,
  guildId: string,
  option: keyof Options
): Promise<Options[typeof option] | undefined> =>
  ((await container.client
    .db<Options>(tableName)
    .where("id", guildId)
    .select(option)
    .first()) || ({} as Options))[option];
