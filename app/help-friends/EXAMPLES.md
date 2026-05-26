// ============================================
// EXEMPLOS DE USO - Help Friends Module
// ============================================

// ============================================
// 1. CRIAR UMA SOLICITAÇÃO DE AJUDA
// ============================================

/*
const handleCreateHelp = async () => {
  const newHelp = {
    ticketId: "ticket-123",
    ticketNumber: "#45678",
    helpMode: "friend", // ou "public"
    friendEmail: "amigo@email.com", // obrigatório se mode = "friend"
    friendName: "João Silva",
    urgency: "high", // "low" | "medium" | "high"
    helpType: "technical", // "business" | "technical" | "independent"
    description: "Preciso de ajuda para resolver esse erro de conexão com o banco de dados. A aplicação está retornando erro 500 ao tentar buscar os dados do cliente.",
  };
  
  // Isso é feito automaticamente via HelpFriendModal
};
*/

// ============================================
// 2. ESTRUTURA DO DOCUMENTO NO FIRESTORE
// ============================================

/*
helpFriends/{docId}
{
  id: "help-friend-1",
  ticketId: "ticket-123",
  ticketNumber: "#45678",
  
  // Solicitante
  requesterEmail: "user@email.com",
  requesterName: "Maria Santos",
  createdAt: "2024-05-26T10:30:00Z",
  
  // Solicitação
  status: "open" | "in-progress" | "resolved" | "closed",
  helpMode: "friend" | "public",
  friendEmail: "amigo@email.com",
  friendName: "João Silva",
  urgency: "high",
  helpType: "technical",
  description: "Descrição detalhada do problema...",
  
  // Ajudante
  helperEmail: "ajudante@email.com",
  helperName: "Carlos Costa",
  acceptedAt: "2024-05-26T11:00:00Z",
  
  // Resolução
  resolution: "A solução foi adicionar a configuração de timeout...",
  resolvedAt: "2024-05-26T14:30:00Z",
  
  updatedAt: "2024-05-26T14:30:00Z"
}
*/

// ============================================
// 3. FLUXO DE ESTADO
// ============================================

/*
SOLICITAÇÃO PÚBLICA:
  1. User A cria solicitação (status: "open")
  2. User B vê e clica em "Aceitar Ajudar" (status: "in-progress")
  3. User B resolve e descreve a solução (status: "resolved")
  4. User A pode ver a resolução

SOLICITAÇÃO PARA AMIGO ESPECÍFICO:
  1. User A cria solicitação para User B (status: "open")
  2. User B pode aceitar ou rejeitar (status: "in-progress" ou "closed")
  3. Se aceitar e resolver, status muda para "resolved"
  4. Se rejeitar, status muda para "closed" imediatamente
  5. User A pode fechar se ninguém aceitar

ENCERRAMENTO:
  - User A pode fechar solicitação aberta
  - Ajudante rejeita solicitação (para amigo)
  - Solicitação é resolvida
*/

// ============================================
// 4. PERMISSÕES E AÇÕES
// ============================================

/*
SOLICITANTE (requesterEmail === user.email):
  ✅ Ver sua própria solicitação
  ✅ Fechar solicitação aberta
  ✅ Ver quando foi resolvida
  ❌ Aceitar sua própria solicitação

AMIGO ESPECÍFICO (friendEmail === user.email):
  ✅ Ver solicitação direcionada a ele
  ✅ Aceitar ou Rejeitar
  ✅ Resolver se aceitou
  ❌ Modificar dados da solicitação

AJUDANTE (helperEmail === user.email):
  ✅ Ver solicitação que aceitou
  ✅ Marcar como resolvido
  ✅ Descrever a resolução
  ❌ Remover a solicitação

OUTROS (solicitação pública):
  ✅ Ver solicitação pública
  ✅ Aceitar se status = "open"
  ❌ Ver solicitações privadas de outros
*/

// ============================================
// 5. FILTROS E BUSCA
// ============================================

/*
// Por Status:
- open: Solicitações aguardando ajuda
- in-progress: Alguém aceitou e está trabalhando
- resolved: Problema foi solucionado
- closed: Solicitação fechada/cancelada

// Por Modo:
- friend: Solicitações para amigos específicos
- public: Solicitações abertas para qualquer um

// Busca por texto:
- Número do ticket (#45678)
- Nome do solicitante
- Nome do amigo
- Descrição do problema
*/

// ============================================
// 6. INTEGRAÇÕES FUTURAS
// ============================================

/*
- Email notification quando solicitação é criada
- Push notification para aceitar/resolver
- Chat em tempo real entre solicitante e ajudante
- Avaliação/rating do ajudante
- Sistema de pontos por ajudas
- Relatório de tempo médio de resolução
- Associação com múltiplos tickets
- Categoria de problemas frequentes
*/

// ============================================
// 7. SEGURANÇA (Firestore Rules)
// ============================================

/*
Regra sugerida para Firestore:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /helpFriends/{document=**} {
      // Ler próprias solicitações, amigo específico, ou públicas
      allow read: if 
        request.auth.token.email == resource.data.requesterEmail ||
        request.auth.token.email == resource.data.friendEmail ||
        resource.data.helpMode == 'public';
      
      // Criar novas solicitações
      allow create: if request.auth != null &&
        request.resource.data.requesterEmail == request.auth.token.email;
      
      // Atualizar (aceitar, resolver, etc)
      allow update: if request.auth != null && (
        request.auth.token.email == resource.data.requesterEmail ||
        request.auth.token.email == resource.data.friendEmail ||
        (resource.data.helpMode == 'public' && request.auth.token.email != resource.data.requesterEmail)
      );
      
      // Deletar
      allow delete: if request.auth.token.email == resource.data.requesterEmail;
    }
  }
}
*/

export {};
