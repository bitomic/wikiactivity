import { load } from 'ts-dotenv'

export const env = load( {
	DISCORD_DEVELOPMENT_SERVER: {
		optional: true,
		type: String
	},
	DISCORD_OWNER: String,
	DISCORD_PREFIX: {
		optional: true,
		type: String
	},
	DISCORD_TOKEN: String,
	NODE_ENV: [
		'development' as const,
		'production' as const
	]
} )
