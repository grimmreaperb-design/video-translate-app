// Configuração de URLs do backend com fallback
// A Vercel não suporta WebSocket, então usamos serviços alternativos para produção
const BACKEND_URLS = {
  // URLs de produção (em ordem de prioridade)
  production: [
    'https://video-translate-app.onrender.com', // Render (suporta WebSocket)
  ],
  // URL de desenvolvimento
  development: 'http://localhost:3001'
};

// URLs conhecidas que devem ser evitadas (incorretas)
const INVALID_URLS = [
  'https://video-translate-app.vercel.app', // Vercel não suporta WebSocket adequadamente
];

// Função para obter a URL do socket baseada no ambiente
export const getSocketUrl = (): string => {
  // Se há uma URL específica nas variáveis de ambiente, use ela (mas valide primeiro)
  if (process.env.REACT_APP_SOCKET_URL) {
    const envUrl = process.env.REACT_APP_SOCKET_URL;
    
    // Verificar se não é uma URL inválida conhecida
    if (INVALID_URLS.includes(envUrl)) {
      console.warn(`⚠️ URL inválida detectada: ${envUrl}. Usando fallback.`);
      return BACKEND_URLS.production[0];
    }
    
    return envUrl;
  }
  
  // Se estamos em desenvolvimento, use localhost
  if (process.env.NODE_ENV === 'development') {
    return BACKEND_URLS.development;
  }
  
  // Em produção, use a primeira URL disponível (Render)
  return BACKEND_URLS.production[0];
};

export const SOCKET_URL = getSocketUrl();

// URLs de fallback para reconexão
export const FALLBACK_URLS = process.env.NODE_ENV === 'production' 
  ? BACKEND_URLS.production.slice(1) // Remove a primeira URL (já usada)
  : [];

// Configuração de transporte baseada na URL
export const getSocketTransports = (url: string): string[] => {
  // Se a URL contém 'vercel.app', use apenas polling (Vercel não suporta WebSocket)
  if (url.includes('vercel.app')) {
    console.warn('⚠️ Vercel detectado: usando apenas polling (WebSocket não suportado)');
    return ['polling'];
  }
  
  // Para outros serviços, tente WebSocket primeiro com fallback para polling
  return ['websocket', 'polling'];
};