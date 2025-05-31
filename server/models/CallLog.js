const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  roomId: String,
  participants: [String],
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
});

module.exports = mongoose.model('CallLog', callLogSchema);
