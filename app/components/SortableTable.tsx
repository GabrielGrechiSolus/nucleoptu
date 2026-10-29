'use client';

import React, { useCallback, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type SortDir = 'asc' | 'desc';
export interface SortState {
  key: string;
  dir: SortDir;
}
type Valor = string | number | boolean | null | undefined;

// Ordenação por coluna: 1º clique crescente, 2º decrescente, 3º volta à ordem original.
export function useSort(inicial: SortState | null = null) {
  const [sort, setSort] = useState<SortState | null>(inicial);
  const toggleSort = useCallback((key: string) => {
    setSort((atual) => {
      if (!atual || atual.key !== key) return { key, dir: 'asc' };
      if (atual.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }, []);
  return { sort, toggleSort };
}

const vazio = (v: Valor) => v === null || v === undefined || v === '';

export function sortRows<T>(rows: T[], sort: SortState | null, acessores: Record<string, (linha: T) => Valor>): T[] {
  const acessar = sort ? acessores[sort.key] : undefined;
  if (!sort || !acessar) return rows;
  const fator = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = acessar(a);
    const vb = acessar(b);
    if (vazio(va) && vazio(vb)) return 0;
    if (vazio(va)) return 1; // vazios sempre por último
    if (vazio(vb)) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * fator;
    if (typeof va === 'boolean' && typeof vb === 'boolean') return (Number(va) - Number(vb)) * fator;
    return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' }) * fator;
  });
}

interface SortThProps {
  label: string;
  k: string;
  sort: SortState | null;
  onSort: (k: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

// Cabeçalho de coluna com botão de ordenação.
export function SortTh({ label, k, sort, onSort, className = '', align = 'left' }: SortThProps) {
  const ativo = sort?.key === k;
  const Icone = !ativo ? ArrowUpDown : sort?.dir === 'asc' ? ArrowUp : ArrowDown;
  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  return (
    <th
      className={`px-3 py-2 ${className}`}
      aria-sort={ativo ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        title={`Ordenar por ${label}`}
        className={`inline-flex w-full items-center gap-1 uppercase ${justify} ${ativo ? 'text-[#00518C]' : ''}`}
      >
        <span>{label}</span>
        <Icone size={12} className={ativo ? '' : 'opacity-50'} />
      </button>
    </th>
  );
}
