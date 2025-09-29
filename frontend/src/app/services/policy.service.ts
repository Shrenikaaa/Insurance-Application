import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Policy {
  _id?: string;
  id?: string;
  userPolicyId?: string; // Added for pending policies
  policyId?: string; // Added for pending policies
  name?: string;
  title?: string;
  policyTitle?: string; // Added for pending policies
  code?: string;
  policyCode?: string; // Added for pending policies
  type: string;
  minSumInsured: number;
  policyPrice?: number; // Added for user policies
  status?: string;
  description?: string;
  termMonths?: number;
  tenureMonths?: number;
  assignedAgentId?: string;
  assignedAgentName?: string;
  customerName?: string; // Added for pending policies
  customerEmail?: string; // Added for pending policies
  purchaseDate?: string; // Added for pending policies
  createdAt: Date;
}

export interface PolicyResponse {
  success: boolean;
  message?: string;
  policy?: Policy;
  policies?: Policy[];
}

@Injectable({
  providedIn: 'root'
})
export class PolicyService {
  private apiUrl = 'http://localhost:3000/api/v1/admin';

  constructor(private http: HttpClient) {}

  public getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    console.log('PolicyService - Getting auth headers, token found:', token ? 'Yes' : 'No');
    if (token) {
      console.log('PolicyService - Token preview:', token.substring(0, 20) + '...');
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get all policies
  getAllPolicies(): Observable<PolicyResponse> {
    return this.http.get<PolicyResponse>(`${this.apiUrl}/policies`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get policy by ID
  getPolicyById(id: string): Observable<PolicyResponse> {
    return this.http.get<PolicyResponse>(`${this.apiUrl}/policies/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Create new policy
  createPolicy(policy: Omit<Policy, '_id' | 'id' | 'createdAt'>): Observable<PolicyResponse> {
    return this.http.post<PolicyResponse>(`${this.apiUrl}/policies`, policy, {
      headers: this.getAuthHeaders()
    });
  }

  // Update existing policy
  updatePolicy(id: string, policy: Partial<Policy>): Observable<PolicyResponse> {
    return this.http.put<PolicyResponse>(`${this.apiUrl}/policies/${id}`, policy, {
      headers: this.getAuthHeaders()
    });
  }

  // Delete policy
  deletePolicy(id: string): Observable<PolicyResponse> {
    return this.http.delete<PolicyResponse>(`${this.apiUrl}/policies/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  getPendingPolicies(): Observable<PolicyResponse> {
    console.log('PolicyService - Getting pending policies from:', `${this.apiUrl}/test-pending`);
    return this.http.get<PolicyResponse>(`${this.apiUrl}/test-pending`);
  }

  approvePolicy(userPolicyId: string): Observable<PolicyResponse> {
    console.log('PolicyService - Approving policy:', userPolicyId, 'at endpoint:', `${this.apiUrl}/test-approve`);
    return this.http.post<PolicyResponse>(`${this.apiUrl}/test-approve`, { userPolicyId }).pipe(
      catchError((error: any) => {
        console.error('PolicyService - Error approving policy:', error);
        throw error;
      })
    );
  }

  getApprovedPolicies(): Observable<PolicyResponse> {
    console.log('PolicyService - Getting approved policies from:', `${this.apiUrl}/approvedpolicies`);
    return this.http.get<PolicyResponse>(`${this.apiUrl}/approvedpolicies`);
  }

  getAllUserPolicies(): Observable<PolicyResponse> {
    console.log('PolicyService - Getting all user policies for admin management');
    // This will get both pending and approved policies combined
    return new Observable(observer => {
      // Get both pending and approved policies and combine them
      const pendingRequest = this.http.get<PolicyResponse>(`${this.apiUrl}/test-pending`);
      const approvedRequest = this.http.get<PolicyResponse>(`${this.apiUrl}/approvedpolicies`);
      
      // Combine both requests
      pendingRequest.subscribe({
        next: (pendingResponse) => {
          approvedRequest.subscribe({
            next: (approvedResponse) => {
              const combinedPolicies = [
                ...(pendingResponse.policies || []),
                ...(approvedResponse.policies || [])
              ];
              observer.next({
                success: true,
                policies: combinedPolicies
              });
              observer.complete();
            },
            error: (error) => {
              // If approved fails, just return pending policies
              observer.next(pendingResponse);
              observer.complete();
            }
          });
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  getAvailablePolicies(): Observable<PolicyResponse> {
    return this.http.get<PolicyResponse>(`${this.apiUrl}/availablepolicies`, {
      headers: this.getAuthHeaders()
    });
  }
}