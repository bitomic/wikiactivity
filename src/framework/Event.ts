import { Piece, type PieceOptions } from '@sapphire/pieces'
import type { Socket } from 'socket.io-client'

export abstract class Event extends Piece<EventOptions> {
	public abstract run( socket: Socket, ...args: unknown[] ): void | Promise<void>
}

export interface EventOptions extends PieceOptions {
	event: string
}
