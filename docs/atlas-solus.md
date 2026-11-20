# Atlas Solus — fontes diretamente do Git

A página `/atlas` usa a integração GitHub existente no NucleoPTU. Não requer checkout, Python, arquivo de inventário no servidor, `ATLAS_WORKSPACE_ROOT`, credencial nova ou armazenamento adicional na Vercel.

## Caminho da informação

1. A API confirma o login Firebase e o perfil, mantendo a restrição atual de acesso ao Git para Sustentação.
2. Lista os repositórios acessíveis na organização configurada em `GITHUB_ORG` (padrão `solussaude`), com paginação. O mapa abre com essa lista, mesmo antes de terminar a análise das fontes.
3. Cada chamada de leitura resolve a branch padrão para um commit e lê até doze arquivos elegíveis, respeitando também o tamanho do bloco. Os blocos seguintes continuam no mesmo commit.
4. As fontes são buscadas no GitHub, preferencialmente em uma consulta GraphQL com vários blobs. Se o token permitir Contents REST mas não GraphQL, usa a leitura REST dos blobs. Fontes Windows-1252 também são interpretadas.
5. O servidor extrai pistas e referências, sem executar código dos projetos. Devolve apenas resultados, progresso e cursor assinado. O próximo bloco pode ser atendido por outra instância da Vercel.
6. O navegador combina os blocos e recompõe as relações, inclusive quando o fornecedor de uma rotina é descoberto depois de quem a utiliza. O sistema selecionado tem prioridade sobre os demais.

O token já configurado em `GITHUB_TOKEN` permanece exclusivamente no servidor. Localmente, continua disponível o fallback existente para GitHub CLI. A credencial precisa das permissões de leitura dos repositórios e de seus conteúdos; o Atlas não amplia permissões.

## Retomada, atualização e limites

O progresso é salvo por usuário em IndexedDB neste navegador. A permissão atual é confirmada pelo servidor antes de mostrar fontes anteriormente salvas. Sem armazenamento disponível, a leitura continua em memória durante a sessão. Outro navegador inicia sua própria leitura; não há banco central de regras nesta implementação.

A lista do Git é atualizada a cada cinco minutos enquanto a página estiver visível. Mudanças no repositório invalidam sua leitura anterior; os demais sistemas são preservados. As descobertas apontam para o commit analisado. “Atualizar Git” também permite tentar novamente os sistemas com falha. Há controles para pausar e retomar a leitura.

Cada requisição termina um bloco; não há processo em segundo plano dependente de uma função serverless continuar viva. O cache em memória do servidor é uma otimização limitada em tamanho, isolada pela credencial, e não um requisito para retomar. O cursor é autenticado por HMAC, tem validade de sete dias e é vinculado ao repositório, à versão do extrator e à credencial do servidor. Cursor vencido reinicia a leitura daquele sistema.

O GitHub pode pedir uma pausa. Nessa situação, o bloco não avança e o navegador respeita o horário de retomada. Falha de um sistema não implica que ele foi analisado. Uma árvore truncada do Git é apresentada como incompleta, nunca como catálogo completo. A leitura de toda a organização pode demorar; a página mostra o progresso e já permite explorar os resultados disponíveis.

## Interpretação das pistas

- São até três exemplos por categoria em cada arquivo. Documentos literais de cliente não têm esse limite.
- Dependências, credenciais, binários, links simbólicos e arquivos acima de 3 MB não entram na leitura. Linhas com possíveis segredos são omitidas.
- Um número com quatorze dígitos não prova CNPJ válido ou exceção exclusiva. Máscaras com todos os dígitos iguais são descartadas.
- Parâmetros encontrados no código não informam o valor configurado no cliente.
- Áreas e trilhas são organização editorial. As relações indicam referências no código ou na documentação, não comprovam uma integração em execução.
- Commit, PR mergeado e branch padrão não confirmam release nem revision instalada no cliente.
- O passaporte conta sistemas visitados. Não representa domínio, produtividade ou avaliação gerencial.

O inventário local `data/atlas.json`, a curadoria local e o comando opcional `npm run atlas:index` continuam excluídos do Git e podem apoiar análise offline. A página publicada não depende desses arquivos nem os carrega automaticamente como fonte atual.

## Verificação

```sh
npm test -- --runInBand app/api/atlas app/atlas
npx tsc --noEmit
npx eslint app/atlas app/api/atlas
npm run build
```

Os testes incluem paginação, leitura sem disco local, retomada entre instâncias, assinatura e expiração de cursor, versão fixa por commit, exclusão de segredos, fontes Windows, limites do Git, troca de versão, fila e isolamento de acesso.

Referências de implementação: [Git Trees](https://docs.github.com/en/rest/git/trees), [limites do GraphQL](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api).
