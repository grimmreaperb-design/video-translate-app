/**
 * Sistema de Logger Inteligente
 * - Em produção: logs desabilitados
 * - Em desenvolvimento: logs completos
 * - Remove alerts e elementos DOM de debug em produção
 */

export const debugMode = process.env.NODE_ENV !== 'production';

// Logger seguro para produção
export const logger = {
  log: (...args: any[]) => {
    if (debugMode) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (debugMode) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (debugMode) {
      console.error(...args);
    } else {
      // Em produção, apenas log silencioso (pode integrar com Sentry futuramente)
      console.error(...args);
    }
  },
  
  // Para logs críticos que devem aparecer mesmo em produção
  critical: (...args: any[]) => {
    console.error('[CRITICAL]', ...args);
  },
  
  // Substitui alerts problemáticos
  alert: (message: string) => {
    if (debugMode) {
      alert(`[DEBUG] ${message}`);
    } else {
      // Em produção, apenas log
      console.warn('[ALERT]', message);
    }
  }
};

// Handler de erros global seguro
export const setupGlobalErrorHandler = () => {
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    const errorMsg = `[UNCAUGHT] ${msg} at ${url}:${lineNo}:${columnNo}`;
    
    if (debugMode) {
      logger.alert(`Erro capturado: ${msg}`);
      logger.error(errorMsg, error);
    } else {
      // Em produção: apenas log silencioso
      logger.critical(errorMsg, error);
    }
    
    return false; // Não impede o comportamento padrão
  };

  window.onunhandledrejection = function (event) {
    const errorMsg = `[UNCAUGHT PROMISE] ${event.reason}`;
    
    if (debugMode) {
      logger.alert(`Promise rejeitada: ${event.reason}`);
      logger.error(errorMsg);
    } else {
      // Em produção: apenas log silencioso
      logger.critical(errorMsg);
    }
  };
};

// Debug visual apenas em desenvolvimento
export const createDebugPanel = () => {
  if (!debugMode) return null;
  
  const logDiv = document.getElementById('debug-logs') || (() => {
    const div = document.createElement('div');
    div.id = 'debug-logs';
    div.style.cssText = `
      position: fixed; 
      top: 10px; 
      right: 10px; 
      background: rgba(0,0,0,0.8); 
      color: white; 
      padding: 10px; 
      font-family: monospace; 
      font-size: 12px; 
      max-height: 300px; 
      overflow-y: auto; 
      z-index: 9999;
      border-radius: 5px;
      max-width: 400px;
      display: none;
    `;
    
    // Toggle com F12
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
        div.style.display = div.style.display === 'none' ? 'block' : 'none';
      }
    });
    
    document.body.appendChild(div);
    return div;
  })();
  
  return logDiv;
};

// Log visual apenas em desenvolvimento
export const visualLog = (message: string) => {
  if (!debugMode) return;
  
  const logDiv = createDebugPanel();
  if (!logDiv) return;
  
  const timestamp = new Date().toLocaleTimeString();
  logDiv.innerHTML += `<div>[${timestamp}] ${message}</div>`;
  logDiv.scrollTop = logDiv.scrollHeight;
};