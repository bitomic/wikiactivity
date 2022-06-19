import type { ModelStatic, Model as SequelizeModel } from 'sequelize'
import type { PieceContext, PieceOptions } from '@sapphire/pieces'
import { DataTypes } from 'sequelize'
import { Model } from '../framework'

interface IGuild {
	limit?: number
	snowflake: string
}

interface IGuildInterface extends SequelizeModel<IGuild, IGuild>, IGuild {
}

export class GuildModel extends Model<IGuildInterface> {
	public readonly model: ModelStatic<IGuildInterface>

	public constructor( context: PieceContext, options: PieceOptions ) {
		super( context, {
			...options,
			name: 'guilds'
		} )

		this.model = this.container.sequelize.define<IGuildInterface>(
			'Guild',
			{
				limit: {
					defaultValue: 1,
					type: DataTypes.INTEGER
				},
				snowflake: {
					primaryKey: true,
					type: DataTypes.STRING
				}
			},
			{
				tableName: 'Guilds',
				timestamps: false
			}
		)
	}

	public async setLimit( snowflake: string, limit: number ): Promise<void> {
		await this.model.upsert(
			{ limit, snowflake },
		)
	}

	public async getLimit( snowflake: string ): Promise<number> {
		const result = await this.model.findOne( { where: { snowflake } } )
		return result?.getDataValue( 'limit' ) ?? 1
	}
}

declare global {
	interface ModelRegistryEntries {
		guilds: GuildModel
	}
}
