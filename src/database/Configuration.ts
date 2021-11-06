import { DataTypes } from 'sequelize'
import type { Model } from 'sequelize'
import { sequelize } from '../lib'

export interface IConfiguration {
	avatar?: string
	channel: string
	color?: number
	guild: string
	wiki: number
}

interface IConfigurationInterface extends Model<IConfiguration, IConfiguration>, Required<IConfiguration> {
}

export const Configuration = sequelize.define<IConfigurationInterface>( 'Configuration', {
	avatar: {
		allowNull: true,
		type: DataTypes.STRING
	},
	channel: DataTypes.STRING,
	color: {
		defaultValue: 0x00acc1,
		type: DataTypes.INTEGER
	},
	guild: {
		references: {
			key: 'snowflake',
			model: 'Guilds'
		},
		type: DataTypes.STRING
	},
	wiki: {
		references: {
			key: 'id',
			model: 'Wikis'
		},
		type: DataTypes.INTEGER
	}
} )
