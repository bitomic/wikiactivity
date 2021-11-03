import type { PieceContext, PieceOptions } from '@sapphire/pieces'
import { AliasPiece } from '@sapphire/pieces'
import type { Awaitable } from '@sapphire/framework'
import type { Client } from '../lib'
import cron from 'node-cron'
import type { ScheduledTask } from 'node-cron'

export abstract class Task extends AliasPiece {
	private cron: ScheduledTask | null = null
	private development: boolean
	private schedule: string

	protected constructor( context: PieceContext, options: TaskOptions ) {
		super( context, options )
		this.development = options.development ?? false
		this.schedule = options.schedule
		this.enabled = ( options.enabled ?? true ) && ( process.env.NODE_ENV !== 'development' || this.development )

		if ( !this.enabled ) return
		if ( !cron.validate( options.schedule ) ) throw new Error( `Invalid cron string: ${ options.schedule }` )

		this.cron = this.create()
		if ( options.fireOnStart ) void this.run()
	}

	protected create(): ScheduledTask | null {
		return cron.schedule(
			this.schedule,
			this.run.bind( this ) as () => void
		)
	}

	public abstract run(): Awaitable<void>

	public override onLoad(): unknown {
		if ( !this.cron ) this.cron = this.create()
		this.cron?.start()
		return super.onLoad()
	}

	public override onUnload(): void {
		if ( this.cron ) {
			this.cron.stop()
			this.cron = null
		}
	}
}

export interface TaskOptions extends PieceOptions {
	development?: boolean
	fireOnStart?: boolean
	schedule: string
}

export interface Task {
	get container(): {
		client: Client
	} & AliasPiece[ 'container' ]
}
