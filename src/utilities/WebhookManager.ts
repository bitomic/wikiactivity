import { AsyncQueue } from '@sapphire/async-queue'
import { container } from '@sapphire/framework'
import type { FandomWiki } from 'mw.js'
import { MessageEmbed } from 'discord.js'
import { sleep } from '../lib'
import type { Webhook } from 'discord.js'

export interface IWikiData {
	avatar: string
	channel: string
	guild: string
	color: number
	interwiki: string
	wikiname: string
}

export interface IRecentChangesItem {
	oldRevid: number
	redirect: boolean
	revid: number
	sizediff: number
	summary: string
	timestamp: string
	title: string
	type: 'edit' | 'log' | 'new'
	user: string
}

export class WebhookManager {
	private static readonly queues = new Map<string, AsyncQueue>()
	private static readonly webhooks = new Map<string, Webhook>()

	public static getQueue( channelId: string ): AsyncQueue {
		let queue = this.queues.get( channelId )

		if ( !queue ) {
			queue = new AsyncQueue()
			this.queues.set( channelId, queue )
		}
		return queue
	}

	public static async getWebhook( { avatar, channelId, guildId, id }: { avatar: string, channelId: string, guildId: string, id: 1 | 2 } ): Promise<Webhook | null> {
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

	public static async send( { avatar, channelId, color, guildId, item, webhookId, wiki }: { avatar: string, channelId: string, color: number, guildId: string, item: IRecentChangesItem, webhookId: 1 | 2, wiki: Required<FandomWiki> } ) {
		const queue = this.getQueue( channelId )
		await queue.wait()
		const webhook = await this.getWebhook( {
			avatar,
			channelId,
			guildId,
			id: webhookId
		} )
		if ( webhook ) {
			const embed = new MessageEmbed( {
				color,
				description: `**${ item.user }** edited **${ item.title }** (${ item.sizediff }).`,
				footer: {
					text: `${ wiki.sitename } • ${ item.revid }`
				},
				timestamp: item.timestamp
			} )
			await webhook.send( {
				embeds: [ embed ]
			} )
			await sleep( 2000 )
		}
		queue.shift()
	}
}
