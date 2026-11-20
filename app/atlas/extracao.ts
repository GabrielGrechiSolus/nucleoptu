// Leitura de texto, sem executar fontes. Compartilhado pelo servidor e pelos testes.
import type { BlocoAtlas, Categoria, CatalogoAtlas, Dominio, RegraAtlas, RepoAtlas, RepoGitAtlas } from './modelo';
export const VERSAO_EXTRACAO = 2;
const EXTENSOES = /\.(sql|pas|dpr|dproj|java|php|tsx?|jsx?|cs|xml|ini|ya?ml|json|md)$/i;
const EXCLUIR = /(^|\/)(node_modules|vendor|dist|build|target|bin|obj|packages|\.git|\.next|historico)(\/|$)|(^|\/)\.env|lock(?:\.|$)|credential|secret|password|passwd|senha|token|service.account|firebase.adminsdk|private.key/i;
const SEGREDO = /password|passwd|senha|secret|token|private.?key|api.?key|connectionstring|bearer|credential/i;
const DEFINICAO = /create\s+or\s+replace\s+package\s+(?:body\s+)?(?:\w+\.)?(pkg_\w+)/i;
const DOCUMENTOS = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|(?<=['"])\d{14}(?=['"])/g;
const PADROES: [
    Categoria,
    RegExp,
    string,
    string
][] = [
    ['cliente', /\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/, 'Documento de cliente mencionado no código', 'Há um documento literal neste trecho. Confirme a condição e a vigência antes de concluir que é uma exceção exclusiva deste cliente.'],
    ['glosa', /glos[ae]|indevid|diverg[eê]nc|negad|n[aã]o.autoriz/i, 'Ponto de glosa ou validação', 'Este ponto menciona glosa ou recusa. Investigue a condição completa e o motivo antes de orientar o atendimento.'],
    ['parametro', /pkg_parametro|parametr[oa]|par[aâ]metr[oa]|regra_tiss_prestador/i, 'Comportamento controlado por parâmetro', 'O comportamento pode depender de uma opção. O código não informa o valor configurado no cliente.'],
    ['configuracao', /getenv|process\.env\.|readstring|readinteger|configurac|configuraç|feature.flag/i, 'Configuração que pode alterar o fluxo', 'Este ponto usa uma configuração. Confirme o ambiente e o valor aplicado antes de concluir a análise.'],
    ['regra', /aplica_redutor|valoriza|car[eê]ncia|coparticip|vig[eê]ncia|limite|desconto|acrescimo|acr[eé]scimo/i, 'Condição de cálculo ou atendimento', 'Há um sinal de limite, vigência ou cálculo. A leitura automática não confirma sozinha o comportamento final.'],
];
export function arquivoElegivel(arquivo: string, tamanho: number, modo = '100644') {
    return (modo === '100644' || modo === '100755') && tamanho <= 3000000 && EXTENSOES.test(arquivo) && !EXCLUIR.test(arquivo);
}
export function dominioDoRepositorio(nome: string): Dominio {
    if (/ptu|intercambio|sispac|a800/i.test(nome))
        return 'intercambio';
    if (/contas|banco|tiss|lerxml|auditoria/i.test(nome))
        return 'contas';
    if (/^(guias|crm|hss|solusweb)$|prestador|beneficiario|chatunimed/i.test(nome))
        return 'atendimento';
    if (/^(adm|ans|estoque|financ|pessoal|web_relatus)$|financeiro|contabil/i.test(nome))
        return 'gestao';
    return 'plataforma';
}
export const LIMITES_GIT = [
    'O mapa vem dos repositórios acessíveis pela integração GitHub da aplicação. Cada leitura usa a branch padrão e fica presa a um commit para não misturar versões.',
    'A leitura ocorre em blocos, com progresso visível e retomada neste navegador. Repositórios pendentes ou com falha não são considerados analisados.',
    'Até três pistas por categoria em cada arquivo; documentos de cliente não têm esse limite. São pistas automáticas, não regras de negócio validadas.',
    'Dependências, credenciais, binários, links simbólicos e arquivos acima de 3 MB ficam fora da leitura. Linhas com possíveis segredos não são exibidas.',
    'Menção de documento não comprova CNPJ válido ou exceção exclusiva. Parâmetros no código não informam os valores configurados no cliente.',
    'Conexões indicam referências no código ou na documentação. Agrupamentos por área e trilhas são formas de navegação; não comprovam um fluxo em produção.',
    'Commit e PR mergeado não confirmam release nem revision instalada no cliente. A leitura respeita os limites da API e pausa quando necessário.',
];
export function catalogoDoGit(repos: RepoGitAtlas[], agora = new Date().toISOString()): CatalogoAtlas {
    return { versao: VERSAO_EXTRACAO, origem: 'github', geradoEm: agora, limites: LIMITES_GIT, regras: [], conexoes: [], indexacaoDisponivel: true,
        repos: repos.map((r): RepoAtlas => ({ id: r.nome, nome: r.nome, descricao: r.descricao || 'Selecione este sistema para explorar suas fontes e relações.', dominio: dominioDoRepositorio(r.nome), branch: r.branch, sha: '', arquivos: 0, ignorados: 0, sinais: 0, catalogados: 0, alterado: false, atualizadoEm: r.atualizadoEm, url: r.url, categorias: {}, estadoLeitura: 'pendente' })) };
}
export function extrairArquivo(repo: string, arquivo: string, sha: string, blob: string, texto: string) {
    const regras: RegraAtlas[] = [];
    const definicoes = new Set<string>();
    const chamadas = new Map<string, {
        nome: string;
        arquivo: string;
        linha: number;
    }>();
    const referencias: BlocoAtlas['referencias'] = [];
    const contagem: Partial<Record<Categoria, number>> = {};
    const markdown = /\.md$/i.test(arquivo);
    let sinais = 0;
    texto.split(/\r?\n/).forEach((linha, index) => {
        if (!linha.trim() || SEGREDO.test(linha))
            return;
        const numero = index + 1;
        if (!markdown) {
            const definicao = DEFINICAO.exec(linha);
            if (definicao)
                definicoes.add(definicao[1].toLowerCase());
            for (const match of linha.matchAll(/\b(pkg_\w+)\s*\./gi)) {
                const nome = match[1].toLowerCase();
                if (!chamadas.has(nome))
                    chamadas.set(nome, { nome, arquivo, linha: numero });
            }
        }
        for (const match of linha.matchAll(/(?:\.\.[/\\]|github\.com[:/]solussaude\/)([\w.-]+)(?:[/\\]|(?=[)\s#])|$)/gi)) {
            const destino = match[1].replace(/\.git$/i, '');
            if (destino.toLowerCase() !== repo.toLowerCase())
                referencias.push({ origem: repo, destino, motivo: markdown ? 'Relação documentada' : 'Referência explícita de caminho', arquivo, linha: numero, ocorrencias: 1 });
        }
        if (markdown)
            return;
        const documentos = [...linha.matchAll(DOCUMENTOS)].map((m) => m[0]).filter((d) => new Set(d.replace(/\D/g, '')).size > 1);
        for (const [categoria, padrao, titulo, resumo] of PADROES) {
            if (!padrao.test(linha) || (categoria === 'cliente' && !documentos.length))
                continue;
            sinais++;
            if (categoria !== 'cliente' && (contagem[categoria] ?? 0) >= 3)
                break;
            contagem[categoria] = (contagem[categoria] ?? 0) + 1;
            const frase = [...linha.matchAll(/['"]([^'"\n]{12,160})['"]/g)].map((m) => m[1].trim()).find((s) => s.split(/\s+/).length >= 3 && !/\b(select|from|where|insert|update|delete|join|begin|varchar|and|or|then|class|function)\b|[{}=;<>]|https?:\/\//i.test(s));
            const contexto = (arquivo.split('/').pop() ?? arquivo).replace(/\.[^.]+$/, '').replace(/^(?:package_|pkg_)/i, '').replace(/_/g, ' ').slice(0, 65);
            regras.push({ id: `${repo}:${arquivo}:${blob}:${numero}:${categoria}`, repo, categoria, titulo: frase && categoria !== 'cliente' ? `Menção no código: ${frase}` : `${titulo} · ${contexto}`, resumo, cnpjs: [...new Set(documentos)], termos: [...new Set(linha.match(/\b(?:pkg_\w+|[a-z]\w{5,})\b/gi) ?? [])].slice(0, 12), fonte: { arquivo, linha: numero, trecho: linha.trim().slice(0, 350), blob, alterado: false, url: `https://github.com/solussaude/${encodeURIComponent(repo)}/blob/${sha}/${arquivo.split('/').map(encodeURIComponent).join('/')}#L${numero}` } });
            break;
        }
    });
    return { regras, sinais, definicoes: [...definicoes], chamadas: [...chamadas.values()], referencias };
}
export function reconstruirConexoes(repos: RepoAtlas[]) {
    const nomes = new Map(repos.map((r) => [r.id.toLowerCase(), r.id]));
    const provedores = new Map<string, string[]>();
    for (const r of repos)
        for (const nome of r.definicoes ?? [])
            provedores.set(nome, [...(provedores.get(nome) ?? []), r.id]);
    const conexoes = new Map<string, CatalogoAtlas['conexoes'][number]>();
    function incluir(c: CatalogoAtlas['conexoes'][number]) {
        const destino = nomes.get(c.destino.toLowerCase());
        if (!destino || destino === c.origem)
            return;
        const chave = `${c.origem}:${destino}:${c.motivo.startsWith('Uso de rotina') ? 'rotina' : c.motivo}`;
        const atual = conexoes.get(chave);
        conexoes.set(chave, atual ? { ...atual, ocorrencias: atual.ocorrencias + c.ocorrencias } : { ...c, destino });
    }
    for (const r of repos) {
        for (const c of r.referencias ?? [])
            incluir(c);
        for (const chamada of r.chamadas ?? [])
            for (const destino of provedores.get(chamada.nome) ?? [])
                incluir({ origem: r.id, destino, motivo: `Uso de rotina de banco (${chamada.nome})`, arquivo: chamada.arquivo, linha: chamada.linha, ocorrencias: 1 });
    }
    return [...conexoes.values()];
}
export function aplicarBloco(catalogo: CatalogoAtlas, bloco: BlocoAtlas): CatalogoAtlas {
    const anterior = catalogo.repos.find((r) => r.id === bloco.repo);
    if (!anterior)
        return catalogo;
    // Repetição de uma resposta não duplica contadores. Outro commit nunca mistura regras antigas.
    if (anterior.sha === bloco.sha && anterior.arquivos >= bloco.proximo && (bloco.proximo > 0 || anterior.estadoLeitura === 'concluido')) {
        if (anterior.estadoLeitura === 'concluido' && anterior.precisaConferir) return { ...catalogo, repos: catalogo.repos.map((r) => r.id === bloco.repo ? { ...r, precisaConferir: false, baseAtualizadaEm: r.atualizadoEm } : r) };
        return catalogo;
    }
    const mesmaVersao = anterior.sha === bloco.sha;
    const antigas = mesmaVersao ? catalogo.regras : catalogo.regras.filter((r) => r.repo !== bloco.repo);
    const regras = [...new Map([...antigas, ...bloco.regras].map((r) => [r.id, r])).values()];
    const categorias: RepoAtlas['categorias'] = {};
    for (const r of regras)
        if (r.repo === bloco.repo)
            categorias[r.categoria] = (categorias[r.categoria] ?? 0) + 1;
    const novo: RepoAtlas = { ...anterior, branch: bloco.branch, sha: bloco.sha, arquivos: bloco.proximo, arquivosTotal: bloco.total, ignorados: bloco.ignorados, catalogados: Object.values(categorias).reduce((a, b) => a + b, 0), categorias, sinais: (mesmaVersao && anterior.arquivos === bloco.inicio ? anterior.sinais : 0) + bloco.sinais, estadoLeitura: bloco.concluido ? 'concluido' : 'lendo', cursor: bloco.cursor, erroLeitura: '', baseAtualizadaEm: mesmaVersao ? anterior.baseAtualizadaEm ?? anterior.atualizadoEm : anterior.atualizadoEm, precisaConferir: mesmaVersao ? anterior.precisaConferir : false,
        definicoes: [...new Set([...(mesmaVersao ? anterior.definicoes ?? [] : []), ...bloco.definicoes])],
        chamadas: [...new Map([...(mesmaVersao ? anterior.chamadas ?? [] : []), ...bloco.chamadas].map((c) => [c.nome, c])).values()],
        referencias: [...new Map([...(mesmaVersao ? anterior.referencias ?? [] : []), ...bloco.referencias].map((c) => [`${c.destino}:${c.arquivo}:${c.linha}`, c])).values()] };
    const repos = catalogo.repos.map((r) => r.id === bloco.repo ? novo : r);
    return { ...catalogo, repos, regras, conexoes: reconstruirConexoes(repos), geradoEm: new Date().toISOString() };
}
