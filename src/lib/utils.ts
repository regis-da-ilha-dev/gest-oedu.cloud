import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { format, formatDistanceToNow, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Comprehensive list of prefixes and suffixes that represent valid compound word parts in academic, medical, and legal Portuguese
const PREFIXES_REGEXP = /^(pré|pós|vice|anti|contra|auto|co|sub|super|neo|extra|micro|macro|infra|inter|intra|pseudo|semi|ultra|recém|além|aquém|recem|alem|aquem|bem|mal|grão|grã|grao|gra|tele|multi|pluri|pan|circum|hiper|hyper|pro|sobre|proto|psico|socio|sócio|sul|norte|leste|oeste|sudeste|nordeste|sudoeste|noroeste|luso|ítalo|italo|anglo|franco|nipo|sino|euro|afro|de|da|do|dos|das|guarda|couve|pára|para|porta|passa|ex|nã|não|quase|centro|relação|público|pública|decreto|medida|massa|boa|má|salário|servidor|audiência|médico|físico|químico|histórico|social|econômico|político|jurídico|administrativo|financeiro|trabalhista|previdenciário|processual|constitucional|civil|penal|tributário|comercial|e)$/i;

const SUFFIXES_REGEXP = /^(chuva|civil|prima|chave|feira|semana|vistas|de|se|governo|estado|membro|sol|dia|noite|africano|africana|americano|americana|brasileiro|brasileira|europeu|europeia|ásia|asia|asiático|asiática|médio|medio|norte|sul|leste|oeste|se|me|te|nos|vos|lhe|lhes|o|a|os|as|lo|la|los|las|no|na|nos|nas|obra|rosa|colônia|colonia|sol|ponto|pontos|lei|leis|provisória|provisórias|falida|falidas|vindo|vindos|vinda|vindas|estar|estares|fé|fés|cirurgião|cirurgiões|veterinário|legista|família|maternidade|público|públicos|pública|públicas|geral|gerais|trabalho|trabalhos|philosophia|philosophiae|positivismo|naturalismo|faire|law|presidente|presidentes|assinado|assinados|contrato|contratos|cumulativo|cumulativos|cumulativa|cumulativas|governamental|governamentais|judicial|judiciais|curriculares|mail|mails|feedback|feedbacks)$/i;

export function sanitizeText(text: any): string {
  if (text === null || text === undefined) return '';
  
  let strVal = '';
  try {
    strVal = String(text);
  } catch (e) {
    return '';
  }
  
  let cleaned = strVal.trim();

  // Fix common encoding artifacts (Mojibake)
  const replacements: Record<string, string> = {
    'Ã¡': 'á', 'Ã ': 'à', 'Ã¢': 'â', 'Ã£': 'ã', 'Ã¤': 'ä',
    'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã«': 'ë',
    'Ã­': 'í', 'Ã¬': 'ì', 'Ã®': 'î', 'Ã¯': 'ï',
    'Ã³': 'ó', 'Ã²': 'ò', 'Ã´': 'ô', 'Ãµ': 'õ', 'Ã¶': 'ö',
    'Ãº': 'ú', 'Ã¹': 'ù', 'Ã»': 'û', 'Ã¼': 'ü',
    'Ã§': 'ç', 'Ã': 'Ç',
    'Ã': 'Á', 'Ã': 'À', 'Ã': 'Â', 'Ã': 'Ã', 'Ã': 'Ä',
    'Ã': 'É', 'Ã': 'È', 'Ã': 'Ê', 'Ã': 'Ë',
    'Ã': 'Í', 'Ã': 'Ì', 'Ã': 'Î', 'Ã': 'Ï',
    'Ã': 'Ó', 'Ã': 'Ò', 'Ã': 'Ô', 'Ã': 'Õ', 'Ã': 'Ö',
    'Ã': 'Ú', 'Ã': 'Ù', 'Ã': 'Û', 'Ã': 'Ü',
    'â': '–', 'â': '—', 'â': "'", 'â': "'", 'â': '"', 'â': '"',
    'Âº': 'º', 'Âª': 'ª', 'Â°': '°',
    '#$': '', // As requested by user "exemplos: #$"
  };

  // We only replace Â if it is clearly part of a two-character artifact (like Âº, Âª, Â°)
  // If it's by itself followed by a space, it's usually an artifact of double encoding.
  // We NEVER replace Â if it's the start of a word or followed by a letter.
  cleaned = cleaned.replace(/Â(?=\s)/g, ''); 
  cleaned = cleaned.replace(/Â(?=[ºª°])/g, '');

  Object.entries(replacements).forEach(([broken, fixed]) => {
    cleaned = cleaned.split(broken).join(fixed);
  });

  // Remove control characters and non-printable artifacts
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");

  // Uni­fy common compound word components and prepositions
  const prefixes = /^(pré|pós|vice|anti|contra|auto|co|sub|super|neo|extra|micro|macro|infra|inter|intra|pseudo|semi|ultra|recém|além|aquém|recem|alem|aquem|bem|mal|grão|grã|grao|gra|tele|multi|pluri|pan|circum|hiper|hyper|pro|sobre|proto|psico|socio|sócio|sul|norte|leste|oeste|sudeste|nordeste|sudoeste|noroeste|luso|ítalo|italo|anglo|franco|nipo|sino|euro|afro|de|da|do|dos|das|guarda|couve|pára|para|porta|passa|ex|nã|não|quase|centro|relação|público|pública|decreto|medida|massa|boa|má|salário|servidor|audiência|médico|físico|químico|histórico|social|econômico|político|jurídico|administrativo|financeiro|trabalhista|previdenciário|processual|constitucional|civil|penal|tributário|comercial|e)$/i;
  const suffixes = /^(chuva|civil|prima|chave|feira|semana|vistas|de|se|governo|estado|membro|sol|dia|noite|africano|africana|americano|americana|brasileiro|brasileira|europeu|europeia|ásia|asia|asiático|asiática|médio|medio|norte|sul|leste|oeste|se|me|te|nos|vos|lhe|lhes|o|a|os|as|lo|la|los|las|no|na|nos|nas|obra|rosa|colônia|colonia|sol|ponto|pontos|lei|leis|provisória|provisórias|falida|falidas|vindo|vindos|vinda|vindas|estar|estares|fé|fés|cirurgião|cirurgiões|veterinário|legista|família|maternidade|público|públicos|pública|públicas|geral|gerais|trabalho|trabalhos|philosophia|philosophiae|positivismo|naturalismo|faire|law|presidente|presidentes|assinado|assinados|contrato|contratos|cumulativo|cumulativos|cumulativa|cumulativas|governamental|governamentais|judicial|judiciais|curriculares|mail|mails|feedback|feedbacks)$/i;

  // Remove soft hyphens, zero-width spaces globally
  cleaned = cleaned.replace(/\u00ad/g, '');
  cleaned = cleaned.replace(/&shy;/g, '');
  cleaned = cleaned.replace(/\xad/g, '');
  cleaned = cleaned.replace(/\u200b/g, '');
  cleaned = cleaned.replace(/\u200c/g, '');
  cleaned = cleaned.replace(/\u200d/g, '');

  // Exact replacement for specific terms
  cleaned = cleaned.replace(/ar-\s+gui/gi, 'argui');
  cleaned = cleaned.replace(/he-\s+roi-\s+co/gi, 'heroico');
  cleaned = cleaned.replace(/he-\s+roico/gi, 'heroico');
  cleaned = cleaned.replace(/heroi-\s+co/gi, 'heroico');
  cleaned = cleaned.replace(/im-\s+bro-\s+glio/gi, 'imbróglio');
  cleaned = cleaned.replace(/im-\s+bróglio/gi, 'imbróglio');
  cleaned = cleaned.replace(/imbró-\s+glio/gi, 'imbróglio');
  cleaned = cleaned.replace(/ba-\s+seou/gi, 'baseou');

  // Cure corrupted hyphens that became question marks (e.g. "dar?se" -> "dar-se", "pré?requisito" -> "pré-requisito")
  cleaned = cleaned.replace(/([a-zA-ZÀ-ÿ])\?([a-zA-ZÀ-ÿ])/gu, '$1-$2');
  cleaned = cleaned.replace(/([a-zA-ZÀ-ÿ]+)\s*\?\s*(se|me|te|nos|vos|lhe|lhes|o|a|os|as|lo|la|los|las|no|na|nos|nas)\b/gi, '$1-$2');
  cleaned = cleaned.replace(/\b(pré|pós|vice|anti|contra|auto|co|sub|super|neo|extra|micro|macro|infra|inter|intra|pseudo|semi|ultra|recém|além|aquém|bem|mal|grão|grã|ex|não)\s*\?\s*([a-zA-ZÀ-ÿ]+)/gi, '$1-$2');
  cleaned = cleaned.replace(/([a-zA-ZÀ-ÿ]+)-\s*\?\s*([a-zA-ZÀ-ÿ]+)/gu, '$1-$2');
  cleaned = cleaned.replace(/([a-zA-ZÀ-ÿ]+)\s*\?\s*-([a-zA-ZÀ-ÿ]+)/gu, '$1-$2');

  // Heal actual line split hyphenation ONLY when separated by line breaks/newlines
  cleaned = cleaned.replace(/([a-zA-ZÀ-ÿ]+)\s*-\s*[\r\n]+\s*([a-zA-ZÀ-ÿ]+)/gu, (match, p1, p2) => {
    const isPronoun = /^(se|me|te|nos|vos|lhe|lhes|o|a|os|as|lo|la|los|las|no|na|nos|nas)$/i.test(p2);
    if (isPronoun || prefixes.test(p1) || suffixes.test(p2)) return p1 + '-' + p2;
    return p1 + p2;
  });

  // Heal space after hyphen split (e.g. "constitu- cional")
  cleaned = cleaned.replace(/([a-zA-ZÀ-ÿ]+)-\s+([a-zA-ZÀ-ÿ]+)/gu, (match, p1, p2) => {
    const isPronoun = /^(se|me|te|nos|vos|lhe|lhes|o|a|os|as|lo|la|los|las|no|na|nos|nas)$/i.test(p2);
    if (isPronoun || prefixes.test(p1) || suffixes.test(p2)) return p1 + '-' + p2;
    return p1 + p2;
  });

  // Standard correct typed hyphens with NO spaces (e.g. "bem-vindo", "relação-custo-benefício") are ALWAYS preserved intact.

  return cleaned;
}

export function preventHyphenBreak(html: any): string {
  if (html === null || html === undefined) return '';
  
  let strVal = '';
  try {
    strVal = String(html);
  } catch (e) {
    return '';
  }

  if (!strVal) return '';

  const prefixes = /^(pré|pós|vice|anti|contra|auto|co|sub|super|neo|extra|micro|macro|infra|inter|intra|pseudo|semi|ultra|recém|além|aquém|recem|alem|aquem|bem|mal|grão|grã|grao|gra|tele|multi|pluri|pan|circum|hiper|hyper|pro|sobre|proto|psico|socio|sócio|sul|norte|leste|oeste|sudeste|nordeste|sudoeste|noroeste|luso|ítalo|italo|anglo|franco|nipo|sino|euro|afro|de|da|do|dos|das|guarda|couve|pára|para|porta|passa|ex|nã|não|quase|centro|relação|público|pública|decreto|medida|massa|boa|má|salário|servidor|audiência|médico|físico|químico|histórico|social|econômico|político|jurídico|administrativo|financeiro|trabalhista|previdenciário|processual|constitucional|civil|penal|tributário|comercial|e)$/i;
  const suffixes = /^(chuva|civil|prima|chave|feira|semana|vistas|de|se|governo|estado|membro|sol|dia|noite|africano|africana|americano|americana|brasileiro|brasileira|europeu|europeia|ásia|asia|asiático|asiática|médio|medio|norte|sul|leste|oeste|se|me|te|nos|vos|lhe|lhes|o|a|os|as|lo|la|los|las|no|na|nos|nas|obra|rosa|colônia|colonia|sol|ponto|pontos|lei|leis|provisória|provisórias|falida|falidas|vindo|vindos|vinda|vindas|estar|estares|fé|fés|cirurgião|cirurgiões|veterinário|legista|família|maternidade|público|públicos|pública|públicas|geral|gerais|trabalho|trabalhos|philosophia|philosophiae|positivismo|naturalismo|faire|law|presidente|presidentes|assinado|assinados|contrato|contratos|cumulativo|cumulativos|cumulativa|cumulativas|governamental|governamentais|judicial|judiciais|curriculares|mail|mails|feedback|feedbacks)$/i;

  // 1. Remove all soft hyphens & zero width spaces globally
  strVal = strVal.replace(/\u00ad/g, '');
  strVal = strVal.replace(/&shy;/g, '');
  strVal = strVal.replace(/\xad/g, '');
  strVal = strVal.replace(/\u200b/g, '');
  strVal = strVal.replace(/\u200c/g, '');
  strVal = strVal.replace(/\u200d/g, '');

  // 2. Heal word hyphens broken across HTML tag boundaries (e.g. organiz-</p><p>ação)
  strVal = strVal.replace(/([a-zA-ZÀ-ÿ]+)-\s*((?:<[^>]+>\s*)+)([a-zA-ZÀ-ÿ]+)/gu, (match, p1, tags, p2) => {
    const isPronoun = /^(se|me|te|nos|vos|lhe|lhes|o|a|os|as|lo|la|los|las|no|na|nos|nas)$/i.test(p2);
    if (isPronoun) return p1 + '\u2011' + p2 + tags;
    if (prefixes.test(p1) || suffixes.test(p2)) {
      return p1 + '\u2011' + p2 + tags;
    }
    return p1 + p2 + tags;
  });

  // Separate HTML into tags and text nodes to protect class names and style declarations
  const parts = strVal.split(/(<[^>]+>)/g);
  
  const processedParts = parts.map((part, index) => {
    // If it's an HTML tag, return it unmodified
    if (index % 2 !== 0) {
      return part;
    }
    
    let text = part;

    // Direct exact replacements
    text = text.replace(/ar-\s+gui/gi, 'argui');
    text = text.replace(/he-\s+roi-\s+co/gi, 'heroico');
    text = text.replace(/he-\s+roico/gi, 'heroico');
    text = text.replace(/heroi-\s+co/gi, 'heroico');
    text = text.replace(/im-\s+bro-\s+glio/gi, 'imbróglio');
    text = text.replace(/im-\s+bróglio/gi, 'imbróglio');
    text = text.replace(/imbró-\s+glio/gi, 'imbróglio');
    text = text.replace(/ba-\s+seou/gi, 'baseou');

    // Cure corrupted hyphens that became question marks (e.g. "dar?se" -> "dar-se" with non-breaking hyphen representation)
    text = text.replace(/([a-zA-ZÀ-ÿ])\?([a-zA-ZÀ-ÿ])/gu, '$1\u2011$2');
    text = text.replace(/([a-zA-ZÀ-ÿ]+)\s*\?\s*(se|me|te|nos|vos|lhe|lhes|o|a|os|as|lo|la|los|las|no|na|nos|nas)\b/gi, '$1\u2011$2');
    text = text.replace(/\b(pré|pós|vice|anti|contra|auto|co|sub|super|neo|extra|micro|macro|infra|inter|intra|pseudo|semi|ultra|recém|além|aquém|bem|mal|grão|grã|ex|não)\s*\?\s*([a-zA-ZÀ-ÿ]+)/gi, '$1\u2011$2');
    text = text.replace(/([a-zA-ZÀ-ÿ]+)-\s*\?\s*([a-zA-ZÀ-ÿ]+)/gu, '$1\u2011$2');
    text = text.replace(/([a-zA-ZÀ-ÿ]+)\s*\?\s*-([a-zA-ZÀ-ÿ]+)/gu, '$1\u2011$2');

    // Heal actual line split hyphenation ONLY when separated by line breaks/newlines
    text = text.replace(/([a-zA-ZÀ-ÿ]+)\s*-\s*[\r\n]+\s*([a-zA-ZÀ-ÿ]+)/gu, (match, p1, p2) => {
      const isPronoun = /^(se|me|te|nos|vos|lhe|lhes|o|a|os|as|lo|la|los|las|no|na|nos|nas)$/i.test(p2);
      if (isPronoun || prefixes.test(p1) || suffixes.test(p2)) return p1 + '\u2011' + p2;
      return p1 + p2;
    });

    // Heal space after hyphen split (e.g. "constitu- cional")
    text = text.replace(/([a-zA-ZÀ-ÿ]+)-\s+([a-zA-ZÀ-ÿ]+)/gu, (match, p1, p2) => {
      const isPronoun = /^(se|me|te|nos|vos|lhe|lhes|o|a|os|as|lo|la|los|las|no|na|nos|nas)$/i.test(p2);
      if (isPronoun || prefixes.test(p1) || suffixes.test(p2)) return p1 + '\u2011' + p2;
      return p1 + p2;
    });

    // Standard correct typed hyphens with NO spaces (e.g. "bem-vindo") are ALWAYS preserved intact and styled with non-breaking hyphen for display
    text = text.replace(/([a-zA-ZÀ-ÿ]+)-([a-zA-ZÀ-ÿ]+)/gu, (match, p1, p2) => {
      return p1 + '\u2011' + p2;
    });

    return text;
  });

  return processedParts.join('');
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeFormat(date: any, formatStr: string): string {
  try {
    const d = new Date(date);
    if (!isValid(d)) return 'Data inválida';
    return format(d, formatStr, { locale: ptBR });
  } catch (e) {
    return 'Erro na data';
  }
}

export function safeFormatDistanceToNow(date: any): string {
  try {
    const d = new Date(date);
    if (!isValid(d)) return 'Nunca';
    return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
  } catch (e) {
    return 'Erro na data';
  }
}



export function limitEnunciationTo20WordsPerLine(html: string | undefined | null): string {
  if (html === null || html === undefined) return '';

  let strVal = '';
  try {
    strVal = String(html);
  } catch (e) {
    return '';
  }

  if (!strVal) return '';

  // Split HTML into tags and text nodes to protect markup structures
  const parts = strVal.split(/(<[^>]+>)/g);
  
  let processedHtml = '';
  let lineWordCount = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    const isHtmlTag = part.startsWith('<') && part.endsWith('>');

    if (isHtmlTag) {
      const lowerTag = part.toLowerCase();
      // Block-level or line-breaking tags reset the word count for the new line context
      if (
        lowerTag.includes('<br') || 
        lowerTag.includes('<p') || 
        lowerTag.includes('</p') || 
        lowerTag.includes('<div') || 
        lowerTag.includes('</div') || 
        lowerTag.includes('<blockquote') ||
        lowerTag.includes('</blockquote') ||
        lowerTag.includes('<li') ||
        lowerTag.includes('</li') ||
        lowerTag.includes('<ul') ||
        lowerTag.includes('</ul') ||
        lowerTag.includes('<ol') ||
        lowerTag.includes('</ol')
      ) {
        lineWordCount = 0;
      }
      processedHtml += part;
    } else {
      // Process text node. Split by spaces but preserve whitespace boundaries
      const subparts = part.split(/(\s+)/g);
      
      for (const subpart of subparts) {
        if (!subpart) continue;

        if (/^\s+$/.test(subpart)) {
          processedHtml += subpart;
        } else {
          // This subpart is a word.
          lineWordCount++;
          if (lineWordCount > 20) {
            // Insert line break prior to this word since it would exceed 20 words.
            processedHtml += '<br class="q-20w-break" />';
            lineWordCount = 1;
          }
          processedHtml += subpart;
        }
      }
    }
  }

  return processedHtml;
}

export function limitEnunciationTo23WordsPerLine(html: string | undefined | null): string {
  return limitEnunciationTo20WordsPerLine(html);
}

