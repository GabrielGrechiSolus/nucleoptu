# Help Friends - Sistema de Solicitação de Ajuda

## 📋 Visão Geral

O módulo **Help Friends** permite que usuários peçam ajuda de amigos ou publiquem solicitações abertas para outros usuários ajudarem no contexto de um chamado (ticket).

## ✨ Funcionalidades

### 1. **Criar Solicitação de Ajuda**
- Selecione um chamado (ticket) aberto
- Escolha o modo de solicitação:
  - **👤 Amigo Específico**: Direcionar para um amigo específico
  - **🌐 Público**: Publicar para qualquer um ver e oferecer ajuda
- Defina o nível de urgência (Baixa/Média/Alta)
- Selecione o tipo de ajuda:
  - **💼 Regra de Negócio**: Assuntos relacionados a processos e negócio
  - **🛠️ Técnico**: Problemas técnicos de implementação
  - **⚙️ Independente**: Outros tipos de ajuda
- Adicione observações detalhadas

### 2. **Aceitar Solicitação**
- Usuários podem aceitar uma solicitação de ajuda (se for modo público ou amigo específico)
- Ao aceitar, a solicitação muda para status "Em Progresso"
- O aceitante é registrado como "Ajudante"

### 3. **Resolver Solicitação**
- Quem aceitou a solicitação pode resolvê-la
- Deve descrever como o problema foi solucionado
- A solicitação muda para status "Resolvida"

### 4. **Gerenciar Solicitações**
- **Solicitante** pode fechar uma solicitação aberta
- **Amigo** (em modo específico) pode rejeitar a solicitação
- Visualizar detalhes completos de cada solicitação

## 📊 Fluxo de Estados

```
open (Aberta)
  ├→ aceitar → in-progress (Em Progresso)
  │            └→ resolver → resolved (Resolvida)
  │            └→ rejeitar → closed (Fechada)
  └→ fechar → closed (Fechada)
```

## 🏗️ Estrutura de Dados

### HelpFriend

```typescript
{
  id: string;                    // ID único da solicitação
  ticketId: string;              // ID do chamado vinculado
  ticketNumber: string;          // Número do chamado (ex: #123456)
  
  // Informações do Solicitante
  requesterEmail: string;
  requesterName: string;
  createdAt: string;
  
  // Informações da Solicitação
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  helpMode: 'friend' | 'public';
  friendEmail?: string;          // Se mode = 'friend'
  friendName?: string;
  urgency: 'low' | 'medium' | 'high';
  helpType: 'business' | 'technical' | 'independent';
  description: string;           // Observações adicionais
  
  // Informações do Ajudante
  helperEmail?: string;
  helperName?: string;
  acceptedAt?: string;
  
  // Resolução
  resolution?: string;
  resolvedAt?: string;
  
  updatedAt: string;
}
```

## 📱 Interface do Usuário

### Página Principal
- **Estatísticas**: Visualize total de solicitações por status
- **Barra de Ferramenta**: Busca, filtros por status e modo
- **Cards de Solicitação**: Visualização rápida com informações principais
- **Modal de Detalhes**: Informações completas e ações disponíveis

## 🔧 Componentes

### `HelpFriendModal`
- Modal para criar nova solicitação
- Validação de campos obrigatórios
- Seleção de chamado e modo

### `HelpFriendCard`
- Card exibindo resumo da solicitação
- Indicadores visuais de urgência e tipo
- Clique para abrir detalhes

### `HelpDetailModal`
- Modal com todos os detalhes
- Ações disponíveis baseadas no role do usuário
- Formulário de resolução

## 🎯 Próximas Melhorias

- [ ] Notificações em tempo real para novas solicitações
- [ ] Sistema de reputação/rating de ajudantes
- [ ] Histórico de conversas entre solicitante e ajudante
- [ ] Agrupamento de solicitações relacionadas ao mesmo cliente
- [ ] Relatórios de tempo de resolução
- [ ] Integração com email para notificações

## 📝 Notas Técnicas

- Usa Firestore para armazenamento de dados
- Suporta atualização em tempo real com `onSnapshot`
- Integrado com autenticação Firebase
- Responsivo para desktop e mobile
- Tema escuro (Tailwind CSS)
