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

const REGRA = `---
chamado: 568.098
cliente: Unimed Pato Branco
assunto: PTU A500 – Recebimento
tipo: correcao
situacao: corrigido
modulo: PTU A500
revision: 40127
publicadoEm: 2026-10-27
pr: 3965, contas#120
evidencia: https://docs.example.com/evidencia
planoTestes:
---

## Problema
Importação parava com justificativa longa.
`;

describe('REGRA.md', () => {
  it('lê o cabeçalho e preenche os campos para a regra', () => {
    const c = montaChamado('568.098-unimed-pato-branco', { 'REGRA.md': REGRA })!;
    expect(c.numero).toBe('568.098');
    expect(c.cliente).toBe('Unimed Pato Branco');
    expect(c.tipo).toBe('correcao');
    expect(c.situacao).toBe('corrigido');
    expect(c.status).toBe('Corrigido');
    expect(c.revision).toBe('40127');
    expect(c.publicadoEm).toBe('2026-10-27');
    expect(c.temRegra).toBe(true);
    expect(c.prs.map((p) => `${p.repo}#${p.numero}`)).toEqual(['banco#3965', 'contas#120']);
    expect(c.evidencias[0].url).toBe('https://docs.example.com/evidencia');
    expect(c.temPlano).toBe(false);
    expect(Object.keys(c.docs)[0]).toBe('REGRA.md');
    expect(c.docs['REGRA.md'].startsWith('## Problema')).toBe(true);
  });

  it('ignora valores inválidos e PR zerado do modelo', () => {
    const c = montaChamado('568.098-x', { 'REGRA.md': REGRA.replace('tipo: correcao', 'tipo: qualquer').replace('pr: 3965, contas#120', 'pr: 0000').replace('revision: 40127', 'revision: abc') })!;
    expect(c.tipo).toBe('');
    expect(c.revision).toBe('');
    expect(c.prs).toEqual([]);
  });

  it('com REGRA.md, a revision vem só do cabeçalho e não da revision do cliente citada no contexto', () => {
    const c = montaChamado('568.098-x', { 'REGRA.md': REGRA.replace('revision: 40127', 'revision:'), 'CONTEXTO.md': 'Revision do cliente: 40124' })!;
    expect(c.revision).toBe('');
  });

  it('chamado sem REGRA.md continua sendo lido pelo CONTEXTO.md', () => {
    const c = montaChamado('568.361-unimed-limeira', { 'CONTEXTO.md': CONTEXTO })!;
    expect(c.temRegra).toBe(false);
    expect(c.tipo).toBe('');
  });
});
