import { env } from './environment'
import { Sequelize } from 'sequelize'

export const sequelize = new Sequelize( env.PG_DATABASE, env.PG_USERNAME, env.PG_PASSWORD, {
	dialect: 'postgres',
	host: env.PG_HOST,
	logging: false,
	port: env.PG_PORT
} )
