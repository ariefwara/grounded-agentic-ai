import { Component, ElementRef, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-chat-composer',
  imports: [],
  templateUrl: './chat-composer.html',
  styleUrl: './chat-composer.css',
})
export class ChatComposer {
  readonly placeholder = input('Type a message');
  readonly messageSent = output<{ body: string; requestId?: string }>();
  readonly typing = output<void>();
  private readonly messageInput = viewChild.required<ElementRef<HTMLInputElement>>('messageInput');

  appendText(value: string): void {
    const input = this.messageInput().nativeElement;
    input.value += value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  }

  submit(requestId?: string): void {
    this.sendMessage(this.messageInput().nativeElement, requestId);
  }

  protected sendMessage(input: HTMLInputElement, requestId?: string): void {
    const body = input.value.trim();
    if (!body) return;

    this.messageSent.emit({ body, requestId });
    input.value = '';
  }
}
