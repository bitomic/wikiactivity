import { Event } from './Event'
import { io } from '../lib'
import type { Socket } from 'socket.io-client'
import { Store } from '@sapphire/pieces'

export class EventStore extends Store<Event> {
	public constructor() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
		super( Event as any, { name: 'events' } )
	}

	public override set( key: string, value: Event ): this {
		io.on( value.options.event, ( socket: Socket ) => value.run( socket ) )
		return super.set( key, value )
	}
}
