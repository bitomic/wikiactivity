import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import type { CommandInteraction } from 'discord.js'
import type { CommandOptions } from '@sapphire/framework'
import { request } from 'undici'

@ApplyOptions<CommandOptions>( {
	chatInputApplicationOptions: {
		options: [
			{
				description: 'Interwiki del wiki a modificar',
				name: 'interwiki',
				required: true,
				type: 'STRING'
			},
			{
				choices: [
					{ name: 'Avatar', value: 'Avatar' },
					{ name: 'Color', value: 'Color' }
				],
				description: 'Configuración a realizar',
				name: 'ajuste',
				required: true,
				type: 'STRING'
			},
			{
				description: 'URL de la imagen o color a asignar',
				name: 'valor',
				required: true,
				type: 'STRING'
			}
		]
	},
	description: 'Configura los mensajes de actividad de un wiki.',
	enabled: true,
	name: 'configurar'
} )
export class UserCommand extends Command {
	public override async chatInputApplicationRun( interaction: CommandInteraction ): Promise<void> {
		if ( !interaction.inGuild() ) return

		if ( !interaction.memberPermissions.has( 'MANAGE_GUILD' ) ) {
			void interaction.reply( {
				content: 'No tienes permiso para usar este comando.',
				ephemeral: true
			} )
			return
		}

		await interaction.deferReply()

		const interwiki = interaction.options.getString( 'interwiki', true )
		const setting = interaction.options.getString( 'ajuste', true )
		const value = interaction.options.getString( 'valor', true )

		const configurations = this.container.stores.get( 'models' ).get( 'configurations' )
		const exists = await configurations.model.findOne( {
			where: {
				guild: interaction.guildId,
				wiki: interwiki
			}
		} )
		if ( !exists ) {
			void interaction.editReply( `No hay ninguna configuración en este servidor para ${ interwiki }.` )
			return
		}

		try {
			if ( setting === 'Avatar' ) {
				const { headers } = await request( value, { method: 'HEAD' } )
				const contentType = headers[ 'content-type' ] ?? ''
				if ( ![ 'image/png', 'image/jpg', 'image/jpeg' ].includes( contentType ) ) {
					void interaction.editReply( `Los avatares deben de ser en formato \`image/png\`, \`image/jpg\`o \`image/jpeg\`; el avatar que intentaste configurar es formato \`${ contentType }\`.` )
					return
				}

				await configurations.model.update(
					{ avatar: value },
					{
						where: {
							guild: interaction.guildId,
							wiki: interwiki
						}
					}
				)

				void interaction.editReply( 'Se ha configurado el nuevo avatar exitosamente.' )
			} else if ( setting === 'Color' ) {
				if ( !value.match( /^[a-f0-9]{6}$/i ) ) {
					void interaction.reply( 'El código hexadecimal es inválido.' )
					return
				}

				await configurations.model.update(
					{ color: parseInt( value, 16 ) },
					{
						where: {
							guild: interaction.guildId,
							wiki: interwiki
						}
					}
				)

				void interaction.editReply( 'Se ha configurado el color exitosamente.' )
			} else {
				void interaction.editReply( `No reconozco la opción de ajuste "${ setting }".` )
			}
		} catch {
			void interaction.editReply( 'Ha ocurrido un error inesperado, vuelve a intentrlo.' )
		}
	}

	public override messageRun(): void { // eslint-disable-line @typescript-eslint/no-empty-function
	}
}
