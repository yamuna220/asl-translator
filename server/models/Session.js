const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['live', 'mock'], required: true },
    durationSeconds: { type: Number, default: 0 },
    wordsDetected: { type: Number, default: 0 },
    role: { type: String, default: '' },
    transcript: { type: String, default: '' },
    interviewerText: { type: String, default: '' },
    simplifiedText: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.models.SessionRecord || mongoose.model('SessionRecord', sessionSchema);
