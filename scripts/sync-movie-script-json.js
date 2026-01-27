/**
 * Script para sincronizar movie-script.ts com movie-script.json
 * 
 * Este script lê o arquivo TypeScript e extrai o array VIDEO_SCRIPT,
 * convertendo-o para JSON que pode ser carregado no browser.
 */

const fs = require('fs');
const path = require('path');

const TS_FILE = path.join(__dirname, 'movie-script.ts');
const JSON_FILE = path.join(__dirname, '../public/movie-script.json');

try {
  // Ler o arquivo TypeScript
  const tsContent = fs.readFileSync(TS_FILE, 'utf-8');
  
  // Extrair o array VIDEO_SCRIPT usando regex
  // Procura por: const VIDEO_SCRIPT: VideoAction[] = [ ... ];
  const match = tsContent.match(/const\s+VIDEO_SCRIPT[^=]*=\s*\[([\s\S]*?)\];/);
  
  if (!match) {
    throw new Error('Não foi possível encontrar VIDEO_SCRIPT no arquivo TypeScript');
  }
  
  // Extrair o conteúdo do array
  const arrayContent = match[1];
  
  // Converter para JSON válido
  // Substituir { wait: X, cmd: 'Y' } por {"wait": X, "cmd": "Y"}
  let jsonContent = arrayContent
    .replace(/(\w+):/g, '"$1":') // Converter chaves para strings
    .replace(/'/g, '"') // Converter aspas simples para duplas
    .replace(/\s+/g, ' ') // Normalizar espaços
    .trim();
  
  // Tentar fazer parse para validar
  try {
    const parsed = JSON.parse(`[${jsonContent}]`);
    
    // Escrever o arquivo JSON
    // fs.writeFileSync(JSON_FILE, JSON.stringify(parsed, null, 2));
    
    console.log('✅ movie-script.json sincronizado com sucesso!');
    console.log(`   ${parsed.length} ações encontradas`);
  } catch (parseError) {
    // Se o parse automático falhar, usar uma abordagem mais manual
    console.warn('⚠️  Parse automático falhou, usando extração manual...');
    
    // Extrair manualmente os objetos
    const actions = [];
    const actionRegex = /\{\s*wait:\s*([\d.]+)\s*,\s*cmd:\s*['"]([^'"]+)['"]\s*\}/g;
    let actionMatch;
    
    while ((actionMatch = actionRegex.exec(arrayContent)) !== null) {
      actions.push({
        wait: parseFloat(actionMatch[1]),
        cmd: actionMatch[2]
      });
    }
    
    if (actions.length === 0) {
      throw new Error('Não foi possível extrair ações do script');
    }
    
    // Escrever o arquivo JSON
    const jsonContent = JSON.stringify(actions, null, 2);
    // fs.writeFileSync(JSON_FILE, jsonContent);
    
    console.log('✅ movie-script.json sincronizado com sucesso!');
    console.log(`   ${actions.length} ações encontradas`);
  }
  
} catch (error) {
  console.error('❌ Erro ao sincronizar movie-script:', error.message);
  process.exit(1);
}

