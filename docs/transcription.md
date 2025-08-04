# Documentação da Funcionalidade de Transcrição

## Visão Geral

A funcionalidade de transcrição permite capturar e transcrever áudio dos usuários em tempo real durante as chamadas de vídeo. O sistema utiliza Whisper.cpp para processamento local de áudio e Supabase para armazenamento das transcrições.

## Arquitetura

### Frontend
- **MediaRecorder API**: Captura áudio em chunks de 5 segundos
- **Socket.IO**: Envia chunks de áudio para o backend
- **Eventos**: Recebe resultados de transcrição e erros

### Backend
- **Socket.IO**: Recebe chunks de áudio via evento `audio-chunk`
- **FFmpeg**: Converte áudio de WebM para WAV
- **Whisper.cpp**: Transcreve áudio para texto
- **Supabase**: Armazena transcrições no banco de dados

### Banco de Dados (Supabase)
- **Tabela**: `transcriptions`
- **Campos**: `id`, `user_id`, `room_id`, `timestamp`, `transcript`, `created_at`

## Eventos Socket.IO

### Cliente → Servidor

#### `audio-chunk`
Envia chunk de áudio para transcrição.

**Payload:**
```typescript
{
  audioBlob: ArrayBuffer,    // Dados do áudio em formato WebM
  userId: string,            // ID do usuário
  roomId: string,            // ID da sala
  timestamp: string          // Timestamp ISO do chunk
}
```

### Servidor → Cliente

#### `transcription-result`
Resultado da transcrição (enviado para todos na sala).

**Payload:**
```typescript
{
  userId: string,            // ID do usuário que enviou o áudio
  roomId: string,            // ID da sala
  transcript: string,        // Texto transcrito
  timestamp: string,         // Timestamp original do chunk
  processingTime: number     // Tempo de processamento em ms
}
```

#### `transcription-error`
Erro durante o processamento (enviado apenas para o usuário).

**Payload:**
```typescript
{
  error: string,             // Descrição do erro
  timestamp: string,         // Timestamp do erro
  processingTime?: number    // Tempo de processamento até o erro
}
```

## Endpoints REST

### `GET /api/transcription/health`
Verifica a saúde do sistema de transcrição.

**Resposta de Sucesso:**
```json
{
  "status": "OK",
  "message": "Transcription system health check",
  "components": {
    "ffmpeg": true,
    "whisper": true,
    "supabase": true,
    "overall": true
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Resposta de Erro:**
```json
{
  "status": "ERROR",
  "message": "Failed to check transcription system health",
  "error": "Error description",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Configuração

### Variáveis de Ambiente

```bash
# Supabase (obrigatório)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Whisper (opcional)
WHISPER_MODEL_PATH=./models/ggml-base.en.bin
WHISPER_BINARY_PATH=./whisper

# Processamento de Áudio (opcional)
AUDIO_TEMP_DIR=./temp
MAX_AUDIO_FILE_SIZE=10485760
AUDIO_CHUNK_TIMEOUT=30000
```

### Dependências do Sistema

1. **FFmpeg**: Necessário para conversão de áudio
   ```bash
   # Ubuntu/Debian
   sudo apt-get install ffmpeg
   
   # macOS
   brew install ffmpeg
   
   # Windows
   # Baixar de https://ffmpeg.org/download.html
   ```

2. **Whisper.cpp**: Binário compilado (opcional)
   - Se não estiver disponível, o sistema usa um fallback simulado
   - Para produção, compile o Whisper.cpp e configure o caminho

## Estrutura de Arquivos

```
backend/src/transcription/
├── index.ts              # Módulo principal
├── audioProcessor.ts     # Processamento de áudio (FFmpeg)
├── whisperProcessor.ts   # Transcrição (Whisper.cpp)
└── supabase.ts          # Integração com Supabase
```

## Fluxo de Processamento

1. **Captura**: Frontend captura áudio com MediaRecorder (5s chunks)
2. **Envio**: Chunk enviado via Socket.IO (`audio-chunk`)
3. **Validação**: Backend valida usuário e sala
4. **Conversão**: Áudio convertido de WebM para WAV (FFmpeg)
5. **Transcrição**: Áudio transcrito para texto (Whisper.cpp)
6. **Armazenamento**: Transcrição salva no Supabase
7. **Broadcast**: Resultado enviado para todos na sala
8. **Limpeza**: Arquivos temporários removidos

## Tratamento de Erros

### Tipos de Erro
- **Validação**: Usuário não está na sala
- **Conversão**: Falha no FFmpeg
- **Transcrição**: Falha no Whisper.cpp
- **Banco de Dados**: Falha ao salvar no Supabase
- **Sistema**: Erros internos do servidor

### Fallbacks
- **Whisper indisponível**: Usa simulação de transcrição
- **FFmpeg indisponível**: Retorna erro específico
- **Supabase indisponível**: Log de erro, mas não interrompe

## Limitações Conhecidas

1. **Formato de Áudio**: Apenas WebM suportado inicialmente
2. **Tamanho**: Limite de 10MB por chunk
3. **Idioma**: Modelo base em inglês (`ggml-base.en.bin`)
4. **Concorrência**: Processamento sequencial por usuário
5. **Armazenamento**: Arquivos temporários em disco local

## Monitoramento

### Logs
- Todos os eventos incluem prefixo `[TRANSCRIPTION]`
- Logs de progresso para cada etapa do processamento
- Métricas de tempo de processamento

### Métricas
- Tempo de processamento por chunk
- Taxa de sucesso/erro
- Uso de recursos (CPU, memória, disco)

## Próximos Passos

1. **Otimização**: Processamento paralelo
2. **Idiomas**: Suporte a múltiplos idiomas
3. **Qualidade**: Modelos Whisper maiores
4. **Cache**: Cache de modelos em memória
5. **Streaming**: Transcrição em tempo real
6. **UI**: Interface para visualizar transcrições