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

	public async addWiki( guild: string, interwiki: string, channel: string ): Promise<boolean> {
		const guilds = this.container.stores.get( 'models' ).get( 'guilds' )
		const guildLimit = await guilds.getLimit( guild )
		const currentCount = await this.countGuildConfigurations( guild )
		if ( currentCount >= guildLimit ) return false
		const alreadyExists = ( await this.getGuildConfigurations( guild ) )
			.find( i => i.wiki === interwiki )
		if ( alreadyExists ) return false
		await this.model.create( {
			channel,
			guild,
			wiki: interwiki
		} )
		this.container.io.send( 'join', [ interwiki ] )
		return true
	}

	public async countGuildConfigurations( guild: string ): Promise<number> {
		const items = await this.getGuildConfigurations( guild )
		return items.length
	}

	public getGuildConfigurations( guild: string ): Promise<IConfiguration[]> {
		return this.model.findAll( { where: { guild } } )
	}

	public getWikiGuild( wiki: string ): Promise<IConfiguration[]> {
		return this.model.findAll( { where: { wiki } } )
	}

	public getWikis(): Promise<Set<string>> {
		return this.model.findAll( {
			attributes: [ 'wiki' ],
			group: [ 'wiki' ]
		} )
			.then( res => res.map( i => i.wiki ) )
			.then( wikis => new Set( wikis ) )
	}
}

declare global {
	interface ModelRegistryEntries {
		configurations: ConfigurationModel
	}
}
