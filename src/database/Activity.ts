import { DataTypes } from 'sequelize'
import type { Model } from 'sequelize'
import { sequelize } from '../lib'

export interface IActivity {
	oldRevid: number
	redirect: boolean
	revid: number
	sizediff: number
	summary: string
	timestamp: string
	title: string
	type: 'edit' | 'log' | 'new'
	user: string
	wiki: number
}

interface IActivityInterface extends Model<IActivity, IActivity>, Required<IActivity> {
}

export const Activity = sequelize.define<IActivityInterface>( 'Activity', {
	oldRevid: DataTypes.INTEGER,
	redirect: DataTypes.BOOLEAN,
	revid: DataTypes.INTEGER,
	sizediff: DataTypes.INTEGER,
	summary: DataTypes.STRING,
	timestamp: DataTypes.STRING,
	title: DataTypes.STRING,
	type: DataTypes.STRING,
	user: DataTypes.STRING,
	wiki: {
		references: {
			key: 'id',
			model: 'Wikis'
		},
		type: DataTypes.INTEGER
	}
} )
