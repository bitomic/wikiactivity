import { container, LogLevel, SapphireClient } from '@sapphire/framework'
import type { FandomBot, FandomWiki } from 'mw.js'
import { env } from './environment'
import { Fandom } from 'mw.js'
import { Intents } from 'discord.js'
import { ModelStore } from '../framework'
import { ScheduledTaskRedisStrategy } from '@sapphire/plugin-scheduled-tasks/register-redis'
import type { Sequelize } from 'sequelize'
import { sequelize } from './Sequelize'

export class UserClient extends SapphireClient {
	protected bot: FandomBot | null = null
	protected fandom = new Fandom()
	public override wiki: FandomWiki

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
		this.wiki = this.fandom.getWiki( 'es.genshin-impact' )
	}

	public override async getFandomBot( force?: boolean ): Promise<FandomBot | null> {
		if ( !this.bot || force ) {
			this.bot = await this.fandom.login( {
				password: env.FANDOM_PASSWORD,
				username: env.FANDOM_USERNAME,
				wiki: this.wiki
			} )
		}

		const who = await this.bot.whoAmI()
		if ( who.query.userinfo.id === 0 && !force ) return this.getFandomBot( force )
		return this.bot
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

declare module 'discord.js' {
	interface Client {
		getFandomBot( force?: boolean ): Promise<FandomBot | null>
		wiki: FandomWiki
	}
}
