import type { ApplicationCommandRegistry, CommandOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import type { CommandInteraction } from 'discord.js'
import { Fandom } from 'mw.js'

@ApplyOptions<CommandOptions>( {
	description: 'Configura la actividad de un wiki para mostrarse en este servidor.',
	enabled: true,
	name: 'registrar'
} )
export class UserCommand extends Command {
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand( builder => builder
			.setName( this.name )
			.setDescription( this.description )
			.setDefaultPermission( false )
			.addStringOption( input => input
				.setName( 'interwiki' )
				.setDescription( 'Interwiki del wiki' )
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
		try {
			const exists = await Fandom.getWiki( interwiki ).exists()
			if ( !exists ) {
				throw new Error( 'Wiki doesn\'t exist' )
			}
		} catch {
			void interaction.editReply( `No he podido encontrar un wiki con el interwiki "${ interwiki }".` )
			return
		}

		const models = this.container.stores.get( 'models' )
		const configurations = models.get( 'configurations' )
		const guilds = models.get( 'guilds' )

		const items = await configurations.getGuildConfigurations( interaction.guildId )
		const guildLimit = await guilds.getLimit( interaction.guildId )

		if ( items.find( i => i.wiki === interwiki ) ) {
			void interaction.editReply( `El wiki "${ interwiki }" ya está configurado en este servidor.` )
			return
		}

		if ( items.length + 1 > guildLimit ) {
			void interaction.editReply( `Tu servidor sólo tiene permitido configurar ${ guildLimit } actividades.` )
			return
		}

		await configurations.model.create( {
			channel: interaction.channelId,
			guild: interaction.guildId,
			wiki: interwiki
		} )

		void interaction.editReply( `Se ha creado exitosamente una configuración para ${ interwiki }.` )
	}
}
