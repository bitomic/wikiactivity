import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import type { CommandInteraction } from 'discord.js'
import type { CommandOptions } from '@sapphire/framework'
import { Fandom } from 'mw.js'

@ApplyOptions<CommandOptions>( {
	chatInputApplicationOptions: {
		options: [
			{
				description: 'Interwiki del wiki',
				name: 'interwiki',
				required: true,
				type: 'STRING'
			}
		]
	},
	description: 'Configura la actividad de un wiki para mostrarse en este servidor.',
	enabled: true,
	name: 'registrar'
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

	public override messageRun(): void { // eslint-disable-line @typescript-eslint/no-empty-function
	}
}
