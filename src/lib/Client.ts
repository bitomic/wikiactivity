import { container, SapphireClient } from '@sapphire/framework'
import { env } from './environment'
import { Intents } from 'discord.js'
import type { Logger } from 'pino'
import { ModelStore } from '../framework'
import { pino } from './pino'
import type { Sequelize } from 'sequelize'
import { sequelize } from './sequelize'

export class UserClient extends SapphireClient {
	public constructor() {
		super( {
			defaultPrefix: env.DISCORD_PREFIX ?? '!',
			intents: [
				Intents.FLAGS.GUILDS
			],
			loadDefaultErrorListeners: true
		} )
		container.pino = pino
		container.sequelize = sequelize
		container.stores.register( new ModelStore() )
	}

	public async start(): Promise<void> {
		await this.login( env.DISCORD_TOKEN )
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		pino: Logger
		sequelize: Sequelize
	}
}
