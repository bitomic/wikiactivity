import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import type { ListenerOptions } from '@sapphire/framework'
import path from 'path'
import { TaskStore } from '../framework'

@ApplyOptions<ListenerOptions>( {
	event: 'ready',
	once: true
} )
export class UserEvent extends Listener {
	public async run(): Promise<void> {
		this.container.logger.info( 'Ready!' )

		const slashStore = this.container.stores.get( 'slash-commands' )

		try {
			await slashStore.registerCommands()
			this.container.logger.info( 'Successfully loaded slash commands.' )
		} catch ( e ) {
			this.container.logger.error( e )
		}

		const taskStore = new TaskStore().registerPath( path.resolve( __dirname, '../tasks' ) )
		taskStore.container.client = this.container.client
		this.container.client.stores.register( taskStore )
		await taskStore.loadAll()
	}
}
