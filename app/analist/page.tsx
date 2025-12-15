"use client";

import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
    collection,
    query,
    orderBy,
    getDocs,
    Timestamp,
} from "firebase/firestore";

// Definindo a estrutura de dados para um Aviso
interface Aviso {
    id: string;
    titulo: string;
    conteudo: string;
    data: Timestamp;
    autor: string;
}

export default function AnalistPage() {
    const [avisos, setAvisos] = useState<Aviso[]>([]);
    const [selectedAviso, setSelectedAviso] = useState<Aviso | null>(null);

    useEffect(() => {
        const fetchAvisos = async () => {
            try {
                const avisosCollection = collection(db, "avisos");
                const q = query(avisosCollection, orderBy("data", "desc"));
                const querySnapshot = await getDocs(q);
                const avisosList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                } as Aviso));
                setAvisos(avisosList);
            } catch (error) {
                console.error("Erro ao buscar avisos: ", error);
            }
        };

        fetchAvisos();
    }, []);

    const handleCardClick = (aviso: Aviso) => {
        setSelectedAviso(aviso);
    };

    const closeModal = () => {
        setSelectedAviso(null);
    };

    // Função para formatar a data do Firestore para um formato legível
    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return "Data indisponível";
        return new Date(timestamp.seconds * 1000).toLocaleDateString("pt-BR");
    };

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-2xl font-bold mb-6">Mural de Avisos</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {avisos.map((aviso) => (
                    <div
                        key={aviso.id}
                        onClick={() => handleCardClick(aviso)}
                        className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick(aviso)}
                    >
                        <h2 className="text-lg font-semibold text-gray-800 truncate">{aviso.titulo}</h2>
                        <p className="text-gray-600 mt-2 text-sm flex-grow overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{aviso.conteudo}</p>
                        <div className="mt-auto pt-4 text-xs text-gray-500">
                            <span>{formatDate(aviso.data)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal para exibir detalhes do aviso */}
            {selectedAviso && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50"
                    onClick={closeModal} // Fecha a modal ao clicar no fundo
                >
                    <div
                        className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()} // Impede que o clique na modal feche-a
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">{selectedAviso.titulo}</h2>
                            <button onClick={closeModal} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                        </div>
                        <div className="text-sm text-gray-500 mb-4">
                            <p>Autor: {selectedAviso.autor}</p>
                            <p>Data: {formatDate(selectedAviso.data)}</p>
                        </div>
                        <div className="mt-4 text-gray-700 whitespace-pre-wrap break-words">
                            {selectedAviso.conteudo}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
