import { Events, Listener, type ListenerOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { type CommandInteraction } from 'discord.js'

@ApplyOptions<ListenerOptions>( {
	event: Events.ChatInputCommandDenied
} )
export class UserEvent extends Listener {
	public run( _: unknown, { interaction }: { interaction: CommandInteraction } ): void {
		void interaction[ interaction.deferred ? 'editReply' : 'reply' ]( {
			content: 'No tienes permisos para usar este comando.'
		} )
	}
}
