import { DataTypes } from 'sequelize'
import type { Model } from 'sequelize'
import { sequelize } from '../lib'

interface IWiki {
	id: number
	interwiki: string
	name: string
}

interface IWikiInterface extends Model<IWiki, IWiki>, Required<IWiki> {
}

export const Wiki = sequelize.define<IWikiInterface>( 'Wiki', {
	id: {
		autoIncrement: false,
		primaryKey: true,
		type: DataTypes.INTEGER
	},
	interwiki: DataTypes.STRING,
	name: DataTypes.STRING
} )
