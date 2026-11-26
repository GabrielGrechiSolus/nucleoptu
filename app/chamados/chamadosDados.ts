import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { criaConsultaSalva } from './dadosSalvos';
import type { Chamado } from './parse';

export const VALIDADE_LISTA_MS = 5 * 60_000;

const consulta = criaConsultaSalva<Chamado[]>({ nome: 'chamados', validade: () => VALIDADE_LISTA_MS });

export async function lerChamados(atualizar = false): Promise<Chamado[]> {
  const lista = await consulta.obtem(
    'todos',
    async () => (await getDocs(collection(db, 'chamados'))).docs.map((d) => ({ ...(d.data() as Chamado), id: d.id })),
    atualizar,
  );
  return [...lista];
}

export const invalidaChamados = () => consulta.invalida();
