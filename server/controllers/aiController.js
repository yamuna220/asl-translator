const axios = require('axios');
const { validationResult } = require('express-validator');

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function openaiChat(system, user) {
  if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY not configured');
  const { data } = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      max_tokens: 500,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function anthropicChat(system, user) {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not configured');
  const { data } = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
    },
    {
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );
  const block = data.content?.find((b) => b.type === 'text');
  return block?.text?.trim() || '';
}

async function runAI(system, userMessage) {
  if (OPENAI_KEY) {
    return openaiChat(system, userMessage);
  }
  if (ANTHROPIC_KEY) {
    return anthropicChat(system, userMessage);
  }
  throw new Error('No AI API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
}

async function simplify(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { question } = req.body;
    const system =
      'You are an accessibility assistant. Rewrite the following interview question in simple, clear language using short sentences and basic vocabulary suitable for someone whose primary language is ASL. Remove jargon. Use maximum 2 sentences.';
    const simplified = await runAI(system, question);
    res.json({ simplified });
  } catch (e) {
    console.error(e);
    res.status(502).json({
      message: e.message || 'AI request failed',
      fallback: req.body.question,
    });
  }
}

async function feedback(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { words, role } = req.body;
    const wordList = Array.isArray(words) ? words.join(', ') : String(words);
    const system =
      'You evaluate short ASL-signed interview answers. Respond in JSON only with keys: score (number 0-10), bullets (array of exactly 2 strings). No markdown.';
    const user = `The candidate signed these words in an ASL interview response: [${wordList}]. Role context: ${role || 'general'}. Evaluate the response for relevance, completeness, and clarity. Give a score out of 10 and 2 bullet points of constructive feedback in simple language.`;
    const raw = await runAI(system, user);
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const scoreMatch = raw.match(/score["']?\s*[:=]\s*([\d.]+)/i);
      const score = scoreMatch ? Math.min(10, Math.max(0, parseFloat(scoreMatch[1]))) : 5;
      parsed = { score, bullets: [raw.slice(0, 120), raw.slice(120, 240) || 'Keep practicing clear signs.'] };
    }
    res.json({
      score: typeof parsed.score === 'number' ? parsed.score : Number(parsed.score) || 0,
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 2) : [],
      raw,
    });
  } catch (e) {
    console.error(e);
    res.status(502).json({ message: e.message || 'AI feedback failed' });
  }
}

async function generateQuestion(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { role, difficulty } = req.body;
    const system =
      'You write one concise behavioral or technical interview question only. Output plain text, no quotes, one question ending with ?';
    const user = `Generate exactly one interview question for role: ${role}. Difficulty: ${difficulty}.`;
    const question = await runAI(system, user);
    res.json({ question });
  } catch (e) {
    console.error(e);
    res.status(502).json({ message: e.message || 'AI generate failed' });
  }
}

module.exports = { simplify, feedback, generateQuestion };
