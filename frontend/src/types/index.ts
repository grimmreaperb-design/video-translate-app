export interface User {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  users: User[];
}

export interface SocketEvents {
  'join-room': (data: { roomId: string; user: User }) => void;
  'leave-room': () => void;
  'room-users': (users: User[]) => void;
  'user-joined': (user: User) => void;
  'user-left': (userId: string) => void;
  'offer': (data: { offer: RTCSessionDescriptionInit; from: string }) => void;
  'answer': (data: { answer: RTCSessionDescriptionInit; from: string }) => void;
  'ice-candidate': (data: { candidate: RTCIceCandidateInit; from: string }) => void;
}