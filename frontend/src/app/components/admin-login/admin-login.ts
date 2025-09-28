import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminLoginRequest } from '../../services/admin.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-login.html'
})
export class AdminLogin {
  constructor(private adminService: AdminService, private router: Router) {}
  formData = {
    email: '',
    password: ''
  };

  isLoading = false;
  successMessage = '';
  errorMessage = '';
  showPassword = false;

  onSubmit() {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';
    
    // FOR TESTING: Add a bypass for admin/admin credentials
    if (this.formData.email === 'admin' && this.formData.password === 'admin') {
      console.log('Using test admin login bypass');
      this.isLoading = false;
      
      // Create a test JWT token payload (this will be signed on the backend)
      // For now, let's use a mock that mimics a real response
      const mockToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ0ZXN0LWFkbWluLWlkIiwicm9sZSI6IkFkbWluIiwiZW1haWwiOiJhZG1pbkBpbnN1cmFuY2UuY29tIiwiaWF0IjoxNjMwMDAwMDAwfQ.YYZy6m_1sEBJqoVYHNZqgGBDlBzBb0c0C8LQ4hBFa4';
      const mockAdminData = {
        id: 'test-admin-id',
        email: 'admin@insurance.com',
        role: 'Admin',
        name: 'System Administrator',
        token: mockToken // Include token in admin data
      };
      
      // Store token and admin data using the service
      this.adminService.setToken(mockToken);
      this.adminService.setAdminData(mockAdminData);
      
      console.log('Mock admin login successful');
      console.log('Token stored:', localStorage.getItem('token'));
      console.log('UserRole stored:', localStorage.getItem('userRole'));
      
      this.successMessage = 'Login successful! Redirecting to admin dashboard...';
      
      // Navigate to admin dashboard
      setTimeout(() => {
        this.router.navigate(['/admin-dashboard']).then(success => {
          if (success) {
            console.log('Navigation to admin dashboard successful');
          } else {
            console.error('Navigation to admin dashboard failed');
          }
        }).catch(navError => {
          console.error('Navigation error:', navError);
        });
      }, 1000);
      
      return;
    }
    
    // Basic validation
    if (!this.formData.email || !this.formData.password) {
      this.errorMessage = 'Please fill in all required fields.';
      this.isLoading = false;
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formData.email)) {
      this.errorMessage = 'Please enter a valid email address.';
      this.isLoading = false;
      return;
    }
    
    // Prepare login request with Admin role
    const loginRequest: AdminLoginRequest = {
      email: this.formData.email,
      password: this.formData.password,
      role: 'Admin'
    };

    console.log('Admin login request:', loginRequest);

    // Make API call to backend using existing user login endpoint
    this.adminService.login(loginRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Admin login response:', response);
        
        if (response.success) {
          // Login successful
          this.successMessage = response.message || 'Login successful! Welcome to Admin Portal.';
          
          // Store token and admin data
          this.adminService.setToken(response.token);
          this.adminService.setAdminData(response.user);
          
          console.log('Admin logged in successfully:', response.user);
          console.log('Token stored:', response.token);
          console.log('UserRole set to Admin');
          
          // Navigate directly to admin dashboard
          this.router.navigate(['/admin-dashboard']).then(success => {
            if (success) {
              console.log('Navigation to admin dashboard successful');
            } else {
              console.error('Navigation to admin dashboard failed');
              // Check what's in localStorage for debugging
              console.log('Token in localStorage:', localStorage.getItem('token'));
              console.log('UserRole in localStorage:', localStorage.getItem('userRole'));
            }
          }).catch(navError => {
            console.error('Navigation error:', navError);
          });
        } else {
          // Handle error response
          this.errorMessage = (response as any).error || 'Login failed. Please try again.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Admin login error:', error);
        
        // Handle different error scenarios based on backend response structure
        if (error.status === 404) {
          this.errorMessage = error.error?.error || 'No Admin account found with this email address.';
        } else if (error.status === 401) {
          this.errorMessage = error.error?.error || 'Invalid password. Please check your password and try again.';
        } else if (error.status === 400) {
          const errorMsg = error.error?.error;
          if (errorMsg && errorMsg.includes('wrong role')) {
            this.errorMessage = 'This email is not registered as an Admin account.';
          } else {
            this.errorMessage = errorMsg || 'Please check your input and try again.';
          }
        } else if (error.status === 0) {
          this.errorMessage = 'Unable to connect to server. Please check your connection and ensure the backend is running.';
        } else {
          this.errorMessage = 'Server error. Please try again later.';
        }
      }
    });
  }

  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
