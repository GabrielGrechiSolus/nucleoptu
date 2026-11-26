import { corDaMensagem, corDaPrioridade, corDoStatus } from './relatusCores';

describe('cores do Web Relatus', () => {
  it('status segue o padrão de etiquetas do sistema', () => {
    expect(corDoStatus('Concluído')).toBe('ok');
    expect(corDoStatus('FECHADO')).toBe('ok');
    expect(corDoStatus('Em standby')).toBe('alert');
    expect(corDoStatus('Aguardando cliente')).toBe('alert');
    expect(corDoStatus('Cancelado')).toBe('error');
    expect(corDoStatus('Em andamento')).toBe('info');
    expect(corDoStatus('Não resolvido')).toBe('info');
  });

  it('prioridade destaca o que é crítico ou alto', () => {
    expect(corDaPrioridade('Crítica')).toBe('error');
    expect(corDaPrioridade('Urgente')).toBe('error');
    expect(corDaPrioridade('Alta')).toBe('alert');
    expect(corDaPrioridade('Média')).toBe('info');
  });

  it('cada tipo de mensagem tem a sua cor, e tipo desconhecido usa a principal', () => {
    expect(['E', 'W', 'L', 'C', 'R', 'O', 'Z'].map(corDaMensagem)).toEqual(['info', 'alert', 'ok', 'ok', 'error', 'neutro', 'info']);
  });
});
