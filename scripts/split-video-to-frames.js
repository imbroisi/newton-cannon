const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_DIR = path.join(__dirname, '../src/video-element-src');
const OUTPUT_DIR = path.join(__dirname, '../public/video-element-frames');

// Função para parsear argumentos da linha de comando
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { url: null, fileName: null };
  
  // Verificar se precisa mostrar ajuda
  if (args.includes('--help') || args.includes('-h')) {
    console.log('📖 Uso do script:');
    console.log('');
    console.log('  Processar vídeo de uma URL:');
    console.log('    node scripts/split-video-to-frames.js --url <URL>');
    console.log('    node scripts/split-video-to-frames.js -u <URL>');
    console.log('');
    console.log('  Processar vídeo específico local:');
    console.log('    node scripts/split-video-to-frames.js <nome-do-arquivo.mp4>');
    console.log('');
    console.log('  Processar todos os vídeos locais (do diretório video-element-src):');
    console.log('    node scripts/split-video-to-frames.js');
    console.log('');
    console.log('  Exemplo:');
    console.log('    node scripts/split-video-to-frames.js --url "https://example.com/video.mp4"');
    console.log('    node scripts/split-video-to-frames.js "meu-video.mp4"');
    console.log('');
    console.log('  Formatos suportados: MP4, MOV');
    process.exit(0);
  }
  
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--url' || args[i] === '-u') && args[i + 1]) {
      result.url = args[i + 1];
      i++;
    } else if (!args[i].startsWith('-')) {
      // Argumento posicional (nome do arquivo) - apenas se não começar com '-'
      // e não for um valor de um parâmetro anterior
      if (i === 0 || (i > 0 && args[i - 1] !== '--url' && args[i - 1] !== '-u')) {
        result.fileName = args[i];
      }
    }
  }
  
  return result;
}

// Função para baixar vídeo de uma URL
function downloadVideoFromUrl(url, outputPath) {
  console.log(`📥 Baixando vídeo de: ${url}`);
  console.log(`💾 Salvando em: ${outputPath}`);
  
  try {
    // FFmpeg pode baixar vídeos diretamente de URLs
    const downloadCommand = `ffmpeg -i "${url}" -c copy "${outputPath}"`;
    execSync(downloadCommand, { stdio: 'inherit' });
    console.log(`✅ Vídeo baixado com sucesso!`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao baixar vídeo: ${error.message}`);
    return false;
  }
}

// Função para listar arquivos de vídeo (MP4 e MOV) no diretório de origem
function findVideoFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Diretório não encontrado: ${dir}`);
    return [];
  }
  
  const files = fs.readdirSync(dir);
  return files.filter(file => {
    const lower = file.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.mov');
  });
}

// Função para extrair frames de um vídeo
function extractFrames(videoPath, outputDir) {
  // Criar diretório se não existir (a limpeza já foi feita na função main)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`📹 Extraindo frames de: ${path.basename(videoPath)}`);
  console.log(`📁 Salvando em: ${outputDir}`);
  
  try {
    // Extrair todos os frames usando FFmpeg
    // %06d garante que os frames terão 6 dígitos (frame-000001.png, frame-000002.png, etc.)
    // -pix_fmt rgba preserva o canal alpha (transparência) se existir no vídeo
    // Usar fps=60 para compatibilizar com o vídeo final gerado em 60 FPS
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf "fps=60" -pix_fmt rgba "${path.join(outputDir, 'frame-%06d.png')}"`;
    
    console.log('⏳ Processando...');
    execSync(ffmpegCommand, { stdio: 'inherit' });
    
    // Contar frames extraídos
    const extractedFrames = fs.readdirSync(outputDir).filter(f => f.endsWith('.png')).length;
    console.log(`✅ ${extractedFrames} frames extraídos com sucesso!`);
    
    return extractedFrames;
  } catch (error) {
    console.error(`❌ Erro ao extrair frames: ${error.message}`);
    return 0;
  }
}

// Função principal
function main() {
  console.log('🎬 Iniciando extração de frames de vídeos (MP4/MOV)...\n');
  
  const args = parseArgs();
  let totalFrames = 0;
  
  // Criar diretório de saída se não existir e limpar conteúdo existente
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.log(`📁 Criando diretório de saída: ${OUTPUT_DIR}`);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  } else {
    // Limpar todo o conteúdo existente antes de processar
    console.log(`🧹 Limpando diretório existente: ${OUTPUT_DIR}`);
    const existingFiles = fs.readdirSync(OUTPUT_DIR);
    existingFiles.forEach(file => {
      try {
        const filePath = path.join(OUTPUT_DIR, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        // Ignorar erros ao deletar
      }
    });
    console.log('✅ Diretório limpo!\n');
  }
  
  // Se uma URL foi fornecida, processar primeiro
  if (args.url) {
    console.log('🌐 Modo URL detectado\n');
    
    // Criar diretório de origem se não existir
    if (!fs.existsSync(SOURCE_DIR)) {
      fs.mkdirSync(SOURCE_DIR, { recursive: true });
    }
    
    // Gerar nome do arquivo a partir da URL
    const urlObj = new URL(args.url);
    const urlPath = urlObj.pathname;
    // Manter a extensão original ou usar .mp4 como padrão
    const urlFileName = path.basename(urlPath) || 'video-from-url.mp4';
    const localVideoPath = path.join(SOURCE_DIR, urlFileName);
    
    // Baixar vídeo
    console.log('─'.repeat(50));
    const downloaded = downloadVideoFromUrl(args.url, localVideoPath);
    console.log('─'.repeat(50));
    
    if (downloaded) {
      // Extrair frames do vídeo baixado
      console.log(`\n📹 Processando vídeo baixado: ${urlFileName}`);
      console.log('─'.repeat(50));
      const frames = extractFrames(localVideoPath, OUTPUT_DIR);
      totalFrames += frames;
      console.log('─'.repeat(50));
    } else {
      console.log('❌ Não foi possível processar o vídeo da URL');
      return;
    }
  } else {
    // Modo local: processar arquivos do diretório
    console.log('📁 Modo local: processando arquivos do diretório\n');
    
    // Verificar se o diretório de origem existe
    if (!fs.existsSync(SOURCE_DIR)) {
      console.log(`📁 Criando diretório de origem: ${SOURCE_DIR}`);
      fs.mkdirSync(SOURCE_DIR, { recursive: true });
      console.log('⚠️  Coloque os arquivos MP4 ou MOV no diretório video-element-src e execute o script novamente.');
      console.log('   Ou use --url para processar um vídeo de uma URL.');
      return;
    }
    
    // Se um arquivo específico foi especificado, processar apenas esse
    if (args.fileName) {
      const videoPath = path.join(SOURCE_DIR, args.fileName);
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(videoPath)) {
        console.error(`❌ Arquivo não encontrado: ${videoPath}`);
        console.error(`   Verifique se o arquivo existe no diretório: ${SOURCE_DIR}`);
        return;
      }
      
      console.log(`📹 Processando arquivo especificado: ${args.fileName}`);
      console.log('─'.repeat(50));
      
      const frames = extractFrames(videoPath, OUTPUT_DIR);
      totalFrames += frames;
      
      console.log('─'.repeat(50));
    } else {
      // Se nenhum arquivo foi especificado, processar todos (comportamento antigo)
    // Encontrar todos os arquivos de vídeo (MP4 e MOV)
    const videoFiles = findVideoFiles(SOURCE_DIR);
    
    if (videoFiles.length === 0) {
      console.log('⚠️  Nenhum arquivo MP4 ou MOV encontrado no diretório video-element-src');
      console.log(`   Coloque os arquivos MP4 ou MOV em: ${SOURCE_DIR}`);
      console.log('   Ou use --url <URL> para processar um vídeo de uma URL.');
        console.log('   Ou use --file <nome> para processar um arquivo específico.');
      return;
    }
    
    console.log(`📹 Encontrados ${videoFiles.length} arquivo(s) de vídeo:\n`);
    videoFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log('');
    
    // Processar cada vídeo
    videoFiles.forEach((file, index) => {
      const videoPath = path.join(SOURCE_DIR, file);
      console.log(`\n[${index + 1}/${videoFiles.length}] Processando: ${file}`);
      console.log('─'.repeat(50));
      
      const frames = extractFrames(videoPath, OUTPUT_DIR);
      totalFrames += frames;
      
      console.log('─'.repeat(50));
    });
    }
  }
  
  console.log(`\n✅ Processamento concluído!`);
  console.log(`📊 Total de frames extraídos: ${totalFrames}`);
  console.log(`📁 Frames salvos em: ${OUTPUT_DIR}`);
}

// Executar
main();

