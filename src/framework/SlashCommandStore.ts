import { AliasStore } from '@sapphire/pieces'
import { SlashCommand } from './SlashCommand'

export class SlashCommandStore extends AliasStore<SlashCommand> {
	public constructor() {
		// @ts-expect-error - Either expect-error or cast to any: https://github.com/sapphiredev/framework/blob/db6febd56afeaeff1f23afce2a269beecb316804/src/lib/structures/CommandStore.ts#L10
		super( SlashCommand, {
			name: 'slash-commands'
		} )
	}
}

declare module '@sapphire/pieces' {
	interface StoreRegistryEntries {
		'slash-commands': SlashCommandStore
	}
}
