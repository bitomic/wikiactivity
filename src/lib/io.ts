import { env } from './environment'
import { io as Socket } from 'socket.io-client'

export const io = Socket( `http://${ env.WIKIACTIVITY_HOST }:${ env.WIKIACTIVITY_PORT }` )
