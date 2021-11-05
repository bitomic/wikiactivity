import { DataTypes } from 'sequelize'
import type { Model } from 'sequelize'
import { sequelize } from '../lib'

interface IWiki {
	channel: string
	color?: number
	guild: string
	interwiki: string
}

interface IWikiInterface extends Model<IWiki, IWiki>, Required<IWiki> {
}

export const Wiki = sequelize.define<IWikiInterface>( 'Wiki', {
	channel: {
		type: DataTypes.STRING
	},
	color: {
		defaultValue: 0x00acc1,
		type: DataTypes.INTEGER
	},
	guild: {
		primaryKey: true,
		references: {
			key: 'snowflake',
			model: 'Guilds'
		},
		type: DataTypes.STRING
	},
	interwiki: {
		primaryKey: true,
		type: DataTypes.STRING
	}
} )
