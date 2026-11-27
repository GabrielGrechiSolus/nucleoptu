# Telas de detalhe e filtros

## Detalhe em tela cheia, com endereço próprio

- Nada de modal para detalhe ou formulário grande: o detalhe ocupa a tela, com botão **Voltar**.
- O detalhe aberto fica na URL, então o link pode ser enviado e o Voltar do navegador funciona:
  - Processos do BM: `?chamado=<número só com dígitos>` ou `?cartao=<id do cartão>`
  - Contexto de chamados: `?chamado=<id>` e `?modelo=1`
  - Chamados sem PR (BM): `?cartao=<id>`
  - Conexões de clientes: `?cliente=<id>`, `?editar=<id>` ou `?editar=novo`
  - Fila de aplicação: `?pedido=<id>`
- A lista e os filtros continuam montados enquanto o detalhe está aberto; ao voltar, nada se perde.
- Se o link for aberto direto (sem página anterior), Voltar leva à lista.
- A prévia de importação de contextos não tem URL (os dados só existem na memória); o Voltar do navegador a fecha.

## Como criar uma tela nova

1. Em `app/<rota>/layout.tsx`, exporte `LayoutComSidebar` (`app/components/LayoutComSidebar.tsx`). Ele já traz o `Suspense` exigido por `useSearchParams`.
2. Na página, use `useDetalheNaUrl('<parametro>')` (`app/components/TelaDetalhe.tsx`): `valor`, `abrir(v)`, `hrefDe(v)` e `voltar()`. Use `useParametrosUrl()` quando precisar trocar vários parâmetros de uma vez.
3. Deixe o número ou nome da linha como `<Link href={hrefDe(id)}>` (abre em nova aba e faz prefetch) e mantenha o clique na linha com `abrir(id)`.
4. Renderize o detalhe com `<TelaDetalhe onVoltar cabecalho abas rodape>`.

## Filtros

- Campo de busca com lupa: use o componente `CampoBusca` (`app/components/CampoBusca.tsx`). Não posicione ícone sobre `rel-input` com classes `pl-*` ou `pr-*`: o estilo de `rel-input` tem prioridade, o espaço não é aplicado e o ícone cobre o texto. Para botão dentro do campo, envolva em `rel-com-botao`.
- No Contexto de chamados, os filtros ficam recolhidos no botão **Filtros** e os ativos aparecem como etiquetas removíveis (`app/chamados/FiltrosChamados.tsx`).
- Use `<div className="rel-filters">`: grade que quebra por largura mínima de 190px (campos nunca ficam espremidos), uma coluna no celular.
- A busca leva `rel-filter-wide` (duas colunas); botões ficam em `rel-filter-actions`; caixas de seleção usam `rel-check-inline`.
- Não limite a largura de `select` com `max-w-*` dentro de `.rel-filters`.

## Menu lateral

- O menu é uma árvore por assunto, definida em `app/components/navegacao.ts` (`montaMenu`): Início, Mural, **Chamados** (Contexto, Fila e a subárvore **Businessmap (BM)** com Chamados sem PR e Processos do BM), **Apoio ao atendimento** (Conexões e Links úteis) e **Conta e administração** (Perfil, Usuários e Gestão de usuários).
- Para uma tela nova, acrescente o item no grupo do assunto em `montaMenu`; itens restritos (como Processos do BM) entram por opção. A busca do menu, os grupos recolhíveis, o realce da rota ativa e os contadores já funcionam a partir daí.
- Com o menu recolhido (só ícones), os itens aparecem em lista simples.
