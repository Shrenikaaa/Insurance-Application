import express from 'express';
import adminController from '../controllers/adminController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Simple test route to verify admin routes are working
router.get('/test', (req, res) => {
    console.log('Admin test route hit');
    res.json({ success: true, message: 'Admin routes working' });
});

// Assignment routes without auth for testing (bypassing middleware for development)
router.post('/assignpolicy', (req, res, next) => {
    console.log('Assignment policy route hit with body:', req.body);
    // Skip authentication for development testing
    req.user = { userId: 'admin', role: 'Admin' }; // Mock admin user
    adminController.assignPolicyToAgent(req, res);
});

router.post('/assignclaim', (req, res, next) => {
    console.log('Assignment claim route hit with body:', req.body);
    // Skip authentication for development testing  
    req.user = { userId: 'admin', role: 'Admin' }; // Mock admin user
    adminController.assignAgentToClaim(req, res);
});

export default router;
