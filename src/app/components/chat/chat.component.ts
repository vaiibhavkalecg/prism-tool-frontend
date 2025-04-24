import { Component, Input, OnInit, OnChanges, SimpleChanges, NgZone } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { trigger, transition, style, animate } from '@angular/animations';

// Add TypeScript interfaces for Web Speech API

// Define the SpeechRecognition interface
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: any;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionStatic {
  new(): SpeechRecognition;
  prototype: SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

// Speech Recognition Event interfaces
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation?: any;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
  item(index: number): SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

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

export class ChatComponent implements OnInit, OnChanges {
  @Input() botId!: string;
  @Input() popupMode: boolean = false;
  message: string = '';
  messages: { sender: 'user' | 'bot', text: string, downloadLink?: string }[] = [];
  isLoading: boolean = false;
  isListening: boolean = false;
  isSpeaking: boolean = false;
  currentSpeakingIndex: number = -1;
  speechRecognition: SpeechRecognition | null = null;
  speechSynthesis: SpeechSynthesis | null = null;
  speechUtterance: SpeechSynthesisUtterance | null = null;

  constructor(private route: ActivatedRoute, private chatService: ChatService, private ngZone: NgZone) {}

  ngOnInit(): void {
    // In popup mode, botId is passed as an @Input property
    // In regular mode, get it from the route
    if (!this.popupMode) {
      this.botId = this.route.snapshot.paramMap.get('id') || '';
    }
    
    // Initialize with a welcome message
    if (this.botId) {
      this.messages.push({ sender: 'bot', text: 'Hello! I am Steve, How can I assist you today?' });
    }

    // Initialize speech recognition if supported by the browser
    this.initSpeechRecognition();
    
    // Initialize speech synthesis
    this.initSpeechSynthesis();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // Reset messages when botId changes in popup mode
    if (changes['botId'] && !changes['botId'].firstChange && this.popupMode) {
      this.messages = [];
      this.messages.push({ sender: 'bot', text: 'Hello! I am Steve, How can I assist you today?' });
    }
  }

  sendMessage() {
    if (!this.message.trim() || !this.botId) return;

    this.messages.push({ sender: 'user', text: this.message });
    const userMessage = this.message;
    this.message = '';
    
    // Show loading state
    this.isLoading = true;

    this.chatService.sendQuery(userMessage, this.botId).subscribe({
      next: (res) => {
        const reply = res.response || 'No response';
        
        // Check if there's a download link in the response
        if (res.download_link) {
          // If there's a download link, add it to the message object
          // Also remove the markdown link from the text if present
          const cleanText = this.removeMarkdownLinks(reply);
          this.messages.push({ 
            sender: 'bot', 
            text: cleanText, 
            downloadLink: res.download_link 
          });
        } else {
          // Regular message without download link
          this.messages.push({ sender: 'bot', text: reply });
        }
        
        this.isLoading = false;
      },
      error: () => {
        this.messages.push({ sender: 'bot', text: 'Error: Could not fetch response.' });
        this.isLoading = false;
      }
    });
  }
  
  // Helper method to remove markdown links from text
  removeMarkdownLinks(text: string): string {
    // This regex matches markdown links in the format [text](url)
    return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }
  
  // Method to handle download when button is clicked
  downloadFile(url: string): void {
    window.open(url, '_blank');
  }

  initSpeechRecognition() {
    // Check if the browser supports the Web Speech API
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      // Create a speech recognition instance
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.speechRecognition = new SpeechRecognitionConstructor();
      
      // Configure the speech recognition
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = 'en-US'; // Set language to English
      
      // Set up the event handlers
      this.speechRecognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        // Use NgZone to ensure Angular detects the changes
        this.ngZone.run(() => {
          this.message = transcript;
        });
      };
      
      this.speechRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
        this.ngZone.run(() => {
          this.isListening = false;
        });
      };
      
      this.speechRecognition.onend = () => {
        this.ngZone.run(() => {
          this.isListening = false;
        });
      };
    }
  }

  toggleVoiceInput() {
    if (!this.speechRecognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    
    if (this.isListening) {
      // Stop listening
      this.speechRecognition.stop();
      this.isListening = false;
    } else {
      // Start listening
      try {
        this.speechRecognition.start();
        this.isListening = true;
      } catch (error) {
        console.error('Speech recognition error:', error);
      }
    }
  }

  // Initialize speech synthesis
  initSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  // Method to speak text aloud
  speakText(text: string, messageIndex: number = -1) {
    if (!this.speechSynthesis) {
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    // If already speaking, stop it
    if (this.isSpeaking) {
      this.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.currentSpeakingIndex = -1;
      
      // If clicking the same message that's currently speaking, just stop
      if (messageIndex === this.currentSpeakingIndex) {
        return;
      }
    }

    // Create a new utterance
    this.speechUtterance = new SpeechSynthesisUtterance(text);
    this.speechUtterance.lang = 'en-US';
    this.speechUtterance.rate = 1.0;
    this.speechUtterance.pitch = 1.0;
    
    // Set event handlers
    this.speechUtterance.onstart = () => {
      this.ngZone.run(() => {
        this.isSpeaking = true;
        this.currentSpeakingIndex = messageIndex;
      });
    };
    
    this.speechUtterance.onend = () => {
      this.ngZone.run(() => {
        this.isSpeaking = false;
        this.currentSpeakingIndex = -1;
      });
    };
    
    this.speechUtterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.ngZone.run(() => {
        this.isSpeaking = false;
        this.currentSpeakingIndex = -1;
      });
    };
    
    // Speak the text
    this.speechSynthesis.speak(this.speechUtterance);
  }
}
