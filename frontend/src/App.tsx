import React, { useState, useEffect } from 'react';
import './App.css';
import VideoRoom from './components/VideoRoom';

function App() {
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isJoiningFromUrl, setIsJoiningFromUrl] = useState<boolean>(false);

  useEffect(() => {
    // Check if there's a roomId parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('roomId');
    console.log('🔍 Checking URL for roomId:', roomFromUrl);
    if (roomFromUrl) {
      console.log('✅ Found roomId in URL, joining room:', roomFromUrl);
      setCurrentRoom(roomFromUrl);
      setIsJoiningFromUrl(true);
      // CORREÇÃO: NÃO remover o roomId da URL para permitir compartilhamento
      // window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleStartCall = (name: string) => {
    if (isJoiningFromUrl && currentRoom) {
      // Joining existing room from URL
      setUserName(name);
      setIsJoiningFromUrl(false);
    } else {
      // Creating new room
      const roomId = generateRoomId();
      setCurrentRoom(roomId);
      setUserName(name);
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
