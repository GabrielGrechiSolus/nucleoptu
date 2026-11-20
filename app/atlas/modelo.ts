export type Categoria = 'cliente' | 'glosa' | 'parametro' | 'configuracao' | 'regra';
export type Dominio = 'intercambio' | 'contas' | 'atendimento' | 'gestao' | 'plataforma';
export interface FonteAtlas {
    arquivo: string;
    linha: number;
    trecho: string;
    blob: string;
    alterado: boolean;
    url: string;
}
export interface RegraAtlas {
    id: string;
    repo: string;
    titulo: string;
    categoria: Categoria;
    resumo: string;
    cnpjs: string[];
    termos: string[];
    fonte: FonteAtlas;
    explicacao?: {
        quando: string;
        efeito: string;
        limites: string;
    };
}
export interface RepoAtlas {
    id: string;
    nome: string;
    descricao: string;
    dominio: Dominio;
    branch: string;
    sha: string;
    arquivos: number;
    ignorados: number;
    sinais: number;
    catalogados: number;
    alterado: boolean;
    atualizadoEm: string;
    url: string;
    categorias: Partial<Record<Categoria, number>>;
    estadoLeitura?: 'pendente' | 'lendo' | 'concluido' | 'erro';
    arquivosTotal?: number;
    cursor?: string;
    erroLeitura?: string;
    baseAtualizadaEm?: string;
    precisaConferir?: boolean;
    definicoes?: string[];
    chamadas?: {
        nome: string;
        arquivo: string;
        linha: number;
    }[];
    referencias?: ConexaoAtlas[];
}
export interface ConexaoAtlas {
    origem: string;
    destino: string;
    motivo: string;
    arquivo: string;
    linha: number;
    ocorrencias: number;
}
export interface CatalogoAtlas {
    versao: number;
    geradoEm: string;
    repos: RepoAtlas[];
    regras: RegraAtlas[];
    conexoes: ConexaoAtlas[];
    limites: string[];
    indexacaoDisponivel?: boolean;
    indexando?: boolean;
    erroIndexacao?: string;
    origem?: 'github';
}
export interface BlocoAtlas {
    repo: string;
    branch: string;
    sha: string;
    inicio: number;
    proximo: number;
    total: number;
    ignorados: number;
    regras: RegraAtlas[];
    sinais: number;
    definicoes: string[];
    chamadas: {
        nome: string;
        arquivo: string;
        linha: number;
    }[];
    referencias: ConexaoAtlas[];
    cursor?: string;
    concluido: boolean;
}
export interface RepoGitAtlas {
    nome: string;
    descricao: string;
    atualizadoEm: string;
    branch: string;
    url: string;
    arquivado: boolean;
}
export interface NovidadeAtlas {
    titulo: string;
    url: string;
    data: string;
    tipo: 'commit' | 'pr';
    sha?: string;
}
export const CATEGORIAS: Record<Categoria, string> = {
    cliente: 'Clientes e exceções', glosa: 'Glosas e validações', parametro: 'Parâmetros', configuracao: 'Configurações', regra: 'Regras e cálculos',
};
export const DOMINIOS: Record<Dominio, {
    nome: string;
    cor: string;
    descricao: string;
}> = {
    intercambio: { nome: 'Intercâmbio', cor: '#087f8c', descricao: 'Troca de informações entre operadoras' },
    contas: { nome: 'Contas e auditoria', cor: '#7953cb', descricao: 'Da cobrança à conferência do pagamento' },
    atendimento: { nome: 'Atendimento', cor: '#c87332', descricao: 'A jornada de quem usa o plano' },
    gestao: { nome: 'Gestão e operação', cor: '#437941', descricao: 'Os processos que sustentam a operação' },
    plataforma: { nome: 'Plataforma', cor: '#5b73a4', descricao: 'Serviços, integrações e qualidade' },
};
export function filtrarRegras(regras: RegraAtlas[], busca: string, repo: string, categoria: string) {
    const normaliza = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const termos = normaliza(busca).trim().split(/\s+/).filter(Boolean);
    const documento = busca.replace(/\D/g, '');
    return regras.filter((r) => (!repo || r.repo === repo) && (!categoria || r.categoria === categoria) &&
        ((!termos.length || termos.every((t) => normaliza(`${r.repo} ${r.titulo} ${r.resumo} ${r.termos.join(' ')} ${r.fonte.arquivo} ${r.cnpjs.join(' ')}`).includes(t))) ||
            (documento.length >= 8 && r.cnpjs.some((c) => c.replace(/\D/g, '').includes(documento)))));
}
