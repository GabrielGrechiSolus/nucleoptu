import { previsaoDe } from './previsao';

describe('previsão de liberação sempre a próxima da última revision da API', () => {
  it('usa a previsão global atual e só para correções sem revision', () => {
    expect(previsaoDe({ revision: '', situacao: 'corrigido', previsaoRevision: '40120' }, 40131)).toBe('40131');
    expect(previsaoDe({ revision: '40127', situacao: 'corrigido', previsaoRevision: '' }, 40131)).toBe('');
    expect(previsaoDe({ revision: '', situacao: 'em-correcao', previsaoRevision: '40120' }, 40131)).toBe('');
  });

  it('sem consulta da API, mantém a previsão gravada no contexto', () => {
    expect(previsaoDe({ revision: '', situacao: 'corrigido', previsaoRevision: '40128' }, null)).toBe('40128');
    expect(previsaoDe({ revision: '', situacao: 'corrigido', previsaoRevision: '' }, null)).toBe('');
  });
});
