const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../splited-frames');
const TARGET_DIR = path.join(__dirname, '../public/sun-frames');

// Função para copiar frames
function copySunFrames() {
  console.log('📁 Copiando frames da estrela de splited-frames para public/sun-frames...\n');
  
  // Verificar se o diretório de origem existe
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Diretório não encontrado: ${SOURCE_DIR}`);
    console.log('   Execute primeiro o script split-video-to-frames.js para extrair os frames.');
    return;
  }
  
  // Criar diretório de destino se não existir
  if (!fs.existsSync(TARGET_DIR)) {
    console.log(`📁 Criando diretório: ${TARGET_DIR}`);
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  } else {
    console.log(`🧹 Limpando diretório existente: ${TARGET_DIR}`);
    const existingFiles = fs.readdirSync(TARGET_DIR);
    existingFiles.forEach(file => {
      try {
        fs.unlinkSync(path.join(TARGET_DIR, file));
      } catch (e) {
        // Ignorar erros ao deletar
      }
    });
  }
  
  // Ler arquivos do diretório de origem
  const files = fs.readdirSync(SOURCE_DIR);
  const frameFiles = files.filter(file => file.toLowerCase().endsWith('.png') && file.startsWith('frame-')).sort();
  
  if (frameFiles.length === 0) {
    console.log('⚠️  Nenhum frame encontrado no diretório splited-frames');
    console.log('   Certifique-se de que os frames foram extraídos corretamente.');
    return;
  }
  
  console.log(`📹 Encontrados ${frameFiles.length} frames`);
  console.log('⏳ Copiando frames...\n');
  
  let copied = 0;
  frameFiles.forEach((file, index) => {
    const sourcePath = path.join(SOURCE_DIR, file);
    const targetPath = path.join(TARGET_DIR, file);
    
    try {
      fs.copyFileSync(sourcePath, targetPath);
      copied++;
      
      // Mostrar progresso a cada 100 frames
      if ((index + 1) % 100 === 0 || index + 1 === frameFiles.length) {
        console.log(`   Copiados ${index + 1}/${frameFiles.length} frames (${Math.round((index + 1) / frameFiles.length * 100)}%)`);
      }
    } catch (error) {
      console.error(`❌ Erro ao copiar ${file}: ${error.message}`);
    }
  });
  
  console.log(`\n✅ ${copied} frames copiados com sucesso!`);
  console.log(`📁 Frames disponíveis em: ${TARGET_DIR}`);
  console.log('\n💡 Os frames agora estão disponíveis para uso no componente React.');
  console.log('   Nota: Os frames precisam estar em public/ porque o React serve arquivos estáticos de lá.');
  console.log('   Arquivos em public/ são acessíveis via URL (ex: /sun-frames/frame-000001.png)');
}

// Executar
copySunFrames();

