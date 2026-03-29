const { validationResult } = require('express-validator');
const SessionRecord = require('../models/Session');

async function list(req, res) {
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
  const {
    type,
    durationSeconds,
    wordsDetected,
    role,
    transcript,
    interviewerText,
    simplifiedText,
    metadata,
  } = req.body;
  const doc = await SessionRecord.create({
    userId: req.user.id,
    type: type === 'mock' ? 'mock' : 'live',
    durationSeconds: Number(durationSeconds) || 0,
    wordsDetected: Number(wordsDetected) || 0,
    role: role || '',
    transcript: transcript || '',
    interviewerText: interviewerText || '',
    simplifiedText: simplifiedText || '',
    metadata: metadata || {},
  });
  res.status(201).json(doc);
}

async function getOne(req, res) {
  const doc = await SessionRecord.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
}

async function update(req, res) {
  const doc = await SessionRecord.findOne({ _id: req.params.id, userId: req.user.id });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  const allowed = [
    'durationSeconds',
    'wordsDetected',
    'transcript',
    'interviewerText',
    'simplifiedText',
    'metadata',
    'role',
  ];
  for (const key of allowed) {
    if (req.body[key] !== undefined) doc[key] = req.body[key];
  }
  await doc.save();
  res.json(doc);
}

module.exports = { list, create, getOne, update };
