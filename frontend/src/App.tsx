import React, { useState, useEffect } from 'react';
import './App.css';
import VideoRoom from './components/VideoRoom';

function App() {
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('roomId');
    
    if (roomFromUrl && roomFromUrl.trim()) {
      setCurrentRoom(roomFromUrl.trim());
    }
    
    setLoading(false);
  }, []);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleStartCall = (name: string) => {
    const finalRoomId = currentRoom || generateRoomId();
    setCurrentRoom(finalRoomId);
    setUserName(name);

    // Se criou a sala agora, atualiza a URL para compartilhamento
    if (!currentRoom) {
      const newUrl = `${window.location.origin}?roomId=${finalRoomId}`;
      window.history.replaceState({}, '', newUrl);
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setUserName('');
    window.history.replaceState({}, '', window.location.origin);
  };

  if (loading) {
    return <div className="App"><p>Carregando...</p></div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Video Call App</h1>
      </header>

      <main>
        {!currentRoom || (currentRoom && !userName) ? (
          <div className="join-form">
            <h2>{currentRoom ? `Entrar na Sala ${currentRoom}` : 'Iniciar Videochamada'}</h2>
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
              <button type="submit">{currentRoom ? 'Entrar na Sala' : 'Iniciar'}</button>
            </form>
          </div>
        ) : (
          <VideoRoom 
            key={currentRoom} // força re-render ao trocar de sala
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
