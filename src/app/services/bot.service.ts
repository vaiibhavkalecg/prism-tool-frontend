import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BotService {
  private apiUrl = `${environment.baseUrl}/bots`;

  constructor(private http: HttpClient) {}

  getBots(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/`);
  }

  createBot(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/`, formData);
  }

  deleteBot(botId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${botId}/`);
  }
}
