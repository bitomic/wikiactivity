import 'dotenv/config'
import { MissingEnvError } from '../errors'

const environmentVariables = [
	'DISCORD_DEVELOPMENT_SERVER',
	'DISCORD_OWNER',
	'DISCORD_PREFIX',
	'DISCORD_TOKEN',
	'NODE_ENV'
] as const
type Env = typeof environmentVariables[ number ]

export const env = {} as Record<Env, string>
for ( const key of environmentVariables ) {
	const value = process.env[ key ]
	if ( !value ) throw new MissingEnvError( key )
	env[ key ] = value
}
