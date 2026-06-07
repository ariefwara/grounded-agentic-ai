export type ChatProfileTheme = {
  primary: string;
  primaryHover: string;
  accent: string;
  avatar: string;
  outgoingBubble: string;
  chatBackground: string;
  backgroundImage?: string;
  composerBackground: string;
};

export type ChatProfile = {
  id: string;
  brand?: string;
  assistantName: string;
  initials: string;
  avatarImage?: string;
  status: string;
  inputPlaceholder: string;
  theme: ChatProfileTheme;
};
