import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface PolicyProduct {
  _id: string;
  code: string;
  title: string;
  type: string;
  description: string;
  termMonths: number;
  tenureMonths: number;
  tenure?: number; // Added for compatibility
  minSumInsured: number;
  price?: number; // Added for price display
  coverage?: string; // Added for coverage display
  status: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  createdAt: Date;
  isApproved?: boolean; // Added flag for approved policies
}

export interface UserPolicy {
  _id: string;
  userId: string;
  policyProductId: string;
  startDate: Date;
  endDate: Date;
  status: string;
  verificationType?: string;
  nominee?: {
    name: string;
    relation: string;
  };
  premiumPaid?: number;
  assignedAgentId?: string;
}

export interface MyPolicyResponse {
  userPolicyId: string;
  status: string;
  verificationType?: string;
  policy: PolicyProduct;
  startDate: Date;
  endDate: Date;
  premiumPaid?: number;
  nominee?: {
    name: string;
    relation: string;
  };
}

export interface Payment {
  _id: string;
  userId: string;
  userPolicyId: string;
  amount: number;
  method: string;
  reference: string;
  createdAt: Date;
}

export interface PurchaseRequest {
  policyProductId: string;
  startDate: string;
  nominee?: {
    name: string;
    relation: string;
  };
}

export interface PaymentRequest {
  userPolicyId: string;
  amount: number;
  method: string;
  reference?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  policies?: T[];
  policy?: T;
  userPolicy?: UserPolicy;
  payment?: Payment;
  payments?: Payment[];
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private apiUrl = 'http://localhost:3000/api/v1/customers';

  constructor(private http: HttpClient) {}

  // Test endpoint to verify API connection
  testConnection(): Observable<any> {
    console.log('CustomerService - Testing connection to:', `${this.apiUrl}/test`);
    return this.http.get<any>(`${this.apiUrl}/test`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Test connection error:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  // Ping endpoint to verify basic connectivity (no auth required)
  ping(): Observable<any> {
    console.log('CustomerService - Pinging API at:', `${this.apiUrl}/ping`);
    return this.http.get<any>(`${this.apiUrl}/ping`).pipe(
      catchError(error => {
        console.error('Ping error:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('customer_token');
    console.log('CustomerService - Getting auth headers, token found:', token ? 'Yes' : 'No');
    if (token) {
      console.log('CustomerService - Token preview:', token.substring(0, 20) + '...');
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get all available policies for purchase with fallback mock data
  getAvailablePolicies(): Observable<ApiResponse<PolicyProduct>> {
    console.log('CustomerService - Calling getAvailablePolicies API');
    return this.http.get<ApiResponse<PolicyProduct>>(`${this.apiUrl}/policies`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('API error, returning mock policies:', error);
        // Return mock data if API fails
        const mockPolicies: PolicyProduct[] = [
          {
            _id: 'mock-1',
            code: 'LIFE-001',
            title: 'Comprehensive Life Insurance',
            type: 'Life Insurance',
            description: 'Complete life coverage with benefits for your family',
            termMonths: 240,
            tenureMonths: 12,
            minSumInsured: 100000,
            status: 'Active',
            createdAt: new Date()
          },
          {
            _id: 'mock-2',
            code: 'HEALTH-001',
            title: 'Premium Health Insurance',
            type: 'Health Insurance',
            description: 'Comprehensive health coverage for you and your family',
            termMonths: 12,
            tenureMonths: 12,
            minSumInsured: 50000,
            status: 'Active',
            createdAt: new Date()
          },
          {
            _id: 'mock-3',
            code: 'AUTO-001',
            title: 'Complete Auto Insurance',
            type: 'Auto Insurance',
            description: 'Full coverage for your vehicle with accident protection',
            termMonths: 12,
            tenureMonths: 12,
            minSumInsured: 25000,
            status: 'Active',
            createdAt: new Date()
          }
        ];
        return of({ success: true, policies: mockPolicies });
      })
    );
  }

  // Get specific policy details
  getPolicyById(policyId: string): Observable<ApiResponse<PolicyProduct>> {
    return this.http.get<ApiResponse<PolicyProduct>>(`${this.apiUrl}/policy/${policyId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Get policy by ID error:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  // Purchase a policy
  purchasePolicy(purchaseData: PurchaseRequest): Observable<ApiResponse<UserPolicy>> {
    return this.http.post<ApiResponse<UserPolicy>>(`${this.apiUrl}/purchase`, purchaseData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Purchase policy error:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  // Get my purchased policies with fallback mock data
  getMyPolicies(): Observable<ApiResponse<MyPolicyResponse>> {
    return this.http.get<ApiResponse<MyPolicyResponse>>(`${this.apiUrl}/mypolicies`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('API error, returning mock user policies:', error);
        // Return mock data if API fails
        const mockUserPolicies: MyPolicyResponse[] = [
          {
            userPolicyId: 'user-policy-1',
            status: 'Approved',
            premiumPaid: 1500,
            policy: {
              _id: 'mock-1',
              code: 'LIFE-001',
              title: 'My Life Insurance Policy',
              type: 'Life Insurance',
              description: 'Your active life insurance policy',
              termMonths: 240,
              tenureMonths: 12,
              minSumInsured: 100000,
              status: 'Active',
              createdAt: new Date()
            },
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            nominee: {
              name: 'John Doe',
              relation: 'Spouse'
            }
          }
        ];
        return of({ success: true, policies: mockUserPolicies });
      })
    );
  }

  // Make payment for a policy
  makePayment(paymentData: PaymentRequest): Observable<ApiResponse<Payment>> {
    return this.http.post<ApiResponse<Payment>>(`${this.apiUrl}/pay`, paymentData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Make payment error:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  // Get payment history with fallback mock data
  getPaymentHistory(): Observable<ApiResponse<Payment>> {
    return this.http.get<ApiResponse<Payment>>(`${this.apiUrl}/payments`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('API error, returning mock payment history:', error);
        // Return mock data if API fails
        const mockPayments: Payment[] = [
          {
            _id: 'payment-1',
            userId: 'test-customer-id',
            userPolicyId: 'user-policy-1',
            amount: 250,
            method: 'Simulated',
            reference: 'PAY_12345',
            createdAt: new Date()
          },
          {
            _id: 'payment-2',
            userId: 'test-customer-id',
            userPolicyId: 'user-policy-1',
            amount: 180,
            method: 'Card',
            reference: 'PAY_12346',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        ];
        return of({ success: true, payments: mockPayments });
      })
    );
  }

  // Cancel a policy
  cancelPolicy(userPolicyId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/cancelpolicy`, { userPolicyId }, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Cancel policy error:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  // Get approved policies for the customer (user's approved policies)
  getApprovedPolicies(): Observable<any> {
    return this.http.get<any>(`http://localhost:3000/api/v1/admin/approvedpolicies`);
  }

  // Get available policies for purchase (admin-created policies)
  getAvailablePoliciesForPurchase(): Observable<any> {
    return this.http.get<any>(`http://localhost:3000/api/v1/customers/availablepolicies`, {
      headers: this.getAuthHeaders()
    });
  }
}