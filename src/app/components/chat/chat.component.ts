import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-chat',
  standalone: false,
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})

export class ChatComponent {
  botId!: string;
  message: string = '';
  messages: { sender: 'user' | 'bot', text: string }[] = [];
  isLoading: boolean = false;

  constructor(private route: ActivatedRoute, private chatService: ChatService) {}

  ngOnInit(): void {
    this.botId = this.route.snapshot.paramMap.get('id') || '';
  }

  sendMessage() {
    if (!this.message.trim()) return;

    this.messages.push({ sender: 'user', text: this.message });
    const userMessage = this.message;
    this.message = '';
    
    // Show loading state
    this.isLoading = true;

    this.chatService.sendQuery(userMessage, this.botId).subscribe({
      next: (res) => {
        const reply = res.response?.content || 'No response';
        this.messages.push({ sender: 'bot', text: reply });
        this.isLoading = false;
      },
      error: () => {
        this.messages.push({ sender: 'bot', text: 'Error: Could not fetch response.' });
        this.isLoading = false;
      }
    });
  }
}
