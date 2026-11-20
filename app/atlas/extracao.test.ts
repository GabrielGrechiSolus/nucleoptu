import { aplicarBloco, arquivoElegivel, catalogoDoGit, extrairArquivo } from './extracao';
import type { BlocoAtlas } from './modelo';
const mapa = () => catalogoDoGit(['ptu', 'banco'].map((nome) => ({ nome, descricao: '', atualizadoEm: '2026-11-20', branch: 'develop', url: '', arquivado: false })));
const bloco = (repo: string, sha = 'sha'): BlocoAtlas => ({ repo, sha, branch: 'develop', inicio: 0, proximo: 1, total: 1, ignorados: 0, regras: [], sinais: 0, definicoes: [], chamadas: [], referencias: [], concluido: true });
test('exclui credenciais, dependências, binários e links simbólicos', () => {
    for (const p of ['.env', '.env.local.ts', 'node_modules/arquivo.ts', 'firebase-adminsdk.json', 'private_key.json', 'service-account.json', 'senha.ini'])
        expect(arquivoElegivel(p, 100)).toBe(false);
    expect(arquivoElegivel('arquivo.sql', 3000001)).toBe(false);
    expect(arquivoElegivel('arquivo.sql', 100, '120000')).toBe(false);
    expect(arquivoElegivel('hss/regra.sql', 100)).toBe(true);
});
test('extrai CNPJs sem limite de três exemplos e não publica segredos', () => {
    const texto = Array.from({ length: 7 }, (_, i) => `if cnpj = '1234567800019${i}' then glosa();`).join('\n') + "\npassword = 'segredo-glosa';\nmascara = '99.999.999/9999-99';";
    const data = extrairArquivo('ptu', 'fonte.sql', 'commit', 'blob', texto);
    expect(data.regras.filter((r) => r.categoria === 'cliente')).toHaveLength(7);
    expect(JSON.stringify(data.regras)).not.toContain('segredo-glosa');
    expect(data.regras[0].fonte.linha).toBe(1);
});
test('reconstrói relações de rotina quando o fornecedor é descoberto depois do consumidor', () => {
    const a = { ...bloco('ptu'), ...extrairArquivo('ptu', 'ptu.pas', 'sha', '1', 'pkg_exemplo.calcula();') };
    const b = { ...bloco('banco'), ...extrairArquivo('banco', 'pkg.sql', 'sha', '2', 'create or replace package pkg_exemplo as') };
    const novo = aplicarBloco(aplicarBloco(mapa(), a), b);
    expect(novo.conexoes).toEqual([expect.objectContaining({ origem: 'ptu', destino: 'banco' })]);
    expect(aplicarBloco(novo, a)).toBe(novo);
});
test('outro commit remove pistas antigas desse sistema e mantém as de outros sistemas', () => {
    const a = { ...bloco('ptu'), ...extrairArquivo('ptu', 'ptu.pas', 'sha', '1', 'aplica_redutor();') };
    const velho = aplicarBloco(mapa(), a);
    const novo = aplicarBloco(velho, bloco('ptu', 'outro-commit'));
    expect(velho.regras).toHaveLength(1);
    expect(novo.regras).toHaveLength(0);
});
test('push em outra branch não força reler um commit já analisado', () => {
    const antigo = aplicarBloco(mapa(), bloco('ptu'));
    antigo.repos = antigo.repos.map((r) => r.id === 'ptu' ? { ...r, atualizadoEm: '2026-11-21', precisaConferir: true } : r);
    const novo = aplicarBloco(antigo, bloco('ptu'));
    expect(novo.repos[0].precisaConferir).toBe(false);
    expect(novo.repos[0].baseAtualizadaEm).toBe('2026-11-21');
    expect(novo.regras).toEqual(antigo.regras);
});
test('atualização durante uma leitura não mistura as datas da versão fixada', () => {
    const primeiro = aplicarBloco(mapa(), { ...bloco('ptu'), total: 2, concluido: false, cursor: 'proximo' });
    primeiro.repos = primeiro.repos.map((r) => r.id === 'ptu' ? { ...r, atualizadoEm: '2026-11-21', precisaConferir: true } : r);
    const ultimo = aplicarBloco(primeiro, { ...bloco('ptu'), inicio: 1, proximo: 2, total: 2 });
    expect(ultimo.repos[0].baseAtualizadaEm).toBe('2026-11-20');
    expect(ultimo.repos[0].precisaConferir).toBe(true);
});
