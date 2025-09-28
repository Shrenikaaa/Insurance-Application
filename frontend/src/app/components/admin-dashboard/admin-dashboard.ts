import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { PolicyService, Policy, PolicyResponse } from '../../services/policy.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './admin-dashboard.html'
})
export class AdminDashboard implements OnInit {
  adminName = 'Admin User';
  sidebarOpen = true; // Start with sidebar open
  showPoliciesSection = true;
  showAgentsSection = false;
  agents: any[] = [];
  assignAgentPolicyId: string | null = null;
  selectedAgentId: string | null = null;
  assignAgentClaimId: string | null = null;
  
  // Dashboard stats
  stats = {
    totalUsers: 0,
    totalPolicies: 0,
    pendingClaims: 0,
    totalAgents: 0,
    totalPayments: 0
  };

  // Recent activities
  recentActivities: Array<{type: string, user: string, timestamp: string}> = [
    { type: 'User Registration', user: 'John Doe', timestamp: '2 hours ago' },
    { type: 'Policy Purchased', user: 'Jane Smith', timestamp: '4 hours ago' },
    { type: 'Claim Submitted', user: 'Mike Johnson', timestamp: '6 hours ago' }
  ];

  // Policy Management Properties
  policies: Policy[] = [];
  filteredPolicies: Policy[] = [];
  showAddPolicyForm = false;
  showEditModal = false;
  showViewModal = false;
  policySearchTerm = '';
  policyFilter = '';

  // New policy form data
  newPolicy: {
    code?: string;
    title?: string;
    type?: string;
    minSumInsured?: number;
    description?: string;
    termMonths?: number;
    tenureMonths?: number;
    status?: string;
  } = {
    code: '',
    title: '',
    type: '',
    minSumInsured: 10000, // Set a reasonable default minimum
    description: '',
    termMonths: 12,
    tenureMonths: 24, // Set a reasonable default
    status: 'Active'
  };

  // Editing policy data
  editingPolicy: any = {};
  viewingPolicy: any = {};
  pendingPolicies: Policy[] = [];
  approvedPolicies: Policy[] = [];

  // Payment Management Properties
  payments: any[] = [];
  filteredPayments: any[] = [];
  loadingPayments = false;
  paymentStatusFilter = '';
  paymentStats = {
    totalAmount: 0,
    completedCount: 0,
    pendingCount: 0
  };

  // Customer Details Properties
  customerDetails: any[] = [];
  filteredCustomerDetails: any[] = [];
  loadingCustomers = false;
  customerSearchTerm = '';
  customerStatusFilter = '';
  customerStats = {
    totalCustomers: 0,
    activePolicies: 0,
    pendingPolicies: 0,
    totalPremium: 0
  };

  // Customer Pagination
  customerCurrentPage = 1;
  customerPageSize = 10;
  customerTotalPages = 1;
  paginatedCustomers: any[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  Math = Math; // Make Math available in template

  // Claims Management Properties
  allClaims: any[] = [];
  filteredClaims: any[] = [];
  claimStatusFilter = '';
  claimStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  };
  selectedClaim: any = null;
  claimDecisionNotes = '';
  showClaimApprovalModal = false;
  showClaimRejectionModal = false;
  showClaimDetailsModal = false;

  currentSection = 'policies'; // Track the current section (policies, agents, pendingPolicies, approvedPolicies, payments, customerDetails, claims)

  // Navigation methods
  showPolicies() {
    this.currentSection = 'policies';
    this.showPoliciesSection = true;
    this.showAgentsSection = false;
  }
  showAgents() {
    this.currentSection = 'agents';
    this.showPoliciesSection = false;
    this.showAgentsSection = true;
  }
  showPendingPolicies() {
    console.log('=== SHOW PENDING POLICIES CLICKED ===');
    console.log('Setting currentSection to pendingPolicies');
    this.currentSection = 'pendingPolicies';
    console.log('Current section is now:', this.currentSection);
    console.log('About to load pending policies...');
    this.loadPendingPolicies();
  }

  showApprovedPolicies() {
    console.log('=== SHOW APPROVED POLICIES CLICKED ===');
    console.log('Setting currentSection to approvedPolicies');
    this.currentSection = 'approvedPolicies';
    console.log('Current section is now:', this.currentSection);
    console.log('About to load approved policies...');
    this.loadApprovedPolicies();
  }

  showPayments() {
    console.log('=== SHOW PAYMENTS CLICKED ===');
    console.log('Setting currentSection to payments');
    this.currentSection = 'payments';
    this.showPoliciesSection = false;
    this.showAgentsSection = false;
    console.log('Current section is now:', this.currentSection);
    console.log('About to load payments...');
    this.loadPayments();
  }

  showCustomerDetails() {
    console.log('=== SHOW CUSTOMER DETAILS CLICKED ===');
    console.log('Setting currentSection to customerDetails');
    this.currentSection = 'customerDetails';
    this.showPoliciesSection = false;
    this.showAgentsSection = false;
    console.log('Current section is now:', this.currentSection);
    console.log('About to load customer details...');
    this.loadCustomerDetails();
  }

  showClaims() {
    console.log('=== SHOW CLAIMS CLICKED ===');
    console.log('Setting currentSection to claims');
    this.currentSection = 'claims';
    this.showPoliciesSection = false;
    this.showAgentsSection = false;
    console.log('Current section is now:', this.currentSection);
    console.log('About to load claims...');
    this.loadAllClaims();
  }

  constructor(private http: HttpClient, private policyService: PolicyService) {}

  ngOnInit() {
    // Debug: Check authentication status
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const userRole = localStorage.getItem('userRole');
    
    console.log('=== AUTHENTICATION STATUS ===');
    console.log('Token exists:', token ? 'YES' : 'NO');
    console.log('User role:', userRole);
    console.log('All localStorage keys:', Object.keys(localStorage));
    
    // Check if user is properly logged in
    if (!token || userRole !== 'Admin') {
      console.log('USER NOT PROPERLY AUTHENTICATED - Redirecting to login');
      alert('Please login as admin first');
      window.location.href = '/admin-login';
      return;
    }
    
    this.loadDashboardStats();
    this.loadPolicies();
    this.loadAgents();
    this.loadPendingPolicies();
    this.loadApprovedPolicies();
  }
  
  testAPIConnection() {
    console.log('Testing API connection...');
    this.policyService.getAllPolicies().subscribe({
      next: (response) => {
        console.log('API connection test successful:', response);
      },
      error: (error) => {
        console.error('API connection test failed:', error);
      }
    });
  }
  
  // Test method to create a policy programmatically
  testCreatePolicy() {
    console.log('=== TESTING POLICY CREATION ===');
    console.log('Current tokens in localStorage:');
    console.log('- token:', localStorage.getItem('token'));
    console.log('- admin_token:', localStorage.getItem('admin_token'));
    console.log('- userRole:', localStorage.getItem('userRole'));
    
    const testPolicy = {
      code: 'TEST' + Date.now(),
      title: 'Test Life Insurance Policy',
      type: 'Life Insurance',
      minSumInsured: 50000,
      description: 'This is a test policy created programmatically',
      termMonths: 12,
      tenureMonths: 24,
      status: 'Active'
    };
    
    console.log('Sending test policy:', testPolicy);
    
    this.policyService.createPolicy(testPolicy).subscribe({
      next: (response) => {
        console.log('Test policy creation successful:', response);
        alert('Test policy created successfully!');
        this.loadPolicies(); // Reload the policies list
      },
      error: (error) => {
        console.error('Test policy creation failed:', error);
        console.log('Error details:', {
          status: error.status,
          message: error.message,
          error: error.error
        });
        alert('Test policy creation failed. Check console for details.');
      }
    });
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  loadDashboardStats() {
    // Load dashboard statistics from API
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    
    this.http.get<any>('http://localhost:3000/api/v1/admin/summary', { headers })
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.stats = {
              totalUsers: response.usersCount || 0,
              totalPolicies: response.policiesSold || 0,
              pendingClaims: response.claimsPending || 0,
              totalAgents: response.agentsCount || 0,
              totalPayments: response.totalPayments || 0
            };
          }
        },
        error: (error) => {
          console.error('Error loading dashboard stats:', error);
        }
      });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    window.location.href = '/home';
  }

  // Policy Management Methods
  loadPolicies() {
    console.log('Loading policies from API...');
    this.policyService.getAllPolicies().subscribe({
      next: (response) => {
        console.log('API Response:', response);
        if (response.success && response.policies) {
          console.log('Raw policies from backend:', response.policies);
          // Map backend data to frontend format
          this.policies = response.policies.map(policy => ({
            _id: policy._id,
            id: policy._id, // Use _id for both to ensure consistency
            name: policy.title || policy.name,
            title: policy.title || policy.name,
            code: policy.code,
            type: policy.type || 'General',
            minSumInsured: policy.minSumInsured || 0,
            status: policy.status || 'Active',
            description: policy.description || '',
            termMonths: policy.termMonths,
            tenureMonths: policy.tenureMonths,
            assignedAgentId: policy.assignedAgentId,
            assignedAgentName: policy.assignedAgentName,
            createdAt: new Date(policy.createdAt)
          }));
          this.filteredPolicies = [...this.policies];
          console.log('Policies loaded from API with assignment data:', this.policies);
          // Debug: Show policy IDs and assignments
          this.policies.forEach((policy, index) => {
            console.log(`Policy ${index + 1}:`, {
              id: policy.id,
              title: policy.title,
              assignedAgentId: policy.assignedAgentId,
              assignedAgentName: policy.assignedAgentName
            });
          });
        } else {
          console.log('API returned no policies, using fallback');
          this.loadMockPolicies();
        }
      },
      error: (error) => {
        console.error('Error loading policies from API:', error);
        console.log('Using mock data as fallback');
        // Fallback to mock data for development
        this.loadMockPolicies();
      }
    });
  }

  loadMockPolicies() {
    // No mock policies - empty array
    this.policies = [];
    this.filteredPolicies = [];
    console.log('No mock policies loaded - starting with empty policy list');
    
    // Add notification about empty policy list
    this.recentActivities.unshift({
      type: 'System Notice',
      user: 'System',
      timestamp: 'Just now'
    });
  }

  addPolicy() {
    console.log('=== ADD POLICY METHOD CALLED ===');
    console.log('Current newPolicy data:', this.newPolicy);
    
    // Validate required fields manually as backup
    if (!this.newPolicy.title || !this.newPolicy.title.trim()) {
      alert('Please enter a policy title.');
      return;
    }
    
    if (!this.newPolicy.type) {
      alert('Please select a policy type.');
      return;
    }
    
    if (!this.newPolicy.minSumInsured || this.newPolicy.minSumInsured <= 0) {
      alert('Please enter a valid minimum sum insured amount (greater than 0).');
      return;
    }
    
    if (!this.newPolicy.termMonths || this.newPolicy.termMonths <= 0) {
      alert('Please enter valid term months (greater than 0).');
      return;
    }
    
    if (!this.newPolicy.tenureMonths || this.newPolicy.tenureMonths <= 0) {
      alert('Please enter valid tenure months (greater than 0).');
      return;
    }
    
    if (!this.newPolicy.description || !this.newPolicy.description.trim()) {
      alert('Please enter a policy description.');
      return;
    }

    // Prepare data for backend API
    const policyData = {
      code: this.newPolicy.code && this.newPolicy.code.trim() ? this.newPolicy.code.trim() : `POL${Date.now()}`, // Use provided code or generate unique code
      title: this.newPolicy.title.trim(),
      type: this.newPolicy.type,
      minSumInsured: this.newPolicy.minSumInsured,
      description: this.newPolicy.description.trim(),
      termMonths: this.newPolicy.termMonths,
      tenureMonths: this.newPolicy.tenureMonths,
      status: 'Active'
    };

    console.log('Adding policy with data:', policyData);
    console.log('Current authentication token:', localStorage.getItem('token') || localStorage.getItem('admin_token') || 'NO TOKEN FOUND');

    this.policyService.createPolicy(policyData).subscribe({
      next: (response) => {
        console.log('Create policy response:', response);
        if (response.success && response.policy) {
          console.log('Policy created successfully:', response.policy);
          alert('Policy added successfully!');
          
          // Add to recent activities
          this.recentActivities.unshift({
            type: 'Policy Added',
            user: 'Admin',
            timestamp: 'Just now'
          });
          
          this.loadPolicies(); // Reload policies
          this.cancelAddPolicy();
        } else {
          alert('Failed to add policy: ' + (response.message || 'Unknown error'));
        }
      },
      error: (error) => {
        console.error('Error adding policy via API:', error);
        console.log('Error status:', error.status);
        console.log('Error body:', error.error);
        console.log('Full error object:', error);
        
        // More detailed error handling
        if (error.status === 401) {
          alert('Authentication failed. Please login again.');
          // Redirect to login
          window.location.href = '/admin-login';
        } else if (error.status === 400) {
          const errorMsg = error.error?.message || error.error?.details?.[0]?.message || 'Validation failed';
          alert('Failed to add policy: ' + errorMsg);
        } else if (error.status === 11000 || error.error?.message?.includes('code already exists')) {
          alert('Policy code already exists. Please use a different code.');
        } else if (error.status === 0) {
          alert('Connection failed. Please check if the server is running.');
        } else {
          alert('Failed to add policy. Server error: ' + (error.error?.message || error.message || 'Unknown error'));
        }
      }
    });
  }

  cancelAddPolicy() {
    this.showAddPolicyForm = false;
    this.newPolicy = {
      code: '',
      title: '',
      type: '',
      minSumInsured: 10000, // Set a reasonable default minimum
      description: '',
      termMonths: 12,
      tenureMonths: 24, // Set a reasonable default
      status: 'Active'
    };
  }

  editPolicy(policy: Policy) {
    this.editingPolicy = {
      id: policy.id || policy._id,
      code: policy.code,
      title: policy.name || policy.title,
      type: policy.type,
      minSumInsured: policy.minSumInsured,
      status: policy.status || 'Active',
      description: policy.description || '',
      termMonths: policy.termMonths,
      tenureMonths: policy.tenureMonths || policy.termMonths, // Use tenureMonths or fallback to termMonths
      createdAt: policy.createdAt
    };
    this.showEditModal = true;
  }

  updatePolicy() {
    if (this.editingPolicy.id) {
      const updateData = {
        title: this.editingPolicy.title,
        type: this.editingPolicy.type,
        minSumInsured: this.editingPolicy.minSumInsured,
        description: this.editingPolicy.description,
        termMonths: this.editingPolicy.termMonths,
        tenureMonths: this.editingPolicy.tenureMonths,
        status: this.editingPolicy.status
      };

      console.log('Updating policy with ID:', this.editingPolicy.id, 'Data:', updateData);

      this.policyService.updatePolicy(this.editingPolicy.id, updateData).subscribe({
        next: (response) => {
          console.log('Update policy response:', response);
          if (response.success) {
            console.log('Policy updated successfully:', response.policy);
            alert('Policy updated successfully!');
            
            // Add to recent activities
            this.recentActivities.unshift({
              type: 'Policy Updated',
              user: 'Admin',
              timestamp: 'Just now'
            });
            
            this.loadPolicies(); // Reload policies
            this.cancelEdit();
          } else {
            alert('Failed to update policy: ' + (response.message || 'Unknown error'));
          }
        },
        error: (error) => {
          console.error('Error updating policy via API:', error);
          alert('Failed to update policy. Please try again.');
        }
      });
    }
  }

  cancelEdit() {
    this.showEditModal = false;
    this.editingPolicy = {};
  }

  deletePolicy(policy: Policy) {
    const policyId = policy.id || policy._id;
    const policyName = policy.name || policy.title;
    
    if (confirm(`Are you sure you want to delete the policy "${policyName}"?`)) {
      if (policyId) {
        console.log('Deleting policy with ID:', policyId);
        
        this.policyService.deletePolicy(policyId).subscribe({
          next: (response) => {
            console.log('Delete policy response:', response);
            if (response.success) {
              console.log('Policy deleted successfully:', response);
              alert('Policy deleted successfully!');
              
              // Add to recent activities
              this.recentActivities.unshift({
                type: 'Policy Deleted',
                user: 'Admin',
                timestamp: 'Just now'
              });
              
              this.loadPolicies(); // Reload policies
            } else {
              alert('Failed to delete policy: ' + (response.message || 'Unknown error'));
            }
          },
          error: (error) => {
            console.error('Error deleting policy via API:', error);
            console.log('Falling back to local mock data deletion');
            
            // Fallback: Delete from local mock data
            const index = this.policies.findIndex(p => p.id === policyId);
            if (index !== -1) {
              this.policies.splice(index, 1);
              this.filterPolicies();
              
              // Add to recent activities
              this.recentActivities.unshift({
                type: 'Policy Deleted (Local)',
                user: 'Admin',
                timestamp: 'Just now'
              });
              
              alert('Policy deleted successfully! (Note: Using local storage)');
            } else {
              alert('Policy not found for deletion');
            }
          }
        });
      }
    }
  }

  viewPolicy(policy: Policy) {
    this.viewingPolicy = {
      id: policy.id || policy._id,
      code: policy.code,
      title: policy.name || policy.title,
      type: policy.type,
      minSumInsured: policy.minSumInsured,
      status: policy.status || 'Active',
      description: policy.description || '',
      termMonths: policy.termMonths,
      tenureMonths: policy.tenureMonths || policy.termMonths, // Use tenureMonths or fallback to termMonths
      createdAt: policy.createdAt
    };
    this.showViewModal = true;
  }

  closeViewModal() {
    this.showViewModal = false;
    this.viewingPolicy = {};
  }

  filterPolicies() {
    this.filteredPolicies = this.policies.filter(policy => {
      const policyName = policy.name || policy.title || '';
      const policyId = policy.id || policy._id || '';
      
      const matchesSearch = !this.policySearchTerm || 
        policyName.toLowerCase().includes(this.policySearchTerm.toLowerCase()) ||
        policyId.toLowerCase().includes(this.policySearchTerm.toLowerCase());
      
      const matchesFilter = !this.policyFilter || policy.type === this.policyFilter;
      
      return matchesSearch && matchesFilter;
    });
  }

  trackByPolicy(index: number, policy: Policy): string {
    return policy._id || policy.id || index.toString();
  }

  loadAgents() {
    this.http.get<any>('http://localhost:3000/api/v1/admin/agents', {
      headers: this.policyService.getAuthHeaders()
    }).subscribe({
      next: (response) => {
        if (response.success && response.agents) {
          this.agents = response.agents;
          // If no agents exist, create a sample one for testing
          if (this.agents.length === 0) {
            this.createSampleAgent();
          }
        } else {
          this.agents = [];
        }
      },
      error: (error) => {
        console.error('Error loading agents:', error);
        this.agents = [];
      }
    });
  }

  createSampleAgent() {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    
    const sampleAgent = {
      name: 'John Smith',
      email: 'john.smith@insurance.com',
      password: 'password123'
    };

    this.http.post('http://localhost:3000/api/v1/admin/createagent', sampleAgent, { headers })
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            console.log('Sample agent created successfully');
            this.loadAgents(); // Reload agents
          }
        },
        error: (error) => {
          console.log('Sample agent might already exist or error occurred:', error.error?.message);
        }
      });
  }

  openAssignAgent(policyId: string) {
    console.log('Opening assign agent modal for policy ID:', policyId);
    this.assignAgentPolicyId = policyId;
    this.selectedAgentId = null;
  }
  assignAgentToPolicy() {
    if (!this.assignAgentPolicyId || !this.selectedAgentId) return;
    
    console.log('Assigning agent:', {
      policyId: this.assignAgentPolicyId,
      agentId: this.selectedAgentId
    });
    
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    this.http.post('http://localhost:3000/api/v1/admin/assignpolicy', {
      policyProductId: this.assignAgentPolicyId,
      agentId: this.selectedAgentId
    }, { headers }).subscribe({
      next: (response: any) => {
        console.log('Assignment response:', response);
        if (response.success) {
          alert('Agent assigned successfully!');
          this.assignAgentPolicyId = null;
          this.selectedAgentId = null;
          this.loadPolicies(); // Refresh policies to show updated status
        } else {
          alert('Failed to assign agent: ' + (response.message || 'Unknown error'));
          this.assignAgentPolicyId = null;
          this.selectedAgentId = null;
        }
      },
      error: (error) => {
        console.error('Assignment error:', error);
        alert('Failed to assign agent: ' + (error.error?.message || error.message || 'Network error'));
        this.assignAgentPolicyId = null;
        this.selectedAgentId = null;
      }
    });
  }
  cancelAssignAgent() {
    this.assignAgentPolicyId = null;
    this.selectedAgentId = null;
  }

  openAssignAgentClaimModal(claimId: string) {
    console.log('Opening assign agent modal for claim ID:', claimId);
    this.assignAgentClaimId = claimId;
    this.selectedAgentId = null;
  }
  assignAgentToClaim() {
    if (!this.assignAgentClaimId || !this.selectedAgentId) return;
    console.log('Assigning agent to claim:', {
      claimId: this.assignAgentClaimId,
      agentId: this.selectedAgentId
    });
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    this.http.post('http://localhost:3000/api/v1/admin/assignclaim', {
      claimId: this.assignAgentClaimId,
      agentId: this.selectedAgentId
    }, { headers }).subscribe({
      next: (response: any) => {
        console.log('Assignment response:', response);
        if (response.success) {
          alert('Agent assigned to claim successfully!');
          this.assignAgentClaimId = null;
          this.selectedAgentId = null;
          this.loadAllClaims(); // Refresh claims to show updated assignment
        } else {
          alert('Failed to assign agent to claim: ' + (response.message || 'Unknown error'));
          this.assignAgentClaimId = null;
          this.selectedAgentId = null;
        }
      },
      error: (error) => {
        console.error('Assignment error:', error);
        alert('Failed to assign agent to claim: ' + (error.error?.message || error.message || 'Network error'));
        this.assignAgentClaimId = null;
        this.selectedAgentId = null;
      }
    });
  }
  cancelAssignAgentToClaim() {
    this.assignAgentClaimId = null;
    this.selectedAgentId = null;
  }

  loadPendingPolicies() {
    console.log('=== LOADING PENDING POLICIES ===');
    console.log('Current pendingPolicies array:', this.pendingPolicies);
    this.policyService.getPendingPolicies().subscribe({
      next: (response: { success: boolean; policies?: Policy[]; message?: string }) => {
        console.log('Full API Response:', response);
        if (response.success && response.policies) {
          console.log('Pending policies fetched successfully:', response.policies);
          console.log('Number of policies:', response.policies.length);
          this.pendingPolicies = response.policies;
          console.log('Updated pendingPolicies array:', this.pendingPolicies);
        } else {
          console.error('Failed to load pending policies:', response.message);
          console.log('Response success:', response.success);
          console.log('Response policies:', response.policies);
        }
      },
      error: (err: any) => {
        console.error('Error loading pending policies:', err);
        console.log('Full error object:', JSON.stringify(err, null, 2));
      }
    });
    console.log('=== END LOADING PENDING POLICIES ===');
  }

  approvePolicy(userPolicyId: string) {
    // Ensure we have a valid userPolicyId
    if (!userPolicyId) {
      console.error('No userPolicyId provided for approval');
      alert('Error: Policy ID not found');
      return;
    }
    
    console.log('Approve Policy button clicked with userPolicyId:', userPolicyId);
    this.policyService.approvePolicy(userPolicyId).subscribe({
      next: (response: { success: boolean; message?: string }) => {
        console.log('API Response:', response); // Log the API response
        if (response.success) {
          alert('Policy approved successfully!');
          
          // Update the policy status locally in both arrays for immediate UI feedback
          const pendingPolicyIndex = this.pendingPolicies.findIndex(policy => 
            policy.userPolicyId === userPolicyId || policy._id === userPolicyId);
          if (pendingPolicyIndex !== -1) {
            this.pendingPolicies[pendingPolicyIndex].status = 'Approved';
            console.log('Updated pending policy status locally to Approved');

            // Also update the main policies table status for the corresponding PolicyProduct
            const policyProductId = this.pendingPolicies[pendingPolicyIndex].policyId;
            const mainPolicyIndex = this.policies.findIndex(policy => 
              policy._id === policyProductId || policy.id === policyProductId);
            if (mainPolicyIndex !== -1) {
              this.policies[mainPolicyIndex].status = 'Approved';
              this.filteredPolicies = [...this.policies]; // Refresh the filtered view
              console.log('Updated main policy status locally to Approved');
            }
          }

          const mainPolicyIndex = this.policies.findIndex(policy => 
            policy._id === userPolicyId || policy.id === userPolicyId);
          if (mainPolicyIndex !== -1) {
            this.policies[mainPolicyIndex].status = 'Approved';
            this.filteredPolicies = [...this.policies]; // Refresh the filtered view
            console.log('Updated main policy status locally to Approved');
          }
          
          // Then refresh the data from server after a short delay
          setTimeout(() => {
            console.log('Refreshing all policy data from server...');
            this.loadPendingPolicies(); // Refresh pending policies
            this.loadApprovedPolicies(); // Refresh approved policies
            this.loadPolicies(); // Refresh main policies view
          }, 1500); // Increased delay to ensure DB update completes
        } else {
          alert('Failed to approve policy: ' + (response.message || 'Unknown error'));
        }
      },
      error: (err: any) => {
        console.error('Error approving policy:', err); // Log the error
        alert('Error approving policy. Please check the console for details.');
      }
    });
  }

  loadApprovedPolicies() {
    console.log('=== LOADING APPROVED POLICIES ===');
    this.policyService.getApprovedPolicies().subscribe({
      next: (response: { success: boolean; policies?: Policy[]; message?: string }) => {
        console.log('Approved policies API Response:', response);
        if (response.success && response.policies) {
          console.log('Approved policies fetched successfully:', response.policies);
          this.approvedPolicies = response.policies;
          console.log('Updated approvedPolicies array:', this.approvedPolicies);
        } else {
          console.error('Failed to load approved policies:', response.message);
          this.approvedPolicies = [];
        }
      },
      error: (err: any) => {
        console.error('Error loading approved policies:', err);
        this.approvedPolicies = [];
      }
    });
  }

  createSamplePendingPolicies() {
    console.log('Creating sample pending policies...');
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    this.http.post<any>('http://localhost:3000/api/v1/admin/create-sample-pending-policies', {}, { headers }).subscribe({
      next: (response: { success: boolean; message?: string }) => {
        console.log('Sample policies creation response:', response);
        if (response.success) {
          alert('Sample pending policies created successfully!');
          this.loadPendingPolicies(); // Refresh pending policies
        } else {
          alert('Failed to create sample policies: ' + (response.message || 'Unknown error'));
        }
      },
      error: (err: any) => {
        console.error('Error creating sample policies:', err);
        alert('Error creating sample policies. Please check the console for details.');
      }
    });
  }

  // Payment Management Methods
  loadPayments() {
    console.log('=== LOADING PAYMENTS ===');
    this.loadingPayments = true;
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    
    this.http.get<any>('http://localhost:3000/api/v1/admin/payments', { headers }).subscribe({
      next: (response: { success: boolean; payments?: any[]; message?: string }) => {
        console.log('Payments API Response:', response);
        this.loadingPayments = false;
        
        if (response.success && response.payments) {
          console.log('Payments fetched successfully:', response.payments);
          this.payments = response.payments;
          this.calculatePaymentStats();
          this.filterPayments();
          this.calculatePagination();
        } else {
          console.error('Failed to load payments:', response.message);
          this.payments = [];
          this.filteredPayments = [];
          this.resetPaymentStats();
        }
      },
      error: (err: any) => {
        console.error('Error loading payments:', err);
        this.loadingPayments = false;
        this.payments = [];
        this.filteredPayments = [];
        this.resetPaymentStats();
        if (err.status === 401) {
          alert('Session expired. Please login again.');
        } else {
          alert('Error loading payments. Please try again.');
        }
      }
    });
  }

  filterPayments() {
    if (!this.paymentStatusFilter) {
      this.filteredPayments = [...this.payments];
    } else if (this.paymentStatusFilter === 'completed') {
      // Since all payments in our system are considered completed once created
      this.filteredPayments = [...this.payments];
    } else if (this.paymentStatusFilter === 'pending') {
      // You can modify this logic if you have pending payments
      this.filteredPayments = [];
    }
    
    this.currentPage = 1;
    this.calculatePagination();
  }

  calculatePaymentStats() {
    this.paymentStats.totalAmount = this.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    this.paymentStats.completedCount = this.payments.length; // All payments are considered completed
    this.paymentStats.pendingCount = 0; // No pending payments in current system
  }

  resetPaymentStats() {
    this.paymentStats = {
      totalAmount: 0,
      completedCount: 0,
      pendingCount: 0
    };
  }

  calculatePagination() {
    this.totalPages = Math.ceil(this.filteredPayments.length / this.pageSize);
    if (this.totalPages === 0) this.totalPages = 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  viewPaymentDetails(payment: any) {
    const paymentDetails = `
Payment Details:
-----------------
Payment ID: ${payment._id}
Customer: ${payment.userId?.name || 'Unknown'} (${payment.userId?.email || 'No email'})
Policy: ${payment.userPolicyId?.policyProductId?.title || 'Unknown Policy'}
Amount: $${payment.amount?.toFixed(2)}
Method: ${payment.method}
Reference: ${payment.reference || 'N/A'}
Date: ${new Date(payment.createdAt).toLocaleString()}
Status: COMPLETED
    `;
    
    alert(paymentDetails);
  }

  downloadPaymentReceipt(payment: any) {
    // Create a simple receipt
    const receiptContent = `
PAYMENT RECEIPT
===============

Payment ID: ${payment._id}
Date: ${new Date(payment.createdAt).toLocaleString()}

Customer Information:
Name: ${payment.userId?.name || 'Unknown'}
Email: ${payment.userId?.email || 'No email'}

Payment Details:
Policy: ${payment.userPolicyId?.policyProductId?.title || 'Unknown Policy'}
Policy Code: ${payment.userPolicyId?.policyProductId?.code || 'No code'}
Amount: $${payment.amount?.toFixed(2)}
Payment Method: ${payment.method}
Reference Number: ${payment.reference || 'N/A'}
Status: COMPLETED

Thank you for your payment!
    `;

    // Create and download a text file
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment_receipt_${payment._id.substring(0, 8)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Customer Details Management Methods
  loadCustomerDetails() {
    console.log('=== LOADING CUSTOMER DETAILS ===');
    this.loadingCustomers = true;
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    
    this.http.get<any>('http://localhost:3000/api/v1/admin/customerdetails', { headers }).subscribe({
      next: (response: { success: boolean; data?: any[]; message?: string }) => {
        console.log('Customer details API Response:', response);
        this.loadingCustomers = false;
        
        if (response.success && response.data) {
          console.log('Customer details fetched successfully:', response.data);
          this.customerDetails = response.data;
          this.calculateCustomerStats();
          this.filterCustomers();
        } else {
          console.error('Failed to load customer details:', response.message);
          this.customerDetails = [];
          this.filteredCustomerDetails = [];
          this.resetCustomerStats();
        }
      },
      error: (err: any) => {
        console.error('Error loading customer details:', err);
        this.loadingCustomers = false;
        this.customerDetails = [];
        this.filteredCustomerDetails = [];
        this.resetCustomerStats();
        if (err.status === 401) {
          alert('Session expired. Please login again.');
        } else {
          alert('Error loading customer details. Please try again.');
        }
      }
    });
  }

  filterCustomers() {
    let filtered = [...this.customerDetails];
    
    // Search filter
    if (this.customerSearchTerm) {
      const searchTerm = this.customerSearchTerm.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.customer.name?.toLowerCase().includes(searchTerm) ||
        customer.customer.email?.toLowerCase().includes(searchTerm) ||
        customer.policies.some((policy: any) => 
          policy.policyProductId?.title?.toLowerCase().includes(searchTerm) ||
          policy.policyProductId?.code?.toLowerCase().includes(searchTerm)
        )
      );
    }
    
    // Status filter
    if (this.customerStatusFilter) {
      filtered = filtered.filter(customer => {
        switch (this.customerStatusFilter) {
          case 'active':
            return customer.policies.some((policy: any) => 
              policy.status === 'Approved' || policy.status === 'Active'
            );
          case 'approved':
            return customer.policies.some((policy: any) => policy.status === 'Approved');
          case 'pending':
            return customer.policies.some((policy: any) => policy.status === 'Pending');
          default:
            return true;
        }
      });
    }
    
    this.filteredCustomerDetails = filtered;
    this.customerCurrentPage = 1;
    this.calculateCustomerPagination();
    this.updatePaginatedCustomers();
  }

  calculateCustomerStats() {
    this.customerStats.totalCustomers = this.customerDetails.length;
    this.customerStats.activePolicies = 0;
    this.customerStats.pendingPolicies = 0;
    this.customerStats.totalPremium = 0;
    
    this.customerDetails.forEach(customer => {
      customer.policies.forEach((policy: any) => {
        if (policy.status === 'Approved' || policy.status === 'Active') {
          this.customerStats.activePolicies++;
        } else if (policy.status === 'Pending') {
          this.customerStats.pendingPolicies++;
        }
        this.customerStats.totalPremium += policy.policyProductId?.premium || 0;
      });
    });
  }

  resetCustomerStats() {
    this.customerStats = {
      totalCustomers: 0,
      activePolicies: 0,
      pendingPolicies: 0,
      totalPremium: 0
    };
  }

  calculateCustomerPagination() {
    this.customerTotalPages = Math.ceil(this.filteredCustomerDetails.length / this.customerPageSize);
    if (this.customerTotalPages === 0) this.customerTotalPages = 1;
    if (this.customerCurrentPage > this.customerTotalPages) this.customerCurrentPage = this.customerTotalPages;
  }

  updatePaginatedCustomers() {
    const startIndex = (this.customerCurrentPage - 1) * this.customerPageSize;
    const endIndex = startIndex + this.customerPageSize;
    this.paginatedCustomers = this.filteredCustomerDetails.slice(startIndex, endIndex);
  }

  previousCustomerPage() {
    if (this.customerCurrentPage > 1) {
      this.customerCurrentPage--;
      this.updatePaginatedCustomers();
    }
  }

  nextCustomerPage() {
    if (this.customerCurrentPage < this.customerTotalPages) {
      this.customerCurrentPage++;
      this.updatePaginatedCustomers();
    }
  }

  // Helper function for template
  sumPayments(total: number, payment: any): number {
    return total + (payment.amount || 0);
  }

  viewCustomerDetails(customer: any) {
    const customerInfo = `
CUSTOMER DETAILS
================

Name: ${customer.customer.name || 'Unknown'}
Email: ${customer.customer.email || 'No email'}
Role: ${customer.customer.role || 'Customer'}
ID: ${customer.customer._id}
Joined: ${new Date(customer.customer.createdAt).toLocaleString()}

POLICY SUMMARY:
Total Policies: ${customer.policies.length}
Total Premium Value: $${customer.totalPremium?.toFixed(2)}
Total Paid: $${customer.totalPaid?.toFixed(2)}

POLICIES:
${customer.policies.map((policy: any, index: number) => `
${index + 1}. ${policy.policyProductId?.title || 'Unknown Policy'} (${policy.policyProductId?.code || 'No code'})
   Status: ${policy.status}
   Start Date: ${new Date(policy.startDate).toLocaleDateString()}
   Premium: $${policy.policyProductId?.premium?.toFixed(2) || '0.00'}
`).join('')}

PAYMENT HISTORY:
Total Payments: ${customer.payments.length}
${customer.payments.map((payment: any, index: number) => `
${index + 1}. $${payment.amount?.toFixed(2)} via ${payment.method} on ${new Date(payment.createdAt).toLocaleDateString()}
   Reference: ${payment.reference || 'N/A'}
`).join('')}
    `;
    
    alert(customerInfo);
  }

  viewCustomerPolicies(customer: any) {
    const policyDetails = `
CUSTOMER POLICIES
=================

Customer: ${customer.customer.name || 'Unknown'}

${customer.policies.map((policy: any, index: number) => `
POLICY ${index + 1}:
- Title: ${policy.policyProductId?.title || 'Unknown Policy'}
- Code: ${policy.policyProductId?.code || 'No code'}
- Status: ${policy.status}
- Start Date: ${new Date(policy.startDate).toLocaleDateString()}
- End Date: ${new Date(policy.endDate).toLocaleDateString()}
- Premium: $${policy.policyProductId?.premium?.toFixed(2) || '0.00'}
- Description: ${policy.policyProductId?.description || 'No description'}
- Nominee: ${policy.nominee?.name || 'None'} (${policy.nominee?.relation || ''})
`).join('\n')}
    `;
    
    alert(policyDetails);
  }

  viewCustomerPayments(customer: any) {
    if (customer.payments.length === 0) {
      alert('This customer has not made any payments yet.');
      return;
    }
    
    const paymentDetails = `
CUSTOMER PAYMENT HISTORY
========================

Customer: ${customer.customer.name || 'Unknown'}
Total Payments: ${customer.payments.length}
Total Amount: $${customer.payments.reduce((sum: number, p: any) => sum + p.amount, 0).toFixed(2)}

${customer.payments.map((payment: any, index: number) => `
PAYMENT ${index + 1}:
- Amount: $${payment.amount?.toFixed(2)}
- Method: ${payment.method}
- Reference: ${payment.reference || 'N/A'}
- Date: ${new Date(payment.createdAt).toLocaleString()}
- Policy: ${payment.userPolicyId?.policyProductId?.title || 'Unknown Policy'}
`).join('\n')}
    `;
    
    alert(paymentDetails);
  }

  // ===== CLAIMS MANAGEMENT METHODS =====

  loadAllClaims() {
    console.log('=== LOADING ALL CLAIMS ===');
    
    // Try both possible token storage keys
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    
    if (!token) {
      console.error('No admin token found');
      alert('Please login as admin first');
      return;
    }

    console.log('Using token:', token.substring(0, 20) + '...');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    this.http.get<any>('http://localhost:3000/api/v1/admin/allclaims', { headers }).subscribe({
      next: (response) => {
        console.log('Claims response:', response);
        if (response.success && response.claims) {
          this.allClaims = response.claims;
          this.calculateClaimStats();
          this.filterClaims();
          console.log('Claims loaded:', this.allClaims.length);
        } else {
          console.error('Failed to load claims:', response.message);
          this.allClaims = [];
          this.filteredClaims = [];
          this.resetClaimStats();
        }
      },
      error: (err) => {
        console.error('Error loading claims:', err);
        
        // Handle token expiry specifically
        if (err.status === 403 || err.status === 401) {
          if (err.error?.message === 'Token expired' || err.statusText === 'Forbidden') {
            alert('Admin session expired. Please login again as admin.');
            // Clear all tokens
            localStorage.removeItem('admin_token');
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            // Redirect to admin login
            window.location.href = '/admin-login';
            return;
          }
        }
        
        this.allClaims = [];
        this.filteredClaims = [];
        this.resetClaimStats();
        alert('Error loading claims: ' + (err.error?.message || err.message || 'Unknown error'));
      }
    });
  }

  calculateClaimStats() {
    this.claimStats = {
      pending: this.allClaims.filter(claim => claim.status === 'Pending').length,
      approved: this.allClaims.filter(claim => claim.status === 'Approved').length,
      rejected: this.allClaims.filter(claim => claim.status === 'Rejected').length,
      total: this.allClaims.length
    };
  }

  resetClaimStats() {
    this.claimStats = { pending: 0, approved: 0, rejected: 0, total: 0 };
  }

  filterClaims() {
    if (!this.claimStatusFilter) {
      this.filteredClaims = [...this.allClaims];
    } else {
      this.filteredClaims = this.allClaims.filter(claim => claim.status === this.claimStatusFilter);
    }
    console.log('Filtered claims:', this.filteredClaims.length);
  }

  trackByClaim(index: number, claim: any): any {
    return claim._id || index;
  }

  viewClaimDetails(claim: any) {
    console.log('Viewing claim details:', claim);
    this.selectedClaim = claim;
    this.showClaimDetailsModal = true;
  }

  approveClaimModal(claim: any) {
    console.log('Opening approve modal for claim:', claim);
    this.selectedClaim = claim;
    this.claimDecisionNotes = '';
    this.showClaimApprovalModal = true;
  }

  rejectClaimModal(claim: any) {
    console.log('Opening reject modal for claim:', claim);
    this.selectedClaim = claim;
    this.claimDecisionNotes = '';
    this.showClaimRejectionModal = true;
  }

  processClaimDecision(status: string) {
    if (!this.selectedClaim) {
      alert('No claim selected');
      return;
    }

    if (status === 'Rejected' && !this.claimDecisionNotes.trim()) {
      alert('Please provide a reason for rejecting the claim');
      return;
    }

    console.log('Processing claim decision:', status, 'for claim:', this.selectedClaim._id);
    
    // Try both possible token storage keys
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    
    if (!token) {
      console.error('No admin token found');
      alert('Please login as admin first');
      return;
    }
    
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    
    const requestData = {
      claimId: this.selectedClaim._id,
      status: status,
      decisionNotes: this.claimDecisionNotes.trim() || undefined
    };

    this.http.post<any>('http://localhost:3000/api/v1/admin/approveclaim', requestData, { headers }).subscribe({
      next: (response) => {
        console.log('Claim decision response:', response);
        if (response.success) {
          alert(`Claim ${status.toLowerCase()} successfully!`);
          this.closeClaimModal();
          this.loadAllClaims(); // Refresh the claims list
        } else {
          alert('Failed to process claim: ' + (response.message || 'Unknown error'));
        }
      },
      error: (err) => {
        console.error('Error processing claim:', err);
        
        // Handle token expiry specifically
        if (err.status === 403 || err.status === 401) {
          if (err.error?.message === 'Token expired' || err.statusText === 'Forbidden') {
            alert('Admin session expired. Please login again as admin.');
            // Clear all tokens
            localStorage.removeItem('admin_token');
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            // Redirect to admin login
            window.location.href = '/admin-login';
            return;
          }
        }
        
        alert('Error processing claim: ' + (err.error?.message || err.message));
      }
    });
  }

  closeClaimModal() {
    this.showClaimApprovalModal = false;
    this.showClaimRejectionModal = false;
    this.selectedClaim = null;
    this.claimDecisionNotes = '';
  }

  closeClaimDetailsModal() {
    this.showClaimDetailsModal = false;
    this.selectedClaim = null;
  }
}
