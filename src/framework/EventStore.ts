import { container } from '@sapphire/framework'
import { Event } from './Event'
import type { Socket } from 'socket.io-client'
import { Store } from '@sapphire/pieces'

export class EventStore extends Store<Event> {
	public constructor() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
		super( Event as any, { name: 'events' } )
	}

	public override set( key: string, value: Event ): this {
		container.io.on( value.options.event, ( socket: Socket ) => value.run( socket ) )
		return super.set( key, value )
	}
}

declare module '@sapphire/pieces' {
	interface StoreRegistryEntries {
		'events': EventStore
	}
}

declare global {
	// eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface EventRegistryEntries {
    }
}
