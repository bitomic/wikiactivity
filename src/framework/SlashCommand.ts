import type { AliasPieceJSON, PieceContext, PieceOptions } from '@sapphire/pieces'
import type {
	ApplicationCommandOptionData,
	ApplicationCommandPermissionData,
	CacheType,
	CommandInteraction,
	CommandInteractionOptionResolver,
	PermissionResolvable
} from 'discord.js'
import { AliasPiece } from '@sapphire/pieces'
import type { Awaitable } from '@sapphire/utilities'

export abstract class SlashCommand<T = Omit<CommandInteractionOptionResolver<CacheType>, 'getMessage' | 'getFocused'>> extends AliasPiece {
	public description: string
	public arguments: ApplicationCommandOptionData[]
	public guildCommand: boolean
	public defaultPermission: boolean
	public permissions: ApplicationCommandPermissionData[]

	protected constructor( context: PieceContext, options: SlashCommandOptions = {} ) {
		super( context, {
			...options,
			name: ( options.name ?? context.name ).toLowerCase()
		} )
		this.arguments = options.arguments ?? []
		this.defaultPermission = options.defaultPermission ?? true
		this.description = options.description ?? ''
		this.guildCommand = options.guildCommand ?? false
		this.permissions = options.permisisons ?? []
	}

	public abstract run( interaction: CommandInteraction, args: T, context: SlashCommandContext ): Awaitable<unknown>

	public override toJSON(): SlashCommandPieceJSON {
		return {
			...super.toJSON(),
			arguments: this.arguments,
			defaultPermission: this.defaultPermission,
			description: this.description,
			guildCommand: this.guildCommand,
			permissions: this.permissions
		}
	}
}

export interface SlashCommandOptions extends PieceOptions {
	arguments?: ApplicationCommandOptionData[]
	description?: string
	guildCommand?: boolean
	defaultPermission?: boolean
	permisisons?: ApplicationCommandPermissionData[]
	requiredClientPermissions?: PermissionResolvable
}

export interface SlashCommandContext extends Record<PropertyKey, unknown> {
	commandName: string
}

export interface SlashCommandPieceJSON extends AliasPieceJSON {
	[ key: string ]: unknown
}
