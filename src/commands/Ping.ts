import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import type { CommandInteraction } from 'discord.js'
import type { CommandOptions } from '@sapphire/framework'

@ApplyOptions<CommandOptions>( {
	chatInputCommand: {
		register: true
	},
	description: 'Pong!',
	enabled: true,
	name: 'ping'
} )
export class UserCommand extends Command {
	public override chatInputRun( interaction: CommandInteraction ): void {
		void interaction.reply( 'Pong!' )
	}
}
