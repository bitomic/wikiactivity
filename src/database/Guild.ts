import { DataTypes } from 'sequelize'
import type { Model } from 'sequelize'
import { sequelize } from '../lib'

interface IGuild {
	language?: string
	limit?: number
	snowflake: string
}

interface IGuildInterface extends Model<IGuild, IGuild>, Required<IGuild> {
}

export const Guild = sequelize.define<IGuildInterface>( 'Guild', {
	language: {
		defaultValue: 'en-US',
		type: DataTypes.STRING
	},
	limit: {
		defaultValue: 1,
		type: DataTypes.STRING
	},
	snowflake: {
		primaryKey: true,
		type: DataTypes.STRING
	}
} )
