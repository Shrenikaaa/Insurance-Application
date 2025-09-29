import mongoose from 'mongoose';

const NomineeSchema = new mongoose.Schema({
  name: String,
  relation: String
});

const UserPolicySchema = new mongoose.Schema({
  verificationType: {
    type: String,
    enum: ['Agent', 'Admin', 'None'],
    default: 'None'
  },
  userId: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
},
  policyProductId: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PolicyProduct', 
    required: true 
},
  startDate: 
  { 
    type: Date, 
    required: true 
},
  endDate: 
  { 
    type: Date, 
    required: false  // Made optional to allow backend calculation
},
  premiumPaid: 
  { 
    type: Number, 
    default: 0 
},
  status: 
  { 
    type: String, 
    enum: ['Pending','Approved','Cancelled','Expired','Claimed'], 
    default: 'Pending' 
  },
  approved: {
    type: Boolean,
    default: false
  },
  assignedAgentId: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Agent' 
},
  nominee: 
  { 
    type: NomineeSchema
},
  createdAt:
    { type: Date, 
      default: Date.now 
    }
});

export default mongoose.model('UserPolicy', UserPolicySchema);

