export class MissingEnvError extends Error {
	public constructor( name: string ) {
		super( `Missing environment variable: ${ name }` )
	}
}
