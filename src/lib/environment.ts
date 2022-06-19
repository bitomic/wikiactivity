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
	FANDOM_PASSWORD: String,
	FANDOM_USERNAME: String,
	NODE_ENV: [
		'development' as const,
		'production' as const
	],
	PG_DATABASE: String,
	PG_HOST: String,
	PG_PASSWORD: String,
	PG_PORT: {
			default: 5432,
			type: Number
	},
	PG_USERNAME: String,
	REDIS_DB: Number,
	REDIS_HOST: String,
	REDIS_PASSWORD: {
		optional: true,
		type: String
	},
	REDIS_PORT: Number,
	WIKIACTIVITY_HOST: String,
	WIKIACTIVITY_PORT: Number
} )