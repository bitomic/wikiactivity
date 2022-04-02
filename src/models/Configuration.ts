import type { ModelStatic, Model as SequelizeModel } from 'sequelize'
import type { PieceContext, PieceOptions } from '@sapphire/pieces'
import { DataTypes } from 'sequelize'
import { Model } from '../framework'

interface IConfiguration {
	avatar?: string
	channel: string
	color?: number
	guild: string
	wiki: string
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

	public async countGuildConfigurations( guild: string ): Promise<number> {
		const items = await this.getGuildConfigurations( guild )
		return items.length
	}

	public getGuildConfigurations( guild: string ): Promise<IConfiguration[]> {
		return this.model.findAll( { where: { guild } } )
	}

	public async *iter(): AsyncGenerator<IConfiguration, void, unknown> {
		const items = await this.model.findAll()
		for ( const item of items ) {
			yield item.toJSON()
		}
	}
}

declare global {
	interface ModelRegistryEntries {
		configurations: ConfigurationModel
	}
}
