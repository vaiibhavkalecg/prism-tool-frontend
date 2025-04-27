import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, NgZone } from '@angular/core';
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

export class ChatComponent implements OnInit, OnChanges, OnDestroy {
  @Input() botId!: string;
  @Input() popupMode: boolean = false;
  @Input() voiceEnabled: boolean = false;
  @Input() isMinimized: boolean = false;
  message: string = '';
  messages: { 
    sender: 'user' | 'bot', 
    text: string, 
    downloadLink?: string, 
    downloadLinks?: string[], 
    downloadLinkLabels?: string[],
    attachments?: { url: string, type: string, name: string }[]
  }[] = [];
  isLoading: boolean = false;
  isListening: boolean = false;
  isSpeaking: boolean = false;
  currentSpeakingIndex: number = -1;
  speechRecognition: SpeechRecognition | null = null;
  speechSynthesis: SpeechSynthesis | null = null;
  speechUtterance: SpeechSynthesisUtterance | null = null;
  selectedFiles: File[] = [];

  constructor(private route: ActivatedRoute, private chatService: ChatService, private ngZone: NgZone) {}

  ngOnInit(): void {
    // In popup mode, botId is passed as an @Input property
    // In regular mode, get it from the route
    if (!this.popupMode) {
      this.botId = this.route.snapshot.paramMap.get('id') || '';
    }
    
    // Initialize with a welcome message
    if (this.botId) {
      const welcomeMessage = 'Hello! I am Steve, How can I assist you today?';
      this.messages.push({ sender: 'bot', text: welcomeMessage });
      
      // If voice is enabled, speak the welcome message
      if (this.voiceEnabled) {
        setTimeout(() => this.speakText(welcomeMessage, 0), 1000); // Slight delay for better UX
      }
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
      const welcomeMessage = 'Hello! I am Steve, How can I assist you today?';
      this.messages.push({ sender: 'bot', text: welcomeMessage });
      
      // If voice is enabled, speak the welcome message
      if (this.voiceEnabled) {
        setTimeout(() => this.speakText(welcomeMessage, 0), 1000); // Slight delay for better UX
      }
    }
    
    // Handle changes to voiceEnabled
    if (changes['voiceEnabled'] && !changes['voiceEnabled'].firstChange) {
      // If voice was just enabled and we have messages, speak the last bot message
      if (this.voiceEnabled) {
        const lastBotMessage = [...this.messages].reverse().find(msg => msg.sender === 'bot');
        if (lastBotMessage) {
          setTimeout(() => this.speakText(lastBotMessage.text, this.messages.indexOf(lastBotMessage)), 500);
        }
      } else {
        // If voice was disabled, stop any current speech
        this.stopSpeech();
      }
    }
    
    // Handle chat minimization - stop speech when chat is minimized
    if (changes['isMinimized'] && this.isMinimized) {
      this.stopSpeech();
    }
  }

  sendMessage() {
    if ((!this.message.trim() && this.selectedFiles.length === 0) || !this.botId) return;

    // Create user message
    const userMessageText = this.message.trim();
    this.message = '';
    
    // Handle files if any are selected
    if (this.selectedFiles.length > 0) {
      // In a real implementation, you would upload these files to your server
      // and then include the URLs in your API call
      
      // For now, we'll just add them to the user message and clear the selection
      this.messages.push({ 
        sender: 'user', 
        text: userMessageText || 'Sent attachments', 
        // In a real implementation, these would be URLs to the uploaded files
        attachments: this.selectedFiles.map(file => ({
          url: URL.createObjectURL(file),
          type: file.type,
          name: file.name
        }))
      });
      
      // Clear selected files
      this.selectedFiles = [];
    } else {
      // Just a text message
      this.messages.push({ sender: 'user', text: userMessageText });
    }
    
    // Show loading state
    this.isLoading = true;

    this.chatService.sendQuery(userMessageText, this.botId).subscribe({
      next: (res) => {
        const reply = res.response || 'No response';
        const botMessage: any = { sender: 'bot' };
        
        // Extract link labels from the response text
        const linkLabels = this.extractLinkLabels(reply);
        
        // Clean text by removing markdown links
        const cleanText = this.removeMarkdownLinks(reply);
        botMessage.text = cleanText;
        
        // Check if there are attachments in the response
        if (res.attachments && res.attachments.length > 0) {
          botMessage.attachments = res.attachments;
        }
        
        // Check if there are download links in the response
        if (res.download_links && res.download_links.length > 0) {
          botMessage.downloadLinks = res.download_links;
          botMessage.downloadLinkLabels = linkLabels;
        } 
        // Check for single download link (backward compatibility)
        else if (res.download_link) {
          botMessage.downloadLink = res.download_link;
          botMessage.downloadLinkLabels = linkLabels.length > 0 ? [linkLabels[0]] : ['Download File'];
        }
        
        // Add the message to the chat
        this.messages.push(botMessage);
        
        // Automatically speak the response if voice is enabled
        if (this.voiceEnabled) {
          this.speakText(cleanText, this.messages.length - 1);
        }
        
        this.isLoading = false;
      },
      error: () => {
        const errorMessage = 'Error: Could not fetch response.';
        this.messages.push({ sender: 'bot', text: errorMessage });
        this.isLoading = false;
        
        // Speak the error message if voice is enabled
        if (this.voiceEnabled) {
          this.speakText(errorMessage, this.messages.length - 1);
        }
      }
    });
  }
  
  // Helper method to extract link labels from markdown links in text
  extractLinkLabels(text: string): string[] {
    const labels: string[] = [];
    const regex = /\[([^\]]+)\]\([^)]+\)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      labels.push(match[1]);
    }
    
    return labels;
  }
  
  // Helper method to remove markdown links from text
  removeMarkdownLinks(text: string): string {
    // This regex matches markdown links in the format [text](url)
    // and replaces them with just the text part
    return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }
  
  // Method to handle download when button is clicked
  downloadFile(url: string): void {
    window.open(url, '_blank');
  }
  
  // Method to determine if an attachment is an image
  isImageAttachment(attachment: { url: string, type: string, name: string }): boolean {
    return attachment.type.startsWith('image/') || 
           attachment.url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) !== null;
  }
  
  // Method to determine if an attachment is a document
  isDocumentAttachment(attachment: { url: string, type: string, name: string }): boolean {
    return attachment.type.startsWith('application/') || 
           attachment.url.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i) !== null;
  }
  
  // Method to get appropriate icon for attachment type
  getAttachmentIcon(attachment: { url: string, type: string, name: string }): string {
    if (this.isImageAttachment(attachment)) {
      return 'bi-file-image';
    } else if (attachment.type.includes('pdf')) {
      return 'bi-file-pdf';
    } else if (attachment.type.includes('word') || attachment.url.match(/\.(doc|docx)$/i)) {
      return 'bi-file-word';
    } else if (attachment.type.includes('excel') || attachment.url.match(/\.(xls|xlsx)$/i)) {
      return 'bi-file-excel';
    } else if (attachment.type.includes('powerpoint') || attachment.url.match(/\.(ppt|pptx)$/i)) {
      return 'bi-file-ppt';
    } else {
      return 'bi-file-earmark';
    }
  }
  
  // Method to handle file input
  handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      for (let i = 0; i < input.files.length; i++) {
        this.selectedFiles.push(input.files[i]);
      }
    }
    // Reset the input so the same file can be selected again
    input.value = '';
  }
  
  // Method to remove a selected file
  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }
  
  // Method to get appropriate icon for file type
  getFileIcon(file: File): string {
    const fileType = file.type;
    if (fileType.startsWith('image/')) {
      return 'bi-file-image';
    } else if (fileType.includes('pdf')) {
      return 'bi-file-pdf';
    } else if (fileType.includes('word') || file.name.match(/\.(doc|docx)$/i)) {
      return 'bi-file-word';
    } else if (fileType.includes('excel') || file.name.match(/\.(xls|xlsx)$/i)) {
      return 'bi-file-excel';
    } else if (fileType.includes('powerpoint') || file.name.match(/\.(ppt|pptx)$/i)) {
      return 'bi-file-ppt';
    } else {
      return 'bi-file-earmark';
    }
  }
  
  // Method to add a bot message with attachment (for testing or manual use)
  addBotMessageWithAttachment(text: string, attachments: { url: string, type: string, name: string }[]) {
    this.messages.push({
      sender: 'bot',
      text: text,
      attachments: attachments
    });
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
          // Automatically send the message after voice input is complete
          if (this.message.trim()) {
            setTimeout(() => this.sendMessage(), 500); // Small delay to allow UI update
          }
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
    
    // Stop any ongoing speech when starting voice input
    this.stopSpeech();
    
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

  // Method to stop any ongoing speech
  stopSpeech() {
    if (this.speechSynthesis && this.isSpeaking) {
      this.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.currentSpeakingIndex = -1;
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
      this.stopSpeech();
      
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

  // Clean up resources when component is destroyed
  ngOnDestroy(): void {
    // Stop any ongoing speech
    this.stopSpeech();
    
    // Stop any ongoing speech recognition
    if (this.speechRecognition && this.isListening) {
      this.speechRecognition.stop();
      this.isListening = false;
    }
  }
}
