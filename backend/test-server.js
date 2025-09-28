import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Mock policy data
const mockPolicies = [
  {
    _id: 'policy-1',
    code: 'LIFE-001',
    title: 'Comprehensive Life Insurance',
    type: 'Life Insurance',
    description: 'Complete life coverage with benefits for your family',
    termMonths: 240,
    tenureMonths: 12,
    minSumInsured: 100000,
    status: 'Active',
    assignedAgentName: 'John Agent',
    createdAt: new Date()
  },
  {
    _id: 'policy-2',
    code: 'HEALTH-001',
    title: 'Premium Health Insurance',
    type: 'Health Insurance',
    description: 'Comprehensive health coverage for you and your family',
    termMonths: 12,
    tenureMonths: 12,
    minSumInsured: 50000,
    status: 'Active',
    assignedAgentName: 'Sarah Agent',
    createdAt: new Date()
  },
  {
    _id: 'policy-3',
    code: 'AUTO-001',
    title: 'Complete Auto Insurance',
    type: 'Auto Insurance',
    description: 'Full coverage for your vehicle with accident protection',
    termMonths: 12,
    tenureMonths: 12,
    minSumInsured: 25000,
    status: 'Active',
    assignedAgentName: 'Mike Agent',
    createdAt: new Date()
  }
];

const mockUserPolicies = [
  {
    userPolicyId: 'user-policy-1',
    status: 'Approved',
    policy: mockPolicies[0],
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    nominee: {
      name: 'John Doe',
      relation: 'Spouse'
    }
  }
];

const mockPayments = [
  {
    _id: 'payment-1',
    userId: 'test-customer-id',
    userPolicyId: 'user-policy-1',
    amount: 250,
    method: 'Card',
    reference: 'PAY_12345',
    createdAt: new Date()
  },
  {
    _id: 'payment-2',
    userId: 'test-customer-id',
    userPolicyId: 'user-policy-1',
    amount: 180,
    method: 'Bank Transfer',
    reference: 'PAY_12346',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  }
];

// Test endpoints
app.get('/api/v1/customers/ping', (req, res) => {
  console.log('Ping endpoint called');
  res.json({ success: true, message: 'Server is running!' });
});

app.get('/api/v1/customers/hello', (req, res) => {
  console.log('Hello endpoint called');
  res.json({ success: true, message: 'Hello from customer API!' });
});

app.get('/api/v1/customers/test', (req, res) => {
  console.log('Test endpoint called');
  res.json({ success: true, message: 'Customer API test successful!' });
});

// Customer API endpoints
app.get('/api/v1/customers/policies', (req, res) => {
  console.log('Get available policies called');
  res.json({
    success: true,
    message: 'Available policies retrieved successfully',
    policies: mockPolicies
  });
});

app.get('/api/v1/customers/mypolicies', (req, res) => {
  console.log('Get my policies called');
  res.json({
    success: true,
    message: 'User policies retrieved successfully',
    policies: mockUserPolicies
  });
});

app.get('/api/v1/customers/payments', (req, res) => {
  console.log('Get payment history called');
  res.json({
    success: true,
    message: 'Payment history retrieved successfully',
    payments: mockPayments
  });
});

app.post('/api/v1/customers/purchase', (req, res) => {
  console.log('Purchase policy called with data:', req.body);
  res.json({
    success: true,
    message: 'Policy purchased successfully',
    userPolicy: {
      _id: 'new-user-policy-id',
      userId: 'test-customer-id',
      policyProductId: req.body.policyProductId,
      startDate: req.body.startDate,
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'Pending',
      nominee: req.body.nominee
    }
  });
});

app.post('/api/v1/customers/pay', (req, res) => {
  console.log('Make payment called with data:', req.body);
  res.json({
    success: true,
    message: 'Payment processed successfully',
    payment: {
      _id: 'new-payment-id',
      userId: 'test-customer-id',
      userPolicyId: req.body.userPolicyId,
      amount: req.body.amount,
      method: req.body.method,
      reference: req.body.reference || `PAY_${Date.now()}`,
      createdAt: new Date()
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test Customer API Server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /api/v1/customers/ping`);
  console.log(`   GET  /api/v1/customers/hello`);
  console.log(`   GET  /api/v1/customers/test`);
  console.log(`   GET  /api/v1/customers/policies`);
  console.log(`   GET  /api/v1/customers/mypolicies`);
  console.log(`   GET  /api/v1/customers/payments`);
  console.log(`   POST /api/v1/customers/purchase`);
  console.log(`   POST /api/v1/customers/pay`);
});