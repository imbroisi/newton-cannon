const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');

/**
 * INSTRUÇÕES PARA GERAR VÍDEO DA ESTRELA COM FUNDO TRANSPARENTE:
 * 
 * Para preservar a transparência dos frames PNG da estrela no vídeo final:
 * 1. Altere VIDEO_FORMAT abaixo para 'mov' (MP4 não suporta transparência)
 * 2. Ao compilar os frames com FFmpeg, use ProRes 4444 para preservar o canal alpha
 * 3. ProRes 4444 preserva o canal alpha (transparência)
 * 
 * Exemplo de comando FFmpeg para preservar transparência:
 *   -c:v prores_ks -pix_fmt yuva444p10le -profile:v 4444
 * 
 * Nota: Se os frames PNG da estrela têm fundo transparente, o vídeo MOV gerado
 * também terá transparência preservada, permitindo composição sobre outros elementos.
 * 
 * IMPORTANTE: O Puppeteer captura exatamente o que o navegador renderiza.
 * Se os frames PNG da estrela têm transparência, ela será preservada no screenshot
 * e as áreas transparentes mostrarão o que está atrás (fundo, outros elementos).
 * 
 * COMO GERAR VÍDEO DA ESTRELA NO FILMORA COM TRANSPARÊNCIA:
 * 
 * 1. Importe os frames PNG da estrela no Filmora (pasta public/sun-frames)
 * 2. Arraste os frames para a timeline na ordem correta
 * 3. Configure a exportação:
 *    - Formato: MOV (QuickTime)
 *    - Codec: ProRes 4444 (ou ProRes 422 HQ se 4444 não estiver disponível)
 *    - Resolução: 1920x1080 (ou a resolução desejada)
 *    - FPS: 60 (ou o FPS dos frames)
 * 4. Certifique-se de que a opção "Preservar transparência" ou "Alpha Channel" está ativada
 * 5. Exporte o vídeo
 * 
 * Nota: ProRes 4444 é o codec recomendado pois preserva o canal alpha completo.
 */

const OUTPUT_DIR = path.join(__dirname, '../video-frames');
const FPS = 60; // Frames por segundo
// Duração padrão do vídeo em segundos (pode ser sobrescrita via argumento --duration)
// Agora: soma de todos os tempos "wait" definidos em movie-script.ts
// (valor fixo anterior: 188s para 11303 frames a 60 FPS)
const DEFAULT_DURATION_SECONDS = 0;
// Velocidade de animação padrão para geração de vídeo (pode ser sobrescrita via argumento --animation-speed)
// Browser: ANIMATION_SPEED = 1200, período da órbita = 12 segundos
// Vídeo: período da órbita medido = 10 segundos (20% mais rápido)
// Correção: reduzir ANIMATION_SPEED por fator de 10/12 = 0.833 para igualar o período
// Valor anterior: 200, novo valor: 200 * (10/12) = 166.67 ≈ 167
const ANIMATION_SPEED_VIDEO_DEFAULT = 60;
const APP_URL = 'http://localhost:3000'; // URL da aplicação React
const RESOLUTION = '1920x1080'; // Resolução do vídeo (1080p)

// Função para exibir ajuda
function showHelp() {
  const VIDEO_FORMAT_HELP = 'mp4'; // Valor padrão do formato
  console.log(`
Uso: node scripts/generate-video.js [opções]

Opções:
  --duration, -t <segundos>     Duração do vídeo em segundos
                                  Padrão: soma dos tempos (wait) definidos em movie-script.ts

  --animation-speed, -a <valor>  Velocidade de animação para geração do vídeo
                                  Padrão: ${ANIMATION_SPEED_VIDEO_DEFAULT}

  --double-frames, -d             Dobra a quantidade de frames gerados, criando frames intermediários
                                  (usa FFmpeg/minterpolate após a geração dos frames PNG)

  --help, -h                      Exibe esta mensagem de ajuda

Exemplos:
  node scripts/generate-video.js
  node scripts/generate-video.js --duration 120
  node scripts/generate-video.js --animation-speed 50
  node scripts/generate-video.js -t 120 -a 50
  node scripts/generate-video.js --double-frames
  node scripts/generate-video.js -d -t 120

Configurações fixas:
  FPS: ${FPS} frames por segundo
  Resolução: ${RESOLUTION}
  Formato: ${VIDEO_FORMAT_HELP}
  URL da aplicação: ${APP_URL}
`);
}

// Parsear argumentos de linha de comando
function parseArgs() {
  const args = process.argv.slice(2);
  
  // Verificar se foi solicitada ajuda
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  const result = {
    duration: DEFAULT_DURATION_SECONDS,
    durationFromArgs: false, // true se --duration / -t for especificado
    animationSpeed: ANIMATION_SPEED_VIDEO_DEFAULT, // Usar default se não for especificado
    doubleFrames: false, // Por padrão, não dobrar frames
    star: null // Nome da estrela (opcional)
  };
  
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--duration' || args[i] === '-t') && args[i + 1]) {
      const duration = parseFloat(args[i + 1]);
      if (!isNaN(duration) && duration > 0) {
        result.duration = duration;
        result.durationFromArgs = true;
      }
    } else if ((args[i] === '--animation-speed' || args[i] === '-a') && args[i + 1]) {
      const speed = parseFloat(args[i + 1]);
      if (!isNaN(speed) && speed > 0) {
        result.animationSpeed = speed;
      }
    } else if (args[i] === '--double-frames' || args[i] === '-d') {
      result.doubleFrames = true;
    } else if ((args[i] === '--star' || args[i] === '-s') && args[i + 1]) {
      result.star = args[i + 1];
    }
  }
  return result;
}

const {
  duration: INITIAL_DURATION_SECONDS,
  durationFromArgs: DURATION_FROM_ARGS,
  animationSpeed: ANIMATION_SPEED_PARAM,
  doubleFrames: DOUBLE_FRAMES,
  star: STAR_NAME
} = parseArgs();

let DURATION_SECONDS = INITIAL_DURATION_SECONDS;
let TOTAL_FRAMES = FPS * DURATION_SECONDS;

// Formato do vídeo de saída. Valores válidos: 'mp4', 'mov', 'avi', 'mkv', 'webm'
// IMPORTANTE: Para preservar transparência, use 'mov' e ajuste o codec para ProRes 4444
const VIDEO_FORMAT = 'mp4';

// Nome do arquivo de saída: se STAR_NAME foi fornecido, usar "final-with-star-<STAR_NAME>.mp4", senão "output.mp4"
const outputFileName = STAR_NAME ? `final-with-star-${STAR_NAME}.${VIDEO_FORMAT}` : `output.${VIDEO_FORMAT}`;
// Diretório de saída: src/FINAL/
const FINAL_DIR = path.join(__dirname, '../src/FINAL');
// Criar diretório se não existir
if (!fs.existsSync(FINAL_DIR)) {
  fs.mkdirSync(FINAL_DIR, { recursive: true });
}
const VIDEO_OUTPUT = path.join(FINAL_DIR, outputFileName);
console.log(`📁 Nome da estrela recebido: ${STAR_NAME || '(nenhum)'}`);
console.log(`📁 Arquivo de saída será: ${VIDEO_OUTPUT}`);

// Importar script do vídeo de arquivo separado
// O arquivo t.ts é sincronizado para movie-script.json pelo sync-movie-script-json.js
// Garantir que o JSON está sincronizado antes de usar
const JSON_FILE = path.join(__dirname, '../public/movie-script.json');

// Sincronizar o JSON a partir do TypeScript antes de carregar
try {
  const { execSync } = require('child_process');
  execSync('node scripts/sync-movie-script-json.js', { stdio: 'pipe' });
} catch (syncError) {
  console.warn('⚠️  Aviso: Não foi possível sincronizar movie-script.json, tentando usar o existente...');
}

// Carregar o JSON
let VIDEO_SCRIPT;
try {
  if (!fs.existsSync(JSON_FILE)) {
    throw new Error(`Arquivo ${JSON_FILE} não encontrado. Execute: node scripts/sync-movie-script-json.js`);
  }
  const jsonContent = fs.readFileSync(JSON_FILE, 'utf-8');
  VIDEO_SCRIPT = JSON.parse(jsonContent);
  console.log(`✅ Script carregado de ${JSON_FILE} (${VIDEO_SCRIPT.length} ações)`);
} catch (error) {
  console.error('❌ Erro ao carregar movie-script.json:', error.message);
  console.error('   Certifique-se de que o arquivo movie-script.ts existe e execute:');
  console.error('   node scripts/sync-movie-script-json.js');
  throw error;
}

// Validar que VIDEO_SCRIPT tem a estrutura esperada
if (!Array.isArray(VIDEO_SCRIPT)) {
  throw new Error('VIDEO_SCRIPT deve ser um array de objetos com { wait, cmd }');
}

// Validar estrutura de cada ação
for (let i = 0; i < VIDEO_SCRIPT.length; i++) {
  const action = VIDEO_SCRIPT[i];
  if (typeof action.wait !== 'number' || typeof action.cmd !== 'string') {
    throw new Error(`Ação ${i} no VIDEO_SCRIPT deve ter { wait: number, cmd: string }, mas recebeu: ${JSON.stringify(action)}`);
  }
}

// Se a duração NÃO foi especificada na linha de comando, usar a soma de todos os "wait" do script
// (incluindo os marcadores "k" de gravação, para que o último "k" conte na duração do vídeo).
if (!DURATION_FROM_ARGS) {
  const scriptDurationSeconds = VIDEO_SCRIPT.reduce((total, action) => {
    const wait = typeof action.wait === 'number' ? action.wait : 0;
    return total + wait;
  }, 0);

  DURATION_SECONDS = scriptDurationSeconds;
  TOTAL_FRAMES = Math.round(FPS * DURATION_SECONDS);

  console.log(`⏱️  Duração não especificada na linha de comando.`);
  console.log(`    Usando soma dos tempos (wait) do movie-script: ${DURATION_SECONDS.toFixed(2)} segundos (~${Math.round(DURATION_SECONDS / 60)} minutos).`);
  console.log(`    Total de frames: ${TOTAL_FRAMES} a ${FPS} FPS.`);
}

// Remover marcadores de gravação (cmd "k"): início e fim da gravação no browser; não são teclas a executar
VIDEO_SCRIPT = VIDEO_SCRIPT.filter(action => action.cmd.toLowerCase().trim() !== 'k');
if (VIDEO_SCRIPT.length > 0) {
  console.log(`   (após remover marcadores "k" de gravação: ${VIDEO_SCRIPT.length} ações)`);
}

// Mapeamento de comandos legíveis para teclas
// Mapeamento completo de todos os comandos do movie-script.ts para teclas
// IMPORTANTE: Todos os comandos definidos em VideoCommand devem estar aqui
const CMD_TO_KEY = {
  // === Controle Geral ===
  'troggle all': 'z',
  'show cannon': 'x',
  'hide cannon': 'x', // Mesma tecla, mas será tratado diferente no executeCommand
  'toggle cannon': 'x', // Manter para compatibilidade
  // Linha QWERTY: q w e r
  'earth': 'q',           // Muda diretamente para Terra
  'rock': 'w',            // Muda diretamente para planeta rochoso
  'star': 'e',            // Muda diretamente para estrela
  'switch planet': 'r',   // Troca entre Terra, planeta rochoso e estrela
  'toggle distance': '.',  // Toggle: liga/desliga indicação de altura
  'hide instructions': 'Escape', // Liga/desliga painel de instruções (mesma tecla)
  'show instructions': 'Escape', // Liga/desliga painel de instruções (mesma tecla)
  'show elliptical orbit': 'y', // Mostra órbita elíptica da Terra ao redor da estrela
  'hide elliptical orbit': 'y', // Esconde órbita elíptica (mesma tecla, mas será tratado diferente no executeCommand)
  'show circular orbit': 't', // Mostra órbita circular da Terra ao redor da estrela
  'hide circular orbit': 't', // Esconde órbita circular (mesma tecla, mas será tratado diferente no executeCommand)
  
  // === Disparo ===
  'fire 1': '1',
  'fire 2': '2',
  'fire 3': '3',
  'fire 4': '4',
  'fire 5': '5',
  'fire 6': '6',
  'fire orbital': '7',    // Velocidade orbital
  'fire escape': '9',     // Velocidade de escape
  'cancel fire': '0',     // Cancela disparo agendado
  
  // === Tamanho do Planeta ===
  'shrink planet': '-',   // Diminui o tamanho do planeta em 50%
  'grow planet': '+',    // Volta o tamanho do planeta para 100%
  
  // === Humano ===
  'hide human': 'a',      // Liga/desliga humano (toggle)
  'show human': 'a',      // Liga/desliga humano (toggle - mesma tecla)
  'kill human': 's',      // Mata o humano (remove da tela)
  'move human down': 'ArrowDown', // Move humano entre linha tracejada e superfície

  'satelite': 't',
  'bg': 'b',
  'size indicator': 'n',
};

/**
 * Converte um comando legível para a tecla correspondente
 * @param {string} cmd - Comando legível
 * @returns {string} - Tecla correspondente
 */
function cmdToKey(cmd) {
  const normalizedCmd = cmd.toLowerCase().trim();
  const key = CMD_TO_KEY[normalizedCmd];
  
  if (!key) {
    console.warn(`⚠️  Comando desconhecido: "${cmd}". Usando como tecla direta.`);
    return cmd; // Fallback: usar o comando como tecla (caso seja uma tecla direta)
  }
  
  return key;
}

// Converter comandos do script para teclas
const VIDEO_SCRIPT_WITH_KEYS = VIDEO_SCRIPT.map(action => ({
  wait: action.wait,
  key: cmdToKey(action.cmd),
  cmd: action.cmd, // Manter o comando original para logs
}));

// Helper function para substituir page.waitForTimeout (removido nas versões recentes do Puppeteer)
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Verificar se o servidor está rodando
async function checkServerRunning(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const port = urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80);
    const options = {
      hostname: urlObj.hostname,
      port: port,
      path: '/',
      method: 'GET', // Mudado para GET que é mais compatível
      timeout: 3000
    };
    
    const req = http.request(options, (res) => {
      // Qualquer status code significa que o servidor está respondendo
      resolve(true);
      req.destroy();
    });
    
    req.on('error', (err) => {
      // Log do erro para debug
      console.log(`   Erro na verificação: ${err.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.setTimeout(3000);
    req.end();
  });
}

async function generateVideo() {
  console.log('🚀 Iniciando geração de vídeo...');
  console.log(`⏱️  Duração configurada: ${DURATION_SECONDS} segundos (${TOTAL_FRAMES} frames a ${FPS} FPS)`);
  
  // Verificar se o servidor está rodando (mas não bloquear se falhar)
  console.log(`🔍 Verificando se o servidor está rodando em ${APP_URL}...`);
  const serverRunning = await checkServerRunning(APP_URL);
  if (!serverRunning) {
    console.warn(`⚠️  Aviso: Não foi possível verificar se o servidor está rodando`);
    console.warn('   Continuando mesmo assim... (o Puppeteer tentará conectar)');
    console.warn('   Se falhar, certifique-se de que a aplicação React está rodando: npm start');
  } else {
    console.log('✅ Servidor está rodando!');
  }
  
  // Criar diretório para frames e limpar completamente
  if (fs.existsSync(OUTPUT_DIR)) {
    console.log('🧹 Limpando frames anteriores...');
    const files = fs.readdirSync(OUTPUT_DIR);
    files.forEach(file => {
      try {
        fs.unlinkSync(path.join(OUTPUT_DIR, file));
      } catch (e) {
        // Ignorar erros ao deletar
      }
    });
  } else {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('🌐 Abrindo navegador...');
  // Para debug, altere headless para false para ver o navegador
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Parsear resolução (formato: "1920x1080")
    const [width, height] = RESOLUTION.split('x').map(Number);
    
    // Definir viewport conforme a resolução especificada
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 1
    });

    // Adicionar parâmetro de animation speed na URL (sempre usar, mesmo que seja o default)
    const urlObj = new URL(APP_URL);
    urlObj.searchParams.set('animationSpeed', ANIMATION_SPEED_PARAM.toString());
    const appUrl = urlObj.toString();
    console.log(`⚡ Velocidade de animação configurada: ${ANIMATION_SPEED_PARAM}`);
    
    console.log(`📡 Carregando página: ${appUrl}`);
    try {
      await page.goto(appUrl, {
        waitUntil: 'domcontentloaded', // Menos restritivo que networkidle0
        timeout: 30000
      });
    } catch (error) {
      if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
        console.error(`❌ Erro: Não foi possível conectar a ${APP_URL}`);
        console.error('   Certifique-se de que a aplicação React está rodando:');
        console.error('   Execute: npm start');
        throw error;
      }
      // Tentar novamente com load
      console.warn('⚠️  Primeira tentativa falhou, tentando novamente...');
      await page.goto(APP_URL, {
        waitUntil: 'load',
        timeout: 30000
      });
    }

    // Aguardar a aplicação React carregar completamente
    console.log('⏳ Aguardando aplicação React carregar...');
    await wait(3000);

    // Garantir que a página está focada e clicar no body para garantir que eventos de teclado funcionem
    console.log('🖱️ Focando na página...');
    await page.click('body');
    await page.focus('body');
    await wait(500);

    // Aguardar que a animação esteja pronta
    console.log('⏳ Aguardando componente estar pronto...');
    await wait(2000);
    
    // Garantir que a página está ativa e pode receber eventos de teclado
    await page.evaluate(() => {
      window.focus();
      document.body.focus();
    });
    await wait(200);

    // Desligar TUDO antes de começar a gravação (incluindo instruções)
    console.log('🔌 Desligando tudo antes de iniciar a gravação (100% limpo)...');
    await page.evaluate(() => {
      window.focus();
      document.body.focus();
    });
    
    // Esconder TODOS os elementos visíveis via JavaScript diretamente
    await page.evaluate(() => {
      // Esconder instruções
      const instructionsContainer = document.querySelector('.instructions-container');
      if (instructionsContainer) {
        instructionsContainer.style.display = 'none';
      }
      
      // Esconder canhão
      const cannonImage = document.querySelector('.cannon-image');
      if (cannonImage) {
        cannonImage.style.display = 'none';
      }
      
      // Esconder indicador de altura (distância)
      const distanceIndicators = document.querySelectorAll(
        '.distance-indicator-horizontal-line, .distance-indicator-vertical-line, .distance-indicator-arrow, .distance-indicator-text'
      );
      distanceIndicators.forEach(el => {
        el.style.display = 'none';
      });
      
      // Esconder texto de gravidade
      const gravityIndicator = document.querySelector('.planet-gravity-indicator');
      if (gravityIndicator) {
        gravityIndicator.style.display = 'none';
      }
      
      // Esconder humano (imagem com alt="Humano" ou altura de 40px)
      const allImages = document.querySelectorAll('img');
      allImages.forEach(img => {
        const alt = img.getAttribute('alt') || '';
        const style = window.getComputedStyle(img);
        const height = parseInt(style.height) || 0;
        
        // Verificar se é o humano: alt="Humano" ou altura de 40px com posição absoluta
        if (alt.toLowerCase().includes('humano') || 
            (height === 40 && style.position === 'absolute' && style.left.includes('50%'))) {
          img.style.display = 'none';
        }
      });
      
      // Esconder cronômetro e lista de comandos (canto superior direito)
      // Procurar por divs com posição absoluta no canto superior direito
      const container = document.querySelector('.container');
      if (container) {
        const allDivs = Array.from(container.querySelectorAll('div'));
        for (const div of allDivs) {
          const style = window.getComputedStyle(div);
          if (style.position === 'absolute') {
            const top = style.top;
            const right = style.right;
            const fontFamily = style.fontFamily || '';
            
            // Verificar se está no canto superior direito (cronômetro/lista)
            // Pode estar em '20px' ou valores próximos
            const topValue = parseInt(top) || 0;
            const rightValue = parseInt(right) || 0;
            
            if (topValue >= 10 && topValue <= 30 && 
                rightValue >= 10 && rightValue <= 30 &&
                fontFamily.toLowerCase().includes('monospace')) {
              div.style.display = 'none';
            }
          }
        }
      }
    });
    
    // Executar comando "troggle all" via tecla 'z' para desligar canhão, balas, etc.
    await page.keyboard.press('z');
    await wait(500); // Aguardar o React processar o comando
    
    // Garantir que TODOS os elementos de UI permaneçam escondidos após o comando
    await page.evaluate(() => {
      // Esconder instruções novamente (caso o comando troggle all as tenha ligado)
      const instructionsContainer = document.querySelector('.instructions-container');
      if (instructionsContainer) {
        instructionsContainer.style.display = 'none';
      }
      
      // Esconder canhão novamente
      const cannonImage = document.querySelector('.cannon-image');
      if (cannonImage) {
        cannonImage.style.display = 'none';
      }
      
      // Esconder indicador de altura novamente
      const distanceIndicators = document.querySelectorAll(
        '.distance-indicator-horizontal-line, .distance-indicator-vertical-line, .distance-indicator-arrow, .distance-indicator-text'
      );
      distanceIndicators.forEach(el => {
        el.style.display = 'none';
      });
      
      // Esconder texto de gravidade novamente
      const gravityIndicator = document.querySelector('.planet-gravity-indicator');
      if (gravityIndicator) {
        gravityIndicator.style.display = 'none';
      }
      
      // Esconder humano novamente (imagem com alt="Humano" ou altura de 40px)
      const allImages = document.querySelectorAll('img');
      allImages.forEach(img => {
        const alt = img.getAttribute('alt') || '';
        const style = window.getComputedStyle(img);
        const height = parseInt(style.height) || 0;
        
        // Verificar se é o humano: alt="Humano" ou altura de 40px com posição absoluta
        if (alt.toLowerCase().includes('humano') || 
            (height === 40 && style.position === 'absolute' && style.left.includes('50%'))) {
          img.style.display = 'none';
        }
      });
      
      // Esconder cronômetro e lista novamente
      const container = document.querySelector('.container');
      if (container) {
        const allDivs = Array.from(container.querySelectorAll('div'));
        for (const div of allDivs) {
          const style = window.getComputedStyle(div);
          if (style.position === 'absolute') {
            const top = style.top;
            const right = style.right;
            const fontFamily = style.fontFamily || '';
            
            const topValue = parseInt(top) || 0;
            const rightValue = parseInt(right) || 0;
            
            if (topValue >= 10 && topValue <= 30 && 
                rightValue >= 10 && rightValue <= 30 &&
                fontFamily.toLowerCase().includes('monospace')) {
              div.style.display = 'none';
            }
          }
        }
      }
    });
    
    await wait(200);

    console.log(`📸 Capturando ${TOTAL_FRAMES} frames a ${FPS} FPS...`);
    
    // Preparar script: calcular tempos absolutos em milissegundos
    const scriptActions = [];
    let accumulatedTime = 0;
    for (const action of VIDEO_SCRIPT_WITH_KEYS) {
      accumulatedTime += action.wait * 1000; // Converter segundos para ms
      scriptActions.push({
        time: accumulatedTime,
        key: action.key,
        cmd: action.cmd, // Manter comando para logs
      });
    }
    
    console.log(`📋 Script configurado com ${scriptActions.length} ações:`);
    scriptActions.forEach((action, index) => {
      console.log(`   ${(action.time / 1000).toFixed(1)}s: ${action.cmd || action.key} (tecla '${action.key}')`);
    });
    
    const frameInterval = 1000 / FPS; // Intervalo entre frames em ms
    
    // Sincronizar com requestAnimationFrame do navegador
    // Aguardar um frame do navegador antes de começar para garantir sincronização
    await page.evaluate(() => {
      return new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });
    });
    
    const startTime = Date.now();
    let nextScriptActionIndex = 0; // Índice da próxima ação do script a ser executada
    
    // Capturar frames
    for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
      // Calcular tempo absoluto deste frame
      const frameTime = frame * frameInterval;
      
      // Verificar se é hora de executar alguma ação do script
      while (nextScriptActionIndex < scriptActions.length) {
        const action = scriptActions[nextScriptActionIndex];
        if (frameTime >= action.time) {
          console.log(`⌨️  Frame ${frame} (${(frameTime / 1000).toFixed(2)}s): Pressionando tecla '${action.key}' (comando: ${action.cmd})`);
          
          // Garantir que a página está focada antes de pressionar a tecla
          try {
            await page.evaluate(() => {
              window.focus();
              if (document.activeElement && document.activeElement !== document.body) {
                document.activeElement.blur();
              }
              document.body.focus();
            });
          } catch (e) {
            if (e.message.includes('Execution context was destroyed')) {
              console.warn(`⚠️  Contexto de execução destruído ao focar página (frame ${frame}), continuando...`);
            } else {
              throw e;
            }
          }
          
          // Para comandos de canhão e órbitas, chamar diretamente o executeCommand do React
          if (action.cmd === 'show cannon' || action.cmd === 'hide cannon' ||
              action.cmd === 'show elliptical orbit' || action.cmd === 'hide elliptical orbit' ||
              action.cmd === 'show circular orbit' || action.cmd === 'hide circular orbit') {
            try {
              await page.evaluate((cmd) => {
                // Chamar executeCommand diretamente no React
                if (window.executeCommand && typeof window.executeCommand === 'function') {
                  window.executeCommand(cmd);
                } else {
                  console.warn('⚠️  window.executeCommand não está disponível, usando fallback');
                  // Fallback: tentar disparar evento de tecla
                  const event = new KeyboardEvent('keydown', {
                    key: 'x',
                    code: 'KeyX',
                    keyCode: 88,
                    which: 88,
                    bubbles: true,
                    cancelable: true
                  });
                  document.dispatchEvent(event);
                }
              }, action.cmd);
              
              // Se for 'show cannon', remover display: none do canhão para garantir que apareça
              if (action.cmd === 'show cannon') {
                await page.evaluate(() => {
                  const cannonImage = document.querySelector('.cannon-image');
                  if (cannonImage) {
                    cannonImage.style.display = '';
                  }
                });
              }
              
              // Aguardar um pouco mais para garantir que o React processe
              await wait(100);
            } catch (e) {
              if (e.message.includes('Execution context was destroyed')) {
                console.warn(`⚠️  Contexto de execução destruído ao executar comando de canhão (frame ${frame}), continuando...`);
              } else {
                throw e;
              }
            }
          } else {
            // Para outros comandos, pressionar a tecla normalmente
            try {
          await page.keyboard.press(action.key);
            } catch (e) {
              if (e.message.includes('Execution context was destroyed')) {
                console.warn(`⚠️  Contexto de execução destruído ao pressionar tecla (frame ${frame}), continuando...`);
              } else {
                throw e;
              }
            }
          }
          
          // Aguardar um pouco para garantir que o React processe o evento
          // Aumentar o delay para comandos que mudam o estado do planeta
          const isPlanetCommand = ['earth', 'rock', 'star', 'switch planet'].includes(action.cmd);
          await wait(isPlanetCommand ? 200 : 50);
          
          nextScriptActionIndex++;
        } else {
          break; // Ainda não é hora desta ação
        }
      }
      
      // Aguardar até o momento correto para este frame
      const targetTime = startTime + frameTime;
      const currentTime = Date.now();
      const waitTime = Math.max(0, targetTime - currentTime);
      
      if (waitTime > 0) {
        await wait(waitTime);
      }
      
      // Aguardar um frame do navegador para garantir que a animação atualizou
      try {
      await page.evaluate(() => {
        return new Promise(resolve => {
          requestAnimationFrame(resolve);
        });
      });
      } catch (e) {
        if (e.message.includes('Execution context was destroyed')) {
          console.warn(`⚠️  Contexto de execução destruído ao aguardar frame (frame ${frame}), continuando...`);
          // Aguardar um pouco antes de continuar
          await wait(16); // ~1 frame a 60 FPS
        } else {
          throw e;
        }
      }
      
      // Screenshot captura exatamente o que o navegador renderiza
      // Se os frames PNG da estrela têm transparência, ela será preservada no screenshot
      // As áreas transparentes mostrarão o que está atrás (fundo, outros elementos)
      let screenshot;
      try {
        screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
        // PNG preserva transparência se existir na renderização do navegador
      });
      } catch (e) {
        if (e.message.includes('Execution context was destroyed') || e.message.includes('Target closed')) {
          console.error(`❌ Erro ao capturar frame ${frame}: ${e.message}`);
          console.error('   A página pode ter sido fechada ou recarregada. Interrompendo captura...');
          throw new Error(`Captura interrompida no frame ${frame}: ${e.message}`);
        } else {
          throw e;
        }
      }
      
      const framePath = path.join(OUTPUT_DIR, `frame-${String(frame).padStart(6, '0')}.png`);
      fs.writeFileSync(framePath, screenshot);
      
      // Progresso
      if ((frame + 1) % (FPS * 5) === 0) {
        console.log(`   Capturado ${frame + 1}/${TOTAL_FRAMES} frames (${Math.round((frame + 1) / TOTAL_FRAMES * 100)}%)`);
      }
    }

    console.log('✅ Frames capturados!');
    
    // Verificar quantos frames foram realmente capturados
    const capturedFrames = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png')).length;
    console.log(`📊 Frames capturados: ${capturedFrames} (esperado: ${TOTAL_FRAMES})`);
    
    if (capturedFrames !== TOTAL_FRAMES) {
      console.warn(`⚠️  Aviso: Número de frames capturados (${capturedFrames}) difere do esperado (${TOTAL_FRAMES})`);
    }
    
    console.log('🎬 Gerando vídeo com FFmpeg...');

    // Gerar vídeo usando FFmpeg com timebase e metadados explícitos
    const movFlags = (VIDEO_FORMAT === 'mp4' || VIDEO_FORMAT === 'mov') ? '-movflags +faststart' : '';
    const tmcdFlag = VIDEO_FORMAT === 'mov' ? '-write_tmcd 0' : '';
    // Timebase padrão do MP4 é 90000, não FPS * 1000
    const timebase = VIDEO_FORMAT === 'mp4' ? 90000 : (FPS * 1000);
    const ffmpegCommand = `ffmpeg -y -r ${FPS} -i "${OUTPUT_DIR}/frame-%06d.png" -r ${FPS} -frames:v ${TOTAL_FRAMES} -s ${RESOLUTION} -f ${VIDEO_FORMAT} -vsync cfr -fflags +genpts -video_track_timescale ${timebase} -avoid_negative_ts make_zero ${movFlags} ${tmcdFlag} -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow "${VIDEO_OUTPUT}"`.trim().replace(/\s+/g, ' ');
    
    try {
      execSync(ffmpegCommand, { stdio: 'inherit' });
      console.log(`✅ Vídeo gerado com sucesso: ${VIDEO_OUTPUT}`);
      
      // Remuxar o vídeo para corrigir metadados de duração (pode resolver problemas no Filmora)
      console.log('🔄 Remuxando vídeo para corrigir metadados...');
      const tempOutput = VIDEO_OUTPUT.replace(`.${VIDEO_FORMAT}`, `_temp.${VIDEO_FORMAT}`);
      const remuxCommand = `ffmpeg -y -i "${VIDEO_OUTPUT}" -c copy -movflags +faststart -map_metadata 0 "${tempOutput}"`;
      
      try {
        execSync(remuxCommand, { stdio: 'inherit' });
        // Substituir o arquivo original pelo remuxado
        fs.renameSync(tempOutput, VIDEO_OUTPUT);
        console.log('✅ Vídeo remuxado com sucesso!');
      } catch (remuxError) {
        console.warn('⚠️  Aviso: Falha ao remuxar vídeo, usando versão original');
        if (fs.existsSync(tempOutput)) {
          fs.unlinkSync(tempOutput);
        }
      }
      
      // Verificar duração do vídeo gerado
      console.log('🔍 Verificando duração do vídeo...');
      try {
        const probeCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${VIDEO_OUTPUT}"`;
        const duration = parseFloat(execSync(probeCommand, { encoding: 'utf-8' }).trim());
        console.log(`📹 Duração do vídeo: ${duration.toFixed(2)}s (esperado: ${DURATION_SECONDS}s)`);
        if (Math.abs(duration - DURATION_SECONDS) > 1) {
          console.warn(`⚠️  Aviso: Duração do vídeo (${duration.toFixed(2)}s) difere significativamente do esperado (${DURATION_SECONDS}s)`);
        }
      } catch (probeError) {
        console.warn('⚠️  Não foi possível verificar a duração do vídeo');
      }
      
    } catch (error) {
      console.error('❌ Erro ao gerar vídeo com FFmpeg:', error.message);
      console.log('💡 Certifique-se de que o FFmpeg está instalado e no PATH');
      console.log('   macOS: brew install ffmpeg');
      console.log('   Linux: sudo apt-get install ffmpeg');
      console.log('   Windows: Baixe de https://ffmpeg.org/download.html');
    }

  } catch (error) {
    console.error('❌ Erro durante a captura:', error);
  } finally {
    await browser.close();
  }
}

// Executar
generateVideo().catch(console.error);

