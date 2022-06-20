import { Piece, type PieceOptions } from '@sapphire/pieces'

export abstract class Event extends Piece<EventOptions> {
	public abstract run( ...args: unknown[] ): void | Promise<void>
}

export interface EventOptions extends PieceOptions {
	event: string
}
