//import { AsyncQueue } from '@sapphire/async-queue'
import { MessageAttachment, MessageEmbed } from 'discord.js'
import { container } from '@sapphire/framework'
import { Fandom } from 'mw.js'
import type { FandomWiki } from 'mw.js'
import fetch from 'node-fetch'
import type { IActivity } from '../database'
import ico2png from 'ico-to-png'
import { sleep } from '../lib'
import type { Webhook } from 'discord.js'

export class WebhookManager {
	//private readonly queues = new Map<string, AsyncQueue>()
	private readonly favicons = new Map<string, Buffer>()
	private readonly webhooks = new Map<string, Webhook>()

	public async getFavicon( wiki: FandomWiki ): Promise<Buffer> {
		let favicon = this.favicons.get( wiki.interwiki )
		if ( !favicon ) {
			const req = await fetch( wiki.getURL( 'Special:Filepath/Site-favicon.ico' ) )
			if ( req.status !== 200 ) {
				const community = new Fandom().getWiki( 'community' )
				return this.getFavicon( community )
			}
			const res = await req.buffer()
			favicon = await ico2png( res, 32 )
			this.favicons.set( wiki.interwiki, favicon )
		}
		return favicon
	}

	/*
	public getQueue( channelId: string ): AsyncQueue {
		let queue = this.queues.get( channelId )

		if ( !queue ) {
			queue = new AsyncQueue()
			this.queues.set( channelId, queue )
		}
		return queue
	}
	*/

	public async getWebhook( { avatar, channelId, guildId, id }: { avatar: string, channelId: string, guildId: string, id: 1 | 2 } ): Promise<Webhook | null> {
		const webhookName = `Wiki Activity ${ id }`
		let webhook = this.webhooks.get( channelId ) ?? null

		if ( !webhook ) {
			const guild = await container.client.guilds.fetch( guildId )
				.catch( () => null )
			const channel = await guild?.channels.fetch( channelId )
				.catch( () => null )
			if ( !channel || channel.type !== 'GUILD_TEXT' ) return null
			const webhooks = await channel.fetchWebhooks()
				.catch( () => null )
			webhook = webhooks?.find( w => w.name === webhookName ) ?? await channel.createWebhook( webhookName, {
				avatar
			} ).catch( () => null )
			if ( !webhook ) return null
		}
		return webhook
	}

	public async send( { avatar, channelId, color, guildId, item, webhookId, wiki }: { avatar: string, channelId: string, color: number, guildId: string, item: IActivity, webhookId: 1 | 2, wiki: Required<FandomWiki> } ) {
		/*
		const queue = this.getQueue( channelId )
		await queue.wait()
		*/
		const webhook = await this.getWebhook( {
			avatar,
			channelId,
			guildId,
			id: webhookId
		} )
		if ( webhook ) {
			const emoji = item.type === 'new' ? '☑' : '📝'

			const userUrl = wiki.getURL( `User:${ item.user }` )
			const user = `[${ item.user }](<${ userUrl }>)`

			const action = item.type === 'new' ? 'created' : 'edited'

			const titleUrl = wiki.getURL( item.title )
			const title = `[${ item.title }](<${ titleUrl }>)`

			const diffSign = item.sizediff < 0 ? '-' : '+'
			const diffUrl = `${ wiki.getURL( '' ) }?diff=${ item.revid }`
			const diff = `[${ diffSign } ${ Math.abs( item.sizediff ) }](<${ diffUrl }>)`

			const description = `${ emoji } **${ user }** ${ action } **${ title }** (${ diff }).`
			const attachment = new MessageAttachment( await this.getFavicon( wiki ), 'favicon.png' )
			const embed = new MessageEmbed( {
				color,
				description,
				footer: {
					icon_url: 'attachment://favicon.png',
					text: `${ wiki.sitename } • ${ item.revid }`
				},
				timestamp: item.timestamp
			} )
			if ( item.summary.length > 0 ) {
				embed.addField( 'Summary', item.summary )
			}
			await webhook.send( {
				embeds: [ embed ],
				files: [ attachment ]
			} )
			await sleep( 2000 )
		}
		//queue.shift()
	}
}
