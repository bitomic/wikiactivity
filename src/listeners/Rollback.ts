import { ApplyOptions } from '@sapphire/decorators'
import { Constants } from 'discord.js'
import type { Interaction } from 'discord.js'
import { Listener } from '@sapphire/framework'
import type { ListenerOptions } from '@sapphire/framework'
import { MessageActionRow } from 'discord.js'
import { unzipSync } from 'zlib'

@ApplyOptions<ListenerOptions>( {
	event: Constants.Events.INTERACTION_CREATE
} )
export class UserEvent extends Listener {
	public async run( interaction: Interaction ): Promise<void> {
		if ( !interaction.isButton() || !interaction.customId.startsWith( 'r-' ) ) return
		if ( !interaction.memberPermissions?.has( 'KICK_MEMBERS' ) ) {
			void interaction.reply( 'No tienes permiso para realizar esta acción.' )
			return
		}

		const message = await interaction.deferUpdate( { fetchReply: true } )
		const [ embed ] = message.embeds
		if ( !embed ) {
			void interaction.editReply( 'No he podido recuperar la información del mensaje.' )
			return
		}
		const fields = embed.fields ?? []

		try {
			const data = interaction.customId.substring( 2 )
			const [ user, title ] = unzipSync( data ).toString()
				.split( '#' )
			if ( !user || !title ) {
				fields.push( { name: 'Error', value: 'Ocurrió un error al intentar recuperar la información de la edición.' } )
			} else {
				const bot = await this.container.client.getFandomBot()
				if ( bot ) {
					const token = await this.container.client.wiki.getToken( 'rollback' ) as unknown as string
					await this.container.client.wiki.post( {
						action: 'rollback',
						markbot: true,
						title,
						token,
						user
					} )
					fields.push( { name: 'Reversión', value: `Se ha revertido la edición a petición de <@!${ interaction.user.id }>.` } )
				} else {
					fields.push( { name: 'Error', value: 'No he podido iniciar sesión para revertir la edición.' } )
				}
			}
		} catch {
			fields.push( { name: 'Error', value: 'Ocurrió un error al intentar revertir esta edición.' } )
		}

		if ( !embed.fields ) embed.fields = fields
		const components = ( message.components ?? [] ).map( i => i instanceof MessageActionRow ? i : new MessageActionRow( i ) )
		components.forEach( i => i.components.forEach( j => j.disabled = true ) )

		void interaction.editReply( {
			components,
			embeds: [ embed ]
		} )
	}
}
