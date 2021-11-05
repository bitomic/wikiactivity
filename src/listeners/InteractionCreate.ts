import { ApplyOptions } from '@sapphire/decorators'
import { Constants } from 'discord.js'
import { env } from '../lib'
import type { Interaction } from 'discord.js'
import { Listener } from '@sapphire/framework'
import type { ListenerOptions } from '@sapphire/framework'

@ApplyOptions<ListenerOptions>( {
	event: Constants.Events.INTERACTION_CREATE
} )
export class UserEvent extends Listener<typeof Constants.Events.INTERACTION_CREATE> {
	public async run( interaction: Interaction ) {
		if ( !interaction.isCommand() ) return

		const command = this.container.stores.get( 'slash-commands' ).get( interaction.commandName )
		if ( !command ) return

		try {
			await command.run( interaction )
			if ( env.NODE_ENV === 'development' ) {
				this.container.logger.info( `${ interaction.user.id } ran slash command ${ command.commandData.name }` )
			}
		} catch ( e ) {
			this.container.logger.error( e )

			if ( interaction.replied ) {
				interaction
					.followUp( {
						content: 'There was a problem with your request.',
						ephemeral: true
					} )
					.catch( e => this.container.logger.fatal( 'An error occurred following up on an error', e ) )
			} else if ( interaction.deferred ) {
				interaction
					.editReply( {
						content: 'There was a problem with your request.'
					} )
					.catch( e => this.container.logger.fatal( 'An error occurred following up on an error', e ) )
			} else {
				interaction
					.reply( {
						content: 'There was a problem with your request.',
						ephemeral: true
					} )
					.catch( e => this.container.logger.fatal( 'An error occurred replying on an error', e ) )
			}
		}
	}
}
