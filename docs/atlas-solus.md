# Atlas Solus

A página `/atlas`, disponível no menu do NucleoPTU, apresenta os repositórios por território de negócio, conexões rastreáveis, pistas de regras, trilhas de exploração e mudanças recentes. Usa o mesmo login e as mesmas restrições de acesso ao Git das páginas existentes. O perfil Sustentação continua sem acesso ao Git.

## Fontes e atualização

- `data/atlas.json`: inventário gerado dos checkouts cuja origem é `github.com/solussaude`. Inclui branch, commit, arquivo, linha e impressão digital do conteúdo. Não é servido como arquivo público e está excluído do Git por conter fontes internas.
- `scripts/index-atlas.py`: lê somente arquivos rastreados pelo Git; não executa procedures, testes, aplicações ou comandos recebidos do navegador. Exclui dependências, credenciais, binários e arquivos acima de 3 MB. Linhas com indícios de segredo não são exibidas.
- `data/atlas-curadoria.json`: arquivo local opcional, excluído do Git, com explicações internas de trechos específicos. Uma explicação só reaparece na indexação enquanto o conteúdo integral do arquivo coincidir com a impressão digital registrada. Mudança na fonte exige nova leitura e atualização da curadoria. Isso não substitui validação de negócio.
- GitHub: lista os repositórios acessíveis na organização e consulta as cinco últimas alterações da branch indexada e os PRs mergeados encontrados entre os vinte PRs fechados mais recentemente atualizados. Consulta a cada cinco minutos enquanto a página estiver visível, com cache de cinco minutos no servidor.

O inventário inicial traz apenas metadados. A biblioteca busca doze ocorrências por página no servidor; não baixa todos os trechos de código. As respostas exigem autenticação e não podem ser armazenadas em cache público.

## Executar

Na pasta do NucleoPTU:

```sh
npm run atlas:index -- --root C:/RepositorioGit
npm run dev
```

A integração Git usa a credencial já existente no servidor (`GITHUB_TOKEN` ou GitHub CLI). Nenhum token é enviado ao navegador. Não adicione credenciais ao inventário ou à curadoria.

Variáveis exclusivas do servidor:

```dotenv
ATLAS_WORKSPACE_ROOT=C:/RepositorioGit
# Opcional: caminho do Python quando não estiver disponível no PATH
ATLAS_PYTHON=python
```

Com os checkouts e Python disponíveis, a página solicita releitura quando o mapa tem mais de quinze minutos, enquanto estiver aberta e visível. A opção “Como funciona o Atlas → Reler código no servidor” permite solicitar a leitura manualmente. A releitura acontece em segundo plano, com acompanhamento a cada quinze segundos e limite de quinze minutos por execução. É necessário um servidor Node persistente para esse modo. Existe uma leitura concorrente por processo e limite de duas solicitações por pessoa a cada dez minutos. A gravação do inventário é atômica; uma leitura malsucedida preserva o mapa anterior.

Sem `ATLAS_WORKSPACE_ROOT`, o mapa salvo continua utilizável e o Git continua sendo consultado, mas o código não é reindexado automaticamente. Hospedagem sem disco persistente/Python/checkouts precisa gerar o inventário no processo de publicação e incluir `data/atlas.json` no artefato. Para múltiplas instâncias, usar um único produtor do inventário e armazenamento compartilhado; a trava atual é local ao processo. O catálogo contém trechos internos: publicar somente com as regras de acesso da aplicação.

O indexador não faz clone, fetch, checkout ou merge e não modifica os repositórios analisados. Portanto, uma divergência entre a branch remota e o checkout local continua sinalizada até que o checkout seja atualizado pelo fluxo normal de desenvolvimento. Reindexar um checkout antigo não atualiza seu código.

## Como interpretar

As áreas são agrupamentos editoriais para navegação, não uma arquitetura validada. Conexões são inferidas de caminhos explícitos, referências documentadas ou chamadas a packages encontrados em outro repositório; não provam que uma integração esteja em execução em produção.

Os cartões automáticos são **pistas**, não regras prontas. Há até três exemplos por categoria em cada arquivo; documentos literais de cliente não têm esse limite. Máscaras com todos os dígitos iguais são descartadas. Um número de quatorze dígitos pode ter outro significado: a menção não comprova CNPJ válido nem exceção exclusiva. Ausência de cartão não comprova ausência de regra.

Parâmetros encontrados no código não informam o valor configurado no cliente. Commit ou PR mergeado não confirma release, revision instalada nem vigência. O painel preserva essas distinções. Arquivo alterado localmente não recebe link para uma versão publicada; os demais links apontam para o commit indexado, nunca para uma linha móvel de uma branch.

O passaporte registra sistemas visitados por pessoa neste navegador. Não atribui domínio técnico, produtividade ou pontuação gerencial. As trilhas são percursos editoriais para descobrir relações, não afirmações de uma sequência universal de execução.

## Verificação

```sh
npm run atlas:test-index
npm test -- --runInBand app/atlas/modelo.test.ts app/api/atlas/route.test.ts
npx tsc --noEmit
npx eslint app/atlas app/api/atlas
```

Os testes cobrem fontes, exclusões, alterações locais, referências entre repositórios, documentos por cliente, busca, autenticação, resumo sem código, validação dos nomes e diferenças entre mapa e Git.
