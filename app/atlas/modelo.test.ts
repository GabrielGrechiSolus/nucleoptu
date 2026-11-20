import { filtrarRegras, type RegraAtlas } from './modelo';
const regra = (overrides: Partial<RegraAtlas> = {}): RegraAtlas => ({ id: '1', repo: 'banco', titulo: 'Coparticipação por vigência', categoria: 'cliente', resumo: 'Exceção de cliente', cnpjs: ['07945024000162'], termos: ['DMED'], fonte: { arquivo: 'regra.sql', linha: 10, trecho: 'condição', blob: 'sha', alterado: false, url: '' }, ...overrides });
test('combina assunto sem acentos com repositório e categoria', () => {
    const regras = [regra(), regra({ id: '2', repo: 'ptu', categoria: 'glosa' })];
    expect(filtrarRegras(regras, 'coparticipacao vigencia', 'banco', 'cliente').map((r) => r.id)).toEqual(['1']);
    expect(filtrarRegras(regras, 'vigencia', 'ptu', 'cliente')).toHaveLength(0);
});
test('localiza CNPJ com pontuação e com dígitos', () => {
    expect(filtrarRegras([regra()], '07.945.024/0001-62', '', '')).toHaveLength(1);
    expect(filtrarRegras([regra()], '07945024', '', '')).toHaveLength(1);
    expect(filtrarRegras([regra()], '00000000000000', '', '')).toHaveLength(0);
});
test('a busca também considera os termos e a fonte, sem ignorar outros filtros', () => {
    expect(filtrarRegras([regra()], 'DMED', '', '')).toHaveLength(1);
    expect(filtrarRegras([regra()], 'regra.sql', 'contas', '')).toHaveLength(0);
});
