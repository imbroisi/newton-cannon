/**
 * Script do vídeo - Sequência de ações (comandos) e tempos de espera
 * 
 * Formato: Array de objetos com:
 *   - wait: tempo de espera em segundos antes de executar a ação
 *   - cmd: comando legível (veja lista de comandos válidos abaixo)
 * 
 * Este arquivo pode ser editado independentemente do código principal
 * para ajustar a sequência de ações do vídeo gerado.
 * 
*/

const VIDEO_SCRIPT: VideoAction[] = [
  // { wait:  0.1, cmd: 'star' },
  // { wait:  0.1 , cmd: 'show circular orbit' },
  // { wait:  0.1 , cmd: 'bg' },
  // { wait:  0.1 , cmd: 'shrink planet' },
  // { wait:  0.1 , cmd: 'shrink planet' },
  // { wait:  0.1 , cmd: 'shrink planet' },
  // { wait:  0.1 , cmd: 'shrink planet' },
  // { wait:  0.1 , cmd: 'shrink planet' },
  // { wait:  0.1 , cmd: 'shrink planet' },
  // { wait:  0.1 , cmd: 'size indicator' },
  // { wait:  1 , cmd: 'earth' },
  // { wait:  1 , cmd: 'fire 1' },
  // { wait:  1 , cmd: 'fire 2' },
  // { wait:  1 , cmd: 'fire 3' },
  // { wait:  1 , cmd: 'fire 4' },
  // { wait:  1 , cmd: 'fire 5' },
  // { wait:  1 , cmd: 'fire 6' },
  // { wait:  1 , cmd: 'fire orbital' },
  // { wait:  20 , cmd: 'cancel fire' },
];

/**
 * Tipo que define todos os comandos válidos para ações no vídeo
 * 
 * Obs.: além do texto legível (ex.: 'show circular orbit'),
 * também aceitamos diretamente a **tecla correspondente**
 * (ex.: 't'), conforme mapeado em `CMD_TO_KEY` em generate-video.js.
 */
type VideoCommand =
  // Controle geral
  | 'troggle all'
  | 'show cannon'
  | 'hide cannon'
  | 'switch planet'
  | 'earth'
  | 'rock'
  | 'star'
  | 'toggle distance'
  | 'hide instructions'
  | 'show instructions'
  // Órbita elíptica
  | 'show elliptical orbit'
  | 'hide elliptical orbit'
  // Órbita circular
  | 'show circular orbit'
  | 'hide circular orbit'
  // Tracejado da órbita
  | 'toggle orbit outline'
  // Circunferência tracejada da superfície original
  | 'toggle reference circle'
  // Imagem do Einstein
  | 'toggle einstein'
  // Disparo
  | 'fire 1'
  | 'fire 2'
  | 'fire 3'
  | 'fire 4'
  | 'fire 5'
  | 'fire 6'
  | 'fire orbital'
  | 'fire escape'
  | 'cancel fire'
  // Tamanho do planeta
  | 'shrink planet'
  | 'grow planet'
  // Humano
  | 'hide human'
  | 'show human'
  | 'kill human'
  | 'move human down'
  | 'bg'
  | 'size indicator';

/**
 * Teclas correspondentes aos comandos acima (atalhos de teclado).
 * 
 * Exemplos:
 * - 'z'  → 'troggle all'
 * - 't'  → órbita circular
 * - 'y'  → órbita elíptica
 * - '1'…'6' → tiros 1…6
 */
type VideoCommandKey =
  | 'z'
  | 'x'
  | 'q'
  | 'w'
  | 'e'
  | 'r'
  | '.'
  | 'Escape'
  | 'y'
  | 't'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '9'
  | '0'
  | '-'
  | '+'
  | 'a'
  | 's'
  | 'ArrowDown'
  | 'b'
  | 'n';

/**
 * Interface para uma ação no script do vídeo
 */
interface VideoAction {
  /** Tempo de espera em segundos antes de executar esta ação */
  wait: number;
  /**
   * Comando a ser executado.
   * Pode ser:
   *  - o texto legível da ação (ex.: 'show circular orbit')
   *  - OU a tecla correspondente (ex.: 't')
   */
  cmd: VideoCommand | VideoCommandKey;
}

// Exportar tanto como default quanto como named export para compatibilidade
export default VIDEO_SCRIPT;
export { VIDEO_SCRIPT };

/**
 * Significado dos comandos disponíveis:
 * 
 * === Comandos de Controle Geral ===
 * 
 * 'troggle all' - Desliga tudo, exceto planeta/estrela, indicador de gravidade e círculo tracejado
 *              (remove canhão, instruções, humano, balas e indicador de distância)
 * 
 * 'toggle cannon' - Toggle: apagar/mostrar canhão, texto de velocidade e balas na superfície
 *                    (se canhão estiver visível, esconde; se estiver escondido, mostra)
 * 
 * 'switch planet' - Troca entre Terra, planeta rochoso e estrela
 *                   (ciclo: estrela -> Terra -> Planeta Rochoso -> estrela)
 *                   (também limpa todas as balas e desliga indicador de velocidade)
 * 
 * 'earth' - Muda diretamente para Terra
 *           (limpa todas as balas e desliga indicador de velocidade)
 * 
 * 'rock' - Muda diretamente para planeta rochoso
 *          (limpa todas as balas e desliga indicador de velocidade)
 * 
 * 'star' - Muda diretamente para estrela
 *          (limpa todas as balas e desliga indicador de velocidade)
 * 
 * 'toggle distance' - Toggle: liga/desliga indicação de altura (linha tracejada e setas)
 * 
 * 'hide instructions' / 'show instructions' - Liga/desliga painel de instruções
 * 
 * === Comandos de Órbita ===
 * 
 * 'show elliptical orbit' - Mostra órbita elíptica da Terra ao redor da estrela
 *                          (desliga canhão, gravidade e velocidades da elipse por padrão)
 * 
 * 'hide elliptical orbit' - Esconde órbita elíptica
 * 
 * 'show circular orbit' - Mostra órbita circular da Terra ao redor da estrela (satélite)
 * 
 * 'hide circular orbit' - Esconde órbita circular
 * 
 * === Comandos de Disparo ===
 * 
 * 'fire 1' a 'fire 6' - Dispara bala nas velocidades 1, 2, 3, 4, 5, 6 km/s (proporcional para estrela)
 * 
 * 'fire orbital' - Dispara bala na velocidade orbital (ajustada)
 *                  (para Terra: ~7.3 km/s, para estrela: ~402 km/s)
 * 
 * 'fire escape' - Dispara bala na velocidade de escape
 *                 (para Terra: ~9.76 km/s, para estrela: ~618 km/s)
 * 
 * 'cancel fire' - Desliga mostrador de velocidade (cancela disparo agendado)
 * 
 * === Comandos de Tamanho do Planeta ===
 * 
 * 'shrink planet' - Diminui o tamanho do planeta em 50% do tamanho atual
 *                   (com animação suave, permite diminuir até 1.5% para visualizar buraco negro)
 *                   (buraco negro aparece quando tamanho < 3.1%)
 * 
 * 'grow planet' - Volta o tamanho do planeta para 100% (com animação suave)
 * 
 * === Comandos do Humano ===
 * 
 * 'hide human' / 'show human' - Liga/desliga humano
 * 
 * 'kill human' - Mata o humano (remove da tela)
 * 
 * 'move human down' - Move humano entre linha tracejada e superfície atual do planeta
 * 
 */

