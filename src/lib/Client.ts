import { container, LogLevel, SapphireClient } from '@sapphire/framework'
import { env } from './environment'
import { Intents } from 'discord.js'
import { ModelStore } from '../framework'
import { ScheduledTaskRedisStrategy } from '@sapphire/plugin-scheduled-tasks/register-redis'
import type { Sequelize } from 'sequelize'
import { sequelize } from './Sequelize'

export class UserClient extends SapphireClient {
	public constructor() {
		super( {
			applicationCommandsHintProvider: () => env.DISCORD_DEVELOPMENT_SERVER
				? { guildIds: [ env.DISCORD_DEVELOPMENT_SERVER ] }
				: null,
			defaultPrefix: env.DISCORD_PREFIX ?? '!',
			intents: [
				Intents.FLAGS.GUILDS,
				Intents.FLAGS.GUILD_MESSAGES
			],
			loadDefaultErrorListeners: true,
			logger: {
				level: LogLevel.Debug
			},
			tasks: {
				strategy: new ScheduledTaskRedisStrategy( {
					bull: {
						redis: {
							db: env.REDIS_DB,
							host: env.REDIS_HOST,
							password: env.REDIS_PASSWORD,
							port: env.REDIS_PORT
						}
					}
				} ),
			}
		} )
		container.sequelize = sequelize
		container.stores.register( new ModelStore() )
	}

	public async start(): Promise<void> {
		await this.login( env.DISCORD_TOKEN )
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		sequelize: Sequelize
	}
}
