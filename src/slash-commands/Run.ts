import { ApplyOptions } from '@sapphire/decorators'
import type { CommandInteraction } from 'discord.js'
import { env } from '../lib'
import { SlashCommand } from '../framework'
import type { SlashCommandOptions } from '../framework'

@ApplyOptions<SlashCommandOptions>( {
	description: 'No description.',
	enabled: true,
	guildOnly: true,
	name: 'run'
} )
export class UserSlash extends SlashCommand {
	public run( interaction: CommandInteraction ): void {
		if ( interaction.user.id !== env.DISCORD_OWNER ) {
			void interaction.reply( {
				content: 'You don\'t have permissions to use this command.',
				ephemeral: true
			} )
			return
		}
		const tasks = this.container.stores.get( 'tasks' )
		const task = tasks.get( 'wikiactivity' )
		if ( !task ) {
			void interaction.reply( {
				content: 'Couldn\'t find the task.'
			} )
			return
		}
		void interaction.reply( {
			content: 'Manually running task.'
		} )
		void task.run()
	}
}
