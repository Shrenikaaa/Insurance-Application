import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CustomerService, PolicyProduct, MyPolicyResponse, Payment, PurchaseRequest, PaymentRequest } from '../../services/customer.service';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './customer-dashboard.html'
})
export class CustomerDashboard implements OnInit {
  showProfile() {
    this.currentSection = 'profile';
  }
  showAvailablePolicies() {
    this.currentSection = 'availablePolicies';
    this.loadAvailablePolicies();
  }
  get recentApprovedClaims() {
    return this.myClaims ? this.myClaims.filter(c => c.status === 'Approved').slice(0, 5) : [];
  }
  customerName = 'Customer User';
  sidebarOpen = true;
  
  // Current section being displayed
  currentSection = 'dashboard'; // dashboard, availablePolicies, myPolicies, payments, paymentHistory
  
  // Dashboard stats
  stats = {
    activePolicies: 0,
    pendingClaims: 0,
    totalPremiumPaid: 0,
    upcomingPayments: 0
  };

  // Data arrays
  availablePolicies: PolicyProduct[] = [];
  myPolicies: MyPolicyResponse[] = [];
  paymentHistory: Payment[] = [];
  recentActivities: any[] = [];
  approvedPolicies: any[] = []; // Changed to any[] to handle admin response structure

  // Modal states
  showPurchaseModal = false;
  showPaymentModal = false;
  selectedPolicy: any | null = null; // Changed to any to handle UserPolicy with populated PolicyProduct
  selectedUserPolicy: MyPolicyResponse | null = null;

  // Form data
  purchaseForm: PurchaseRequest = {
    policyProductId: '',
    startDate: '',
    nominee: {
      name: '',
      relation: ''
    }
  };

  paymentForm: PaymentRequest = {
    userPolicyId: '',
    amount: 0,
    method: 'Simulated',
    reference: ''
  };

  // Claims-related properties
  myClaims: any[] = [];
  filteredClaims: any[] = [];
  loadingClaims = false;
  claimStatusFilter = '';
  claimStats = {
    totalClaims: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
    totalAmountClaimed: 0,
    approvedAmount: 0
  };

  // File Claim Form
  claimForm = {
    userPolicyId: '',
    incidentDate: '',
    incidentType: '',
    description: '',
    amountClaimed: 0
  };
  
  submittingClaim = false;
  maxIncidentDate = new Date().toISOString().split('T')[0]; // Today's date

  constructor(
    private http: HttpClient,
    private customerService: CustomerService
  ) {}

  ngOnInit() {
    console.log('Customer Dashboard initialized');
    
    // FOR DEVELOPMENT: Set a test customer token if none exists
    
    // Load dashboard data (will use mock data if API fails)
    this.loadDashboardData();
    this.showDashboard();

    this.loadAvailablePolicies();
    this.loadApprovedPolicies();
  }

  showDashboard() {
    // This method can be expanded to set up dashboard view if needed
    this.currentSection = 'dashboard';
  }

  testApiConnection() {
    console.log('Testing API connection...');
    console.log('Testing direct HTTP call...');
    // Test direct HTTP call without service
    this.http.get('http://localhost:3000/api/v1/customers/ping').subscribe({
      next: (response) => {
        console.log('Direct HTTP SUCCESS:', response);
        alert('Direct HTTP test successful!');
        // Now test via service
        console.log('Testing via service...');
        this.customerService.ping().subscribe({
          next: (serviceResponse) => {
            console.log('Service call SUCCESS:', serviceResponse);
            this.loadApprovedPolicies(); // Changed to load approved policies instead of all available policies
          }
        });
      }
    });
  }

  showMyPolicies() {
    this.currentSection = 'myPolicies';
    this.loadMyPolicies();
  }

  showApprovedPolicies() {
    this.currentSection = 'approvedPolicies';
    this.loadApprovedPolicies();
  }

  showBuyPolicy() {
    this.currentSection = 'buyPolicy';
    this.loadAvailablePoliciesForPurchase(); // Load admin-created policies for purchase
  }

  showPayments() {
    this.currentSection = 'payments';
    this.loadMyPolicies(); // Load policies that can receive payments
    this.loadApprovedPolicies(); // Also load admin-approved policies
  }

  showPaymentHistory() {
    this.currentSection = 'paymentHistory';
    this.loadPaymentHistory();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  // Data loading methods
  loadDashboardData() {
    this.loadAvailablePolicies();
    this.loadMyPolicies();
    this.loadPaymentHistory();
    this.calculateStats();
  }

  // loadAvailablePolicies() {
  //   console.log('Loading available policies...');
  //   this.customerService.getAvailablePolicies().subscribe({
  //     next: (response) => {
  //       if (response.success && response.policies) {
  //         this.availablePolicies = response.policies;
  //         console.log('Available policies loaded:', this.availablePolicies);
  //       } else {
  //         console.error('Failed to load policies:', response.message);
  //       }
  //     },
  //     error: (err) => {
  //       console.error('Error loading policies:', err);
  //     }
  //   });
  // }

  // filepath: c:\Users\Ascendion\Desktop\Insurance-App\Insurance-Application\frontend\src\app\components\customer-dashboard\customer-dashboard.component.ts
loadAvailablePolicies() {
  const token = localStorage.getItem('token') || localStorage.getItem('customer_token');
  const headers = { 'Authorization': `Bearer ${token}` };

  this.http.get('http://localhost:3000/api/v1/customers/availablepolicies', { headers }).subscribe({
    next: (response: any) => {
      if (response.success) {
        this.availablePolicies = response.policies || [];
      } else {
        this.availablePolicies = [];
      }
    },
    error: (error) => {
      console.error('Error loading available policies:', error);
      this.availablePolicies = [];
    }
  });
}

  loadMyPolicies() {
    console.log('Loading my policies...');
    this.customerService.getMyPolicies().subscribe({
      next: (response) => {
        console.log('My policies response:', response);
        if (response.success && response.policies) {
          this.myPolicies = response.policies.filter(p => p && p.policy && p.policy.title);
          console.log('My policies loaded:', this.myPolicies);
        } else {
          console.log('No policies in response or response failed:', response);
          this.myPolicies = [];
        }
      },
      error: (error) => {
        console.error('Error loading my policies:', error);
        console.error('Error details:', error.error);
        if (error.status === 0) {
          alert('Cannot connect to server. Please make sure the backend is running.');
        } else if (error.status === 401 || error.status === 403) {
          alert('Authentication failed. Please login again.');
        } else {
          alert('Failed to load your policies: ' + (error.error?.message || error.message || 'Unknown error'));
        }
        this.myPolicies = [];
      }
    });
  }

  loadPaymentHistory() {
    this.customerService.getPaymentHistory().subscribe({
      next: (response) => {
        if (response.success && response.payments) {
          this.paymentHistory = response.payments;
          console.log('Payment history loaded:', this.paymentHistory);
        }
      },
      error: (error) => {
        console.error('Error loading payment history:', error);
        alert('Failed to load payment history');
      }
    });
  }

  loadApprovedPolicies() {
    console.log('Loading approved policies...');
    this.customerService.getApprovedPolicies().subscribe({
      next: (response: { success: boolean; policies?: any[]; message?: string }) => {
        if (response.success && response.policies) {
          this.approvedPolicies = response.policies;
          console.log('Approved policies loaded:', this.approvedPolicies);
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

  loadAvailablePoliciesForPurchase() {
    console.log('Loading available policies for purchase...');
    this.customerService.getAvailablePoliciesForPurchase().subscribe({
      next: (response: { success: boolean; policies?: any[]; message?: string }) => {
        if (response.success && response.policies) {
          this.availablePolicies = response.policies;
          console.log('Available policies for purchase loaded:', this.availablePolicies);
        } else {
          console.error('Failed to load available policies:', response.message);
          this.availablePolicies = [];
        }
      },
      error: (err: any) => {
        console.error('Error loading available policies:', err);
        this.availablePolicies = [];
      }
    });
  }

  loadClaimablePolicies() {
    console.log('Loading claimable policies (with completed payments)...');
    const token = localStorage.getItem('token') || localStorage.getItem('customer_token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    this.http.get<any>('http://localhost:3000/api/v1/customers/claimablepolicies', { headers }).subscribe({
      next: (response) => {
        console.log('Claimable policies response:', response);
        if (response.success && response.policies) {
          this.approvedPolicies = response.policies;
          console.log('Claimable policies loaded:', this.approvedPolicies);
        } else {
          console.error('Failed to load claimable policies:', response.message);
          this.approvedPolicies = [];
        }
      },
      error: (err: any) => {
        console.error('Error loading claimable policies:', err);
        this.approvedPolicies = [];
      }
    });
  }

  calculateStats() {
    // Calculate stats from loaded data
    this.stats.activePolicies = this.myPolicies.filter(p => p.status === 'Approved').length;
    this.stats.totalPremiumPaid = this.paymentHistory.reduce((total, payment) => total + payment.amount, 0);
    this.stats.pendingClaims = 0; // TODO: Implement claims functionality
    this.stats.upcomingPayments = this.myPolicies.filter(p => p.status === 'Approved').length;
  }

  // Purchase policy functionality
  selectPolicy(policy: any) {
    // Handle approved policy selection
    this.selectedPolicy = policy;
    // You can either open a purchase modal or navigate to policy details
    // For now, let's show a simple confirmation
    const confirmPurchase = confirm(`Do you want to proceed with ${policy.policyProductId?.title}?`);
    if (confirmPurchase) {
      this.openPurchaseModalForApproved(policy);
    }
  }

  openPurchaseModalForApproved(policy: any) {
    this.selectedPolicy = policy;
    this.purchaseForm = {
      policyProductId: policy.policyProductId?._id || policy._id,
      startDate: new Date().toISOString().split('T')[0], // Today's date
      nominee: {
        name: '',
        relation: ''
      }
    };
    this.showPurchaseModal = true;
  }

  openPurchaseModal(policy: PolicyProduct) {
    this.selectedPolicy = policy;
    this.purchaseForm = {
      policyProductId: policy._id,
      startDate: new Date().toISOString().split('T')[0], // Today's date
      nominee: {
        name: '',
        relation: ''
      }
    };
    this.showPurchaseModal = true;
  }

  closePurchaseModal() {
    this.showPurchaseModal = false;
    this.selectedPolicy = null;
    this.purchaseForm = {
      policyProductId: '',
      startDate: '',
      nominee: { name: '', relation: '' }
    };
  }

  purchasePolicy() {
    if (!this.purchaseForm.startDate) {
      alert('Please select a start date');
      return;
    }

    this.customerService.purchasePolicy(this.purchaseForm).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Policy purchased successfully! It is now pending approval.');
          this.closePurchaseModal();
          this.loadMyPolicies(); // Refresh my policies
          this.calculateStats();
        } else {
          alert('Failed to purchase policy: ' + (response.message || 'Unknown error'));
        }
      },
      error: (error) => {
        console.error('Error purchasing policy:', error);
        alert('Failed to purchase policy: ' + (error.error?.message || error.message || 'Network error'));
      }
    });
  }

  // Payment functionality
  openPaymentModal(userPolicy: MyPolicyResponse) {
    this.selectedUserPolicy = userPolicy;
    this.paymentForm = {
      userPolicyId: userPolicy.userPolicyId,
      amount: userPolicy.policy.minSumInsured / 12, // Monthly premium estimate
      method: 'Simulated',
      reference: `PAY_${Date.now()}`
    };
    this.showPaymentModal = true;
  }

  // Open purchase modal for admin-created policies
  openPaymentModalForApproved(policy: any) {
    // This should open purchase modal, not payment modal
    // Since these are admin-created policies available for purchase
    this.selectedPolicy = policy;
    this.purchaseForm = {
      policyProductId: policy.policyId || policy._id,
      startDate: '',
      nominee: {
        name: '',
        relation: ''
      }
    };
    this.showPurchaseModal = true;
  }

  // Open payment modal for policies (purchase policy first, then pay)
  openPaymentModalForPolicy(policy: any) {
    this.selectedPolicy = policy;
    
    // First purchase the policy to create a UserPolicy
    const purchaseData = {
      policyProductId: policy._id,
      startDate: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0], // Tomorrow's date
      nominee: {
        name: 'Default Nominee',
        relation: 'Self'
      }
    };
    
    this.customerService.purchasePolicy(purchaseData).subscribe({
      next: (response) => {
        if (response.success && response.userPolicy) {
          // Now open payment modal with the userPolicy ID
          this.paymentForm = {
            userPolicyId: response.userPolicy._id,
            amount: policy.price || policy.minSumInsured || 1000,
            method: 'Simulated',
            reference: `PAY_${Date.now()}_POLICY`
          };
          this.showPaymentModal = true;
        } else {
          alert('Failed to purchase policy: ' + (response.message || 'Unknown error'));
        }
      },
      error: (err) => {
        alert('Error purchasing policy: ' + err.message);
      }
    });
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.selectedUserPolicy = null;
    this.paymentForm = {
      userPolicyId: '',
      amount: 0,
      method: 'Simulated',
      reference: ''
    };
  }

  makePayment() {
    if (this.paymentForm.amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    this.customerService.makePayment(this.paymentForm).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Payment made successfully!');
          this.closePaymentModal();
          this.loadPaymentHistory(); // Refresh payment history
          this.calculateStats();
        } else {
          alert('Failed to make payment: ' + (response.message || 'Unknown error'));
        }
      },
      error: (err) => {
        alert('Error making payment: ' + err.message);
      }
    });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('customer_token');
    localStorage.removeItem('userRole');
    window.location.href = '/home';
  }

  // Claims Navigation Methods
  showMyClaims() {
    this.currentSection = 'myClaims';
    this.loadMyClaims();
  }

  showFileClaim() {
    this.currentSection = 'fileClaim';
    this.loadClaimablePolicies(); // Load policies with completed payments for claim form
  }

  openClaimModal(policy: any) {
    // Set the selected policy for claim and navigate to File Claim section
    this.selectedPolicy = policy;
    this.claimForm.userPolicyId = policy.userPolicyId;
    this.showFileClaim(); // Navigate to file claim section with pre-selected policy
  }

  // Claims Data Loading
  loadMyClaims() {
    this.loadingClaims = true;
    const token = localStorage.getItem('token') || localStorage.getItem('customer_token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    
    this.http.get<any>('http://localhost:3000/api/v1/customers/myclaims', { headers }).subscribe({
      next: (response) => {
        console.log('My claims response:', response);
        this.loadingClaims = false;
        
        if (response.success) {
          this.myClaims = response.claims || [];
          this.claimStats = response.stats || this.claimStats;
          this.filterClaims();
        } else {
          console.error('Failed to load claims:', response.message);
          this.myClaims = [];
          this.filteredClaims = [];
        }
      },
      error: (err) => {
        console.error('Error loading claims:', err);
        this.loadingClaims = false;
        this.myClaims = [];
        this.filteredClaims = [];
        alert('Error loading claims: ' + err.message);
      }
    });
  }

  filterClaims() {
    if (!this.claimStatusFilter) {
      this.filteredClaims = [...this.myClaims];
    } else {
      this.filteredClaims = this.myClaims.filter(claim => claim.status === this.claimStatusFilter);
    }
  }

  // Claim Form Methods
  onPolicySelected() {
    const policyId = this.claimForm.userPolicyId;
    this.selectedPolicy = this.approvedPolicies.find(policy => policy._id === policyId) || null;
    
    // Reset amount when policy changes
    this.claimForm.amountClaimed = 0;
  }

  resetClaimForm() {
    this.claimForm = {
      userPolicyId: '',
      incidentDate: '',
      incidentType: '',
      description: '',
      amountClaimed: 0
    };
    this.selectedPolicy = null;
  }

  submitClaim() {
    if (!this.validateClaimForm()) {
      return;
    }

    this.submittingClaim = true;
    const token = localStorage.getItem('token') || localStorage.getItem('customer_token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const claimData = {
      userPolicyId: this.claimForm.userPolicyId,
      incidentDate: this.claimForm.incidentDate,
      incidentType: this.claimForm.incidentType,
      description: this.claimForm.description,
      amountClaimed: this.claimForm.amountClaimed
    };

    console.log('Submitting claim:', claimData);

    this.http.post<any>('http://localhost:3000/api/v1/customers/raiseclaim', claimData, { headers }).subscribe({
      next: (response) => {
        console.log('Claim submission response:', response);
        this.submittingClaim = false;
        
        if (response.success) {
          alert('Claim submitted successfully! You will be notified of status updates.');
          this.resetClaimForm();
          this.showMyClaims(); // Navigate to claims list
        } else {
          alert('Failed to submit claim: ' + (response.message || 'Unknown error'));
        }
      },
      error: (err) => {
        console.error('Error submitting claim:', err);
        this.submittingClaim = false;
        
        let errorMessage = 'Error submitting claim';
        if (err.error && err.error.message) {
          errorMessage += ': ' + err.error.message;
        } else if (err.error && err.error.errors && err.error.errors.length > 0) {
          errorMessage += ': ' + err.error.errors.join(', ');
        }
        
        alert(errorMessage);
      }
    });
  }

  validateClaimForm(): boolean {
    if (!this.claimForm.userPolicyId) {
      alert('Please select a policy');
      return false;
    }

    if (!this.claimForm.incidentDate) {
      alert('Please select incident date');
      return false;
    }

    if (!this.claimForm.incidentType) {
      alert('Please select incident type');
      return false;
    }

    if (!this.claimForm.description || this.claimForm.description.trim().length < 10) {
      alert('Please provide a detailed description (minimum 10 characters)');
      return false;
    }

    if (this.claimForm.amountClaimed <= 0) {
      alert('Please enter a valid claim amount');
      return false;
    }

    if (this.selectedPolicy && this.claimForm.amountClaimed > this.selectedPolicy.policyProductId?.minSumInsured) {
      alert(`Claim amount cannot exceed policy coverage of $${this.selectedPolicy.policyProductId?.minSumInsured}`);
      return false;
    }

    // Validate incident date
    const incidentDate = new Date(this.claimForm.incidentDate);
    const today = new Date();
    
    // Find the user policy to get start date
    const userPolicy = this.approvedPolicies.find(p => p._id === this.claimForm.userPolicyId);
    const policyStart = userPolicy ? new Date(userPolicy.startDate) : null;

    if (incidentDate > today) {
      alert('Incident date cannot be in the future');
      return false;
    }

    if (policyStart && incidentDate < policyStart) {
      alert('Incident date cannot be before policy start date');
      return false;
    }

    return true;
  }

  viewClaimDetails(claim: any) {
    const claimDetails = `
CLAIM DETAILS
=============

Claim ID: ${claim._id}
Policy: ${claim.userPolicyId?.policyProductId?.title || 'Unknown Policy'} (${claim.userPolicyId?.policyProductId?.code || 'No code'})
Status: ${claim.status}
Filed Date: ${new Date(claim.createdAt).toLocaleString()}

INCIDENT INFORMATION:
Incident Date: ${new Date(claim.incidentDate).toLocaleDateString()}
Incident Type: ${claim.incidentType || 'Not specified'}
Amount Claimed: $${claim.amountClaimed?.toFixed(2)}

DESCRIPTION:
${claim.description}

${claim.decisionNotes ? 'DECISION NOTES:\n' + claim.decisionNotes : ''}
${claim.decidedByAgentId ? 'Reviewed by: ' + (claim.decidedByAgentId.name || 'Agent') : ''}
    `;
    
    alert(claimDetails);
  }

  // Cancel Policy Methods
  showCancelConfirmation = false;
  policyToCancel: any = null;
  cancellingPolicy = false;

  openCancelConfirmation(policy: any) {
    if (policy.status !== 'Approved') {
      alert('Only approved policies can be cancelled.');
      return;
    }
    
    this.policyToCancel = policy;
    this.showCancelConfirmation = true;
    console.log('Opening cancel confirmation for policy:', policy);
  }

  closeCancelConfirmation() {
    this.showCancelConfirmation = false;
    this.policyToCancel = null;
  }

  confirmCancelPolicy() {
    if (!this.policyToCancel) {
      return;
    }

    this.cancellingPolicy = true;
    console.log('Cancelling policy:', this.policyToCancel.userPolicyId);

    const token = localStorage.getItem('customer_token') || localStorage.getItem('token');
    
    if (!token) {
      alert('Please login to cancel policy');
      this.closeCancelConfirmation();
      this.cancellingPolicy = false;
      return;
    }

    const headers = { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    };

    const requestData = {
      userPolicyId: this.policyToCancel.userPolicyId
    };

    this.http.post<any>('http://localhost:3000/api/v1/customers/cancelpolicy', requestData, { headers })
      .subscribe({
        next: (response) => {
          console.log('Policy cancel response:', response);
          if (response.success) {
            alert('Policy cancelled successfully!');
            
            // Update the policy status in the local array
            const policyIndex = this.myPolicies.findIndex(p => p.userPolicyId === this.policyToCancel.userPolicyId);
            if (policyIndex !== -1) {
              this.myPolicies[policyIndex].status = 'Cancelled';
            }
            
            // Refresh the policies list
            this.loadMyPolicies();
            
            this.closeCancelConfirmation();
          } else {
            alert('Failed to cancel policy: ' + (response.message || 'Unknown error'));
          }
          this.cancellingPolicy = false;
        },
        error: (error) => {
          console.error('Error cancelling policy:', error);
          let errorMessage = 'Error cancelling policy';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          alert(errorMessage);
          this.cancellingPolicy = false;
        }
      });
  }

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-200 text-green-800';
      case 'pending':
        return 'bg-yellow-200 text-yellow-800';
      case 'rejected':
        return 'bg-red-200 text-red-800';
      case 'active':
        return 'bg-blue-200 text-blue-800';
      case 'paid':
        return 'bg-purple-200 text-purple-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  }
}
