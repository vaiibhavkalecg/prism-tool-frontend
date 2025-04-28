// speechify.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class SpeechifyService {
  private readonly token: string = "qMTisJ6C1XTx03UH5tDURBNrx0Dmyd4qHQxf-2qFMmo=";
  private readonly apiUrl: string = "https://api.sws.speechify.com/v1/audio/stream";
  private audioElement: HTMLAudioElement | null = null;
  private voiceId: string = "fadea3ca-97e2-4d02-9079-76dea11a1306"; // Default voice ID

  constructor() {}

  /**
   * Convert text to speech and play it in the browser
   * @param text The text to convert to speech
   * @returns Promise that resolves when audio starts playing
   */
  async speak(text: string): Promise<void> {
    try {
      // Stop any currently playing audio
      this.stop();

      // Create the request body
      const requestBody = {
        accept: "audio/aac",
        input: text,
        voice_Id: this.voiceId
      };

      // Make the API request
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Speechify API error: ${response.status} ${response.statusText}`);
      }

      // Get the audio blob from the response
      const audioBlob = await response.blob();
      
      // Create an object URL for the blob
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play the audio
      this.audioElement = new Audio(audioUrl);
      
      return new Promise((resolve, reject) => {
        if (this.audioElement) {
          this.audioElement.onplay = () => resolve();
          this.audioElement.onerror = (e) => reject(new Error(`Audio playback error: ${e}`));
          this.audioElement.play();
        } else {
          reject(new Error("Audio element not created"));
        }
      });
    } catch (error) {
      console.error("Error in SpeechifyService.speak:", error);
      throw error;
    }
  }

  /**
   * Stop any currently playing audio
   */
  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      
      // Release memory by revoking the object URL
      if (this.audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audioElement.src);
      }
      
      this.audioElement = null;
    }
  }

  /**
   * Check if audio is currently playing
   * @returns boolean indicating if audio is playing
   */
  isPlaying(): boolean {
    return !!this.audioElement && 
           !this.audioElement.paused && 
           this.audioElement.currentTime > 0 && 
           !this.audioElement.ended;
  }

  /**
   * Set a different voice ID
   * @param voiceId The voice ID to use
   */
  setVoiceId(voiceId: string): void {
    this.voiceId = voiceId;
  }
}