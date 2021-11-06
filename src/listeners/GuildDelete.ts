import { Configuration, Guild }  from '../database'
import { ApplyOptions } from '@sapphire/decorators'
import { GatewayDispatchEvents } from 'discord-api-types/v9'
import type { GatewayGuildDeleteDispatch } from 'discord-api-types/v9'
import { Listener } from '@sapphire/framework'
import type { ListenerOptions } from '@sapphire/framework'

@ApplyOptions<ListenerOptions>( {
	event: GatewayDispatchEvents.GuildDelete
} )
export class UserEvent extends Listener {
	public async run( guild: GatewayGuildDeleteDispatch[ 'd' ] ): Promise<void> {
		if ( guild.unavailable ) return
		await Configuration.destroy( {
			where: {
				guild: guild.id
			}
		} )
		await Guild.destroy( {
			where: {
				snowflake: guild.id
			}
		} )
	}
}
