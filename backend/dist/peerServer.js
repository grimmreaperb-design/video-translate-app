"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const peer_1 = require("peer");
const logger_1 = require("./utils/logger");
// Configuração do servidor PeerJS
const peerServer = (0, peer_1.PeerServer)({
    port: 9000,
    path: '/myapp',
    proxied: true,
});
peerServer.on('connection', (client) => {
    logger_1.logger.info(`Cliente conectado ao PeerServer: ${client.getId()}`);
});
peerServer.on('disconnect', (client) => {
    logger_1.logger.info(`Cliente desconectado do PeerServer: ${client.getId()}`);
});
exports.default = peerServer;
//# sourceMappingURL=peerServer.js.map