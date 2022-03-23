import type { ModelStatic, Model as SequelizeModel } from 'sequelize'
import type { PieceContext, PieceOptions } from '@sapphire/pieces'
import { DataTypes } from 'sequelize'
import { Model } from '../framework'

interface IConfiguration {
	avatar?: string
	channel: string
	color?: number
	guild: string
	wiki: number
}

interface IConfigurationInterface extends SequelizeModel<IConfiguration, IConfiguration>, IConfiguration {
}

export class ConfigurationModel extends Model<IConfigurationInterface> {
	public readonly model: ModelStatic<IConfigurationInterface>

	public constructor( context: PieceContext, options: PieceOptions ) {
		super( context, {
			...options,
			name: 'configurations'
		} )

		this.model = this.container.sequelize.define<IConfigurationInterface>(
			'Configuration',
			{
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
					type: DataTypes.STRING
				}
			},
			{
				tableName: 'Configurations',
				timestamps: false
			}
		)
	}
}

declare global {
	interface ModelRegistryEntries {
		configurations: ConfigurationModel
	}
}
