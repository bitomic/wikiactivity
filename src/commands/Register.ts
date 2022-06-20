import { type ApplicationCommandRegistry, Command, type CommandOptions, RegisterBehavior } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import type { CommandInteraction } from 'discord.js'
import { env } from '../lib'

@ApplyOptions<CommandOptions>( {
	description: 'Test',
	name: 'registrar',
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
		const result = await configurations.addWiki( interaction.guildId, interwiki, interaction.channelId )
		if ( result ) {
			void interaction.editReply( {
				content: 'Se ha agregado el wiki exitosamente.'
			} )
		} else {
			void interaction.editReply( {
				content: 'Ha ocurrido un error al intentar registrar el wiki, es posible que ya estuviera registrado. Vuelve a intentarlo más tarde.'
			} )
		}
	}
}
