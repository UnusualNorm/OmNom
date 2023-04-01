import type { ChatInputCommandInteraction } from "discord.js";
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
      name: "trigger",
      chatInputRun: "trigger",
    },
    {
      name: "global",
      chatInputRun: "global",
    },
  ],
})
export class AntiVirusCommand extends Subcommand {
  override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName("chatbot")
          .setDescription(
            `Change ${this.container.client.user!.username} chatbot settings!`
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
                  .setName("hello")
                  .setDescription(
                    "Taking the chatbot's persona into account, how would the chatbot respond to hello?"
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
                      name: "Hello",
                      value: "hello",
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
              .setName("trigger")
              .setDescription(
                "Make the chatbot write a message in this channel!"
              )
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
    const name = interaction.options.getString("name") ?? undefined;
    const avatar = interaction.options.getString("avatar") ?? undefined;
    const persona = interaction.options.getString("persona") ?? undefined;
    const hello = interaction.options.getString("hello") ?? undefined;
    const keywords = interaction.options.getString("keywords") ?? undefined;

    // Maybe our db connection is slow, defer the interaction.
    await interaction.deferReply({
      ephemeral: true,
    });

    // If we already have a chatbot for this channel, delete it.
    await this.container.client
      .db("chatbots")
      .delete()
      .where("id", interaction.channelId);

    // Create the chatbot.
    await this.container.client.db("chatbots").insert({
      id: interaction.channelId,
      name,
      avatar,
      persona,
      hello,
      keywords,
    });

    // Send a confirmation message.
    await interaction.editReply({
      content: `Successfully created the chatbot for this channel!`,
    });
    return;
  }

  async configure(interaction: ChatInputCommandInteraction) {
    const option = interaction.options.getString("option", true);
    const value = interaction.options.getString("value", true);

    // Maybe our db connection is slow, defer the interaction.
    await interaction.deferReply({
      ephemeral: true,
    });

    // If we don't have a chatbot for this channel, send an error message.
    const chatbot = await this.container.client
      .db("chatbots")
      .select("*")
      .where("id", interaction.channelId)
      .first();

    if (!chatbot) {
      await interaction.editReply({
        content: `There is no chatbot for this channel!`,
      });
      return;
    }

    // Make sure this is a valid option.
    if (!["name", "avatar", "persona", "hello", "keywords"].includes(option)) {
      await interaction.editReply({
        content: `Invalid option!`,
      });
      return;
    }

    // Update the chatbot.
    await this.container.client
      .db("chatbots")
      .update({
        [option]: value,
      })
      .where("id", interaction.channelId);

    // Send a confirmation message.
    await interaction.editReply({
      content: `Successfully updated the chatbot for this channel!`,
    });
    return;
  }

  async delete(interaction: ChatInputCommandInteraction) {
    // Maybe our db connection is slow, defer the interaction.
    await interaction.deferReply({
      ephemeral: true,
    });

    // If we don't have a chatbot for this channel, send an error message.
    const chatbot = await this.container.client
      .db("chatbots")
      .select("*")
      .where("id", interaction.channelId)
      .first();

    if (!chatbot) {
      await interaction.editReply({
        content: `There is no chatbot for this channel!`,
      });
      return;
    }

    // Delete the chatbot.
    await this.container.client
      .db("chatbots")
      .delete()
      .where("id", interaction.channelId);

    // Send a confirmation message.
    await interaction.editReply({
      content: `Successfully deleted the chatbot for this channel!`,
    });
    return;
  }
}
