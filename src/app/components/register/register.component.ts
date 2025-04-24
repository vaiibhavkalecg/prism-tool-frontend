import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerForm!: FormGroup;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      gender: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      const formData = this.registerForm.value;
      this.authService.register(formData).subscribe({
        next: (res) => {
          if (res.message === 'User registered successfully.') {
            // Show success toast message
            this.toastr.success('User registered successfully!', 'Success', {
              timeOut: 3000,  // Duration in milliseconds
              progressBar: true,
              closeButton: true,
            });

            // Redirect after 3 seconds
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 3000);
          } else {
            this.errorMessage = 'Registration failed. Please try again.';
          }
        },
        error: (err) => {
          this.errorMessage = 'An error occurred during registration.';
          console.error(err);
        }
      });
    }
  }
}
