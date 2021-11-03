import type { CommandInteraction, Interaction } from 'discord.js'
import { ApplyOptions } from '@sapphire/decorators'
import type { Client } from '../lib'
import { Constants } from 'discord.js'
import { Listener } from '@sapphire/framework'
import type { ListenerOptions } from '@sapphire/framework'
import type { SlashCommandStore } from '../framework'

@ApplyOptions<ListenerOptions>( {
	event: Constants.Events.INTERACTION_CREATE
} )
export class UserEvent extends Listener<typeof Constants.Events.INTERACTION_CREATE> {
	public run( interaction: Interaction ): void {
		if ( interaction.isCommand() ) void this.handleCommandInteraction( interaction )
	}

	private async handleCommandInteraction( interaction: CommandInteraction ): Promise<void> {
		const args = interaction.options
		const { commandName } = interaction
		const store = this.container.stores.get( 'slash-commands' ) as unknown as SlashCommandStore
		const command = store.get( commandName )

		if ( !command ) return

		const context = {
			client: this.container.client as Client,
			commandName
		}
		try {
			await command.run( interaction, args, context )
		} catch ( e ) {
			this.container.logger.error( e )
		}
	}
}
