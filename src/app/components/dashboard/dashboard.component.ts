import { Component } from '@angular/core';
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

  // Form fields
  isToolEnabled: boolean = false;
  text_document: File | null = null;
  tool_document: File | null = null;

  searchTerm: string = '';
  filteredBots: any[] = [];

  constructor(
    private botService: BotService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.fetchBots();
    this.filteredBots = this.bots;
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

}
