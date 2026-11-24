import type React from 'react';
import { Bell, FolderSearch, Home, Inbox, Kanban, LifeBuoy, Link as LinkIcon, ListChecks, MessageCircle, Network, ShieldCheck, Ticket, User, UserCog, Users, Building2 } from 'lucide-react';

export interface ItemMenu {
  tipo: 'item';
  href: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

export interface GrupoMenu {
  tipo: 'grupo';
  id: string;
  label: string;
  icon: React.ElementType;
  inicialAberto: boolean;
  filhos: NoMenu[];
}

export type NoMenu = ItemMenu | GrupoMenu;

const item = (href: string, label: string, icon: React.ElementType, color: string): ItemMenu => ({ tipo: 'item', href, label, icon, color });
const grupo = (id: string, label: string, icon: React.ElementType, inicialAberto: boolean, filhos: NoMenu[]): GrupoMenu => ({ tipo: 'grupo', id, label, icon, inicialAberto, filhos });

export interface OpcoesMenu {
  admin: boolean;
  processos: boolean;
}

export function montaMenu({ admin, processos }: OpcoesMenu): NoMenu[] {
  return [
    item('/home', 'Início', Home, 'text-sky-400'),
    item('/notice-board', 'Mural', Bell, 'text-rose-400'),
    item('/chat', 'Chat da equipe', MessageCircle, 'text-sky-400'),
    item('/escritorio', 'Escritório virtual', Building2, 'text-teal-400'),
    grupo('chamados', 'Chamados', Ticket, true, [
      item('/chamados', 'Contexto de chamados', FolderSearch, 'text-teal-400'),
      item('/fila', 'Fila de aplicação', ListChecks, 'text-sky-400'),
      grupo('bm', 'Businessmap (BM)', Kanban, true, [
        item('/chamados-bm', 'Chamados sem PR', Inbox, 'text-amber-400'),
        ...(processos ? [item('/processos', 'Processos do BM', ListChecks, 'text-emerald-400')] : []),
      ]),
    ]),
    grupo('apoio', 'Apoio ao atendimento', LifeBuoy, true, [
      item('/client-connections', 'Conexões de clientes', Network, 'text-pink-400'),
      item('/links', 'Links úteis', LinkIcon, 'text-cyan-400'),
    ]),
    grupo('conta', 'Conta e administração', ShieldCheck, false, [
      item('/profile', 'Perfil', User, 'text-gray-300'),
      item('/users', 'Usuários', Users, 'text-gray-300'),
      ...(admin ? [item('/admin/usuarios', 'Gestão de usuários', UserCog, 'text-sky-400')] : []),
    ]),
  ];
}

export function itensDoMenu(nos: NoMenu[]): ItemMenu[] {
  return nos.flatMap((n) => (n.tipo === 'item' ? [n] : itensDoMenu(n.filhos)));
}

export function rotaAtiva(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function contemRota(no: NoMenu, pathname: string): boolean {
  return itensDoMenu([no]).some((i) => rotaAtiva(pathname, i.href));
}

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Mantém só os itens cujo nome (ou o do grupo) combina com a busca; grupos sem itens somem.
export function filtraMenu(nos: NoMenu[], busca: string): NoMenu[] {
  const q = semAcento(busca.trim());
  if (!q) return nos;
  return nos.flatMap((n): NoMenu[] => {
    if (n.tipo === 'item') return semAcento(n.label).includes(q) ? [n] : [];
    if (semAcento(n.label).includes(q)) return [n];
    const filhos = filtraMenu(n.filhos, busca);
    return filhos.length ? [{ ...n, filhos }] : [];
  });
}

export function somaContadores(no: NoMenu, contadorDe: (href: string) => number): number {
  return itensDoMenu([no]).reduce((total, i) => total + contadorDe(i.href), 0);
}
