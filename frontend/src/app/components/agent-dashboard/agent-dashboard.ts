import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './agent-dashboard.html'
})
export class AgentDashboard implements OnInit {
  agentName = 'Agent User';
  sidebarOpen = true; // Start with sidebar open
  currentSection: string = 'dashboard'; // Default section

  // Dashboard stats
  stats = {
    assignedPolicies: 0,
    soldPolicies: 0,
    pendingApplications: 0,
    monthlyCommission: 0
  };

  // Recent activities
  recentActivities = [
    { type: 'Policy Sold', customer: 'John Doe', amount: '$1,200', timestamp: '2 hours ago' },
    { type: 'Application Review', customer: 'Jane Smith', amount: '$800', timestamp: '4 hours ago' },
    { type: 'Customer Meeting', customer: 'Mike Johnson', amount: '$1,500', timestamp: '1 day ago' }
  ];

  // Assigned policies
  assignedPoliciesList: any[] = [];
    assignedClaimsList: any[] = [];

  constructor(private http: HttpClient, private agentService: AgentService) {}

  ngOnInit() {
    this.loadDashboardStats();
    this.loadAssignedPolicies();
      this.loadAssignedClaims();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  loadDashboardStats() {
    // Load dashboard statistics from API
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // You can implement agent-specific stats API endpoint
    this.stats = {
      assignedPolicies: 25,
      soldPolicies: 18,
      pendingApplications: 7,
      monthlyCommission: 5420
    };
  }

  loadAssignedPolicies() {
    const agentId = localStorage.getItem('agentId') ?? undefined;
    this.agentService.getAssignedPolicies(agentId).subscribe({
      next: (policies) => {
        this.assignedPoliciesList = policies;
      },
      error: (err) => {
        this.assignedPoliciesList = [];
      }
    });
  }
  
    loadAssignedClaims() {
      this.agentService.getAssignedClaims().subscribe({
        next: (response) => {
          this.assignedClaimsList = response.claims || [];
        },
        error: (err) => {
          this.assignedClaimsList = [];
        }
      });
    }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    window.location.href = '/home';
  }
}
