import path from 'path'
import { Sequelize } from 'sequelize'

const filepath = path.resolve( __dirname, '../../databases/discord.sqlite' )

export const sequelize = new Sequelize( {
	dialect: 'sqlite',
	logging: false,
	storage: filepath
} )
