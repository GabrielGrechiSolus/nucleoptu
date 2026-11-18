import { randomBytes } from 'node:crypto';
import { chaveDoAmbiente, cifra, decifra } from '../api/_cripto';
import { permite } from '../api/_limite';
import { ehAgenteBloqueado, mesmaOrigem } from '../seguranca';
import { contextoDaSenha, limpaEntrada, paraLista, preparaParaGravar } from './servidor';

const chave = randomBytes(32);

const entrada = (conexoes: Record<string, unknown>[] = []) => ({ id: 'c1', nome: 'Cliente', conexoes, contatos: [] });

describe('proteção do cadastro de conexões', () => {
  it('criptografa a senha e só abre com a chave e o contexto corretos', () => {
    const segredo = cifra('S3nh@-forte', chave, 'c1:x1');
    expect(segredo.startsWith('v1:')).toBe(true);
    expect(segredo.includes('S3nh@')).toBe(false);
    expect(decifra(segredo, chave, 'c1:x1')).toBe('S3nh@-forte');
    expect(() => decifra(segredo, chave, 'c1:outra')).toThrow();
    expect(() => decifra(segredo, randomBytes(32), 'c1:x1')).toThrow();
    expect(cifra('a', chave, 'k')).not.toBe(cifra('a', chave, 'k'));
  });

  it('aceita só chave de 32 bytes em base64', () => {
    expect(chaveDoAmbiente(chave.toString('base64'))?.length).toBe(32);
    expect(chaveDoAmbiente('curta')).toBe(null);
    expect(chaveDoAmbiente(undefined)).toBe(null);
  });

  it('limita consultas por usuário em uma janela de tempo', () => {
    const k = `teste:${Math.random()}`;
    expect([1, 2, 3].map((i) => permite(k, 3, 1000, 1000 + i))).toEqual([true, true, true]);
    expect(permite(k, 3, 1000, 1100)).toBe(false);
    expect(permite(k, 3, 1000, 2500)).toBe(true);
  });

  it('bloqueia agentes de IA, robôs e requisições sem identificação, e libera navegadores comuns', () => {
    expect(ehAgenteBloqueado('Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)')).toBe(true);
    expect(ehAgenteBloqueado('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0)')).toBe(true);
    expect(ehAgenteBloqueado('python-requests/2.31')).toBe(true);
    expect(ehAgenteBloqueado('Mozilla/5.0 HeadlessChrome/120.0')).toBe(true);
    expect(ehAgenteBloqueado('')).toBe(true);
    expect(ehAgenteBloqueado(null)).toBe(true);
    expect(ehAgenteBloqueado('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36')).toBe(false);
  });

  it('só aceita requisições que alteram dados vindas do mesmo site', () => {
    expect(mesmaOrigem('https://nucleoptu.vercel.app', 'nucleoptu.vercel.app')).toBe(true);
    expect(mesmaOrigem('https://site-malicioso.com', 'nucleoptu.vercel.app')).toBe(false);
    expect(mesmaOrigem('https://nucleoptu.vercel.app', 'interno', 'nucleoptu.vercel.app')).toBe(true);
    expect(mesmaOrigem(null, 'nucleoptu.vercel.app')).toBe(true);
    expect(mesmaOrigem('não é url', 'x')).toBe(false);
  });

  it('valida a entrada: tamanho, quantidade e campos obrigatórios', () => {
    expect(limpaEntrada(null).ok).toBe(false);
    expect(limpaEntrada(entrada()).ok).toBe(true);
    expect(limpaEntrada({ ...entrada(), nome: 'x'.repeat(2001) }).ok).toBe(false);
    expect(limpaEntrada(entrada([{ id: 'a', tipo: 'anydesk', idRemoto: '' }])).ok).toBe(false);
    expect(limpaEntrada(entrada([{ id: 'a', tipo: 'anydesk', idRemoto: '1', senha: 'x'.repeat(501) }])).ok).toBe(false);
    const muitas = Array.from({ length: 101 }, (_, i) => ({ id: `a${i}`, tipo: 'anydesk', idRemoto: '1' }));
    expect(limpaEntrada(entrada(muitas)).ok).toBe(false);
    expect(limpaEntrada({ ...entrada(), id: '../../x' }).ok).toBe(true);
    const r = limpaEntrada({ ...entrada(), id: '../../x' });
    expect(r.ok && r.cliente.id).toBe('');
  });

  it('grava a senha cifrada, mantém a antiga quando vazia e nunca devolve a senha na lista', () => {
    const cifrar = (t: string, ctx: string) => cifra(t, chave, ctx);
    const novo = limpaEntrada(entrada([{ id: 'x1', tipo: 'vpn', host: 'h', senha: 'segredo' }]));
    if (!novo.ok) throw new Error('entrada');
    const gravado = preparaParaGravar(novo.cliente, null, cifrar) as { conexoes: Record<string, unknown>[] };
    expect(gravado.conexoes[0].senha).toBe(undefined);
    expect(String(gravado.conexoes[0].senhaCifrada).startsWith('v1:')).toBe(true);
    expect(decifra(String(gravado.conexoes[0].senhaCifrada), chave, contextoDaSenha('c1', 'x1'))).toBe('segredo');

    const edicao = limpaEntrada(entrada([{ id: 'x1', tipo: 'vpn', host: 'h2', senha: '' }]));
    if (!edicao.ok) throw new Error('entrada');
    const mantido = preparaParaGravar(edicao.cliente, gravado, cifrar) as { conexoes: Record<string, unknown>[] };
    expect(mantido.conexoes[0].senhaCifrada).toBe(gravado.conexoes[0].senhaCifrada);

    const removida = limpaEntrada(entrada([{ id: 'x1', tipo: 'vpn', host: 'h2', limparSenha: true }]));
    if (!removida.ok) throw new Error('entrada');
    expect((preparaParaGravar(removida.cliente, gravado, cifrar) as { conexoes: Record<string, unknown>[] }).conexoes[0].senhaCifrada).toBe('');

    const lista = paraLista('c1', gravado);
    expect(lista.conexoes[0].senha).toBe('');
    expect(lista.conexoes[0].temSenha).toBe(true);
    expect(JSON.stringify(lista).includes('v1:')).toBe(false);
  });
});
