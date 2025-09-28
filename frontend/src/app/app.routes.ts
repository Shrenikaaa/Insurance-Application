import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { UserSignup } from './components/user-signup/user-signup';
import { UserLogin } from './components/user-login/user-login';
import { AdminLogin } from './components/admin-login/admin-login';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { AgentDashboard } from './components/agent-dashboard/agent-dashboard';
import { CustomerDashboard } from './components/customer-dashboard/customer-dashboard';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'register', component: UserSignup },
  { path: 'login', component: UserLogin },
  { path: 'admin-login', component: AdminLogin },
  { path: 'admin-dashboard', component: AdminDashboard, canActivate: [AuthGuard] },
  { path: 'agent-dashboard', component: AgentDashboard, canActivate: [AuthGuard] },
  { path: 'customer-dashboard', component: CustomerDashboard }, // Removed AuthGuard temporarily for testing
  { path: '**', redirectTo: '/home' }
];
