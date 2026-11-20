"""Inventário rastreável dos checkouts Solus. Não executa código dos repositórios."""
import argparse
import collections
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import quote

EXTENSIONS = {'.sql', '.pas', '.dpr', '.dproj', '.java', '.php', '.ts', '.tsx', '.js', '.cs', '.xml', '.ini', '.yaml', '.yml', '.json', '.md'}
IGNORE = {'node_modules', '.git', '.next', 'vendor', 'dist', 'build', 'target', 'bin', 'obj', 'packages', 'historico'}
SECRET = re.compile(r'password|passwd|senha|secret|token|private.key|api.key|connectionstring|bearer|credential', re.I)
PATTERNS = [
    ('cliente', re.compile(r'\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b|[\'\"]\d{14}[\'\"]')),
    ('glosa', re.compile(r'glos[ae]|indevid|diverg[eê]nc|negad|nao.autoriz|não.autoriz', re.I)),
    ('parametro', re.compile(r'pkg_parametro|parametr[oa]|par[aâ]metr[oa]|regra_tiss_prestador', re.I)),
    ('configuracao', re.compile(r'getenv|process\.env\.|readstring|readinteger|configurac|configuraç|feature.flag', re.I)),
    ('regra', re.compile(r'aplica_redutor|valoriza|car[eê]ncia|coparticip|vig[eê]ncia|limite|desconto|acrescimo|acr[eé]scimo', re.I)),
]
HINTS = {
    'glosa': ('glos', 'indevid', 'diverg', 'negad', 'autoriz'),
    'parametro': ('parametr', 'parâmetr', 'regra_tiss_prestador'),
    'configuracao': ('getenv', 'process.env.', 'readstring', 'readinteger', 'configurac', 'configuraç', 'feature'),
    'regra': ('redutor', 'valoriza', 'carên', 'caren', 'coparticip', 'vigên', 'vigen', 'limite', 'desconto', 'acrescimo', 'acréscimo'),
}
SENSITIVE = ('password', 'passwd', 'senha', 'secret', 'token', 'private_key', 'private-key', 'private.key', 'privatekey', 'api_key', 'api-key', 'apikey', 'connectionstring', 'bearer', 'credential')
DOMAIN = {
    'intercambio': {'ptu', 'lib_ptu', 'api_ptu', 'api_a800', 'ws_intercambio_consumidor', 'ws_intercambio_webptu', 'ws_sispac'},
    'contas': {'banco', 'contas', 'api_contas', 'api_webcontas', 'japi_contas', 'japi_webcontas', 'web_contas', 'tiss', 'ws_tiss', 'servertiss', 'webservicetiss', 'api_webservicetiss', 'lerxml'},
    'atendimento': {'guias', 'crm', 'hss', 'solusweb', 'api_webprestador', 'api_chatunimed'},
    'gestao': {'adm', 'ans', 'estoque', 'financ', 'pessoal', 'web_relatus'},
}
DESCRIPTIONS = {
    'banco': 'Rotinas de dados, cálculos e validações compartilhadas pelos módulos.',
    'ptu': 'Intercâmbio entre operadoras e processamento dos arquivos PTU.',
    'contas': 'Conferência de contas médicas, pagamentos e glosas.',
    'TestesIntegracao': 'Cenários automatizados que verificam o comportamento das rotinas.',
    'nucleoptu': 'Contexto de chamados e apoio ao trabalho de análise.',
    'crm': 'Gestão do relacionamento no ecossistema de saúde suplementar.',
    'japi_contas': 'Serviço de contas médicas, itens e lotes na migração para Java.',
    'japi_webcontas': 'Entrada do Web Contas que direciona solicitações entre serviços Delphi e Java.',
    'api_webprestador': 'Entrada do Web Prestador: autentica e encaminha solicitações às APIs de origem.',
    'api_webservicetiss': 'Recebe, grava e valida lotes de guias TISS enviados pelos prestadores.',
    'lib_ptu': 'Objetos e configurações compartilhados do PTU.',
    'ws_intercambio_consumidor': 'Consumidor do intercâmbio PTU; compartilha a biblioteca ws_lib_shared.',
    'ws_intercambio_webptu': 'Servidor Web PTU; compartilha a biblioteca ws_lib_shared.',
    'ws_lib_shared': 'Biblioteca compartilhada entre o consumidor do intercâmbio e o Web PTU.',
    'jworker_upflux': 'Lê dados de integração e gera arquivos Parquet para processamento.',
}

def git(repo, *args):
    try:
        return subprocess.check_output(['git', '-C', str(repo), *args], timeout=40, stderr=subprocess.DEVNULL).decode('utf-8', 'replace').strip()
    except (subprocess.SubprocessError, OSError):
        return ''

def blob(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()

def build(root):
    repos, rules, edges = [], [], {}
    providers, calls = {}, []
    candidates = []
    for p in sorted(root.iterdir()):
        if not p.is_dir() or p.is_symlink() or p.is_junction() or not (p / '.git').exists():
            continue
        remote = git(p, 'remote', 'get-url', 'origin')
        match = re.search(r'github\.com[:/]solussaude/([^/\s]+?)(?:\.git)?$', remote, re.I)
        if match:
            candidates.append((p, match[1]))
    names = {name.lower(): name for _, name in candidates}
    curated_file = Path(__file__).resolve().parents[1] / 'data' / 'atlas-curadoria.json'
    curated = json.loads(curated_file.read_text(encoding='utf-8')) if curated_file.exists() else []
    for folder, name in candidates:
        branch = git(folder, 'branch', '--show-current')
        sha = git(folder, 'rev-parse', 'HEAD')
        changed = set(git(folder, 'diff', '--name-only', 'HEAD').splitlines())
        tracked = git(folder, 'ls-files', '-z').split('\0')
        count, ignored, signals, found = 0, 0, 0, 0
        categories = collections.Counter()
        for relative in tracked:
            p = folder / relative
            if not relative or any(part.lower() in IGNORE for part in Path(relative).parts) or p.suffix.lower() not in EXTENSIONS:
                continue
            if SECRET.search(p.name) or p.name.startswith('.env') or 'lock' in p.name.lower() or p.is_symlink():
                ignored += 1
                continue
            try:
                if not p.is_file() or p.stat().st_size > 3_000_000:
                    ignored += 1
                    continue
                raw = p.read_bytes()
                try:
                    text = raw.decode('utf-8-sig')
                except UnicodeDecodeError:
                    text = raw.decode('cp1252', errors='replace')
            except OSError:
                ignored += 1
                continue
            count += 1
            digest = blob(raw)
            for entry in curated:
                if entry['repo'] != name or entry['arquivo'] != relative or entry['blob'] != digest:
                    continue
                anchor = entry['ancora']
                line_no = next((i for i, line in enumerate(text.splitlines(), 1) if anchor in line), None)
                if not line_no:
                    continue
                found += 1
                categories[entry['categoria']] += 1
                rules.append(dict(id=entry['id'], repo=name, titulo=entry['titulo'], categoria=entry['categoria'], resumo=entry['resumo'], cnpjs=entry.get('cnpjs', []), termos=entry.get('termos', []), explicacao=entry['explicacao'], fonte=dict(arquivo=relative, linha=line_no, trecho=text.splitlines()[line_no-1].strip(), blob=digest, alterado=relative in changed, url='' if relative in changed else f'https://github.com/solussaude/{name}/blob/{sha}/{quote(relative, safe="/")}#L{line_no}')))
            per_category = collections.Counter()
            for line_no, line in enumerate(text.splitlines(), 1):
                if not line.strip():
                    continue
                lower = line.casefold()
                if any(word in lower for word in SENSITIVE):
                    continue
                package = re.search(r'create\s+or\s+replace\s+package\s+(?:body\s+)?(?:\w+\.)?(pkg_\w+)', line, re.I) if p.suffix.lower() != '.md' and 'package' in lower and 'create' in lower else None
                if package:
                    providers.setdefault(package[1].lower(), set()).add(name)
                for symbol in set(re.findall(r'\b(pkg_\w+)\s*\.', line, re.I)) if p.suffix.lower() != '.md' and 'pkg_' in lower else ():
                    calls.append((name, symbol.lower(), relative, line_no))
                # Só caminhos explícitos para outros checkouts; nomes soltos não provam dependência.
                for other in re.findall(r'(?:\.\.[/\\]|github\.com[:/]solussaude/)([\w.-]+)(?:[/\\]|(?=[)\s#]))', line, re.I) if '../' in line or '..\\' in line or 'github.com' in lower else ():
                    dest = names.get(other.lower().removesuffix('.git'))
                    if dest and dest != name:
                        key = (name, dest, 'Relação documentada' if p.suffix.lower() == '.md' else 'Referência explícita de caminho')
                        if key not in edges:
                            edges[key] = dict(origem=name, destino=dest, motivo=key[2], arquivo=relative, linha=line_no, ocorrencias=0)
                        edges[key]['ocorrencias'] += 1
                if p.suffix.lower() == '.md':
                    continue
                for category, pattern in PATTERNS:
                    if category == 'cliente' and "'" not in line and '"' not in line and '/' not in line:
                        continue
                    if category in HINTS and not any(hint in lower for hint in HINTS[category]):
                        continue
                    if not pattern.search(line):
                        continue
                    if category == 'cliente':
                        docs = re.findall(r'\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}|(?<=[\'\"])\d{14}(?=[\'\"])', line)
                        if not any(len(set(re.sub(r'\D', '', doc))) > 1 for doc in docs):
                            continue
                    signals += 1
                    # Amostra estratificada explícita: evita transformar arquivos gigantes em milhares de cartões iguais.
                    if category != 'cliente' and per_category[category] >= 3:
                        break
                    per_category[category] += 1
                    found += 1
                    categories[category] += 1
                    cnpjs = [doc for doc in re.findall(r'\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b|(?<=[\'\"])\d{14}(?=[\'\"])', line) if len(set(re.sub(r'\D', '', doc))) > 1]
                    terms = list(dict.fromkeys(re.findall(r'\b(?:pkg_\w+|[a-z]\w{5,})\b', line, re.I)))[:12]
                    titles = {'cliente': 'Documento de cliente mencionado no código', 'glosa': 'Ponto de glosa ou validação', 'parametro': 'Comportamento controlado por parâmetro', 'configuracao': 'Configuração que pode alterar o fluxo', 'regra': 'Condição de cálculo ou atendimento'}
                    descriptions = {'cliente': 'Há um documento literal neste trecho. Verifique a condição e a vigência antes de concluir que é uma exceção exclusiva deste cliente.', 'glosa': 'Este ponto menciona glosa ou recusa. A condição completa e o motivo precisam ser lidos na fonte.', 'parametro': 'O resultado pode depender de uma opção configurada. A presença do parâmetro não informa seu valor no cliente.', 'configuracao': 'Este ponto lê ou usa uma configuração. Confirme o ambiente e o valor aplicado antes de orientar o cliente.', 'regra': 'Há um sinal de limite, vigência ou cálculo. A leitura automática não confirma sozinha o comportamento final.'}
                    # Frases de mensagens/opções ajudam a reconhecer o assunto sem inventar uma tradução da lógica.
                    phrases = re.findall(r"['\"]([^'\"\n]{12,160})['\"]", line)
                    phrase = next((value.strip() for value in phrases if len(value.split()) >= 3 and not re.search(r'\b(select|from|where|insert|update|delete|join|begin|varchar|and|or|then|class|function)\b|[{}=;<>]|https?://', value, re.I)), '')
                    context = re.sub(r'^(?:package_|pkg_)', '', Path(relative).stem, flags=re.I).replace('_', ' ')
                    title = (f'Menção no código: {phrase}' if phrase and category != 'cliente' else f'{titles[category]} · {context[:65]}')
                    url = '' if relative in changed else f'https://github.com/solussaude/{name}/blob/{sha}/{quote(relative, safe="/")}#L{line_no}'
                    rules.append(dict(id=hashlib.sha256(f'{name}:{relative}:{category}:{line_no}'.encode()).hexdigest()[:20], repo=name, titulo=title, categoria=category, resumo=descriptions[category], cnpjs=sorted(set(cnpjs)), termos=terms, fonte=dict(arquivo=relative, linha=line_no, trecho=line.strip()[:350], blob=digest, alterado=relative in changed, url=url)))
                    break
        domain = next((d for d, ns in DOMAIN.items() if name.lower() in ns), 'plataforma')
        repos.append(dict(id=name, nome=name, descricao=DESCRIPTIONS.get(name, 'Explore as fontes e conexões deste repositório. Papel funcional a validar com a equipe.'), dominio=domain, branch=branch or 'HEAD', sha=sha, arquivos=count, ignorados=ignored, sinais=signals, catalogados=found, categorias=dict(categories), alterado=bool(changed), atualizadoEm=git(folder, 'log', '-1', '--format=%cI'), url=f'https://github.com/solussaude/{name}'))
    for origin, symbol, path, line in calls:
        for dest in providers.get(symbol, set()):
            if origin == dest:
                continue
            key = (origin, dest, 'Uso de rotina de banco')
            if key not in edges:
                edges[key] = dict(origem=origin, destino=dest, motivo=f'Uso de rotina de banco ({symbol})', arquivo=path, linha=line, ocorrencias=0)
            edges[key]['ocorrencias'] += 1
    rules.sort(key=lambda r: not bool(r.get('explicacao')))
    return dict(versao=1, geradoEm=datetime.datetime.now(datetime.timezone.utc).isoformat(), repos=repos, regras=rules, conexoes=list(edges.values()), limites=[
        'Inventário dos checkouts locais com origem solussaude. Outros repositórios aparecem na sincronização do Git, sem análise de código até serem indexados.',
        'Detecção por padrões, com até três exemplos por categoria em cada arquivo; documentos de cliente não têm esse limite. Os cartões são pistas para análise, não um catálogo completo de regras validadas.',
        'Explicações com leitura técnica só são mantidas enquanto o conteúdo integral do arquivo coincidir com a fonte analisada. Ainda exigem validação de negócio e da versão do cliente.',
        'Arquivos binários, dependências, credenciais, arquivos acima de 3 MB e linhas com possíveis segredos não são publicados.',
        'Documento literal não comprova exceção por CNPJ. Não há consulta à configuração ou à revision instalada no cliente.',
        'Conexões vêm de caminhos explícitos ou uso de packages definidos em outro repositório; agrupamentos por área são uma navegação editorial.',
        'Fontes refletem o checkout e a branch indicados. Mudanças locais são sinalizadas e não recebem link para uma versão publicada.'
    ])

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default=os.environ.get('ATLAS_WORKSPACE_ROOT', str(Path(__file__).resolve().parents[2])))
    parser.add_argument('--output', default=str(Path(__file__).resolve().parents[1] / 'data' / 'atlas.json'))
    args = parser.parse_args()
    result = build(Path(args.root).resolve())
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix('.tmp')
    temporary.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    temporary.replace(output)
    print(json.dumps(dict(repos=len(result['repos']), regras=len(result['regras']), conexoes=len(result['conexoes']), geradoEm=result['geradoEm'])))
