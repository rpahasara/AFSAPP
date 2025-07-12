const mongoose = require('mongoose');
const Counter = require('./counter');

const OrderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  uniqueId: { type: String, unique: true, sparse: true },
  dateOfSurvey: { type: Date, required: true },
  surveyors: { type: [String], required: true },
  confinedSpaceNameOrId: { type: String, required: true },
  building: { type: String, required: true },
  locationDescription: { type: String },
  confinedSpaceDescription: { type: String },
  confinedSpace: { type: Boolean, required: true },
  permitRequired: { type: Boolean, required: true },
  entryRequirements: { type: String },
  atmosphericHazard: { type: Boolean, required: true },
  atmosphericHazardDescription: { type: String },
  engulfmentHazard: { type: Boolean, required: true },
  engulfmentHazardDescription: { type: String },
  configurationHazard: { type: Boolean, required: true },
  configurationHazardDescription: { type: String },
  otherRecognizedHazards: { type: Boolean, required: true },
  otherHazardsDescription: { type: String },
  ppeRequired: { type: Boolean, required: true },
  ppeList: { type: String },
  forcedAirVentilationSufficient: { type: Boolean, required: true },
  dedicatedContinuousAirMonitor: { type: Boolean, required: true },
  warningSignPosted: { type: Boolean, required: true },
  otherPeopleWorkingNearSpace: { type: Boolean, required: true },
  canOthersSeeIntoSpace: { type: Boolean, required: true },
  contractorsEnterSpace: { type: Boolean, required: true },
  numberOfEntryPoints: { type: Number },
  notes: { type: String },
  pictures: { type: [String] }
});

// Pre-save hook to generate a formatted sequential ID (0001, 0002, etc.)
OrderSchema.pre('save', async function(next) {
  const doc = this;
  
  // Only generate uniqueId if it's not already set
  if (!doc.uniqueId) {
    try {
      // Find and update the counter document, or create if it doesn't exist
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'orderId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      
      // Format the sequence number to have leading zeros (4 digits: 0001, 0002, etc.)
      doc.uniqueId = counter.seq.toString().padStart(4, '0');
      next();
    } catch (error) {
      console.error('Error generating uniqueId:', error);
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('Order', OrderSchema);
