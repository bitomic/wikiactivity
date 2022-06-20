import { Listener, type ListenerOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { Constants } from 'discord.js'

@ApplyOptions<ListenerOptions>( {
	event: Constants.Events.CLIENT_READY,
	once: true
} )
export class UserEvent extends Listener {
	public run(): void {
		this.container.pino.info( 'Client is ready and running.' )
	}
}
