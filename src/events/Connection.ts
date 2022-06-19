import { Event, type EventOptions } from '../framework'
import { ApplyOptions } from '@sapphire/decorators'

@ApplyOptions<EventOptions>( {
	event: 'connection'
} )
export class UserEvent extends Event {
	public run() {
		this.container.pino.info( 'WebSocket connected successfully!' )
	}
}
