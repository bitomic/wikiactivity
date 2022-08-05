import { type ActivityItem, createActivityItem } from '@bitomic/wikiactivity-api'
import type { DiscussionsItem, DiscussionsPostResponse, LogEventsItem, LogEventsResponse, RecentChangesItem, RecentChangesResponse } from '@bitomic/wikiactivity-api'
import { Event, type EventOptions } from '../framework'
import { ApplyOptions } from '@sapphire/decorators'
import { Fandom } from 'mw.js'
import type { FandomWiki } from 'mw.js'
import { isIPv4 } from 'net'
import type { MessageEmbedOptions } from 'discord.js'

@ApplyOptions<EventOptions>( {
	event: 'activity',
	name: 'activity'
} )
export class ActivityEvent extends Event {
	public queue: ActivityItem[] = []

	public run( item: DiscussionsPostResponse | LogEventsResponse | RecentChangesResponse ) {
		this.queue.push( createActivityItem( item ) )
	}

	public async process(): Promise<void> {
		const items = this.queue
		this.queue = []

		const configurations = this.container.stores.get( 'models' ).get( 'configurations' )
		const perWiki: Record<string, ActivityItem[]> = {}
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
			if ( !fandomwiki || !exists ) {
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
					const embed = this.createEmbed( item, fandomwiki )
					await webhook.send( {
						avatarURL: configuration.avatar ?? '',
						embeds: [
							{
								...embed,
								color: configuration.color ?? 0x0088ff,
								footer: {
									text: fandomwiki.sitename
								}
							}
						],
						username: configuration.name ?? 'Wiki Activity'
					} )
				}
			}
		}
	}

	protected createEmbed( item: ActivityItem, wiki: Required<FandomWiki> ): MessageEmbedOptions | null {
		if ( item.isRecentChanges() ) {
			return this.createRecentChangesEmbed( item )
		} else if ( item.isDiscussions() ) {
			return this.createDiscussionsEmbed( item, wiki )
		} else if ( item.isLogEvents() ) {
			return this.createLogEventsEmbed( item )
		}
		return null
	}

	protected createDiscussionsEmbed( item: DiscussionsItem, wiki: Required<FandomWiki> ): MessageEmbedOptions {
		const embed: MessageEmbedOptions = {}

		const userUrl = this.getUrl( item.wiki, item.creatorIp.length > 0 ? `Special:Contributions/${ item.creatorIp }` : `User:${ item.createdBy.name }` )
		const user = this.getDiscordLink( item.creatorIp.length > 0 ? item.creatorIp : item.createdBy.name, userUrl )

		if ( item.isArticleComment() ) {
			const title = item._embedded.thread[ 0 ].containerId
			const article = this.getDiscordLink( title, this.getUrl( item.wiki, title ) )
			if ( item.isReply ) {
				const comment = this.getDiscordLink( 'una respuesta', item.getUrl( wiki ) )
				embed.description = `💬 **${ user }** dejó ${ comment } a un comentario en ${ article }.`
			} else {
				const comment = this.getDiscordLink( 'un comentario', item.getUrl( wiki ) )
				embed.description = `💬 **${ user }** dejó ${ comment } en ${ article }.`
			}
		} else if ( item.isMessageWall() ) {
			const wall = this.getUrl( item.wiki, `Message Wall:${ item.wall }` )
			const wallUrl = this.getDiscordLink( `muro de ${ item.wall }`, wall )
			if ( item.isReply ) {
				const reply = this.getDiscordLink( 'una respuesta', item.getUrl( wiki ) )
				embed.description = `✉️ **${ user }** dejó ${ reply } a un mensaje en el ${ wallUrl }.`
			} else {
				const reply = this.getDiscordLink( 'un mensaje nuevo', item.getUrl( wiki ) )
				embed.description = `✉️ **${ user }** dejó ${ reply } el ${ wallUrl }.`
			}
		} else if ( item.isPost() ) {
			if ( item.isReply ) {
				const reply = this.getDiscordLink( 'una respuesta', item.getUrl( wiki ) )
				embed.description = `💭 **${ user }** dejó ${ reply } a una publicación.`
			} else {
				const reply = this.getDiscordLink( item.title, item.getUrl( wiki ) )
				embed.description = `💭 **${ user }** creó una nueva publicación en ${ item.category }: ${ reply }`
			}
		}

		if ( item.rawContent.length > 0 ) {
			const content = item.rawContent.length > 1024 ? `${ item.rawContent.substring( 0, 1020 ) }...` : item.rawContent
			embed.fields = [ { name: 'Contenido', value: content } ]
		}

		embed.timestamp = item.creationDate.epochSecond * 1000

		return embed
	}

	protected createLogEventsEmbed( item: LogEventsItem ): MessageEmbedOptions {
		const embed: MessageEmbedOptions = {}

		const isIp = isIPv4( item.user )
		const userUrl = this.getUrl( item.wiki, isIp ? `Special:Contributions/${ item.user }` : `User:${ item.user }` )
		const user = this.getDiscordLink( item.user, userUrl )

		if ( item.isBlock() ) {
			let action = 'bloqueó a'
			if ( item.isReblocking() ) action = 'cambió el bloqueo de'
			else if ( item.isUnblocking() ) action = 'desbloqueó a'

			const targetUser = item.title.split( ':' ).slice( 1 )
				.join( ':' )
			const targetUrl = this.getUrl( item.wiki, `Special:Contributions/${ targetUser }` )
			const target = this.getDiscordLink( targetUser, targetUrl )

			embed.description = `🚫 **${ user }** ${ action } ${ target }.`
			if ( item.comment.length > 0 ) {
				embed.fields = [ { name: 'Motivo', value: item.comment } ]
			}
			if ( item.isBlocking() || item.isReblocking() ) {
				const expiry = item.expiryDate

				const fields = embed.fields ?? []
				const duration = expiry
					? `<t:${ Math.floor( expiry.getTime() / 1000 ) }:R>\n${ expiry.toISOString() }`
					: 'Para siempre'
				fields.push( { name: 'Duración', value: duration } )

				embed.fields ??= fields
			}
		} else if ( item.isDelete() ) {
			let action = 'borró'
			if ( item.isRestoring() ) action = 'restauró'

			const articleUrl = this.getUrl( item.wiki, item.title )
			const article = this.getDiscordLink( item.title, articleUrl )

			embed.description = `🗑️ **${ user }** ${ action } **${ article }**.`

			if ( item.comment.length > 0 ) {
				embed.fields = [ { name: 'Motivo', value: item.comment } ]
			}
		} else if ( item.isMove() ) {
			const fromUrl = this.getUrl( item.wiki, item.title )
			const from = this.getDiscordLink( item.title, fromUrl )
			const toUrl = this.getUrl( item.wiki, item.params.target_title )
			const to = this.getDiscordLink( item.params.target_title, toUrl )

			const redirect = item.params.supressredirect ? ' sin dejar una redirección' : ''
			embed.description = `📦 **${ user }** trasladó ${ from } a ${ to }${ redirect }.`
		} else if ( item.isProtect() ) {
			let action = 'protegió'
			const articleUrl = this.getUrl( item.wiki, item.title )
			const article = this.getDiscordLink( item.title, articleUrl )

			if ( item.isModifying() ) action = 'modificó la protección de'
			else if ( item.isUnprotecting() ) action = 'desprotegió'

			const description = item.isProtecting() || item.isModifying() ? `(${ item.params.description })` : ''
			embed.description = `🛡️ **${ user }** ${ action } ${ article }. ${ description }`

			if ( item.comment.length > 0 ) {
				embed.fields = [ { name: 'Motivo', value: item.comment } ]
			}
		} else if ( item.isRights() ) {
			const targetUser = item.title.split( ':' ).slice( 1 )
				.join( ':' )
			const targetUrl = this.getUrl( item.wiki, `User:${ targetUser }` )
			const target = this.getDiscordLink( targetUser, targetUrl )

			embed.description = `🏅 **${ user }** cambió los grupos a los que pertenece **${ target }**.`
			embed.fields = []
			if ( item.comment.length > 0 ) {
				embed.fields.push( { name: 'Motivo', value: item.comment } )
			}

			const oldgroups = new Set( item.params.oldgroups )
			const newgroups = new Set( item.params.newgroups )

			embed.fields.push( {
				inline: true,
				name: 'Grupos anteriores',
				value: item.params.oldmetadata.length === 0
					? 'Ninguno'
					: item.params.oldmetadata.map( item => {
						let response = newgroups.has( item.group ) ? item.group : `~~${ item.group }~~`
						if ( item.expiry !== 'infinity' ) {
							const ms = Math.floor( new Date( item.expiry ).getTime() / 1000 )
							response += ` (hasta <t:${ ms }:R>)`
						}
						return response
					} ).join( '\n' )
			} )
			embed.fields.push( {
				inline: true,
				name: 'Grupos actuales',
				value: item.params.newmetadata.length === 0
					? 'Ninguno'
					: item.params.newmetadata.map( item => {
						let response = oldgroups.has( item.group ) ? item.group : `**${ item.group }**`
						if ( item.expiry !== 'infinity' ) {
							const ms = Math.floor( new Date( item.expiry ).getTime() / 1000 )
							response += ` (hasta <t:${ ms }:R>)`
						}
						return response
					} ).join( '\n' )
			} )
		} else if ( item.isUpload() ) {
			let action = 'subió'
			if ( item.isOverwriting() ) action = 'subió una nueva versión de'
			else if ( item.isReverting() ) action = 'revirtió'

			const imageUrl = this.getUrl( item.wiki, item.title )
			const image = this.getDiscordLink( item.title, imageUrl )
			embed.description = `📷 **${ user }** ${ action } ${ image }.`
			if ( item.comment.length > 0 ) {
				embed.fields = [ { name: 'Comentarios', value: item.comment } ]
			}
		}

		embed.timestamp = item.date

		return embed
	}

	protected createRecentChangesEmbed( item: RecentChangesItem ): MessageEmbedOptions {
		const embed: MessageEmbedOptions = {}

		const userUrl = this.getUrl( item.wiki, item.anon ? `Special:Contributions/${ item.user }` : `User:${ item.user }` )
		const user = this.getDiscordLink( item.user, userUrl )

		const pageUrl = this.getUrl( item.wiki, item.title )
		const page = this.getDiscordLink( item.title, pageUrl )

		const sizediff = item.sizediff < 0 ? `- ${ Math.abs( item.sizediff ) }` : `+ ${ item.sizediff }`
		const diffUrl = `${ this.parseInterwiki( item.wiki ) }?diff=${ item.revid }`
		const diff = this.getDiscordLink( sizediff, diffUrl )

		const emoji = item.type === 'edit' ? '📝' : '☑'
		const action = item.type === 'edit' ? 'editó' : 'creó'
		embed.description = `${ emoji } **${ user }** ${ action } **${ page }**. (${ diff })`

		if ( item.comment ) {
			embed.fields = [ { name: 'Resumen', value: item.comment } ]
		}

		embed.timestamp = item.date

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
