import { redirect } from 'next/navigation';

export default async function ChamadosBmPage({ searchParams }: { searchParams: Promise<{ cartao?: string | string[] }> }) {
  const { cartao } = await searchParams;
  const id = typeof cartao === 'string' ? cartao.replace(/\D/g, '') : '';
  redirect(`/chamados?aba=regras${id ? `&cartao=${id}` : ''}`);
}
