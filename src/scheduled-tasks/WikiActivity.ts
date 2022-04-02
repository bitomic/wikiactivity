import type { MessageEmbedOptions, Webhook } from 'discord.js'
import { MessageActionRow, MessageButton } from 'discord.js'
import { ApplyOptions } from '@sapphire/decorators'
import { deflateSync } from 'zlib'
import { Fandom } from 'mw.js'
import type { FandomWiki } from 'mw.js'
import type { PieceOptions } from '@sapphire/pieces'
import { request } from 'undici'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'
import { sleep } from '@bitomic/utilities'

interface DiscussionsArticleNamesResponse {
	articleNames?: {
		[ key: string ]: {
			title: string
		}
	}
}

interface DiscussionsJsonModel {
	content: Array<{
		content?: Array<{
			text?: string
		}>
	}>
}

interface DiscussionsResponse {
	_embedded: {
		'doc:posts': Array<{
			createdBy: {
				avatarUrl: string | null
				name: string | null
				badgePermission: string
			}
			creationDate: {
				epochSecond: number
			}
			creatorIp: string
			forumId: string
			forumName: string | null
			id: string
			isReply: boolean
			jsonModel: string
			modificationDate: unknown | null
			rawContent: string
			threadId: string
			title: string | null
			_embedded: {
				thread: Array<{
					containerType: string
				}>
			}
		}>
	}
}

interface RecentChangesItem {
	oldRevid: number
	redirect?: boolean
	revid: number
	sizediff: number
	summary: string
	timestamp: string
	title: string
	type: string
	user: string
}

const getEmbedTime = ( embed: MessageEmbedOptions ): number => {
	const t = embed.timestamp
	if ( !t ) return Date.now()
	else if ( typeof t === 'number' ) return t
	else return t.getTime()
}

@ApplyOptions<PieceOptions>( {
	name: 'wikiactivity'
} )
export class ManualTask extends ScheduledTask {
	public async run( payload: number ): Promise<void> {
		this.container.logger.debug( new Date(), 'Running task with the following payload:', new Date( payload * 1000 ) )

		const fandom = new Fandom()
		const configurations = this.container.stores.get( 'models' ).get( 'configurations' )
		const from = typeof payload === 'number' ? payload : Math.floor(  Date.now() / 1000  - 60 * 5 )
		const now = Math.floor( Date.now() / 1000 )

		for await ( const config of configurations.iter() ) {
			const wiki = await fandom.getWiki( config.wiki ).load()
				.catch( () => null )
			if ( !wiki ) {
				this.container.logger.warn( `Couldn't load wiki: ${ config.wiki }` )
				continue
			}
			const activity = await this.getActivity( wiki, from, now )
			if ( activity.length === 0 ) continue
			const webhooks = await this.getWebhooks( config.guild, config.channel )
			if ( !webhooks ) continue

			let switcher: 0 | 1 = 0
			for ( const embed of activity ) {
				const webhook = webhooks[ switcher ]
				if ( config.color ) embed.color = config.color

				await webhook.send( {
					avatarURL: config.avatar ?? '',
					components: this.getComponents( webhook, embed ),
					embeds: [ embed ],
					username: wiki.sitename
				} )
				await sleep( 1000 )
				switcher = Math.abs( switcher - 1 ) as 0 | 1
			}
		}

		this.container.tasks.create( 'wikiactivity', now, 1000 * 60 * 5 )
		this.container.logger.debug( new Date(), 'Scheduled next task at:', new Date( 1000 * ( now + 60 * 5 ) ) )
	}

	protected getComponents( webhook: Webhook, embed: MessageEmbedOptions ): MessageActionRow[] {
		if ( webhook.guildId !== '768261477345525781' ) return []
		if ( !embed.description || !embed.description.includes( 'editó' ) ) return []
		const [ , user, title ] = embed.description.match( /\[(.*?)\].*?\[(.*?)\]/ ) ?? []
		if ( !user || !title ) return []

		const encoded = deflateSync( `${ user }#${ title }` ).toString()
		const row = new MessageActionRow()
		const button = new MessageButton()
			.setCustomId( `r-${ encoded }` )
			.setLabel( 'Revertir' )
			.setStyle( 'DANGER' )
		row.addComponents( button )
		return [ row ]
	}

	protected async getActivity( wiki: Required<FandomWiki>, from: number, to: number ): Promise<MessageEmbedOptions[]> {
		const discussions = await this.getDiscussionsActivity( wiki, from, to )
		const recentchanges = await this.getRecentChanges( wiki, from, to )
		const activity = [ ...discussions, ...recentchanges ]
		return activity.sort( ( a, b ) => {
			const date1 = getEmbedTime( a )
			const date2 = getEmbedTime( b )
			return date1 - date2
		} )
	}

	protected async getDiscussionsActivity( wiki: Required<FandomWiki>, from: number, to: number ): Promise<MessageEmbedOptions[]> {
		const path = Fandom.interwiki2path( wiki.interwiki )
		const url = `${ path }/wikia.php?controller=DiscussionPost&method=getPosts&sortDirection=descending&sortKey=creation_date&limit=100&includeCounters=false`
		const { body, statusCode } = await request( url )
		if ( statusCode !== 200  ) return []

		const response = await body.json() as DiscussionsResponse
		const posts = response._embedded[ 'doc:posts' ].filter( post => {
			const created = post.creationDate.epochSecond
			return created > from && created < to
		} )

		const pagesByIds = await this.loadDiscussionsPagesByIds( posts, path )

		return posts.map( post => this.formatDiscussionsActivityItem( post, wiki, pagesByIds ) )
	}

	protected async getWebhooks( guildId: string, channelId: string ): Promise<[ Webhook, Webhook ] | null> {
		const guild = await this.container.client.guilds.fetch( guildId )
			.catch( () => null )
		if ( !guild ) {
			this.container.logger.warn( `Couldn't retrieve guild with snowflake ${ guildId }.` )
			return null
		}

		const channel = await guild.channels.fetch( channelId )
			.catch( () => null )
		if ( !channel ) {
			this.container.logger.warn( `Couldn't retrieve channel ${ channelId } from guild ${ guildId }.` )
			return null
		} else if ( !channel.isText() ) {
			this.container.logger.warn( `Tried to post activity on non-text channel ${ channelId } from guild ${ guildId }.` )
			return null
		}

		try {
			const webhooks = await channel.fetchWebhooks()
			const w1 = webhooks.find( i => i.owner?.id !== undefined && i.owner.id === this.container.client.user?.id && i.name === 'Wiki Activity 1' ) ?? await channel.createWebhook( 'Wiki Activity 1' )
			const w2 = webhooks.find( i => i.owner?.id !== undefined && i.owner.id === this.container.client.user?.id && i.name === 'Wiki Activity 2' ) ?? await channel.createWebhook( 'Wiki Activity 2' )

			return [ w1, w2 ]
		} catch {
			this.container.logger.warn( `Couldn't fetch nor create webhooks in guild ${ guildId }.` )
			return null
		}
	}

	protected async loadDiscussionsPagesByIds( posts: DiscussionsResponse[ '_embedded' ][ 'doc:posts' ], path: string ): Promise<Record<string, string>> {
		const pageids = new Set<string>()
		for ( const post of posts ) {
			if ( post._embedded.thread[ 0 ]?.containerType && post._embedded.thread[ 0 ].containerType === 'ARTICLE_COMMENT' ) {
				pageids.add( post.forumId )
			}
		}

		const ids = [ ...pageids ].join( ',' )
		const url = `${ path }/wikia.php?controller=FeedsAndPosts&method=getArticleNamesAndUsernames&stablePageIds=${ ids }&format=json`
		const { body } = await request( url )
		const response = await body.json() as DiscussionsArticleNamesResponse

		if ( !response.articleNames ) return {}
		return Object.entries( response.articleNames ).reduce( ( collection, [ key, value ] ) => {
			collection[ key ] = value.title
			return collection
		}, {} as Record<string, string> )
	}

	protected formatDiscussionsActivityItem( item: DiscussionsResponse[ '_embedded' ][ 'doc:posts' ][ 0 ], wiki: Required<FandomWiki>, pagesByIds: Record<string, string> ): MessageEmbedOptions {
		let description: string
		let { rawContent } = item

		const authorTarget = item.createdBy.name
			? `User:${ item.createdBy.name }`
			: `Special:Contributions${ item.creatorIp }`
		const author = `[${ item.createdBy.name ?? item.creatorIp.substring( 1 ) }](${ this.getUrl( wiki, authorTarget ) })`

		if ( item._embedded.thread[ 0 ]?.containerType && item._embedded.thread[ 0 ].containerType === 'ARTICLE_COMMENT' ) {
			if ( rawContent.length === 0 ) {
				try {
					const jsonModel = JSON.parse( item.jsonModel ) as DiscussionsJsonModel
					const text = jsonModel.content.find( i => i.content )?.content?.find( i => i.text )?.text
					if ( text && text.length > 0 ) {
						rawContent = text
					}
				} catch {
					this.container.logger.warn( 'Failed to parse a comment in an article.' )
				}
			}

			const pageTitle = pagesByIds[ item.forumId ]
			const pageUrl = pageTitle ? this.getUrl( wiki, pageTitle ) : null

			const commentUrl = item.isReply
				? `${ pageUrl ?? '' }?commentId=${ item.threadId }&replyId=${ item.id }`
				: `${ pageUrl ?? '' }?commentId=${ item.threadId }`
			const action = item.isReply
				? `dejó [una respuesta](${ commentUrl }) a un comentario`
				: `dejó [un comentario](${ commentUrl })`
			const page = pageTitle && pageUrl
				? `[${ pageTitle }](${ pageUrl })`
				: 'una página desconocida'
			description = `**${ author }** ${ action } en **${ page }**.`
		} else if ( item.forumName?.endsWith( 'Message Wall' ) ) {
			const wallOwner = item.forumName.substring( 0, item.forumName.length - ' Message Wall'.length )
			const wallUrl = this.getUrl( wiki, `Message Wall:${ wallOwner }` )
			const wallLink = `[muro de ${ wallOwner }](${ wallUrl })`

			const threadUrl = item.isReply
				? `${ wallUrl }?threadId=${ item.threadId }#${ item.id }`
				: `${ wallUrl }?threadId=${ item.threadId }`

			const action = item.isReply
				? `dejó [una respuesta](${ threadUrl }) a un mensaje`
				: `dejó [un mensaje](${ threadUrl })`

			const threadName = item.title
				? `: **${ item.title }**`
				: ''
			description = `**${ author }** ${ action } en el **${ wallLink }**${ threadName }.`
		} else {
			const threadUrl = this.getDiscussionsUrl( wiki, item.threadId, item.id )
			const action = item.isReply
				? `dejó [una respuesta](${ threadUrl }) a una publicación`
				: `creó [una nueva publicación](${ threadUrl })`

			const threadName = item.title
				? `: **${ item.title }**`
				: ''
			description = `**${ author }** ${ action } en la categoría ${ item.forumName ?? 'Desconocido' }${ threadName }`
		}

		const embed: MessageEmbedOptions = {
			description,
			footer: {
				icon_url: 'attachment://favicon.png',
				text: `${ wiki.sitename }`
			},
			timestamp: new Date( item.creationDate.epochSecond * 1000 )
		}

		if ( rawContent.length > 0 && rawContent.length < 1000 ) {
			embed.fields = [ { name: 'Contenido', value: rawContent } ]
		}

		return embed
	}

	protected async getRecentChanges( wiki: Required<FandomWiki>, from: number, to: number ): Promise<MessageEmbedOptions[]> {
		const recentchanges: MessageEmbedOptions[] = []

		const activity = wiki.iterQueryList( {
			list: 'recentchanges',
			// @ts-expect-error - blame the typings
			rcdir: 'newer',
			rcend: to,
			rclimit: 'max',
			rcprop: [
				'comment', 'ids', 'redirect', 'sizes', 'timestamp', 'title', 'user'
			],
			rcshow: '!bot',
			rcstart: from,
			rctype: [
				'categorize', 'edit', 'new'
			]
		} )
		for await ( const item of activity ) {
			const data: RecentChangesItem = {
				oldRevid: item.old_revid,
				revid: item.revid,
				sizediff: item.newlen - item.oldlen,
				summary: item.comment,
				timestamp: item.timestamp,
				title: item.title,
				type: item.type,
				user: item.user
			}
			recentchanges.push( this.formatRecentChangesItem( data, wiki ) )
		}

		return recentchanges
	}

	protected formatRecentChangesItem( item: RecentChangesItem, wiki: Required<FandomWiki> ): MessageEmbedOptions {
		const emoji = item.type === 'new' ? '☑' : '📝'

		const userTitle = item.user.match( /^\d+(\.\d+){3}/ )
			? `Special:Contributions/${ item.user }`
			: `User:${ item.user }`
		const user = `[${ item.user }](${ this.getUrl( wiki, userTitle ) })`

		const action = item.type === 'new' ? 'creó' : 'editó'

		const page = `[${ item.title }](${ this.getUrl( wiki, item.title ) })`

		const diffSign = item.sizediff < 0 ? '-' : '+'
		const diffUrl = `${ this.getUrl( wiki, '' ) }?diff=${ item.revid }`
		const diff = `[${ diffSign } ${ Math.abs( item.sizediff ) }](<${ diffUrl }>)`

		const description = `${ emoji } **${ user }** ${ action } **${ page }** (${ diff })`

		const embed: MessageEmbedOptions = {
			description,
			footer: {
				icon_url: 'attachment://favicon.png',
				text: `${ wiki.sitename } • ${ item.revid }`
			},
			timestamp: new Date( item.timestamp )
		}

		if ( item.summary.length > 0 ) {
			embed.fields = [ { name: 'Resumen', value: item.summary } ]
		}

		return embed
	}

	protected getUrl( wiki: Required<FandomWiki>, target: string ): string {
		const base = `${ wiki.server }${ wiki.articlepath }`
		return base.replace( '$1', encodeURI( target ) )
	}

	protected getDiscussionsUrl( wiki: Required<FandomWiki>, threadId: string, replyId?: string ): string {
		let url = `${ wiki.server }${ wiki.scriptpath }/f/p/${ threadId }`
		if ( replyId ) {
			url = `${ url }/r/${ replyId }`
		}
		return url
	}
}

declare module '@sapphire/framework' {
	interface ScheduledTasks {
		wikiactivity: never;
	}
}
