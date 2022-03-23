import type { ModelStatic, Model as SequelizeModel } from 'sequelize'
import type { PieceContext, PieceOptions } from '@sapphire/pieces'
import { DataTypes } from 'sequelize'
import { Model } from '../framework'

interface IKeyV {
	guild: string
	key: string
	value: string
}

interface IKeyVInterface extends SequelizeModel<IKeyV, IKeyV>, IKeyV {
}

export class KeyVModel extends Model<IKeyVInterface> {
	public readonly model: ModelStatic<IKeyVInterface>

	public constructor( context: PieceContext, options: PieceOptions ) {
		super( context, {
			...options,
			name: 'keyv'
		} )

		this.model = this.container.sequelize.define<IKeyVInterface>(
			'KeyV',
			{
				guild: {
					primaryKey: true,
					type: DataTypes.STRING
				},
				key: {
					primaryKey: true,
					type: DataTypes.STRING
				},
				value: {
					type: DataTypes.STRING
				}
			},
			{
				tableName: 'KeyV',
				timestamps: false
			}
		)
	}

	public async set( guild: string, key: string, value: string ): Promise<void> {
		await this.model.upsert(
			{ guild, key, value },
		)
	}

	public async get( guild: string, key: string ): Promise<string | null> {
		const result = await this.model.findOne( { where: { guild, key } } )
		return result?.getDataValue( 'value' ) ?? null
	}
}

declare global {
	interface ModelRegistryEntries {
		keyv: KeyVModel
	}
}
