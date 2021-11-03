import { env } from './environment'
import { Intents } from 'discord.js'
import { SapphireClient } from '@sapphire/framework'

export class Client extends SapphireClient {
	public constructor() {
		super( {
			defaultPrefix: env.DISCORD_PREFIX,
			intents: [
				Intents.FLAGS.GUILDS,
				Intents.FLAGS.GUILD_MESSAGES
			],
			loadDefaultErrorListeners: true
		} )
	}

	public async start(): Promise<void> {
		await this.login( env.DISCORD_TOKEN )
	}
}
