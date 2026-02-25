'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db } from '../../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  collectionGroup,
} from 'firebase/firestore';

interface ValidationResult {
  name: string;
  status: 'checking' | 'success' | 'warning' | 'error';
  message: string;
  count?: number;
}

const DataValidator = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const validate = async () => {
    if (!user) return;

    setIsValidating(true);
    const newResults: ValidationResult[] = [];

    try {
      // Validar Tickets
      try {
        const ticketsQ = query(collection(db, 'tickets'), where('userId', '==', user.uid));
        const ticketsSnapshot = await getDocs(ticketsQ);
        newResults.push({
          name: 'Chamados',
          status: ticketsSnapshot.size > 0 ? 'success' : 'warning',
          message: `${ticketsSnapshot.size} chamados encontrados`,
          count: ticketsSnapshot.size,
        });
      } catch (error) {
        newResults.push({
          name: 'Chamados',
          status: 'error',
          message: `Erro ao carregar: ${error}`,
        });
      }

      // Validar Studies
      try {
        const studiesQ = query(collection(db, 'studies'), where('userId', '==', user.uid));
        const studiesSnapshot = await getDocs(studiesQ);
        newResults.push({
          name: 'Estudos',
          status: studiesSnapshot.size > 0 ? 'success' : 'warning',
          message: `${studiesSnapshot.size} estudos encontrados`,
          count: studiesSnapshot.size,
        });
      } catch (error) {
        newResults.push({
          name: 'Estudos',
          status: 'error',
          message: `Erro ao carregar: ${error}`,
        });
      }

      // Validar Categories
      try {
        const categoriesQ = query(collection(db, 'categories'), where('userId', '==', user.uid));
        const categoriesSnapshot = await getDocs(categoriesQ);
        newResults.push({
          name: 'Categorias',
          status: categoriesSnapshot.size > 0 ? 'success' : 'warning',
          message: `${categoriesSnapshot.size} categorias salvas`,
          count: categoriesSnapshot.size,
        });

        if (categoriesSnapshot.size === 0) {
          newResults[newResults.length - 1].message += ' (As categorias podem não estar sendo persistidas)';
        }
      } catch (error) {
        newResults.push({
          name: 'Categorias',
          status: 'error',
          message: `Erro ao carregar: ${error}`,
        });
      }

      // Validar Meetings
      try {
        const meetingsQ = query(collection(db, 'meetings'), where('createdBy', '==', user.uid));
        const meetingsSnapshot = await getDocs(meetingsQ);
        newResults.push({
          name: 'Reuniões',
          status: meetingsSnapshot.size > 0 ? 'success' : 'warning',
          message: `${meetingsSnapshot.size} reuniões encontradas`,
          count: meetingsSnapshot.size,
        });
      } catch (error) {
        newResults.push({
          name: 'Reuniões',
          status: 'error',
          message: `Erro ao carregar: ${error}`,
        });
      }

      // Validar Notices
      try {
        const noticesQ = query(collection(db, 'notices'), where('userId', '==', user.uid));
        const noticesSnapshot = await getDocs(noticesQ);
        newResults.push({
          name: 'Avisos',
          status: noticesSnapshot.size > 0 ? 'success' : 'warning',
          message: `${noticesSnapshot.size} avisos encontrados`,
          count: noticesSnapshot.size,
        });
      } catch (error) {
        newResults.push({
          name: 'Avisos',
          status: 'error',
          message: `Erro ao carregar: ${error}`,
        });
      }

      setResults(newResults);
    } catch (error) {
      console.error('Erro na validação:', error);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    validate();
  }, [user]);

  const getIcon = (status: ValidationResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-emerald-500" size={20} />;
      case 'warning':
        return <AlertCircle className="text-yellow-500" size={20} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={20} />;
      case 'checking':
        return <Clock className="text-blue-500 animate-spin" size={20} />;
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 max-w-screen-2xl mx-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Validação de Dados</h2>
            <p className="text-zinc-400 text-sm mt-1">Verifique se todos os seus dados estão sendo salvos corretamente no Firebase</p>
          </div>
          <button
            onClick={validate}
            disabled={isValidating}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isValidating
                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : 'bg-sky-500 text-white hover:bg-sky-600'
            }`}
          >
            {isValidating ? 'Validando...' : 'Validar Novamente'}
          </button>
        </div>

        <div className="space-y-3">
          {results.map((result, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                result.status === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : result.status === 'error'
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-yellow-500/10 border-yellow-500/30'
              }`}
            >
              {getIcon(result.status)}
              <div className="flex-1">
                <p className="font-medium text-white">{result.name}</p>
                <p className="text-xs text-zinc-400">{result.message}</p>
              </div>
              {result.count !== undefined && (
                <span className="text-sm font-bold text-white bg-zinc-800 px-2 py-1 rounded">
                  {result.count}
                </span>
              )}
            </div>
          ))}
        </div>

        {results.length > 0 && results.some(r => r.status === 'error') && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm font-medium mb-2">⚠️ Problema Detectado</p>
            <p className="text-red-400/80 text-xs">
              Alguns dados não estão sendo carregados corretamente. Verifique as regras de segurança do Firebase e se os documentos foram criados corretamente.
            </p>
          </div>
        )}

        {results.length > 0 && results.some(r => r.status === 'warning') && (
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm font-medium mb-2">ℹ️ Informação</p>
            <p className="text-yellow-400/80 text-xs">
              Alguns dados ainda não foram criados. Comece criando novos chamados, estudos ou outras informações para popular o sistema.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataValidator;
