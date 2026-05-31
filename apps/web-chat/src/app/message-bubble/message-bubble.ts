import { Component, computed, input } from '@angular/core';
import { marked } from 'marked';
import { ChatMessage } from '../shared/chat-message.model';

@Component({
  selector: 'app-message-bubble',
  imports: [],
  templateUrl: './message-bubble.html',
  styleUrl: './message-bubble.css',
})
export class MessageBubble {
  readonly message = input.required<ChatMessage>();
  readonly renderedBody = computed(() => marked.parse(this.message().body, { async: false }) as string);
}
