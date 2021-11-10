import { ApplyOptions } from '@sapphire/decorators'
import type { CommandInteraction } from 'discord.js'
import { Configuration } from '../database'
import fetch from 'node-fetch'
import { QueryTypes } from 'sequelize'
import { sequelize } from '../lib'
import { SlashCommand } from '../framework'
import type { SlashCommandOptions } from '../framework'
import { WebhookManager } from '../utilities'

@ApplyOptions<SlashCommandOptions>( {
	description: 'Configure the embed\'s avatar for a wiki.',
	enabled: true,
	guildOnly: false,
	name: 'set-avatar',
	options: [
		{
			description: 'Interwiki of the wiki you want to modify.',
			name: 'interwiki',
			required: true,
			type: 'STRING'
		},
		{
			description: 'Avatar URL.',
			name: 'avatar',
			required: true,
			type: 'STRING'
		}
	]
} )
export class UserSlash extends SlashCommand {
	public async run( interaction: CommandInteraction<'present'> ): Promise<void> {
		const canManage = await this.canManage( interaction )
		if ( !canManage ) return
		await interaction.deferReply()

		const interwiki = interaction.options.getString( 'interwiki', true )
		const avatar = interaction.options.getString( 'avatar', true )

		const req = await fetch( avatar )
			.catch( () => null )
		const contentType = req?.headers.get( 'content-type' ) ?? 'undefined'
		if ( !contentType || ![
			'image/png', 'image/jpg', 'image/jpeg'
		].includes( contentType ) ) {
			await interaction.editReply( {
				content: `An avatar must be either \`image/png\`, \`image/jpg\` or \`image/jpeg\`; the url you provided is \`${ contentType }\`.`
			} )
			return
		}

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
			{ avatar },
			{
				where: {
					guild: interaction.guildId,
					wiki: wikiId
				}
			}
		)

		void interaction.editReply( {
			content: 'Avatar updated successfully. You should see soon a test message for you to make sure the avatar displays correctly.'
		} )

		if ( !interaction.channelId || !interaction.guildId ) return
		const manager = new WebhookManager()
		const webhook = await manager.getWebhook( {
			avatar,
			channelId: interaction.channelId,
			guildId: interaction.guildId,
			id: 1
		} )
		await webhook?.send( {
			avatarURL: avatar,
			content: 'This is a test message.'
		} )
	}
}
