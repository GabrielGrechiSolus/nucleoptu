export type HelpType = 'business' | 'technical' | 'independent';
export type UrgencyLevel = 'low' | 'medium' | 'high';
export type HelpMode = 'friend' | 'public';
export type HelpStatus = 'open' | 'in-progress' | 'resolved' | 'closed';

export interface HelpFriend {
  id: string;
  ticketId: string;
  ticketNumber: string;
  requesterEmail: string;
  requesterName: string;
  createdAt: string;
  status: HelpStatus;
  
  // Informações da solicitação
  helpMode: HelpMode;
  friendEmail?: string; // Se mode = 'friend'
  friendName?: string;
  
  urgency: UrgencyLevel;
  helpType: HelpType;
  description: string; // Observações adicionais
  
  // Quem está ajudando
  helperEmail?: string;
  helperName?: string;
  acceptedAt?: string;
  requiresRelatus?: boolean;
  
  // Resolução
  resolution?: string;
  resolvedAt?: string;
  
  // Metadata
  updatedAt: string;
}

export interface HelpFriendWithTicket extends HelpFriend {
  ticketDetails?: {
    clientName: string;
    openDate: string;
    status: 'open' | 'closed';
  };
}
