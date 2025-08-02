"use strict";
// Utilitário de logging para o aplicativo
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logger = {
    info: (message) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
    },
    error: (message, error) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
        if (error) {
            console.error(error);
        }
    },
    warn: (message) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
    },
    debug: (message) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`);
        }
    }
};
//# sourceMappingURL=logger.js.map