import { montaChamado, parseTitulo, extraiPrs, numeroDaPasta } from './parse';

const CONTEXTO = `﻿# 568.361 — Unimed Limeira — A410: envio de diárias e taxas com tabela 00

Atualizado: 28/10/2026. Status: **correção publicada, PR pendente**.

## Versão e release do banco
Revision do cliente: 40122 (painel).

## Entendimento de retomada
O A410 não enviava as diárias e taxas com tabela 00.

Ver [Evidência de teste](https://solussaude.atlassian.net/wiki/spaces/DES/pages/1/Evid) e
[Plano de Testes — chamado 568.361](https://docs.google.com/document/d/abc/edit).
Branch \`hotfix/(568.361)-envia-diarias-e-taxas-a410-com-tabela-00\`. Ajuste anterior no PR 3730 e em #3928.
https://github.com/solussaude/banco/pull/3858
`;

describe('parse de chamados', () => {
  it('extrai número, cliente e assunto do título', () => {
    expect(parseTitulo(CONTEXTO, '568.361-unimed-limeira')).toEqual({
      numero: '568.361',
      cliente: 'Unimed Limeira',
      assunto: 'A410: envio de diárias e taxas com tabela 00',
    });
    expect(parseTitulo('# 560.004 - cliente não informado - Valorização de pacote', 'x').assunto).toBe('Valorização de pacote');
  });

  it('reconhece a pasta do chamado', () => {
    expect(numeroDaPasta('568.361-unimed-limeira')).toBe('568.361');
    expect(numeroDaPasta('consultas')).toBeNull();
  });

  it('lista PRs com repositório quando há URL e sem quando só há citação', () => {
    const prs = extraiPrs(CONTEXTO);
    expect(prs.map((p) => p.numero)).toEqual(['3928', '3858', '3730']);
    expect(prs.find((p) => p.numero === '3858')?.repo).toBe('banco');
    expect(prs.find((p) => p.numero === '3730')?.repo).toBeUndefined();
  });

  it('monta o chamado com evidência, plano, revision, status e branch', () => {
    const c = montaChamado('568.361-unimed-limeira', { 'CONTEXTO.md': CONTEXTO, 'BM.md': '# BM' })!;
    expect(c.id).toBe('568361');
    expect(c.temPr).toBe(true);
    expect(c.temEvidencia).toBe(true);
    expect(c.temPlano).toBe(true);
    expect(c.temBm).toBe(true);
    expect(c.revision).toBe('40122');
    expect(c.atualizadoEm).toBe('28/10/2026');
    expect(c.status).toBe('correção publicada, PR pendente');
    expect(c.branches).toEqual(['hotfix/(568.361)-envia-diarias-e-taxas-a410-com-tabela-00']);
    expect(c.resumo).toContain('não enviava as diárias');
    expect(Object.keys(c.docs)).toEqual(['CONTEXTO.md', 'BM.md']);
  });

  it('ignora pasta que não é de chamado', () => {
    expect(montaChamado('consultas', { 'LEIAME.md': 'texto' })).toBeNull();
  });
});
