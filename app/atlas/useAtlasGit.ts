'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { aplicarBloco, reconstruirConexoes } from './extracao';
import { lerMapa, salvarMapa } from './cacheNavegador';
import type { BlocoAtlas, CatalogoAtlas } from './modelo';
export type ConsultaAtlas = <T>(suffix?: string, method?: string, signal?: AbortSignal, corpo?: unknown) => Promise<T>;
export class ErroConsultaAtlas extends Error {
    constructor(message: string, public status: number, public retomarEm?: string, public acessoNegado = false) { super(message); }
}
export function reconciliarMapa(novo: CatalogoAtlas, salvo: CatalogoAtlas | null) {
    if (!salvo || novo.versao !== salvo.versao || salvo.origem !== 'github')
        return novo;
    const repos = novo.repos.map((r) => {
        const antigo = salvo.repos.find((a) => a.id === r.id);
        if (!antigo || (antigo.baseAtualizadaEm && antigo.baseAtualizadaEm !== r.atualizadoEm))
            return r;
        return { ...antigo, descricao: r.descricao, atualizadoEm: r.atualizadoEm, url: r.url };
    });
    const nomes = new Set(repos.filter((r) => r.sha).map((r) => r.id));
    return { ...novo, repos, regras: salvo.regras.filter((r) => nomes.has(r.repo)), conexoes: reconstruirConexoes(repos), geradoEm: salvo.geradoEm };
}
export function useAtlasGit(consultar: ConsultaAtlas, uid: string | undefined, selecionado: string) {
    const [catalogo, definirCatalogo] = useState<CatalogoAtlas | null>(null);
    const atual = useRef<CatalogoAtlas | null>(null);
    const [erro, setErro] = useState('');
    const [atualizando, setAtualizando] = useState(false);
    const [pausado, setPausado] = useState(false);
    const [lendo, setLendo] = useState('');
    const [retomarEm, setRetomarEm] = useState(0);
    const [tentativa, setTentativa] = useState(0);
    const salvarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const persistenciaFalhou = useRef(false);
    const geracao = useRef(0);
    const setCatalogo = useCallback((valor: CatalogoAtlas) => {
        atual.current = valor;
        definirCatalogo(valor);
        if (salvarTimer.current)
            clearTimeout(salvarTimer.current);
        if (uid && !persistenciaFalhou.current)
            salvarTimer.current = setTimeout(() => {
                void salvarMapa(uid, valor).catch(() => { persistenciaFalhou.current = true; setErro('O navegador não conseguiu salvar a retomada. A leitura continua nesta sessão.'); });
            }, 250);
    }, [uid]);
    const atualizar = useCallback(async (reiniciarErros = false) => {
        const minhaGeracao = geracao.current;
        setAtualizando(true);
        setErro('');
        try {
            // Confirma a permissão atual antes de mostrar fontes previamente salvas neste navegador.
            const novo = await consultar<CatalogoAtlas>();
            if (minhaGeracao !== geracao.current)
                return;
            let salvo = atual.current;
            if (!salvo && uid) {
                try {
                    salvo = await lerMapa(uid);
                }
                catch { /* Cache não é requisito. */ }
            }
            if (minhaGeracao !== geracao.current)
                return;
            const mapa = reconciliarMapa(novo, salvo);
            if (reiniciarErros)
                mapa.repos = mapa.repos.map((r) => r.estadoLeitura === 'erro' ? { ...r, estadoLeitura: 'pendente', cursor: undefined, sha: '', arquivos: 0, erroLeitura: '' } : r);
            setCatalogo(mapa);
            setTentativa((n) => n + 1);
        }
        catch (e) {
            if (minhaGeracao === geracao.current) {
                const falha = e as ErroConsultaAtlas;
                setErro(falha.message);
                if (falha.status === 401 || falha.acessoNegado) {
                    atual.current = null;
                    definirCatalogo(null);
                    setPausado(true);
                }
            }
        }
        finally {
            if (minhaGeracao === geracao.current)
                setAtualizando(false);
        }
    }, [consultar, uid, setCatalogo]);
    useEffect(() => {
        const estaGeracao = ++geracao.current;
        atual.current = null;
        definirCatalogo(null);
        persistenciaFalhou.current = false;
        void atualizar();
        const interval = setInterval(() => { if (document.visibilityState === 'visible')
            void atualizar(); }, 5 * 60000);
        return () => { geracao.current = estaGeracao + 1; clearInterval(interval); if (salvarTimer.current)
            clearTimeout(salvarTimer.current); };
    }, [atualizar]);
    const temCatalogo = !!catalogo;
    useEffect(() => {
        if (!temCatalogo || pausado || atualizando)
            return;
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        let ativo = true;
        const rodar = async () => {
            if (!ativo)
                return;
            if (document.visibilityState !== 'visible' || retomarEm > Date.now()) {
                timer = setTimeout(rodar, 1500);
                return;
            }
            const mapa = atual.current;
            if (!mapa)
                return;
            const pendentes = mapa.repos.filter((r) => r.estadoLeitura === 'pendente' || r.estadoLeitura === 'lendo');
            const r = pendentes.find((p) => p.id === selecionado) ?? pendentes[0];
            if (!r) {
                setLendo('');
                return;
            }
            setLendo(r.id);
            try {
                const bloco = await consultar<BlocoAtlas>('', 'POST', controller.signal, { repo: r.id, cursor: r.cursor });
                if (!ativo || !atual.current)
                    return;
                setCatalogo(aplicarBloco(atual.current, bloco));
            }
            catch (e) {
                if (!ativo || controller.signal.aborted)
                    return;
                const erro = e as ErroConsultaAtlas;
                if (erro.status === 429) {
                    setRetomarEm(Date.parse(erro.retomarEm ?? '') || Date.now() + 60000);
                    setErro(erro.message);
                    return;
                }
                if (erro.status === 401 || erro.acessoNegado) {
                    setErro(erro.message);
                    atual.current = null;
                    definirCatalogo(null);
                    setPausado(true);
                    return;
                }
                if (erro.status === 400 && r.cursor && atual.current) {
                    setCatalogo({ ...atual.current, repos: atual.current.repos.map((p) => p.id === r.id ? { ...p, estadoLeitura: 'pendente', cursor: undefined, sha: '', arquivos: 0 } : p) });
                }
                else if (atual.current)
                    setCatalogo({ ...atual.current, repos: atual.current.repos.map((p) => p.id === r.id ? { ...p, estadoLeitura: 'erro', erroLeitura: erro.message } : p) });
            }
            if (ativo)
                timer = setTimeout(rodar, 600);
        };
        timer = setTimeout(rodar, 100);
        return () => { ativo = false; controller.abort(); clearTimeout(timer); };
        // A fila usa a referência atual para não abortar a si mesma a cada bloco recebido.
    }, [temCatalogo, pausado, atualizando, retomarEm, selecionado, tentativa, consultar, setCatalogo]);
    return { catalogo, erro, setErro, atualizar, atualizando, pausado, setPausado, lendo, retomarEm };
}
