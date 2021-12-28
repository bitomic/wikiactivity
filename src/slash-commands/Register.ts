import { Configuration, Guild, Wiki } from '../database'
import { ApplyOptions } from '@sapphire/decorators'
import type { CommandInteraction } from 'discord.js'
import { Fandom } from 'mw.js'
import { QueryTypes } from 'sequelize'
import { sequelize } from '../lib'
import { SlashCommand } from '../framework'
import type { SlashCommandOptions } from '../framework'

@ApplyOptions<SlashCommandOptions>( {
	description: 'Setup a wiki for its activity to be shown in a channel.',
	enabled: true,
	guildOnly: false,
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
	public async run( interaction: CommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply()
		const canManage = await this.canManage( interaction )
		if ( !canManage ) return

		const interwiki = interaction.options.getString( 'interwiki', true )

		const guild = await Guild.findByPk( interaction.guildId ) ?? await Guild.create( {
			snowflake: interaction.guildId
		} )
		const interwikis = ( await sequelize.query<{ interwiki: string }>( `SELECT interwiki FROM Configurations AS c INNER JOIN Wikis AS w ON c.wiki = w.id WHERE c.guild = '${ interaction.guildId }'`, {
			type: QueryTypes.SELECT
		} ) ).map( i => i.interwiki )
		if ( interwikis.length >= guild.limit ) {
			void interaction.editReply( {
				content: `Sorry, but your server isn't allowed to have more than ${ guild.limit } wikis registered.`
			} )
			return
		}

		if ( interwikis.includes( interwiki ) ) {
			void interaction.editReply( {
				content: `It seems like you already have configured \`${ interwiki }\`'s activity to be shown in this server.`
			} )
			return
		}

		let storedWiki = await Wiki.findOne( {
			where: {
				interwiki
			}
		} )
		if ( !storedWiki ) {
			const fandom = new Fandom()
			const wiki = await fandom.getWiki( interwiki ).load()
				.catch( () => null )
			const exists = await wiki?.exists()
			if ( !wiki || !exists ) {
				void interaction.editReply( {
					content: `I couldn't find a wiki for \`${ interwiki }\`.`
				} )
				return
			}
			storedWiki = await Wiki.create( {
				id: wiki.id,
				interwiki,
				name: wiki.sitename
			} )
		}

		await Configuration.create( {
			channel: interaction.channelId,
			guild: interaction.guildId,
			wiki: storedWiki.id
		} )

		void interaction.editReply( {
			content: `I have successfully registered \`${ interwiki }\` and its activity will show up on <#${ interaction.channelId }>!`
		} )
	}
}
