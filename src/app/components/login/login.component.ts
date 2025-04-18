import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm!: FormGroup;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.getToken()) {
      this.router.navigate(['/dashboard']);
    }

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const data = this.loginForm.value;

      this.authService.login(data).subscribe({
        next: (res) => {
          if (res.success) {
            this.authService.storeToken(res.access_token);
            this.authService.storeUser(res.userObject);
            this.router.navigate(['/dashboard']);
          } else {
            this.errorMessage = 'Login failed. Please try again.';
          }
        },
        error: (err) => {
          this.errorMessage = 'Invalid email or password.';
          console.error(err);
        }
      });
    }
  }
}
