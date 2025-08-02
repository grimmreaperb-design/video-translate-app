# Video Translate App

A real-time video translation application that allows users to communicate across different languages using speech-to-text, translation, and text-to-speech technologies.

## Features

- **Real-time Audio Translation**: Speak in your native language and have it translated to other users' preferred languages
- **Multi-language Support**: Supports multiple languages including English, Spanish, Portuguese, French, German, and more
- **Room-based Communication**: Create or join rooms for group conversations
- **WebRTC Integration**: Uses WebRTC for real-time audio/video streaming
- **Web Speech API**: Utiliza a API nativa do navegador para transcrição e síntese de voz
- **LibreTranslate**: Serviço gratuito de tradução para converter texto entre idiomas
- **Modern UI**: Beautiful, responsive interface built with React and TypeScript

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **Socket.IO** for real-time communication
- **PeerJS** para comunicação peer-to-peer
- **LibreTranslate** para tradução de texto
- **Supabase** para autenticação e banco de dados
- **Vercel Serverless Functions** para hospedagem do backend

### Frontend
- **React** with **TypeScript**
- **Socket.IO Client** for real-time communication
- **PeerJS** for WebRTC audio/video streaming
- **Web Speech API** para transcrição e síntese de voz
- **Modern CSS** with gradients and animations
- **Vercel** para hospedagem do frontend

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Conta no Vercel (para deploy)
- Conta no Supabase (para autenticação e banco de dados)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd VideoTranslateApp
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Set up environment variables:
```bash
# Na raiz do projeto, crie um arquivo .env para o backend
cd api
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Na pasta frontend, crie um arquivo .env.local
cd ../frontend
cp .env.example .env.local
# Edite o arquivo .env.local com suas configurações
```

## Deploy

Este projeto está configurado para deploy no Vercel. Você pode fazer o deploy de duas maneiras:

### Usando o script de deploy

```bash
# Na raiz do projeto
./deploy-vercel.sh
```

### Manualmente

```bash
# Instalar o Vercel CLI
npm install -g vercel

# Fazer login no Vercel
vercel login

# Deploy de produção
npm run deploy

# OU para deploy de desenvolvimento
npm run deploy:dev
```

Para mais informações sobre o deploy, consulte o arquivo [VERCEL-DEPLOY.md](VERCEL-DEPLOY.md).cp .env.example .env
```

Edit the `.env` file and add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Running the Application

### Development Mode
Run both backend and frontend simultaneously:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3001`
- Frontend development server on `http://localhost:3000`

### Individual Services

Run backend only:
```bash
npm run dev:backend
```

Run frontend only:
```bash
npm run dev:frontend
```

## Usage

1. **Onboarding**: When you first visit the app, you'll be guided through a setup process:
   - Enter your name
   - Select your preferred language

2. **Room Management**:
   - Create a new room or join an existing one
   - See other users in the room and their language preferences

3. **Real-time Translation**:
   - Click "Start Recording" to begin speaking
   - Your speech will be transcribed and translated for other users
   - Other users will hear the translated audio in their preferred language

## API Endpoints

### Rooms
- `GET /api/rooms` - Get all available rooms
- `POST /api/rooms` - Create a new room
- `GET /api/rooms/:roomId` - Get specific room details
- `POST /api/rooms/:roomId/join` - Join a room
- `POST /api/rooms/:roomId/leave` - Leave a room
- `DELETE /api/rooms/:roomId` - Delete a room

### Onboarding
- `GET /api/onboarding/languages` - Get available languages
- `POST /api/onboarding/users` - Create a new user
- `GET /api/onboarding/users/:userId` - Get user details
- `PUT /api/onboarding/users/:userId` - Update user
- `DELETE /api/onboarding/users/:userId` - Delete user

### Socket.IO Events
- `join-room` - Join a room
- `leave-room` - Leave a room
- `audio-chunk` - Send audio data for translation
- `translated-audio` - Receive translated audio
- `user-joined` - User joined the room
- `user-left` - User left the room

## Testing

Run the test suite:
```bash
npm test
```

## Building for Production

Build both backend and frontend:
```bash
npm run build
```

## Project Structure

```
VideoTranslateApp/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Main server file
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   └── types/            # TypeScript types
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── types/            # TypeScript types
│   │   ├── App.tsx           # Main app component
│   │   └── index.tsx         # Entry point
│   ├── package.json
│   └── tsconfig.json
└── package.json              # Root package.json
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the GitHub repository.