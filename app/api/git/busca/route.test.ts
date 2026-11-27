/** @jest-environment node */
const mockExigeGit = jest.fn();
const mockGithub = jest.fn();

jest.mock('../../_servidor', () => ({
  exigeGit: (...a: unknown[]) => mockExigeGit(...a),
  githubGet: (...a: unknown[]) => mockGithub(...a),
  ErroGithub: class extends Error { status = 502; },
}));

const pede = async (q: string) => {
  const { GET } = await import('./route');
  return GET(new Request(`http://localhost/api/git/busca?q=${encodeURIComponent(q)}`));
};
const consultaFeita = () => new URL(`http://x${mockGithub.mock.calls[0][0]}`).searchParams.get('q');

describe('busca ao vivo no GitHub', () => {
  beforeEach(() => {
    mockExigeGit.mockResolvedValue({ ok: true, token: 't', email: `p${Math.random()}@exemplo.com` });
    mockGithub.mockReset().mockResolvedValue({ total_count: 1, items: [{ number: 7, title: 'hotfix/(568.361)-ajuste', state: 'closed', html_url: 'https://github.com/solussaude/banco/pull/7', repository_url: 'https://api.github.com/repos/solussaude/banco', updated_at: '2026-11-20T00:00:00Z', user: { login: 'dev' }, pull_request: { merged_at: '2026-11-19T00:00:00Z' }, body: 'não deve voltar' }] });
  });

  it('procura PRs da organização e devolve só o necessário', async () => {
    const r = await pede('carência a500');
    expect(await r.json()).toEqual({ total: 1, prs: [{ repo: 'banco', numero: 7, titulo: 'hotfix/(568.361)-ajuste', estado: 'mesclado', autor: 'dev', atualizadoEm: '2026-11-20T00:00:00Z', url: 'https://github.com/solussaude/banco/pull/7', chamado: '568.361' }] });
    expect(consultaFeita()).toBe('carência a500 org:solussaude is:pr');
  });

  it('número de chamado é procurado no formato do título dos PRs', async () => {
    await pede('568361');
    expect(consultaFeita()).toBe('"568.361" org:solussaude is:pr');
  });

  it('não deixa a consulta trocar a organização nem usar operadores', async () => {
    await pede('segredo org:outra repo:x/y -is:pr "aspas" OR user:z');
    expect(consultaFeita()).toBe('segredo aspas or org:solussaude is:pr');
  });

  it('exige texto suficiente e respeita o bloqueio de acesso ao Git', async () => {
    expect((await pede('ab')).status).toBe(400);
    expect((await pede('org:x')).status).toBe(400);
    mockExigeGit.mockResolvedValue({ ok: false, status: 403, erro: 'O perfil Sustentação não tem acesso ao Git.' });
    expect((await pede('carencia')).status).toBe(403);
    expect(mockGithub).not.toHaveBeenCalled();
  });
});
