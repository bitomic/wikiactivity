import { DataTypes } from 'sequelize'
import type { Model } from 'sequelize'
import { sequelize } from '../lib'

interface IGuild {
	language: string
	snowflake: string
}

interface IGuildInterface extends Model<IGuild, IGuild>, IGuild {
}

export const Guild = sequelize.define<IGuildInterface>( 'Guild', {
	language: {
		type: DataTypes.STRING
	},
	snowflake: {
		primaryKey: true,
		type: DataTypes.STRING
	}
} )
