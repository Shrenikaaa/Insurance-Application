import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    console.log('AuthGuard - URL:', state.url);
    console.log('AuthGuard - Token exists:', !!token);
    console.log('AuthGuard - User Role:', userRole);

    if (!token) {
      console.log('AuthGuard - No token found, redirecting to home');
      this.router.navigate(['/home']);
      return false;
    }

    // Check role-based access
    const url = state.url;
    
    if (url.includes('admin-dashboard') && userRole !== 'Admin') {
      console.log('AuthGuard - Admin access denied. UserRole:', userRole);
      this.router.navigate(['/home']);
      return false;
    }
    
    if (url.includes('agent-dashboard') && userRole !== 'Agent') {
      console.log('AuthGuard - Agent access denied. UserRole:', userRole);
      this.router.navigate(['/home']);
      return false;
    }
    
    if (url.includes('customer-dashboard') && userRole !== 'Customer') {
      console.log('AuthGuard - Customer access denied. UserRole:', userRole);
      this.router.navigate(['/home']);
      return false;
    }

    console.log('AuthGuard - Access granted for', userRole, 'to', url);
    return true;
  }
}