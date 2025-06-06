import { Component, HostListener } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { BotService } from '../../services/bot.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

  bots: any[] = [];
  showCreatePopup: boolean = false;
  
  // Chat popup properties
  activeChats: Array<{
    botId: string;
    botName: string;
    isMinimized: boolean;
    isActive: boolean;
    position: number;
  }> = [];

  // Form fields
  isToolEnabled: boolean = false;
  text_document: File | null = null;
  tool_document: File | null = null;

  searchTerm: string = '';
  filteredBots: any[] = [];
  viewMode: string = 'list'; // Default view mode is list

  constructor(
    private botService: BotService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.fetchBots();
    this.filteredBots = this.bots;
  }

  // Listen for window resize events to recalculate chat positions
  @HostListener('window:resize')
  onResize() {
    // Force Angular change detection by triggering a state change
    this.activeChats = [...this.activeChats];
  }

  openCreateBotPopup(): void {
    this.showCreatePopup = true;
  }

  onTextDocChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.text_document = file;
    }
  }

  onToolDocChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.tool_document = file;
    }
  }

  createBot(form: NgForm): void {
    if (!form.valid || !this.text_document) {
      alert('Please fill all required fields and upload text document.');
      return;
    }

    const formData = new FormData();
    formData.append('name', form.value.name);
    formData.append('description', form.value.description);
    formData.append('model', form.value.model);
    formData.append('isToolEnabled', String(this.isToolEnabled));
    formData.append('text_document', this.text_document);
    if (this.tool_document) {
      formData.append('tool_document', this.tool_document);
    }

    this.botService.createBot(formData).subscribe({
      next: (res) => {
        alert('Bot created successfully!');
        this.showCreatePopup = false;
        this.fetchBots();
        form.resetForm();
        this.text_document = null;
        this.tool_document = null;
        this.isToolEnabled = false;
      },
      error: (err) => {
        console.error('Error creating bot:', err);
        alert('Something went wrong while creating bot.');
      }
    });
  }

  fetchBots(): void {
    this.botService.getBots().subscribe({
      next: (res: any) => {
        this.bots = res.bots || [];
        this.filteredBots = this.bots; // Initialize filteredBots with all bots
        this.filterBots(); // Apply any existing search filter
      },
      error: (err) => {
        console.error('Failed to fetch bots:', err);
      }
    });
  }

  filterBots(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredBots = this.bots; // Show all bots if search term is empty
      return;
    }
    
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredBots = this.bots.filter(bot => 
      bot.name.toLowerCase().includes(term) || 
      (bot.description && bot.description.toLowerCase().includes(term)) ||
      (bot.model && bot.model.toLowerCase().includes(term))
    );
  }
  
  // Make sure to call this when the search input changes
  onSearchChange(event: any): void {
    this.searchTerm = event.target.value;
    this.filterBots();
  }
  
  deleteBot(botId: string): void {
    const confirmDelete = confirm('Are you sure you want to delete this bot?');
    if (confirmDelete) {
      this.botService.deleteBot(botId).subscribe({
        next: () => {
          alert('Bot deleted successfully!');
          this.fetchBots();
        },
        error: (err) => {
          console.error('Error deleting bot:', err);
          alert('Failed to delete the bot.');
        }
      });
    }
  }

  logout() {
    this.authService.logout();  // Call the logout method from AuthService
    this.router.navigate(['/login']);  // Redirect to login page
  }

  getActiveBots() {
    // Replace with your actual logic
    return this.bots.filter(bot => true).length;
  }
  
  getToolEnabledBots() {
    return this.bots.filter(bot => bot.isToolEnabled).length;
  }

  refreshDashboard(): void {
    this.fetchBots();
  }

  toggleViewMode(mode: string): void {
    this.viewMode = mode;
  }

  // Chat popup methods
  openChatPopup(botId: string): void {
    // Check if chat is already open
    const existingChatIndex = this.activeChats.findIndex(chat => chat.botId === botId);
    
    if (existingChatIndex !== -1) {
      // Chat already exists, just restore it if minimized
      this.activeChats[existingChatIndex].isMinimized = false;
      this.activeChats[existingChatIndex].isActive = true;
      
      // Make this chat the active one
      this.setActiveChat(existingChatIndex);
      return;
    }
    
    // Find the bot details
    const bot = this.bots.find(b => b._id === botId);
    const botName = bot ? bot.name : 'AI Assistant';
    
    // Add new chat
    this.activeChats.push({
      botId: botId,
      botName: botName,
      isMinimized: false,
      isActive: true,
      position: this.activeChats.length // Position for stacking
    });
    
    // Set all other chats to inactive
    this.setActiveChat(this.activeChats.length - 1);
  }

  closeChatPopup(index: number): void {
    this.activeChats.splice(index, 1);
    
    // Update positions for remaining chats
    this.activeChats.forEach((chat, idx) => {
      chat.position = idx;
    });
  }

  minimizeChatPopup(index: number): void {
    this.activeChats[index].isMinimized = true;
  }

  restoreChatPopup(index: number): void {
    this.activeChats[index].isMinimized = false;
    this.setActiveChat(index);
  }
  
  setActiveChat(index: number): void {
    // Set all chats to inactive
    this.activeChats.forEach(chat => chat.isActive = false);
    
    // Set the selected chat to active
    this.activeChats[index].isActive = true;
    
    // Bring the active chat to the front by updating z-index via position
    const currentPosition = this.activeChats[index].position;
    const maxPosition = Math.max(...this.activeChats.map(chat => chat.position));
    
    if (currentPosition < maxPosition) {
      // Update positions for all chats that were above this one
      this.activeChats.forEach(chat => {
        if (chat.position > currentPosition) {
          chat.position--;
        }
      });
      
      // Move this chat to the top position
      this.activeChats[index].position = maxPosition;
    }
  }

  // Calculate the horizontal position for each chat window
  calculateChatPosition(index: number): number {
    const windowWidth = window.innerWidth;
    const chatWidth = 350; // Width of chat popup
    const spacing = 20; // Spacing between chats
    const visibleChats = this.activeChats.filter(chat => !chat.isMinimized);
    const visibleCount = visibleChats.length;
    
    // If there's only one chat or the window is too small, center it
    if (visibleCount === 1 || windowWidth < (chatWidth * 2)) {
      return (windowWidth / 2) - (chatWidth / 2);
    }
    
    // Find the position of this chat in the visible chats array
    const visibleIndex = visibleChats.findIndex(chat => chat === this.activeChats[index]);
    
    // Calculate total width needed for all chats
    const totalWidth = (visibleCount * chatWidth) + ((visibleCount - 1) * spacing);
    
    // If all chats can fit on screen with spacing
    if (totalWidth < windowWidth) {
      const startX = (windowWidth - totalWidth) / 2;
      return startX + (visibleIndex * (chatWidth + spacing));
    } else {
      // If not all chats can fit, distribute them evenly
      const availableWidth = windowWidth - chatWidth;
      const step = availableWidth / (visibleCount - 1);
      return visibleIndex * step;
    }
  }

}
