import { SlashCommand } from './SlashCommand'
import { Store } from '@sapphire/pieces'

export class SlashCommandStore extends Store<SlashCommand> {
	public constructor() {
		// @ts-expect-error - Either expect-error or cast to any: https://github.com/sapphiredev/framework/blob/db6febd56afeaeff1f23afce2a269beecb316804/src/lib/structures/CommandStore.ts#L10
		super( SlashCommand, { name: 'slash-commands' } )
	}

	public async registerCommands() {
		const { client } = this.container

		// This will split the slash commands between global and guild only.
		const slashCommands = this.container.stores.get( 'slash-commands' )
		const [
			guildCmds, globalCmds
		] = slashCommands.partition( c => c.guildOnly )

		// iterate to all connected guilds and apply the commands.
		const guilds = await client.guilds.fetch() // retrieves Snowflake & Oauth2Guilds
		for ( const [ id ] of guilds ) {
			const guild = await client.guilds.fetch( id ) // gets the guild instances from the cache (fetched before)
			await guild.commands.set( guildCmds.map( c => c.commandData ) )
		}

		// Global commands will update over the span of an hour and is discouraged to update on development mode.
		// https://canary.discord.com/developers/docs/interactions/slash-commands#registering-a-command
		// https://discord.com/developers/docs/interactions/application-commands#making-a-global-command
		if ( process.env.NODE_ENV === 'development' ) {
			this.container.logger.info( 'Skipped global commands because we\'re in development mode' )
			return
		}

		// This will register global commands.
		await client.application?.commands.set( globalCmds.map( c => c.commandData ) )
	}
}

declare module '@sapphire/pieces' {
	interface StoreRegistryEntries {
		'slash-commands': SlashCommandStore
	}
}
