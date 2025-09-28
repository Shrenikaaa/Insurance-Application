import express from 'express';
import customerController from '../controllers/customerController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

console.log('=== CUSTOMER ROUTES MODULE LOADED ===');

const router = express.Router();
const customerAuth = [authenticateToken, authorizeRoles('Customer')];

console.log('=== REGISTERING CUSTOMER ROUTES ===');

// Public test endpoint (no authentication required)
router.get('/ping', (req, res) => {
  console.log('=== CUSTOMER PING ENDPOINT HIT ===');
  res.json({ success: true, message: 'Customer API is reachable!', timestamp: new Date() });
});

// Even simpler test
router.get('/hello', (req, res) => {
  console.log('=== CUSTOMER HELLO ENDPOINT HIT ===');
  res.send('Hello from customer routes!');
});

router.get('/policies', customerAuth, customerController.viewPolicies);
router.post('/purchase', customerAuth, customerController.purchasePolicy);
router.post('/pay', customerAuth, customerController.makePayment);
router.get('/payments', customerAuth, customerController.paymentHistory);
router.get('/mypolicies', customerAuth, customerController.myPolicies);
router.post('/raiseclaim', customerAuth, customerController.raiseClaim);
router.get('/myclaims', customerAuth, customerController.getMyClaims);
router.post('/cancelpolicy', customerAuth, customerController.cancelPolicy);
// Get a policy by its ID
router.get('/policy/:id', customerAuth, customerController.getPolicyById);
// Get details for a specific claim by claimId
router.get('/claim/:id', customerAuth, customerController.getClaimById);
// Get approved policies for the customer
router.get('/approvedpolicies', customerAuth, customerController.getApprovedPolicies);
// Get policies with completed payments (claimable policies)
router.get('/claimablepolicies', customerAuth, customerController.getClaimablePolicies);

console.log('=== CUSTOMER ROUTES REGISTERED SUCCESSFULLY ===');

export default router;
