import { AfterViewInit, Component, ElementRef, effect, input, viewChild } from '@angular/core';
import { MessageBubble } from '../message-bubble/message-bubble';
import { ChatMessage } from '../shared/chat-message.model';

@Component({
  selector: 'app-message-list',
  imports: [MessageBubble],
  templateUrl: './message-list.html',
  styleUrl: './message-list.css',
})
export class MessageList implements AfterViewInit {
  readonly messages = input.required<ChatMessage[]>();
  private readonly scroller = viewChild.required<ElementRef<HTMLDivElement>>('scroller');
  private viewReady = false;

  constructor() {
    effect(() => {
      this.messages().length;
      if (!this.viewReady) return;
      this.scrollToBottom();
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    this.scrollAfterLayout(0);
    window.setTimeout(() => this.scrollAfterLayout(0), 60);
    window.setTimeout(() => this.scrollAfterLayout(0), 180);
  }

  private scrollAfterLayout(attempt: number): void {
    window.requestAnimationFrame(() => {
      const element = this.scroller().nativeElement;
      element.scrollTop = element.scrollHeight;
      if (attempt < 1) {
        this.scrollAfterLayout(attempt + 1);
      }
    });
  }
}
