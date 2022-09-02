import { type ApplicationCommandRegistry, Command, type CommandOptions, RegisterBehavior } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import type { CommandInteraction } from 'discord.js'
import { env } from '../lib'
import { request } from 'undici'

@ApplyOptions<CommandOptions>( {
	description: 'Configura los mensajes de actividad de un wiki.',
	name: 'configurar',
	preconditions: [ 'ManageServer' ]
	} )
export class UserCommand extends Command {
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand(
			builder => builder
				.setName( this.name )
				.setDescription( this.description )
				.addStringOption( input => input
					.setName( 'interwiki' )
					.setDescription( 'Interwiki del wiki' )
					.setRequired( true ) )
				.addStringOption( input => input
					.setName( 'ajuste' )
					.setDescription( 'Configuración a realizar' )
					.setRequired( true )
					.addChoices(
						{ name: 'Avatar', value: 'avatar' },
						{ name: 'Color', value: 'color' },
						{ name: 'Nombre', value: 'name' }
					) )
				.addStringOption( input => input
					.setName( 'valor' )
					.setDescription( 'Nombre, URL de la imagen o color a asignar' )
					.setRequired( true ) ),
			{
				...env.DISCORD_DEVELOPMENT_SERVER
					? { guildIds: [ env.DISCORD_DEVELOPMENT_SERVER ] }
					: {},
				behaviorWhenNotIdentical: RegisterBehavior.Overwrite
			}
		)
	}

	public override async chatInputRun( interaction: CommandInteraction ): Promise<void> {
		if ( !interaction.inGuild() ) return
		await interaction.deferReply()
		const configurations = this.container.stores.get( 'models' ).get( 'configurations' )
		const interwiki = interaction.options.getString( 'interwiki', true )
		const setting = interaction.options.getString( 'ajuste', true ) as 'avatar' | 'color' | 'name'
		let value: string | number = interaction.options.getString( 'valor', true )

		if ( setting === 'avatar' ) {
			const { headers } = await request( value, { method: 'HEAD' } )
			const contentType = headers[ 'content-type' ] ?? ''
			if ( ![ 'image/png', 'image/jpg', 'image/jpeg' ].includes( contentType ) ) {
				void interaction.editReply( `Los avatares deben de ser en formato \`image/png\`, \`image/jpg\`o \`image/jpeg\`; el avatar que intentaste configurar es formato \`${ contentType }\`.` )
				return
			}
		} else if ( setting === 'color' ) {
			if ( !value.match( /^[a-f0-9]{6}$/i ) ) {
				void interaction.editReply( 'El código hexadecimal es inválido.' )
				return
			}
			value = parseInt( value, 16 )
		}

		const [ count ] = await configurations.setProperty( interaction.guildId, interwiki, setting, value )
			.catch( () => [ 0 ] )
		if ( count === 0 ) {
			void interaction.editReply( {
				content: 'Ocurrió un error al intentar actualizar los ajustes.'
			} )
		} else {
			void interaction.editReply( {
				content: 'Ajuste realizado exitosamente.'
			} )
		}
	}
}
