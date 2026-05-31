export type ChatMessage = {
  id: number;
  sender: 'user' | 'assistant';
  body: string;
  time: string;
  pending?: boolean;
  status?: 'sent' | 'read';
};
