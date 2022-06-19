import { Listener, type ListenerOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { Constants } from 'discord.js'

@ApplyOptions<ListenerOptions>( {
	event: Constants.Events.CLIENT_READY,
	once: true
} )
export class UserEvent extends Listener {
	public async run(): Promise<void> {
		this.container.pino.info( 'Client is ready and running.' )

		const configurations = this.container.stores.get( 'models' ).get( 'configurations' )
		const wikis = [ ...await configurations.getWikis() ]
		if ( wikis.length === 0 ) {
			this.container.pino.info( 'No wikis are registered. The socket won\'t join any room.' )
			return
		}
		this.container.io.send( 'join', wikis )
		this.container.pino.info( `Joined the following rooms: ${ wikis.join( ', ' ) }` )
	}
}
