import { SlashCommandRegister, TaskStore } from '../framework'
import { ApplyOptions } from '@sapphire/decorators'
import { env } from '../lib'
import { Listener } from '@sapphire/framework'
import type { ListenerOptions } from '@sapphire/framework'
import path from 'path'

@ApplyOptions<ListenerOptions>( {
	event: 'ready',
	once: true
} )
export class UserEvent extends Listener {
	public async run(): Promise<void> {
		this.container.logger.info( 'Ready!' )

		const register = SlashCommandRegister.getInstance()
		if ( env.NODE_ENV !== 'development' ) {
			await register.globalRegister()
		}
		if ( env.DISCORD_DEVELOPMENT_SERVER.length > 0 ) {
			const guild = await this.container.client.guilds.fetch( env.DISCORD_DEVELOPMENT_SERVER )
			await register.guildRegister( guild )
		}
		this.container.logger.info( 'Slash commands loaded successfully.' )

		const taskStore = new TaskStore().registerPath( path.resolve( __dirname, '../tasks' ) )
		taskStore.container.client = this.container.client
		this.container.client.stores.register( taskStore )
		await taskStore.loadAll()
	}
}
