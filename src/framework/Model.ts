import type { ModelStatic, Model as SequelizeModel } from 'sequelize/types'
import { AliasPiece } from '@sapphire/pieces'

export abstract class Model<T extends SequelizeModel> extends AliasPiece {
	public abstract readonly model: ModelStatic<T>

	public override async onLoad(): Promise<void> {
		await this.model.sync()
	}
}
