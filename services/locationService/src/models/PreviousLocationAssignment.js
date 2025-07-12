const mongoose = require('mongoose');

const PreviousLocationAssignmentSchema = new mongoose.Schema({
  technicianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  // Store snapshot of location data at the time of closure
  locationSnapshot: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      default: ''
    }
  },
  assignedDate: {
    type: Date,
    required: true
  },
  closedDate: {
    type: Date,
    default: Date.now
  },
  workDuration: {
    type: Number, // in milliseconds
    required: true
  },
  totalWorkOrders: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
PreviousLocationAssignmentSchema.index({ technicianId: 1, closedDate: -1 });

// Check if model already exists to avoid re-compilation error
const PreviousLocationAssignment = mongoose.models.PreviousLocationAssignment || 
  mongoose.model('PreviousLocationAssignment', PreviousLocationAssignmentSchema);

module.exports = PreviousLocationAssignment;
