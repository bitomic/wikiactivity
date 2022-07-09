import { env } from './environment'
import { Sequelize } from 'sequelize'

export const sequelize = new Sequelize( env.MYSQL_DATABASE, env.MYSQL_USERNAME, env.MYSQL_PASSWORD, {
	dialect: 'mysql',
	host: env.MYSQL_HOST,
	logging: false,
	port: env.MYSQL_PORT
} )
