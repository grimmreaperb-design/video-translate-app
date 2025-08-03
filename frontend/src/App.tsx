import React, { useState, useEffect } from 'react';
import './App.css';
import VideoRoom from './components/VideoRoom';

function App() {
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isJoiningFromUrl, setIsJoiningFromUrl] = useState<boolean>(false);

  useEffect(() => {
    // Check if there's a roomId parameter in the URL
    console.log('🔍 [DEBUG] App.tsx useEffect executando...');
    console.log('🔍 [DEBUG] URL completa:', window.location.href);
    
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('roomId');
    
    console.log('🔍 [DEBUG] Parâmetros da URL:', urlParams.toString());
    console.log('🔍 [DEBUG] roomFromUrl extraído:', roomFromUrl);
    console.log('🔍 [DEBUG] Tipo do roomFromUrl:', typeof roomFromUrl);
    
    if (roomFromUrl && roomFromUrl.trim()) {
      const cleanRoomId = roomFromUrl.trim();
      console.log('✅ [DEBUG] Room ID válido encontrado:', cleanRoomId);
      console.log('✅ [DEBUG] Definindo currentRoom para:', cleanRoomId);
      console.log('✅ [DEBUG] Definindo isJoiningFromUrl para: true');
      
      setCurrentRoom(cleanRoomId);
      setIsJoiningFromUrl(true);
      
      console.log('✅ [DEBUG] Estados definidos - currentRoom:', cleanRoomId, 'isJoiningFromUrl: true');
    } else {
      console.log('❌ [DEBUG] Nenhum roomId válido encontrado na URL');
      console.log('❌ [DEBUG] roomFromUrl é:', roomFromUrl);
    }
  }, []);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleStartCall = (name: string) => {
    console.log('🚀 [DEBUG] handleStartCall executando...');
    console.log('🚀 [DEBUG] Parâmetros recebidos - name:', name);
    console.log('🚀 [DEBUG] Estado atual - isJoiningFromUrl:', isJoiningFromUrl);
    console.log('🚀 [DEBUG] Estado atual - currentRoom:', currentRoom);
    
    if (isJoiningFromUrl && currentRoom) {
      // Joining existing room from URL
      console.log('✅ [DEBUG] CENÁRIO: Entrando em sala existente da URL');
      console.log('✅ [DEBUG] Room ID que será usado:', currentRoom);
      setUserName(name);
      setIsJoiningFromUrl(false);
      console.log('✅ [DEBUG] Estados finais - userName:', name, 'currentRoom:', currentRoom);
    } else {
      // Creating new room
      console.log('❌ [DEBUG] CENÁRIO: Criando nova sala (PROBLEMA!)');
      console.log('❌ [DEBUG] Motivo - isJoiningFromUrl:', isJoiningFromUrl, 'currentRoom:', currentRoom);
      const roomId = generateRoomId();
      console.log('❌ [DEBUG] Novo Room ID gerado:', roomId);
      setCurrentRoom(roomId);
      setUserName(name);
      console.log('❌ [DEBUG] Estados finais - userName:', name, 'currentRoom:', roomId);
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
