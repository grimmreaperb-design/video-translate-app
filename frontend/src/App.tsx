import React, { useState, useEffect } from 'react';
import './App.css';
import VideoRoom from './components/VideoRoom';

function App() {
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isJoiningFromUrl, setIsJoiningFromUrl] = useState<boolean>(false);

  useEffect(() => {
    // Check if there's a roomId parameter in the URL
    console.error('🔍 [DEBUG] App.tsx useEffect executando...');
    console.error('🔍 [DEBUG] URL completa:', window.location.href);
    alert('DEBUG: App.tsx useEffect executando - URL: ' + window.location.href);
    
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('roomId');
    
    console.error('🔍 [DEBUG] Parâmetros da URL:', urlParams.toString());
    console.error('🔍 [DEBUG] roomFromUrl extraído:', roomFromUrl);
    console.error('🔍 [DEBUG] Tipo do roomFromUrl:', typeof roomFromUrl);
    alert('DEBUG: roomFromUrl = ' + roomFromUrl);
    
    if (roomFromUrl && roomFromUrl.trim()) {
      const cleanRoomId = roomFromUrl.trim();
      console.error('✅ [DEBUG] Room ID válido encontrado:', cleanRoomId);
      console.error('✅ [DEBUG] Definindo currentRoom para:', cleanRoomId);
      console.error('✅ [DEBUG] Definindo isJoiningFromUrl para: true');
      alert('DEBUG: Room ID encontrado: ' + cleanRoomId);
      
      setCurrentRoom(cleanRoomId);
      setIsJoiningFromUrl(true);
      
      console.error('✅ [DEBUG] Estados definidos - currentRoom:', cleanRoomId, 'isJoiningFromUrl: true');
    } else {
      console.error('❌ [DEBUG] Nenhum roomId válido encontrado na URL');
      console.error('❌ [DEBUG] roomFromUrl é:', roomFromUrl);
      alert('DEBUG: PROBLEMA - Nenhum roomId encontrado!');
    }
  }, []);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleStartCall = (name: string) => {
    console.error('🚀 [DEBUG] handleStartCall executando...');
    console.error('🚀 [DEBUG] Parâmetros recebidos - name:', name);
    console.error('🚀 [DEBUG] Estado atual - isJoiningFromUrl:', isJoiningFromUrl);
    console.error('🚀 [DEBUG] Estado atual - currentRoom:', currentRoom);
    alert('DEBUG handleStartCall: isJoiningFromUrl=' + isJoiningFromUrl + ', currentRoom=' + currentRoom);
    
    if (isJoiningFromUrl && currentRoom) {
      // Joining existing room from URL
      console.error('✅ [DEBUG] CENÁRIO: Entrando em sala existente da URL');
      console.error('✅ [DEBUG] Room ID que será usado:', currentRoom);
      alert('DEBUG: SUCESSO - Usando Room ID da URL: ' + currentRoom);
      setUserName(name);
      setIsJoiningFromUrl(false);
      console.error('✅ [DEBUG] Estados finais - userName:', name, 'currentRoom:', currentRoom);
    } else {
      // Creating new room
      console.error('❌ [DEBUG] CENÁRIO: Criando nova sala (PROBLEMA!)');
      console.error('❌ [DEBUG] Motivo - isJoiningFromUrl:', isJoiningFromUrl, 'currentRoom:', currentRoom);
      const roomId = generateRoomId();
      console.error('❌ [DEBUG] Novo Room ID gerado:', roomId);
      alert('DEBUG: PROBLEMA - Criando nova sala: ' + roomId + ' (isJoiningFromUrl=' + isJoiningFromUrl + ', currentRoom=' + currentRoom + ')');
      setCurrentRoom(roomId);
      setUserName(name);
      console.error('❌ [DEBUG] Estados finais - userName:', name, 'currentRoom:', roomId);
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setUserName('');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Video Call App</h1>
      </header>
      
      <main>
        {!currentRoom || (currentRoom && !userName) ? (
          <div className="join-form">
            <h2>{isJoiningFromUrl ? `Entrar na Sala ${currentRoom}` : 'Iniciar Videochamada'}</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const name = formData.get('name') as string;
              if (name.trim()) {
                handleStartCall(name.trim());
              }
            }}>
              <div>
                <label htmlFor="name">Seu Nome:</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  required 
                  placeholder="Digite seu nome"
                />
              </div>
              <button type="submit">{isJoiningFromUrl ? 'Entrar na Sala' : 'Iniciar'}</button>
            </form>
          </div>
        ) : (
          <VideoRoom 
            userName={userName}
            roomId={currentRoom}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
      </main>
    </div>
  );
}

export default App;
