import type { ApplicationCommandRegistry, CommandOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import type { CommandInteraction } from 'discord.js'
import { request } from 'undici'

@ApplyOptions<CommandOptions>( {
	description: 'Configura los mensajes de actividad de un wiki.',
	enabled: true,
	name: 'configurar'
} )
export class UserCommand extends Command {
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand( builder => builder
			.setName( this.name )
			.setDescription( this.description )
			.setDefaultPermission( false )
			.addStringOption( input => input
				.setName( 'interwiki' )
				.setDescription( 'Interwiki del wiki a modificar' )
				.setRequired( true ) )
			.addStringOption( input => input
				.setName( 'ajuste' )
				.setDescription( 'Configuración a realizar' )
				.setRequired( true )
				.addChoices( [
					[ 'Avatar', 'Avatar' ],
					[ 'Color', 'Color' ]
				] ) )
			.addStringOption( input => input
				.setName( 'valor' )
				.setDescription( 'URL de la imagen o color a asignar' )
				.setRequired( true ) ) )
	}

	public override async chatInputRun( interaction: CommandInteraction ): Promise<void> {
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
