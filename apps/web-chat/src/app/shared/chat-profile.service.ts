import { Injectable } from '@angular/core';
import { parse } from 'yaml';
import { ChatProfile } from './chat-profile.model';

@Injectable({ providedIn: 'root' })
export class ChatProfileService {
  profile!: ChatProfile;

  async load(): Promise<void> {
    this.profile = await this.loadProfile();
    this.applyProfile(this.profile);
  }

  private async loadProfile(): Promise<ChatProfile> {
    const searchParams = new URLSearchParams(window.location.search);
    const queryProfileId = searchParams.get('profile');
    if (!queryProfileId) {
      searchParams.set('profile', 'retail');
      window.location.replace(`${window.location.pathname}?${searchParams}${window.location.hash}`);
      await new Promise<never>(() => undefined);
    }

    const profileId = queryProfileId || 'retail';
    window.localStorage.setItem('web-chat-profile-id', profileId);

    const baseUrl = `/config/profiles/${encodeURIComponent(profileId)}`;
    const [identityResponse, appearanceResponse] = await Promise.all([
      fetch(`${baseUrl}/identity.yaml`),
      fetch(`${baseUrl}/appearance.yaml`),
    ]);
    if (!identityResponse.ok || !appearanceResponse.ok) {
      throw new Error(`Unknown web-chat profile "${profileId}".`);
    }

    const identity = parse(await identityResponse.text());
    const theme = parse(await appearanceResponse.text());
    return { ...identity, theme } as ChatProfile;
  }

  private applyProfile(profile: ChatProfile): void {
    const root = document.documentElement;
    root.style.setProperty('--chat-primary', profile.theme.primary);
    root.style.setProperty('--chat-primary-hover', profile.theme.primaryHover);
    root.style.setProperty('--chat-accent', profile.theme.accent);
    root.style.setProperty('--chat-avatar', profile.theme.avatar);
    root.style.setProperty('--chat-outgoing', profile.theme.outgoingBubble);
    root.style.setProperty('--chat-background', profile.theme.chatBackground);
    root.style.setProperty(
      '--chat-background-image',
      profile.theme.backgroundImage ? `url("${profile.theme.backgroundImage}")` : 'none',
    );
    root.style.setProperty('--chat-composer', profile.theme.composerBackground);
    document.title = profile.assistantName;
  }
}
