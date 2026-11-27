import { indiceDoChamado, ondeEncontrou } from './buscaChamado';
import { FILTROS_VAZIOS, filtraChamados } from './filtro';
import { montaChamado } from './parse';
import type { RegistroBm } from './bmRegistro';
import type { CartaoQuadro } from './bmQuadro';

const chamado = montaChamado('568.361-x', {
  'REGRA.md': '---\nchamado: 568.361\ncliente: Unimed Limeira\nassunto: Arquivo rejeitado\ntipo: correcao\nsituacao: corrigido\npr: banco#1234\n---\n\n## Problema\nTexto.',
  'GITHUB.md': 'Descrição do PR: ajusta a coparticipação do beneficiário.',
})!;

const registro = {
  chamado: '568361', encontrado: true, cardId: 45678, sincronizadoEm: '', sincronizadoPor: '',
  resumo: { cardId: 45678, chamado: '568361', coluna: 'Aguardando Homologação', secao: 'Análise', bloqueado: false, prazo: '', responsavel: 'Marina Souza', url: 'https://empresa.businessmap.io/ctrl_board/45/cards/45678/', atualizadoEm: '' },
  cartao: {
    titulo: 'Rejeição no A580', tipo: 'Correção', raia: '', prioridade: 'Alta', tamanho: '', coResponsaveis: ['Carlos Lima'], solicitante: 'Fulano', observadores: [], descricao: 'Erro na glosa do protocolo', tags: ['urgente'], motivoBloqueio: '',
    campos: [{ nome: 'Texto de conclusão', valor: 'Liberado via revision', grupo: '' }], subtarefas: [{ descricao: 'Montar evidência', concluida: false, responsavel: '', concluidaEm: '' }],
    comentarios: [{ autor: 'Beatriz', em: '', texto: 'Cliente confirmou o reprocessamento' }], anexos: [{ nome: 'retorno.xml', link: '' }], vinculados: [{ cardId: 99, chamado: '570.276', titulo: 'Relacionado', coluna: '', tipoVinculo: '' }],
    tempos: [], conferencia: [],
  },
} as unknown as RegistroBm;

const doQuadro = { cardId: 777, customId: '568361', numero: '568361', titulo: 'Report: 568.361 voltou', tipo: 'Bug', coluna: 'Triagem', responsavel: 'Paulo', url: '' } as CartaoQuadro;

const busca = (texto: string, semGit = false) => {
  const indices = new Map([[chamado.id, indiceDoChamado(chamado, registro, [doQuadro], semGit)]]);
  return filtraChamados([chamado], { ...FILTROS_VAZIOS, busca: texto }, indices).length === 1;
};

describe('busca profunda do contexto de chamados', () => {
  it.each([
    'coparticipacao', 'homologacao', 'marina', 'rejeicao a580', 'glosa protocolo', 'reprocessamento', 'beatriz', 'revision liberado', 'evidencia', 'retorno.xml', '570276', '45678', 'urgente', 'carlos', 'voltou paulo',
    'https://empresa.businessmap.io/ctrl_board/45/cards/45678/details/', 'limeira marina #1234',
  ])('encontra por "%s" sem marcar opção nenhuma', (texto) => {
    expect(busca(texto)).toBe(true);
  });

  it('continua não encontrando o que não existe', () => {
    expect(busca('araguaina')).toBe(false);
  });

  it('diz de onde veio o resultado quando não está no cabeçalho do chamado', () => {
    const indice = indiceDoChamado(chamado, registro, [doQuadro]);
    expect(ondeEncontrou(indice, 'limeira')).toEqual([]);
    expect(ondeEncontrou(indice, 'limeira reprocessamento')).toEqual(['Businessmap']);
    expect(ondeEncontrou(indice, 'coparticipacao')).toEqual(['Documentos']);
    expect(ondeEncontrou(indice, 'banco#1234')).toEqual(['PR e Git']);
  });
});
