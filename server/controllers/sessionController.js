const { validationResult } = require('express-validator');
const SessionRecord = require('../models/Session');

const mongoose = require('mongoose');
const GUEST_SESSIONS = [];

async function list(req, res) {
  if (mongoose.connection.readyState !== 1) {
    return res.json([...GUEST_SESSIONS].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }
  const sessions = await SessionRecord.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.json(sessions);
}

async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const payload = {
    userId: req.user.id,
    type: req.body.type === 'mock' ? 'mock' : 'live',
    durationSeconds: Number(req.body.durationSeconds) || 0,
    wordsDetected: Number(req.body.wordsDetected) || 0,
    role: req.body.role || '',
    transcript: req.body.transcript || '',
    interviewerText: req.body.interviewerText || '',
    simplifiedText: req.body.simplifiedText || '',
    metadata: req.body.metadata || {},
    createdAt: new Date().toISOString(),
    _id: `mock_${Date.now()}`
  };

  if (mongoose.connection.readyState !== 1) {
    GUEST_SESSIONS.push(payload);
    return res.status(201).json(payload);
  }

  const doc = await SessionRecord.create(payload);
  res.status(201).json(doc);
}

async function getOne(req, res) {
  if (mongoose.connection.readyState !== 1) {
    const doc = GUEST_SESSIONS.find(s => s._id === req.params.id);
    return doc ? res.json(doc) : res.status(404).json({ message: 'Not found' });
  }
  const doc = await SessionRecord.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
}

async function update(req, res) {
  if (mongoose.connection.readyState !== 1) {
    const index = GUEST_SESSIONS.findIndex(s => s._id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Not found' });
    const allowed = ['durationSeconds', 'wordsDetected', 'transcript', 'interviewerText', 'simplifiedText', 'metadata', 'role'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) GUEST_SESSIONS[index][key] = req.body[key];
    }
    return res.json(GUEST_SESSIONS[index]);
  }
  const doc = await SessionRecord.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  const allowed = ['durationSeconds', 'wordsDetected', 'transcript', 'interviewerText', 'simplifiedText', 'metadata', 'role'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) doc[key] = req.body[key];
  }
  await doc.save();
  res.json(doc);
}
module.exports = { list, create, getOne, update };
