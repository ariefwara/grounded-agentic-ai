import { Component, HostListener, signal, viewChild } from '@angular/core';
import { ChatComposer } from './chat-composer/chat-composer';
import { ChatHeader } from './chat-header/chat-header';
import { MessageList } from './message-list/message-list';
import { EngineClient } from './shared/engine-client.service';
import { ChatMessage } from './shared/chat-message.model';
import { ChatProfile } from './shared/chat-profile.model';
import { ChatProfileService } from './shared/chat-profile.service';

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

@Component({
  selector: 'app-root',
  imports: [ChatComposer, ChatHeader, MessageList],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly composer = viewChild.required(ChatComposer);
  private audioContext?: AudioContext;
  private lastTypingSoundAt = 0;

  constructor(
    private readonly engineClient: EngineClient,
    profileService: ChatProfileService,
  ) {
    this.profile = profileService.profile;
  }

  protected readonly profile: ChatProfile;
  protected readonly messages = signal<ChatMessage[]>([]);

  @HostListener('window:message', ['$event'])
  protected handleSimulationMessage(event: MessageEvent): void {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === 'SIMULATION_TYPE_WORD') {
      if (typeof event.data.value !== 'string') return;
      this.composer().appendText(event.data.value);
      this.playTypingSound();
      return;
    }
    if (event.data?.type === 'SIMULATION_SUBMIT_MESSAGE') {
      if (typeof event.data.requestId !== 'string') return;
      this.composer().submit(event.data.requestId);
    }
  }

  protected async sendMessage(body: string, requestId?: string): Promise<void> {
    const userMessageId = Date.now();
    const pendingMessageId = userMessageId + 1;

    this.playTone({ frequency: 740, duration: 0.06, volume: 0.045 });
    this.messages.update((messages) => [
      ...messages,
      {
        id: userMessageId,
        sender: 'user',
        body,
        time: new Intl.DateTimeFormat('en', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date()),
        status: 'sent',
      },
      {
        id: pendingMessageId,
        sender: 'assistant',
        body: '',
        time: this.currentTime(),
        pending: true,
      },
    ]);

    try {
      const answer = await this.engineClient.sendMessage(body);
      this.receiveAssistantReply(answer, requestId, pendingMessageId);
    } catch {
      this.receiveAssistantReply('I cannot reach the engine right now.', requestId, pendingMessageId);
    }
  }

  protected playTypingSound(): void {
    const now = Date.now();
    if (now - this.lastTypingSoundAt < 55) return;

    this.lastTypingSoundAt = now;
    this.playTone({ frequency: 520, duration: 0.025, volume: 0.018 });
  }

  private receiveAssistantReply(answer: string, requestId?: string, pendingMessageId?: number): void {
    this.playTone({ frequency: 620, duration: 0.08, volume: 0.04 });
    window.setTimeout(() => {
      this.playTone({ frequency: 820, duration: 0.09, volume: 0.035 });
    }, 90);

    this.messages.update((messages) => {
      const reply = {
        id: pendingMessageId ?? Date.now(),
        sender: 'assistant' as const,
        body: answer,
        time: this.currentTime(),
      };

      if (!pendingMessageId) return [...messages, reply];

      return messages.map((message) => (message.id === pendingMessageId ? reply : message));
    });
    window.dispatchEvent(
      new CustomEvent('SIMULATION_ASSISTANT_REPLY', {
        detail: {
          answer,
          requestId,
        },
      }),
    );
  }

  private currentTime(): string {
    return new Intl.DateTimeFormat('en', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  }

  private playTone({
    frequency,
    duration,
    volume,
  }: {
    frequency: number;
    duration: number;
    volume: number;
  }): void {
    const audioWindow = window as AudioWindow;
    const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) return;
    this.audioContext ??= new AudioContextConstructor();

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const startAt = this.audioContext.currentTime;
    const endAt = startAt + duration;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.02);
  }
}
