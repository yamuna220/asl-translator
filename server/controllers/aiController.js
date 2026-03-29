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

async function mockAI(system, userMessage) {
  console.log('[DEV] API Key missing or invalid, using Mock AI fallback.');
  const sys = (system || '').toLowerCase();
  const usr = (userMessage || '').toLowerCase();
  
  if (sys.includes('simplify') || usr.includes('simplify')) {
    return userMessage.length > 50 
      ? `Simple: ${userMessage.slice(0, 45)}... (Simplified version)` 
      : `Simple: ${userMessage}`;
  }
  
  if (sys.includes('json') || sys.includes('evaluate')) {
    return JSON.stringify({
      score: 8,
      bullets: [
        'Great clarity in your signs today.',
        'Try to expand on your technical examples for a higher score.'
      ]
    });
  }

  if (usr.includes('generate') || usr.includes('question')) {
    const qs = [
      'Tell me about a time you had to learn a new skill quickly?',
      'How do you handle conflict in a team environment?',
      'What is your greatest professional achievement?',
      'Describe a situation where you had to work under pressure.',
      'Why do you want to work for our company?'
    ];
    return qs[Math.floor(Math.random() * qs.length)];
  }

  return 'Could you please provide more details? (Mock response)';
}

async function runAI(system, userMessage) {
  if (OPENAI_KEY) {
    try { return await openaiChat(system, userMessage); } catch (e) { console.error('OpenAI Error:', e.message); }
  }
  if (ANTHROPIC_KEY) {
    try { return await anthropicChat(system, userMessage); } catch (e) { console.error('Anthropic Error:', e.message); }
  }
  return mockAI(system, userMessage);
}
async function simplify(req, res) {
  console.log('[AI] Simplify Request Received:', req.body.question?.slice(0, 30));
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
    console.warn(`[AI] Simplify Failure: ${e.message}`);
    res.status(200).json({
      simplified: req.body.question || 'Could you repeat that more simply?',
      error: e.message,
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
    const wordList = Array.isArray(words) ? words.join(', ') : String(words || '');
    const system =
      'You evaluate short ASL-signed interview answers. Respond in JSON only with keys: score (number 0-10), bullets (array of exactly 2 strings). No markdown.';
    const user = `The candidate signed these words in an ASL interview response: [${wordList}]. Role context: ${role || 'general'}. Evaluate the response for relevance, completeness, and clarity. Give a score out of 10 and 2 bullet points of constructive feedback in simple language.`;
    
    let raw = await runAI(system, user);
    let parsed = { score: 5, bullets: ['Response evaluation pending.', 'Continue practicing your signs.'] };
    
    try {
      // Robust JSON detection in case AI adds markdown
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : raw;
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.warn('AI JSON Parse Failed, using regex fallback:', parseError.message);
      const scoreMatch = raw.match(/score["']?\s*[:=]\s*([\d.]+)/i);
      if (scoreMatch) parsed.score = Math.min(10, Math.max(0, parseFloat(scoreMatch[1])));
      
      // Try to find bullets or just use the raw text split
      const bulletMatch = raw.match(/bullets?["']?\s*[:=]\s*\[([\s\S]*?)\]/i);
      if (bulletMatch) {
         try { parsed.bullets = JSON.parse(`[${bulletMatch[1]}]`); } catch { /* ignore */ }
      }
    }

    res.json({
      score: typeof parsed.score === 'number' ? parsed.score : Number(parsed.score) || 0,
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 2) : parsed.bullets ? [String(parsed.bullets)] : [],
      raw: process.env.NODE_ENV === 'production' ? undefined : raw,
    });
  } catch (e) {
    console.error('Feedback Error:', e);
    res.status(200).json({ 
      score: 5, 
      bullets: ['AI service currently busy.', 'Please try again in a moment.'],
      error: e.message 
    });
  }
}

async function generateQuestion(req, res) {
  console.log('[AI] Generate Question Received:', req.body.role, req.body.difficulty);
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
    console.warn(`[AI] GenerateFailure: ${e.message}`);
    // Return a guaranteed mock question on any catastrophic error
    const fallbackQs = [
      'Tell me about a time you had to learn a new skill quickly?',
      'How do you handle conflict in a team environment?',
      'What is your greatest professional achievement?'
    ];
    res.status(200).json({ 
      question: fallbackQs[Math.floor(Math.random() * fallbackQs.length)],
      error: e.message 
    });
  }
}

module.exports = { simplify, feedback, generateQuestion };
