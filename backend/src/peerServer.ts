import { PeerServer } from 'peer';
import { logger } from './utils/logger';

// Configuração do servidor PeerJS
const peerServer: any = PeerServer({
  port: 9000,
  path: '/myapp',
  proxied: true,
});

peerServer.on('connection', (client: any) => {
  logger.info(`Cliente conectado ao PeerServer: ${client.getId()}`);
});

peerServer.on('disconnect', (client: any) => {
  logger.info(`Cliente desconectado do PeerServer: ${client.getId()}`);
});

export default peerServer;