import { env } from './environment'
import { Intents } from 'discord.js'
import { SapphireClient } from '@sapphire/framework'
import { SlashCommandStore } from '../framework'

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
		this.stores.register( new SlashCommandStore() )
	}

	public async start(): Promise<void> {
		await this.login( env.DISCORD_TOKEN )
	}
}
