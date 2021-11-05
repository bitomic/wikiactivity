import { Guild, Wiki } from '../database'
import { ApplyOptions } from '@sapphire/decorators'
import type { CommandInteraction } from 'discord.js'
import { Fandom } from 'mw.js'
import { SlashCommand } from '../framework'
import type { SlashCommandOptions } from '../framework'

@ApplyOptions<SlashCommandOptions>( {
	description: 'Setup a wiki for its activity to be shown in a channel.',
	enabled: true,
	guildOnly: true,
	name: 'register',
	options: [
		{
			description: 'Interwiki (not the full url, but its short form).',
			name: 'interwiki',
			required: true,
			type: 'STRING'
		}
	]
} )
export class UserSlash extends SlashCommand {
	public async run( interaction: CommandInteraction ): Promise<void> {
		await interaction.deferReply()
		const canManage = await this.canManage( interaction )
		if ( !canManage ) return

		const interwiki = interaction.options.getString( 'interwiki', true )

		const fandom = new Fandom()
		const wiki = fandom.getWiki( interwiki )
		const exists = await wiki.exists()
		if ( !exists ) {
			void interaction.editReply( {
				content: `I couldn't find a wiki for \`${ interwiki }\`.`
			} )
			return
		}

		const guild = await Guild.findByPk( interaction.guildId ) ?? await Guild.create( {
			snowflake: interaction.guildId
		} )
		const guildWikis = await Wiki.findAll( {
			where: {
				guild: guild.snowflake
			}
		} )
		if ( guildWikis.length >= guild.limit ) {
			void interaction.editReply( {
				content: `Sorry, but your server isn't allowed to have more than ${ guild.limit } wikis registered.`
			} )
			return
		}

		const interwikis = guildWikis.map( i => i.interwiki )
		if ( interwikis.includes( interwiki ) ) {
			void interaction.editReply( {
				content: `It seems like you already have configured \`${ interwiki }\`'s activity to be shown in this server.`
			} )
			return
		}

		await Wiki.create( {
			channel: interaction.channelId,
			guild: interaction.guildId,
			interwiki
		} )
		void interaction.editReply( {
			content: `I have successfully registered \`${ interwiki }\` and its activity will show up on <#${ interaction.channelId }>!`
		} )
	}
}
