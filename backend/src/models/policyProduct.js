import mongoose from 'mongoose';

const PolicyProductSchema = new mongoose.Schema({
  assignedAgentName: {
    type: String,
    default: null
  },
  assignedAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  termMonths: {
    type: Number,
    required: true
  },
  tenureMonths: {
    type: Number,
    required: true
  },
  minSumInsured: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Approved', 'pending', 'approved'],
    default: 'Active',
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('PolicyProduct', PolicyProductSchema);

