import { ApplyOptions } from '@sapphire/decorators'
import type { CommandInteraction } from 'discord.js'
import { SlashCommand } from '../framework'
import type { SlashCommandOptions } from '../framework'

@ApplyOptions<SlashCommandOptions>( {
	description: 'Pong!',
	enabled: true,
	guildOnly: true,
	name: 'ping'
} )
export class UserSlash extends SlashCommand {
	public run( interaction: CommandInteraction ): void {
		void interaction.reply( {
			content: 'Pong!',
			ephemeral: true
		} )
	}
}
