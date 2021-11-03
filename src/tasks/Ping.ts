import { ApplyOptions } from '@sapphire/decorators'
import { Task } from '../framework'
import type { TaskOptions } from '../framework'

@ApplyOptions<TaskOptions>( {
	enabled: false,
	fireOnStart: true,
	schedule: '0 */1 * * *'
} )
export class UserTask extends Task {
	public run(): void {
		this.container.logger.info( 'Pong!' )
	}
}
