import { io as Socket } from 'socket.io-client'
import { env } from './environment'

export const io = Socket( `http://${ env.WIKIACTIVITY_HOST }:${ env.WIKIACTIVITY_PORT }` )
