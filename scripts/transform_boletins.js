const fs = require('fs');
const path = require('path');

const inPath = path.join(__dirname, '..', 'app', 'utils', 'boletins_unimed_import.json');
const outPath = path.join(__dirname, '..', 'app', 'utils', 'boletins_unimed_for_import.json');

function main() {
  if (!fs.existsSync(inPath)) {
    console.error('Arquivo de entrada não encontrado:', inPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(inPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao parsear JSON de entrada:', e.message);
    process.exit(1);
  }

  if (!Array.isArray(parsed)) {
    console.error('Formato inválido: espera um array');
    process.exit(1);
  }

  const transformed = parsed.map((item) => {
    const title = Array.isArray(item.assuntos) && item.assuntos.length ? item.assuntos.join(' | ') : (item.title || item.assunto || 'Sem título');

    const parts = [];
    if (item.assuntos_relevantes) parts.push(String(item.assuntos_relevantes).trim());
    if (item.acao) parts.push('Ação: ' + String(item.acao).trim());
    if (item.vigencia) parts.push('Vigência: ' + String(item.vigencia).trim());
    if (item.chamado) parts.push('Chamado: ' + String(item.chamado).trim());
    if (item.info_solus) parts.push('Info Solus: ' + String(item.info_solus).trim());
    // include additional assuntos beyond the first
    if (Array.isArray(item.assuntos) && item.assuntos.length > 1) {
      parts.unshift('Assuntos: ' + item.assuntos.join(' | '));
    }

    const description = parts.join(' \n');

    const link = item.link || '';
    const type = link ? 'site' : 'texto';

    return {
      title,
      description,
      link,
      type,
      importance: item.importance || 'medium',
      target: item.target || 'todos',
      active: item.active !== false,
      // omit createdAt so importer will set Date.now() when missing
      creatorEmail: item.creatorEmail || undefined,
      readBy: Array.isArray(item.readBy) ? item.readBy : [],
    };
  });

  fs.writeFileSync(outPath, JSON.stringify(transformed, null, 2), 'utf8');
  console.log('Arquivo gerado:', outPath, 'com', transformed.length, 'registros');
}

main();
