import express from 'express';
import adminController from '../controllers/adminController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
const adminAuth = [authenticateToken, authorizeRoles('Admin')];

// Policy management routes
router.post('/addpolicies', adminController.addPolicy); // Temporarily remove auth for testing
router.get('/getpolicies', adminAuth, adminController.getPolicies);
router.put('/updatepolicies/:id', adminAuth, adminController.updatePolicy);
router.delete('/deletepolicies/:id', adminAuth, adminController.deletePolicy);

// RESTful Policy Management Routes
router.get('/policies', adminAuth, adminController.getAllPolicies);
router.get('/policies/:id', adminAuth, adminController.getPolicyById);
router.post('/policies', adminController.createPolicy); // Temporarily remove auth for testing
router.put('/policies/:id', adminAuth, adminController.updatePolicyById);
router.delete('/policies/:id', adminAuth, adminController.deletePolicyById);

// User and agent management
router.get('/userpolicies', adminAuth, adminController.allUserPolicies);
router.get('/payments', adminAuth, adminController.allPayments);
router.post('/createagent', adminAuth, adminController.createAgent);
router.post('/assignpolicy', adminAuth, adminController.assignPolicyToAgent);
router.post('/assignclaim', adminAuth, adminController.assignClaimToAgent);
router.get('/customerdetails', adminAuth, adminController.allCustomerData);
router.get('/agents', adminAuth, adminController.allAgents);

// Claims management
router.get('/allclaims', adminAuth, adminController.allClaims);
router.get('/claim/:id', adminAuth, adminController.getClaimById);
router.post('/approveclaim', adminAuth, adminController.approveClaim);

// Policy approval workflow
router.get('/pendingpolicies', adminController.getPendingPolicies); // Temporarily remove auth for testing
router.get('/approvedpolicies', adminController.getApprovedPolicies); // Temporarily remove auth for testing
router.post('/approvepolicy', adminController.approvePolicy); // Temporarily remove auth for testing

// Test endpoints (no auth required)
router.get('/test-pending', adminController.getPendingPolicies);
router.post('/test-approve', adminController.approvePolicy);

// Audit and reporting
router.get('/audit', adminAuth, adminController.getAuditLogs);
router.get('/summary', adminAuth, adminController.getSummaryKPIs);

export default router;
