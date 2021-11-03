import type { APIApplicationCommandOption } from 'discord-api-types/v9'
import { container } from '@sapphire/framework'
import { env } from '../lib'
import type { Guild } from 'discord.js'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import type { SlashCommand } from './SlashCommand'
import type { SlashCommandStore } from './SlashCommandStore'

export class SlashCommandRegister {
	private static instance?: SlashCommandRegister

	private globalCommands: APIApplicationCommand[]
	private guildCommands: APIApplicationCommand[]
	private rest: REST
	private store: SlashCommandStore

	private constructor() {
		this.globalCommands = []
		this.guildCommands = []
		this.rest = new REST( {
			version: '9'
		} ).setToken( env.DISCORD_TOKEN )
		this.store = container.stores.get( 'slash-commands' )
		const globalCommands = this.store.filter( command => !command.guildCommand )
		const guildCommands = this.store.filter( command => command.guildCommand )

		this.globalCommands = globalCommands.map( this.slashCommandToData.bind( this ) )
		this.guildCommands = guildCommands.map( this.slashCommandToData.bind( this ) )
	}

	public static getInstance(): SlashCommandRegister {
		if ( !SlashCommandRegister.instance ) {
			SlashCommandRegister.instance = new SlashCommandRegister()
		}
		return SlashCommandRegister.instance
	}

	public async guildRegister( guild: Guild ): Promise<void> {
		if ( !container.client.id ) return

		await guild.commands.fetch()

		const commands = await this.rest.put(
			Routes.applicationGuildCommands( container.client.id, guild.id ),
			{
				body: this.guildCommands
			}
		) as APIGuildApplicationCommand[]

		const restrictedCommands = commands.filter( command => {
			const item = this.store.get( command.name )
			return item && item.permissions.length > 0
		} )
		const fullPermissions = restrictedCommands.map( command => ( {
			id: command.id,
			permissions: this.store.get( command.name )?.permissions ?? []
		} ) )

		await guild.commands.permissions.set( { fullPermissions } )
	}

	public async globalRegister(): Promise<void> {
		if ( !container.client.id ) return
		await this.rest.put(
			Routes.applicationCommands( container.client.id ),
			{
				body: this.globalCommands
			}
		)
	}

	private slashCommandToData( command: SlashCommand ): APIApplicationCommand {
		return {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			application_id: container.client.application!.id,
			default_permission: command.defaultPermission,
			description: command.description,
			guild_id: undefined,
			name: command.name,
			options: command.arguments.map( argument => ( {
				...argument,
				// @ts-expect-error - I am not writing quality code (?)
				type: ApplicationCommandOptionTypeMap[ argument.type.toString() ] //eslint-disable-line @typescript-eslint/no-unsafe-assignment
			} ) )
		}
	}
}

export interface APIApplicationCommand {
	application_id: string
	default_permission?: boolean
	description: string
	guild_id?: string | undefined
	name: string
	options?: APIApplicationCommandOption[]
}

export interface APIGuildApplicationCommand extends APIApplicationCommand {
	guild_id: string
	id: string
	type?: number
	version?: string
}

export const ApplicationCommandOptionTypeMap = {
	BOOLEAN: 5,
	CHANNEL: 7,
	INTEGER: 4,
	MENTIONABLE: 9,
	NUMBER: 10,
	ROLE: 8,
	STRING: 3,
	SUBCOMMAND: 1,
	SUBCOMMAND_GROUP: 2,
	USER: 6
}
