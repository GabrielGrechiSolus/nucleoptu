import { act, renderHook, waitFor } from '@testing-library/react';
import { avisaPerfilAtualizado, usePessoa } from './usePessoa';

let mockPerfil: Record<string, string> = {};
const mockUsuario = { uid: 'u1', email: 'pessoa@exemplo.com', displayName: 'Pessoa' };

jest.mock('../../firebase', () => ({ db: {} }));
jest.mock('../AuthContext', () => ({ useAuth: () => ({ user: mockUsuario }) }));
jest.mock('firebase/firestore', () => ({
  doc: () => 'perfil',
  getDoc: async () => ({ exists: () => true, data: () => ({ ...mockPerfil }) }),
}));

describe('usuário Git vinculado com o sistema aberto', () => {
  it('quem já está na tela passa a enxergar o vínculo sem recarregar a página', async () => {
    mockPerfil = {};
    const { result } = renderHook(() => usePessoa());
    await waitFor(() => expect(result.current.carregado).toBe(true));
    expect(result.current.gitUser).toBe('');

    mockPerfil = { gitUser: 'usuario-novo' };
    act(() => avisaPerfilAtualizado());

    await waitFor(() => expect(result.current.gitUser).toBe('usuario-novo'));
  });
});
