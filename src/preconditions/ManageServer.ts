import { Precondition, type PreconditionOptions, type PreconditionResult } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import type { CommandInteraction } from 'discord.js'

@ApplyOptions<PreconditionOptions>( {
	name: 'ManageServer'
} )
export class UserPrecondition extends Precondition {
	public override chatInputRun( interaction: CommandInteraction ): PreconditionResult {
		return interaction.memberPermissions?.has( 'MANAGE_GUILD' )
			? this.ok()
			: this.error()
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		ManageServer: never;
	}
}
