import { Listener, type ListenerOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { Constants } from 'discord.js'
import { env } from '../lib'
import { EventStore } from '../framework'
import { io } from 'socket.io-client'
import path from 'path'

@ApplyOptions<ListenerOptions>( {
	event: Constants.Events.CLIENT_READY,
	once: true
	} )
export class UserEvent extends Listener {
	public async run(): Promise<void> {
		this.container.pino.info( 'Client is ready and running.' )

		const store = new EventStore()
		store.registerPath( path.join( __dirname, '../events' ) )
		// is this a race condition? yes it is! :D
		this.container.io = io( `http://${ env.WIKIACTIVITY_HOST }:${ env.WIKIACTIVITY_PORT }` )
		await store.loadAll()
		this.container.stores.register( store )
	}
}
