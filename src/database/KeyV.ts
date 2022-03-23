import { DataTypes } from 'sequelize'
import type { Model } from 'sequelize'
import { sequelize } from '../lib'

interface IKeyV {
	key: string
	value: string
}

interface IKeyVInterface extends Model<IKeyV, IKeyV>, IKeyV {
}

export const KeyV = sequelize.define<IKeyVInterface>( 'KeyV', {
	key: {
		primaryKey: true,
		type: DataTypes.STRING
	},
	value: {
		type: DataTypes.STRING
	}
} )
