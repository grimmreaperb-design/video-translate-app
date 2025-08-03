// Teste simples de conexão socket.io
import { io } from 'socket.io-client';

const testSocket = () => {
  console.log('🧪 Testando conexão socket.io...');
  
  const socket = io('http://localhost:3001', {
    transports: ['websocket', 'polling'],
    timeout: 10000,
    forceNew: true
  });

  socket.on('connect', () => {
    console.log('✅ Socket conectado com sucesso!', socket.id);
    
    // Teste de join-room
    socket.emit('join-room', {
      roomId: 'test-room',
      user: {
        id: 'test-user-123',
        name: 'Test User'
      }
    });
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Erro de conexão:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket desconectado:', reason);
  });

  socket.on('room-users', (users) => {
    console.log('👥 Usuários na sala:', users);
  });

  socket.on('user-joined', (user) => {
    console.log('👤 Usuário entrou:', user);
  });

  return socket;
};

// Exportar para uso no console do navegador
window.testSocket = testSocket;

export default testSocket;