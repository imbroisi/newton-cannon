#!/usr/bin/env node

/**
 * Script: interpolation.js
 * 
 * Recebe um vídeo e faz interpolação dos frames, dobrando o número de frames.
 * Isso dobra a duração do vídeo (torna a animação 2 vezes mais lenta).
 * 
 * Uso:
 *   node scripts/interpolation.js <arquivo-video.mp4>
 *   node scripts/interpolation.js --help
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Mostra a ajuda do script
 */
function showHelp() {
  console.log('📖 Uso do script interpolation.js:');
  console.log('');
  console.log('  node scripts/interpolation.js <arquivo-video.mp4>');
  console.log('  node scripts/interpolation.js --help');
  console.log('  node scripts/interpolation.js -h');
  console.log('');
  console.log('Descrição:');
  console.log('  Interpola os frames do vídeo, dobrando o número de frames.');
  console.log('  Isso dobra a duração do vídeo (torna a animação 2 vezes mais lenta).');
  console.log('  O vídeo de saída terá o mesmo nome do de entrada,');
  console.log('  mas com "-interpolated" antes da extensão.');
  console.log('');
  console.log('Exemplo:');
  console.log('  node scripts/interpolation.js video.mp4');
  console.log('  → Gera: video-interpolated.mp4');
  console.log('');
  console.log('Requisitos:');
  console.log('  - FFmpeg instalado e disponível no PATH');
  process.exit(0);
}

/**
 * Verifica se FFmpeg está disponível
 */
function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Obtém informações do vídeo (FPS, duração e bitrate)
 */
function getVideoInfo(videoPath) {
  try {
    const ffprobeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate,duration,bit_rate -of default=noprint_wrappers=1 "${videoPath}"`;
    const output = execSync(ffprobeCmd, { encoding: 'utf-8' });
    
    let fps = null;
    let duration = null;
    let bitrate = null;
    
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.startsWith('r_frame_rate=')) {
        const rate = line.split('=')[1].trim();
        const [num, den] = rate.split('/');
        fps = parseFloat(num) / parseFloat(den);
      } else if (line.startsWith('duration=')) {
        duration = parseFloat(line.split('=')[1].trim());
      } else if (line.startsWith('bit_rate=')) {
        bitrate = parseInt(line.split('=')[1].trim());
      }
    }
    
    return { fps, duration, bitrate };
  } catch (e) {
    console.error(`❌ Erro ao obter informações do vídeo: ${e.message}`);
    return { fps: null, duration: null, bitrate: null };
  }
}

/**
 * Interpola os frames do vídeo usando FFmpeg
 */
function interpolateVideo(inputPath, outputPath) {
  console.log(`📹 Interpolando frames do vídeo...`);
  console.log(`   Entrada: ${inputPath}`);
  console.log(`   Saída: ${outputPath}`);
  
  // Obter informações do vídeo original
  const { fps, duration, bitrate } = getVideoInfo(inputPath);
  
  if (fps) {
    console.log(`   FPS original: ${fps.toFixed(2)}`);
    console.log(`   Duração original: ${duration ? duration.toFixed(2) + 's' : 'desconhecida'}`);
  }
  if (bitrate) {
    const bitrateMbps = (bitrate / 1000000).toFixed(2);
    console.log(`   Bitrate original: ${bitrateMbps} Mbps`);
  }
  
  // Calcular novo FPS (dobrar)
  const newFps = fps ? fps * 2 : 60; // Se não conseguir detectar, assume 60 FPS e dobra para 120
  
  console.log(`   Novo FPS: ${newFps.toFixed(2)} (dobrado)`);
  if (duration) {
    console.log(`   Nova duração: ${(duration * 2).toFixed(2)}s (dobrada - animação 2x mais lenta)`);
  }
  
  console.log('');
  console.log('⏳ Processando com FFmpeg (minterpolate)...');
  console.log('   Isso pode levar alguns minutos dependendo do tamanho do vídeo...');
  
  try {
    // Estratégia: interpolar para 2x FPS e depois dobrar o tempo de cada frame
    // Isso dobra o número de frames E dobra a duração (animação 2x mais lenta)
    // setpts=2*PTS dobra o tempo de cada frame, resultando em duração 2x maior
    
    const originalFps = fps || 30;
    
    // Construir comando FFmpeg preservando qualidade
    // -c:v libx264: usar codec H.264
    // -crf 18: qualidade muito alta (quanto menor, melhor qualidade, 18 é excelente)
    // -preset slow: melhor compressão, mantém qualidade
    // -pix_fmt yuv420p: compatibilidade
    // Se tiver bitrate original, usar -b:v para manter similar
    let ffmpegCmd = `ffmpeg -i "${inputPath}" -vf "minterpolate=fps=${newFps},setpts=2*PTS" -r ${originalFps}`;
    
    if (bitrate) {
      // Manter o mesmo bitrate do original (ajustado para 2x duração = 2x bitrate total)
      // Mas como a duração dobra, o bitrate por segundo pode ser mantido
      const bitrateKbps = Math.round(bitrate / 1000);
      ffmpegCmd += ` -b:v ${bitrateKbps}k -maxrate ${bitrateKbps}k -bufsize ${bitrateKbps * 2}k`;
      console.log(`   Preservando bitrate: ${(bitrate / 1000000).toFixed(2)} Mbps`);
    } else {
      // Se não conseguir detectar bitrate, usar CRF (Constant Rate Factor) para alta qualidade
      ffmpegCmd += ` -c:v libx264 -crf 18 -preset slow`;
      console.log(`   Usando CRF 18 para alta qualidade (bitrate original não detectado)`);
    }
    
    ffmpegCmd += ` -pix_fmt yuv420p "${outputPath}"`;
    
    console.log('');
    console.log('⏳ Processando com FFmpeg (minterpolate)...');
    console.log('   Isso pode levar alguns minutos dependendo do tamanho do vídeo...');
    console.log('');
    
    execSync(ffmpegCmd, { stdio: 'inherit' });
    
    console.log('');
    console.log('✅ Interpolação concluída com sucesso!');
    console.log(`📁 Vídeo interpolado salvo em: ${outputPath}`);
    
    // Verificar se o arquivo foi criado
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`📊 Tamanho do arquivo: ${sizeMB} MB`);
    }
  } catch (error) {
    console.error('');
    console.error(`❌ Erro ao interpolar vídeo: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Função principal
 */
function main() {
  const args = process.argv.slice(2);
  
  // Verificar se precisa mostrar ajuda
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
  }
  
  // Verificar se FFmpeg está disponível
  if (!checkFFmpeg()) {
    console.error('❌ FFmpeg não encontrado!');
    console.error('   Por favor, instale o FFmpeg e certifique-se de que está no PATH.');
    console.error('   Visite: https://ffmpeg.org/download.html');
    process.exit(1);
  }
  
  // Obter caminho do vídeo de entrada
  const inputPath = args[0];
  
  if (!inputPath) {
    console.error('❌ Erro: nenhum arquivo de vídeo especificado.');
    console.error('');
    showHelp();
  }
  
  // Verificar se o arquivo existe
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Erro: arquivo não encontrado: ${inputPath}`);
    process.exit(1);
  }
  
  // Verificar se é um arquivo de vídeo
  const ext = path.extname(inputPath).toLowerCase();
  if (!['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) {
    console.warn(`⚠️  Aviso: extensão de arquivo não reconhecida: ${ext}`);
    console.warn('   Continuando mesmo assim...');
  }
  
  // Gerar caminho de saída
  const dir = path.dirname(inputPath);
  const basename = path.basename(inputPath, ext);
  
  // Se o nome termina com "-not-interpolated", remover essa parte
  // Caso contrário, adicionar "-interpolated"
  let outputBasename;
  if (basename.endsWith('-not-interpolated')) {
    outputBasename = basename.replace(/-not-interpolated$/, '');
    console.log(`📝 Arquivo de entrada termina com "-not-interpolated"`);
    console.log(`   Removendo sufixo para gerar nome de saída`);
  } else {
    outputBasename = `${basename}-interpolated`;
    console.log(`📝 Arquivo de entrada não tem sufixo "-not-interpolated"`);
    console.log(`   Adicionando sufixo "-interpolated" ao nome de saída`);
  }
  
  const outputPath = path.join(dir, `${outputBasename}${ext}`);
  
  console.log(`   Entrada: ${basename}${ext}`);
  console.log(`   Saída: ${outputBasename}${ext}`);
  console.log('');
  
  // Verificar se o arquivo de saída já existe
  if (fs.existsSync(outputPath)) {
    console.warn(`⚠️  Aviso: arquivo de saída já existe: ${outputPath}`);
    console.warn('   Será sobrescrito.');
    console.log('');
  }
  
  console.log('🎬 Iniciando interpolação de frames...');
  console.log('');
  
  // Interpolar vídeo
  interpolateVideo(inputPath, outputPath);
}

// Executar
main();

