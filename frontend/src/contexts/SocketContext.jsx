import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  const getSocket = () => {
    if (!socketRef.current) {
      const socketUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/';
      socketRef.current = io(socketUrl, { autoConnect: false, withCredentials: true });
      socketRef.current.on('connect', () => setConnected(true));
      socketRef.current.on('disconnect', () => setConnected(false));
    }
    return socketRef.current;
  };

  useEffect(() => () => { socketRef.current?.disconnect(); }, []);

  return (
    <SocketContext.Provider value={{ getSocket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocketContext = () => useContext(SocketContext);
