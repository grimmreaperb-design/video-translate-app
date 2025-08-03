import React, { useState, useEffect } from 'react';
import { SOCKET_URL } from '../config';

interface HealthStatus {
  frontend: 'ok' | 'error';
  backend: 'ok' | 'error' | 'checking';
  socket: 'ok' | 'error' | 'checking';
  timestamp: string;
}

const HealthCheck: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus>({
    frontend: 'ok',
    backend: 'checking',
    socket: 'checking',
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    const checkHealth = async () => {
      const timestamp = new Date().toISOString();
      
      // Check backend health
      try {
        // Use production backend URL
        const backendUrl = 'https://video-translate-backend-wv9b.onrender.com';
        const response = await fetch(`${backendUrl}/api/health`, {
          method: 'GET',
          timeout: 5000
        } as RequestInit);
        
        const backendStatus = response.ok ? 'ok' : 'error';
        
        setHealth(prev => ({
          ...prev,
          backend: backendStatus,
          timestamp
        }));
      } catch (error) {
        setHealth(prev => ({
          ...prev,
          backend: 'error',
          timestamp
        }));
      }

      // Check socket connectivity (simplified)
      try {
        // Simple check - if we can resolve the URL, consider it OK
        // In a real scenario, you might want to test actual socket connection
        if (SOCKET_URL) {
          setHealth(prev => ({
            ...prev,
            socket: 'ok',
            timestamp
          }));
        }
      } catch (error) {
        setHealth(prev => ({
          ...prev,
          socket: 'error',
          timestamp
        }));
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return '#4CAF50';
      case 'error': return '#F44336';
      case 'checking': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return '✅';
      case 'error': return '❌';
      case 'checking': return '🔄';
      default: return '❓';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 1000,
      minWidth: '200px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        🏥 Health Status
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
        <span style={{ marginRight: '8px' }}>
          {getStatusIcon(health.frontend)}
        </span>
        <span style={{ color: getStatusColor(health.frontend) }}>
          Frontend: {health.frontend.toUpperCase()}
        </span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
        <span style={{ marginRight: '8px' }}>
          {getStatusIcon(health.backend)}
        </span>
        <span style={{ color: getStatusColor(health.backend) }}>
          Backend: {health.backend.toUpperCase()}
        </span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
        <span style={{ marginRight: '8px' }}>
          {getStatusIcon(health.socket)}
        </span>
        <span style={{ color: getStatusColor(health.socket) }}>
          Socket: {health.socket.toUpperCase()}
        </span>
      </div>
      
      <div style={{ 
        fontSize: '10px', 
        color: '#ccc', 
        marginTop: '5px',
        borderTop: '1px solid #444',
        paddingTop: '3px'
      }}>
        Last check: {new Date(health.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default HealthCheck;