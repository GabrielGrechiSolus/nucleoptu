import { NextResponse } from 'next/server';
import { permite } from '../_limite';
import { verificaFirebase } from '../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_INSTRUCTION = [
  'Você é o assistente do NucleoPTU, uma aplicação interna de apoio à equipe.',
  'Responda em português do Brasil, com clareza e objetividade.',
  'Não afirme que consultou chamados, PRs, cartões BM, dados de clientes ou políticas internas que não foram incluídos na conversa.',
  'Quando faltarem dados ou houver dúvida, explique o limite e peça a informação necessária.',
  'Não invente prazos, status, regras de negócio ou dados operacionais.',
].join(' ');

type Turn = { role: 'user' | 'assistant'; text: string };

export async function POST(req: Request) {
  const login = await verificaFirebase(req);
  if (!login.ok || !login.uid) {
    return NextResponse.json({ erro: login.motivo ?? 'Entre no sistema para usar o assistente.' }, { status: 401 });
  }
  if (!permite('gemini:' + login.uid, 20, 60_000)) {
    return NextResponse.json({ erro: 'Você atingiu o limite de perguntas por minuto. Aguarde um pouco e tente novamente.' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ erro: 'O assistente ainda não foi configurado. Adicione GEMINI_API_KEY nas variáveis de ambiente do servidor.' }, { status: 503 });
  }

  const raw = await req.text();
  if (raw.length > 24_000) return NextResponse.json({ erro: 'A conversa está muito longa. Inicie uma nova conversa.' }, { status: 413 });

  let turns: Turn[];
  try {
    const body = JSON.parse(raw) as { turns?: unknown };
    if (!Array.isArray(body.turns) || body.turns.length === 0 || body.turns.length > 12) {
      return NextResponse.json({ erro: 'Envie até 12 mensagens por conversa.' }, { status: 400 });
    }
    turns = body.turns.map((item) => {
      const turno = item as Partial<Turn>;
      if ((turno.role !== 'user' && turno.role !== 'assistant') || typeof turno.text !== 'string' || !turno.text.trim() || turno.text.length > 3000) {
        throw new Error('invalid_turn');
      }
      return { role: turno.role, text: turno.text.trim() };
    });
    if (turns.at(-1)?.role !== 'user') return NextResponse.json({ erro: 'A última mensagem precisa ser uma pergunta.' }, { status: 400 });
  } catch {
    return NextResponse.json({ erro: 'Formato de conversa inválido.' }, { status: 400 });
  }

  const input = turns.map((turn) => (turn.role === 'user' ? 'Usuário' : 'Assistente') + ': ' + turn.text).join('\n\n');
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey, 'Api-Revision': '2026-05-20' },
      body: JSON.stringify({
        model: 'gemini-3.8-flash',
        input,
        system_instruction: SYSTEM_INSTRUCTION,
        store: false,
      }),
      signal: AbortSignal.timeout(45_000),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({})) as { output_text?: string; error?: { message?: string } };
    if (!response.ok) {
      console.error('Gemini API falhou:', response.status, payload.error?.message ?? 'sem detalhe');
      return NextResponse.json({ erro: response.status === 429 ? 'O Gemini está com muitas solicitações. Tente novamente em instantes.' : 'Não foi possível obter uma resposta do Gemini agora.' }, { status: response.status === 429 ? 429 : 502 });
    }
    const answer = payload.output_text?.trim();
    if (!answer) return NextResponse.json({ erro: 'O Gemini não retornou uma resposta em texto.' }, { status: 502 });
    return NextResponse.json({ resposta: answer });
  } catch (error) {
    console.error('Erro ao consultar Gemini:', error);
    return NextResponse.json({ erro: 'Não foi possível conectar ao Gemini. Tente novamente.' }, { status: 502 });
  }
}

