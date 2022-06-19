import { magentaBright } from 'colorette'
import Pino from 'pino'
import pretty from 'pino-pretty'

const prettyStream = pretty( {
	colorize: true,
	customPrettifiers: {
		time: ( ts: string | object ) => magentaBright(
			typeof ts === 'string'
				? new Date( ts ).toISOString()
				: new Date().toISOString() )
	},
	ignore: 'pid,hostname',
	mkdir: true
} )

export const pino = Pino(
	{
		timestamp: Pino.stdTimeFunctions.isoTime
	},
	Pino.multistream( [
		{ stream: prettyStream },
		{ stream: Pino.destination( 'pino.log' ) }
	] )
)
