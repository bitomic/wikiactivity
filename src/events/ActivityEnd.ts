import { Event, type EventOptions } from '../framework'
import type { ActivityEvent } from './Activity'
import { ApplyOptions } from '@sapphire/decorators'

@ApplyOptions<EventOptions>( {
	event: 'activity-end'
	} )
export class UserEvent extends Event {
	public async run(): Promise<void> {
		const activity = this.container.stores.get( 'events' ).get( 'activity' ) as ActivityEvent
		await activity.process()
			.catch( e => {
				this.container.pino.error( 'An error had occurred while processing the activity.' )
				this.container.pino.error( e )
			} )
	}
}
