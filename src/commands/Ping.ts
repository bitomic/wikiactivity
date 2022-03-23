import type { CommandInteraction, Message } from 'discord.js'
import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import type { CommandOptions } from '@sapphire/framework'

@ApplyOptions<CommandOptions>( {
	chatInputApplicationOptions: {},
	description: 'Pong!',
	enabled: true,
	name: 'ping'
} )
export class UserCommand extends Command {
	public override chatInputApplicationRun( interaction: CommandInteraction ): void {
		void interaction.reply( 'Pong!' )
	}

	public override messageRun( message: Message ): void {
		void message.reply( 'Pong!' )
	}
}
