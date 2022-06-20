import { Event, type EventOptions } from '../framework'
import { ApplyOptions } from '@sapphire/decorators'
import { Fandom } from 'mw.js'
import type { MessageEmbedOptions } from 'discord.js'

interface IDiscussionsItem {
	author: {
		avatar: string
		badge: string
		name: string
	}
	content: string
	created: number
	id: string
	isReply: boolean
	pageTitle?: string
	threadId: string
	title?: string
	url: string
	wiki: string
}

interface IRecentChangesItem {
	oldRevid: number
	revid: number
	sizediff: number
	summary: string
	timestamp: number
	title: string
	type: string
	user: string
	wiki: string
}

@ApplyOptions<EventOptions>( {
	event: 'activity',
	name: 'activity'
} )
export class ActivityEvent extends Event {
	public queue: Array<IDiscussionsItem | IRecentChangesItem> = []

	public run( item: IDiscussionsItem | IRecentChangesItem ) {
		this.queue.push( item )
	}

	public async process(): Promise<void> {
		const items = this.queue
		this.queue = []

		const configurations = this.container.stores.get( 'models' ).get( 'configurations' )
		const perWiki: Record<string, Array<IDiscussionsItem | IRecentChangesItem>> = {}
		items.reduce( ( list, item ) => {
			const { wiki } = item
			const arr = list[ wiki ] ?? []
			arr.push( item )
			if ( !list[ wiki ] ) list[ wiki ] = arr
			return list
		}, perWiki )

		const { client } = this.container
		const fandom = new Fandom()
		for ( const [ wiki, items ] of Object.entries( perWiki ) ) {
			const fandomwiki = await fandom.getWiki( wiki ).load()
				.catch( () => null )
			const exists = await fandomwiki?.exists()
			if ( !exists ) {
				this.container.pino.warn( `Couldn't access wiki ${ wiki }.` )
				continue
			}
			const guilds = await configurations.getWikiGuilds( wiki )
			for ( const configuration of guilds ) {
				const guild = await client.guilds.fetch( configuration.guild )
					.catch( () => null )
				if ( !guild ) {
					this.container.pino.warn( `Couldn't fetch guild ${ configuration.guild }.` )
					continue
				}
				const channel = await guild.channels.fetch( configuration.channel )
					.catch( () => null )
				if ( !channel || channel.type !== 'GUILD_TEXT' ) {
					this.container.pino.warn( `Couldn't fetch channel ${ configuration.channel } from guild ${ configuration.guild }.` )
					continue
				}
				const guildWebhooks = await channel.fetchWebhooks()
				const webhook = guildWebhooks.find( w => w.owner?.id === client.id ) ?? await channel.createWebhook( 'Wiki Activity' )

				for ( const item of items ) {
					const embed = this.createEmbed( item )
					await webhook.send( {
						avatarURL: configuration.avatar ?? '',
						embeds: [
							{
								...embed,
								footer: {
									text: fandomwiki?.sitename ?? 'Wiki desconocido'
								}
							}
						],
						username: configuration.name ?? 'Wiki Activity'
					} )
				}
			}
		}
	}

	protected createEmbed( item: IDiscussionsItem | IRecentChangesItem ): MessageEmbedOptions {
		return 'type' in item
			? this.createRecentChangesEmbed( item )
			: this.createDiscussionsEmbed( item )
	}

	protected createDiscussionsEmbed( item: IDiscussionsItem ): MessageEmbedOptions {
		let description: string
		const { content } = item
		const authorTarget = item.author.name.match( /^\d+(\.\d+){3}/ )
			? `Special:Contributions/${ item.author.name }`
			: `User:${ item.author.name }`
		const author = this.getDiscordLink( item.author.name, this.getUrl( item.wiki, authorTarget ) )

		if ( item.pageTitle ) {
			const pageUrl = this.getUrl( item.wiki, item.pageTitle )
			const page = this.getDiscordLink( item.pageTitle, pageUrl )
			const actionLabel = item.isReply ? 'una respuesta' : 'un comentario'
			const actionLink = this.getDiscordLink( actionLabel, item.url )
			const action = `dejó ${ actionLink }${ item.isReply ? ' a un comentario' : '' }`
			description = `**${ author }** ${ action } en ${ page }`
		} else if ( item.url.includes( '/wiki/' ) ) {
			const actionLabel = item.isReply ? 'una respuesta' : 'un mensaje'
			const actionLink = this.getDiscordLink( actionLabel, item.url )
			const action = `dejó ${ actionLink } ${ item.isReply ? 'a un mensaje' : '' }`
			const threadName = item.title
				? `: **${ item.title }**`
				: ''
			description = `**${ author }** ${ action } en un muro${ threadName }`
		} else {
			const action = item.isReply
				? `dejó ${ this.getDiscordLink( 'una respuesta', item.url ) } a una publicación`
				: `creó ${ this.getDiscordLink( 'una publicación', item.url ) }`
			const threadName = item.title
				? `: **${ item.title }**`
				: ''
			description = `**${ author }** ${ action }${ threadName }`
		}

		const embed: MessageEmbedOptions = {
			description,
			timestamp: new Date( item.created )
		}

		if ( content.length > 0 && content.length < 1000 ) {
			embed.fields = [
				{ name: 'Contenido', value: content }
			]
		}

		return embed
	}

	protected createRecentChangesEmbed( item: IRecentChangesItem ): MessageEmbedOptions {
		const emoji = item.type === 'new' ? '☑' : '📝'
		const userTitle = item.user.match( /^\d+(\.\d+){3}/ )
			? `Special:Contributions/${ item.user }`
			: `User:${ item.user }`
		const user = this.getDiscordLink( item.user, this.getUrl( item.wiki, userTitle ) )
		const action = item.type === 'new' ? 'creó' : 'editó'
		const page = this.getDiscordLink( item.title, this.getUrl( item.wiki, item.title ) )
		const diffSign = item.sizediff < 0 ? '-' : '+'
		const diffUrl = `${ this.getUrl( item.wiki, '' ) }?diff=${ item.revid }`
		const diff = this.getDiscordLink( `${ diffSign } ${ Math.abs( item.sizediff ) }`, diffUrl )
		const description = `${ emoji } **${ user }** ${ action } **${ page }** (${ diff })`
		const embed: MessageEmbedOptions = {
			description,
			timestamp: new Date( item.timestamp )
		}
		if ( item.summary.length > 0 ) {
			embed.fields = [
				{ name: 'Resumen', value: item.summary }
			]
		}

		return embed
	}

	protected getDiscordLink( text: string, link: string ): string {
		return `[${ text }](<${ link }>)`
	}

	protected getUrl( interwiki: string, target: string ): string {
		return `${ this.parseInterwiki( interwiki ) }${ encodeURI( target ) }`
	}

	protected parseInterwiki( interwiki: string ): string {
		const match = interwiki.match( /^([a-z-]{2,5})\.([a-z-]+)$/ ) ?? interwiki.match( /^([a-z-]+)$/ )
		if ( !match ) return 'https://community.fandom.com/wiki/'
		const [ , first, second ] = match
		if ( !first ) return 'https://community.fandom.com/wiki/'
		return second
			? `https://${ second }.fandom.com/${ first }/wiki/`
			: `https://${ first }.fandom.com/wiki/`
	}
}

declare global {
	interface EventRegistryEntries {
		activity: ActivityEvent
	}
}
