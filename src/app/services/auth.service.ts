import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
    private apiUrl = `${environment.baseUrl}`; // Ensure it ends with `/`

    constructor(private http: HttpClient) {}
  
    login(data: any): Observable<any> {
      return this.http.post(`${this.apiUrl}/login/`, data);
    }

    register(data: any): Observable<any> {
      return this.http.post(`${this.apiUrl}/register/`, data);
    }
  
    storeToken(token: string) {
      localStorage.setItem('access_token', token);
    }
  
    getToken(): string | null {
      return localStorage.getItem('access_token');
    }
  
    storeUser(user: any) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  
    getUser(): any {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
  
    logout() {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  
    isLoggedIn(): boolean {
      return !!this.getToken();
    }

}
