import { Component, input } from '@angular/core';
import { ChatProfile } from '../shared/chat-profile.model';

@Component({
  selector: 'app-chat-header',
  imports: [],
  templateUrl: './chat-header.html',
  styleUrl: './chat-header.css',
})
export class ChatHeader {
  readonly profile = input.required<ChatProfile>();
}
