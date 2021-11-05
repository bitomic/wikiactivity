export const sleep = ( ms: number ): Promise<never> => new Promise( r => { setTimeout( r, ms ) } )
