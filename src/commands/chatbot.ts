import { type ChatInputCommandInteraction } from "discord.js";
import { Command, RegisterBehavior } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";

@ApplyOptions<Subcommand.Options>({
  name: "chatbot",
  subcommands: [
    {
      name: "create",
      chatInputRun: "create",
    },
    {
      name: "configure",
      chatInputRun: "configure",
    },
    {
      name: "delete",
      chatInputRun: "delete",
    },
    {
      name: "global",
      chatInputRun: "global",
    },
  ],
})
export class ChatBotCommand extends Subcommand {
  override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("chatbot")
          .setDescription(
            `Change ${this.container.client.user?.username} chatbot settings!`
          )
          .addSubcommand((builder) =>
            builder
              .setName("create")
              .setDescription("Create/override the chatbot for this channel!")
              .addStringOption((builder) =>
                builder
                  .setName("name")
                  .setDescription("The name of the chatbot.")
              )
              .addStringOption((builder) =>
                builder
                  .setName("avatar")
                  .setDescription("The avatar of the chatbot.")
              )
              .addStringOption((builder) =>
                builder
                  .setName("persona")
                  .setDescription("The persona of the chatbot.")
              )
              .addStringOption((builder) =>
                builder
                  .setName("greeting")
                  .setDescription(
                    "Taking the chatbot's persona into account, how would the chatbot greet someone?"
                  )
              )
              .addStringOption((builder) =>
                builder
                  .setName("keywords")
                  .setDescription(
                    "Keywords that the chatbot will respond to. Wildcards are supported."
                  )
              )
          )
          .addSubcommand((builder) =>
            builder
              .setName("configure")
              .setDescription("Configure a chatbot!")
              .addStringOption((builder) =>
                builder
                  .setName("option")
                  .setDescription("The option to configure.")
                  .setRequired(true)
                  .addChoices(
                    {
                      name: "Name",
                      value: "name",
                    },
                    {
                      name: "Avatar",
                      value: "avatar",
                    },
                    {
                      name: "Persona",
                      value: "persona",
                    },
                    {
                      name: "greeting",
                      value: "greeting",
                    },
                    {
                      name: "Keywords",
                      value: "keywords",
                    }
                  )
              )
              .addStringOption((builder) =>
                builder
                  .setName("value")
                  .setDescription("The value to set the option to.")
                  .setRequired(true)
              )
          )
          .addSubcommand((builder) =>
            builder
              .setName("delete")
              .setDescription("Delete the chatbot for this channel!")
          )
          .addSubcommand((builder) =>
            builder
              .setName("global")
              .setDescription(
                `Toggle the ${this.container.client.user?.username} global chatbot!`
              )
              .addBooleanOption((builder) =>
                builder
                  .setName("enabled")
                  .setDescription(
                    "Whether the global chatbot is enabled or not."
                  )
                  .setRequired(true)
              )
          ),

      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
      }
    );
  }

  async create(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      ephemeral: true,
    });

    const name = interaction.options.getString("name") ?? undefined;
    const avatar = interaction.options.getString("avatar") ?? undefined;
    const persona = interaction.options.getString("persona") ?? undefined;
    const greeting = interaction.options.getString("greeting") ?? undefined;
    const keywords = interaction.options.getString("keywords") ?? undefined;

    try {
      // Create the chatbot.
      const chatbot = {
        id: interaction.channelId,
        name: name ?? null,
        avatar: avatar ?? null,
        persona: persona ?? null,
        greeting: greeting ?? null,
        keywords: keywords ?? null,
      };

      await this.container.client.db.chatbot.upsert({
        where: {
          id: interaction.channelId,
        },
        create: chatbot,
        update: chatbot,
      });

      // Send a confirmation message.
      return interaction.editReply({
        content: `Successfully created a chatbot in this channel!`,
      });
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply({
        content: `An error occurred while creating a chatbot in this channel...`,
      });
    }
  }

  async configure(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      ephemeral: true,
    });

    const option = interaction.options.getString("option", true);
    const value = interaction.options.getString("value", true);

    try {
      // Make sure this is a valid option.
      if (
        !["name", "avatar", "persona", "greeting", "keywords"].includes(option)
      )
        return interaction.editReply({
          content: `Invalid option!`,
        });

      // Update the chatbot.
      const updated = await this.container.client.db.chatbot.update({
        where: {
          id: interaction.channelId,
        },
        data: {
          [option]: value,
        },
      });

      // If we didn't update anything, send an error message.
      if (!updated)
        return interaction.editReply({
          content: "There is no chatbot in this channel!",
        });

      // Send a confirmation message.
      return interaction.editReply({
        content: `Successfully updated the chatbot in this channel!`,
      });
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply({
        content: `An error occurred while configuring the chatbot in this channel...`,
      });
    }
  }

  async delete(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
      ephemeral: true,
    });

    try {
      // Delete the chatbot.
      const deleted = await this.container.client.db.chatbot.delete({
        where: {
          id: interaction.channelId,
        },
      });

      // If we didn't delete anything, send an error message.
      if (!deleted)
        return interaction.editReply({
          content: "There is no chatbot in this channel!",
        });

      // Send a confirmation message.
      return interaction.editReply({
        content: "Successfully deleted the chatbot in this channel!",
      });
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply({
        content:
          "An error occurred while deleting the chatbot in this channel...",
      });
    }
  }

  async global(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild())
      return interaction.reply({
        content: "This command can only be used in a guild!",
        ephemeral: true,
      });

    await interaction.deferReply({
      ephemeral: true,
    });

    const enabled = interaction.options.getBoolean("enabled", true);

    try {
      // Update the global chatbot. Insert if it doesn't exist.
      await this.container.client.db.globalChatbot.upsert({
        where: {
          id: interaction.guildId,
        },
        create: {
          id: interaction.guildId,
          enabled,
        },
        update: {
          enabled,
        },
      });

      // Send a confirmation message.
      return interaction.editReply({
        content: `Successfully ${
          enabled ? "enabled" : "disabled"
        } the global chatbot!`,
      });
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply({
        content: `An error occurred while toggling the global chatbot...`,
      });
    }
  }
}
