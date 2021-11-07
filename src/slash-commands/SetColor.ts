import { ApplyOptions } from '@sapphire/decorators'
import type { CommandInteraction } from 'discord.js'
import { Configuration } from '../database'
import { QueryTypes } from 'sequelize'
import { sequelize } from '../lib'
import { SlashCommand } from '../framework'
import type { SlashCommandOptions } from '../framework'

@ApplyOptions<SlashCommandOptions>( {
	description: 'Configure the embed\'s color for a wiki.',
	enabled: true,
	guildOnly: true,
	name: 'set-color',
	options: [
		{
			description: 'Interwiki of the wiki you want to modify.',
			name: 'interwiki',
			required: true,
			type: 'STRING'
		},
		{
			description: 'Hexadecimal code of the color (6 characters without #).',
			name: 'color',
			required: true,
			type: 'STRING'
		}
	]
} )
export class UserSlash extends SlashCommand {
	public async run( interaction: CommandInteraction<'present'> ): Promise<void> {
		const canManage = await this.canManage( interaction )
		if ( !canManage ) return
		const interwiki = interaction.options.getString( 'interwiki', true )
		const color = interaction.options.getString( 'color', true )
		if ( !color.match( /^[a-f0-9]{6}$/i ) ) {
			void interaction.reply( {
				content: 'The hex color is invalid.'
			} )
			return
		}

		await interaction.deferReply()
		const configurations = await sequelize.query<{ id: number }>( `SELECT c.wiki AS id FROM Configurations AS c INNER JOIN Wikis AS w ON c.wiki = w.id WHERE c.guild = '${ interaction.guildId }' AND w.interwiki = '${ interwiki }'`, {
			type: QueryTypes.SELECT
		} )

		const wikiId = configurations[ 0 ]?.id
		if ( !wikiId ) {
			void interaction.editReply( {
				content: `Couldn't complete the operation. Make sure \`${ interwiki }\` is configured in your server before trying to modify its color.`
			} )
			return
		}
		await Configuration.update(
			{ color: parseInt( color, 16 ) },
			{
				where: {
					guild: interaction.guildId,
					wiki: wikiId
				}
			}
		)

		void interaction.editReply( {
			content: 'Color updated successfully.'
		} )
	}
}
