import { Activity, KeyV, Wiki } from '../database'
import type { IActivity, IConfiguration, IWiki } from '../database'
import { ApplyOptions } from '@sapphire/decorators'
import { Fandom } from 'mw.js'
import type { FandomWiki } from 'mw.js'
import { QueryTypes } from 'sequelize'
import { sequelize } from '../lib'
import { Task } from '../framework'
import type { TaskOptions } from '../framework'
import { WebhookManager } from '../utilities'

interface IGuildWikiActivity extends Omit<IActivity, 'wiki'>, Omit<IConfiguration, 'wiki'>, Omit<IWiki, 'id'> {
	color: number
}

@ApplyOptions<TaskOptions>( {
	enabled: true,
	fireOnStart: true,
	name: 'wikiactivity',
	schedule: '*/5 * * * *'
} )
export class UserTask extends Task {
	public static readonly FIVE_MINUTES = 1000 * 60 * 5
	public async run(): Promise<void> {
		const lastCheck = await UserTask.getLastCheck()
		const interwikis = await UserTask.getWikis()
		const fandom = new Fandom()
		const wikis = new Map<string, Required<FandomWiki>>()

		for ( const { id, interwiki } of interwikis ) {
			const wiki = await fandom.getWiki( interwiki ).load()
			wikis.set( interwiki, wiki )
			// eslint-disable-next-line no-extra-parens
			const activity = ( await UserTask.getWikiActivity( wiki, lastCheck ) as IActivity[] )
				.map( i => {
					i.wiki = id
					return i
				} )
			if ( activity.length === 0 ) continue
			await Activity.bulkCreate( activity )
		}

		const webhookManager = new WebhookManager()
		for await ( const item of UserTask.paginateActivities() ) {
			const wiki = wikis.get( item.interwiki ) ?? await fandom.getWiki( item.interwiki ).load()
			await webhookManager.send( {
				avatar: item.avatar ?? this.container.client.user?.avatarURL( { format: 'png' } ) ?? '',
				channelId: item.channel,
				color: item.color,
				guildId: item.guild,
				item: {
					oldRevid: item.oldRevid,
					redirect: item.redirect,
					revid: item.revid,
					sizediff: item.sizediff,
					summary: item.summary,
					timestamp: item.timestamp,
					title: item.title,
					type: item.type,
					user: item.user,
					wiki: wiki.id
				},
				webhookId: 1,
				wiki
			} )
		}
	}

	public static async getWikis(): Promise<Array<{ id: number, interwiki: string }>> {
		const query = await Wiki.findAll()

		return query.map( i => ( { id: i.id, interwiki: i.interwiki } ) )
	}

	public static async getLastCheck(): Promise<Date> {
		const lastCheck = ( await KeyV.findByPk( 'last-activity-check' ) )?.value ?? Date.now() - UserTask.FIVE_MINUTES
		await KeyV.upsert( {
			key: 'last-activity-check',
			value: new Date().toISOString()
		} )
		return new Date( lastCheck )
	}

	public static async getWikiActivity( wiki: FandomWiki, date: Date ): Promise<Array<Omit<IActivity, 'wiki'>>> {
		const recentchanges = await wiki.query( {
			// @ts-expect-error - ts is drunk
			list: 'recentchanges',
			rcend: date.toISOString(),
			rclimit: 'max',
			rcprop: [
				'comment', 'ids', 'redirect', 'sizes', 'timestamp', 'title', 'user'
			],
			rcshow: '!bot',
			rctype: [
				'categorize', 'edit', 'new'
			]
		} )
		// eslint-disable-next-line
		return recentchanges.map( ( item: any ) => ( {
			oldRevid: item.old_revid, // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			redirect: item.redirect, // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			revid: item.revid, // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			sizediff: item.newlen - item.oldlen, // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			summary: item.comment ?? '', // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			timestamp: item.timestamp, // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			title: item.title, // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			type: item.type, // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			user: item.user // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
		} ) )
	}

	public static async* paginateActivities(): AsyncGenerator<IGuildWikiActivity, void, unknown> {
		const getQuery = ( limit: number, offset: number ): Promise<IGuildWikiActivity[]> => {
			const sql = `SELECT c.avatar, c.channel, c.color, c.guild, w.interwiki, w.name, a.oldRevid, a.redirect, a.revid, a.sizediff, a.summary, a.timestamp, a.title, a.type, a.user FROM Configurations AS c INNER JOIN Wikis AS w ON w.id = c.wiki INNER JOIN Activities AS a ON a.wiki = w.id ORDER BY timestamp LIMIT ${ limit } OFFSET ${ offset }`
			return sequelize.query<IGuildWikiActivity>( sql, {
				type: QueryTypes.SELECT
			} )
		}
		let offset = 0
		let query = await getQuery( 100, offset )
		while ( query.length > 0 ) {
			for ( const item of query ) {
				yield item
			}
			offset += 100
			query = await getQuery( 100, offset )
		}
		await Activity.sync( { force: true } )
	}
}
