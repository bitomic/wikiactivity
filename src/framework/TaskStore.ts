import { AliasStore } from '@sapphire/pieces'
import { Task } from './Task'

export class TaskStore extends AliasStore<Task> {
	public constructor() {
		// @ts-expect-error - Either expect-error or cast to any: https://github.com/sapphiredev/framework/blob/db6febd56afeaeff1f23afce2a269beecb316804/src/lib/structures/CommandStore.ts#L10
		super( Task, {
			name: 'tasks'
		} )
	}
}

declare module '@sapphire/pieces' {
	interface StoreRegistryEntries {
		'tasks': TaskStore
	}
}
