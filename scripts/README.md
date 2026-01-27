# Script de Geração de Vídeo

Este script captura frames da animação do Newton Cannon e gera um vídeo MP4 automaticamente.

## Pré-requisitos

1. **FFmpeg instalado**:
   - macOS: `brew install ffmpeg`
   - Linux: `sudo apt-get install ffmpeg`
   - Windows: Baixe de https://ffmpeg.org/download.html

2. **Aplicação React rodando**:
   - Execute `npm start` em um terminal

## Como usar

1. Certifique-se de que a aplicação React está rodando em `http://localhost:3000`

2. Execute o script:
   ```bash
   npm run generate-video
   ```

3. O script irá:
   - Abrir um navegador headless
   - Carregar a aplicação
   - Disparar uma bala automaticamente (tecla "5" = 5 km/s)
   - Capturar frames a 60 FPS por 30 segundos
   - Gerar o vídeo `output.mp4` na raiz do projeto

## Personalização

Edite `scripts/generate-video.js` para ajustar:

- **FPS**: Frames por segundo (padrão: 60)
- **DURATION_SECONDS**: Duração do vídeo em segundos (padrão: 30)
- **APP_URL**: URL da aplicação (padrão: http://localhost:3000)
- **Resolução**: `width` e `height` no viewport (padrão: 1920x1080)
- **Tecla de disparo**: Altere `'5'` para outra tecla (1-9)

## Arquivos gerados

- `video-frames/`: Diretório com os frames PNG capturados
- `output.mp4`: Vídeo final gerado

Estes arquivos são ignorados pelo git (adicionados ao `.gitignore`).

