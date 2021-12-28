import type { ApplicationCommandData, ApplicationCommandOptionData, CommandInteraction, InteractionReplyOptions } from 'discord.js'
import type { Awaitable } from '@sapphire/utilities'
import { Piece } from '@sapphire/framework'
import type { PieceContext } from '@sapphire/framework'

export abstract class SlashCommand extends Piece {
	public readonly commandData: SlashCommandOptions
	public readonly guildOnly: boolean

	public constructor( context: PieceContext, options: SlashCommandOptions ) {
		super( context, options )

		this.commandData = {
			defaultPermission: options.defaultPermission ?? true,
			description: options.description ?? 'No description provided',
			name: this.name,
			options: options.options ?? []
		}

		this.guildOnly = options.guildOnly ?? false
	}

	public abstract run( interaction: CommandInteraction ): Awaitable<unknown>

	protected async canManage( interaction: CommandInteraction ): Promise<boolean> {
		if ( !this.isGuild( interaction ) ) return false

		const guild = interaction.guild ?? await this.container.client.guilds.fetch( interaction.guildId )
		const member = await guild.members.fetch( interaction.user.id )
		// eslint-disable-next-line prefer-destructuring
		const { permissions } = member

		const hasPermission = permissions.has( 'MANAGE_GUILD' )
		if ( !hasPermission ) {
			this.reply( interaction, {
				content: 'You need the `Manage server` permission to use this command.'
			} )
		}
		return hasPermission
	}

	protected isGuild( interaction: CommandInteraction ): interaction is CommandInteraction<'present'> {
		const inGuild = interaction.inGuild()
		if ( !inGuild ) {
			this.reply( interaction, {
				content: 'This command can only be used in guilds.'
			} )
		}
		return inGuild
	}

	protected reply( interaction: CommandInteraction, options: InteractionReplyOptions ): void {
		const method = interaction.replied || interaction.deferred
			? 'editReply'
			: 'reply'
		void interaction[ method ]( options )
	}
}

export type SlashCommandOptions = ApplicationCommandData & {
	defaultPermission?: boolean
	description?: string
	enabled?: boolean
	guildOnly?: boolean
	options?: ApplicationCommandOptionData[]
}
