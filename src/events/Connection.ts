import { Event, type EventOptions } from '../framework'
import { ApplyOptions } from '@sapphire/decorators'

@ApplyOptions<EventOptions>( {
	event: 'connection'
} )
export class UserEvent extends Event {
	public async run(): Promise<void> {
		this.container.pino.info( 'WebSocket connected successfully!' )

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
