import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AgentService {
  constructor(private http: HttpClient) {}

  getAssignedPolicies(agentId?: string): Observable<any> {
    let url = 'http://localhost:3000/api/v1/agents/assignedpolicies';
    if (agentId) {
      url += `?agentId=${agentId}`;
    }
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.get<any>(url, { headers });
  }

  getAssignedClaims(): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.get<any>('http://localhost:3000/api/v1/agents/assignedclaims', { headers });
  }
}
