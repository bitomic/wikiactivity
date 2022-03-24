import { ApplyOptions } from '@sapphire/decorators'
import { Listener } from '@sapphire/framework'
import type { ListenerOptions } from '@sapphire/framework'
import type { ScheduledTaskRedisStrategy } from '@sapphire/plugin-scheduled-tasks/register-redis'

@ApplyOptions<ListenerOptions>( {
	event: 'ready',
	once: true
} )
export class UserEvent extends Listener {
	public async run(): Promise<void> {
		this.container.logger.info( 'Ready!' )

		await this.container.sequelize.sync()

		// eslint-disable-next-line no-extra-parens
		const jobs = await ( this.container.tasks.list( {
			types: [ 'active', 'delayed', 'waiting' ]
		} ) as ReturnType<ScheduledTaskRedisStrategy[ 'list' ]> )

		let isTaskScheduled = false
		for ( const job of jobs ?? [] ) {
			if ( job.data.task === 'wikiactivity' ) {
				const payload = job.data.payload as number
				this.container.logger.debug( `Found an already scheduled job, so it isn't necessary to create a first task. The next attempt should run at ${ new Date( job.timestamp ).toISOString() } with payload "${ new Date( payload * 1000 ).toISOString() }"` )
				isTaskScheduled = true
				break
			}
		}

		if ( !isTaskScheduled ) {
			const date = Math.floor( Date.now() / 1000 ) - 60 * 5
			this.container.logger.debug( `Didn't find an already scheduled job, so we will create a new one with payload "${ new Date( date * 1000 ).toISOString() }"` )
			this.container.tasks.create( 'wikiactivity', date )
		}
	}
}
