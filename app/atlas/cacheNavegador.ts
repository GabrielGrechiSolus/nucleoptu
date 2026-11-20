import type { CatalogoAtlas } from './modelo';
import { VERSAO_EXTRACAO } from './extracao';
function abrir(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('nucleoptu-atlas-git', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('mapas');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
export async function lerMapa(uid: string): Promise<CatalogoAtlas | null> {
    const db = await abrir();
    try {
        return await new Promise((resolve, reject) => {
            const req = db.transaction('mapas').objectStore('mapas').get(uid);
            req.onsuccess = () => { const dados = req.result as CatalogoAtlas | undefined; resolve(dados?.versao === VERSAO_EXTRACAO && dados.origem === 'github' ? dados : null); };
            req.onerror = () => reject(req.error);
        });
    }
    finally {
        db.close();
    }
}
export async function salvarMapa(uid: string, catalogo: CatalogoAtlas) {
    const db = await abrir();
    try {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('mapas', 'readwrite');
            tx.objectStore('mapas').put(catalogo, uid);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }
    finally {
        db.close();
    }
}
