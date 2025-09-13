// backend/src/services/openaiTasks.service.js
const OpenAI = require('openai');

function oneOf(value, allowed, fallback) {
  const v = String(value || '').toLowerCase();
  return allowed.includes(v) ? v : fallback;
}

function normalizeTask(t) {
  return {
    taskName: t.taskName || t.name || 'Untitled Task',
    description: t.description || '',
    priority: oneOf(t.priority, ['1','2','3'], '2'),
    frequency: t.frequency || '',
    difficulty: oneOf(t.difficulty, ['easy','medium','hard','very hard'], 'medium'),
    duration: t.duration || '',
    who: t.who === 'professional' ? 'professional' : 'owner',
    steps: Array.isArray(t.steps) ? t.steps.filter(Boolean).map(String) : [],
    tools: Array.isArray(t.tools) ? t.tools.filter(Boolean).map(String) : [],

    // NEW: pass-through optional manufacturer citation
    manufacturerSnippet: t.manufacturerSnippet || '',
    manufacturerSourceUrl: t.manufacturerSourceUrl || '',
    manufacturerDocTitle: t.manufacturerDocTitle || '',
  };
}

async function callOpenAIForTasks({ prompt, asset }) {
  const apiKey = process.env.OPENAI_API_KEY;
    if (process.env.NODE_ENV !== 'production') {
    console.log('[openaiTasks] asset fields:', {
      id: asset?._id || asset?.id,
      assetName: asset?.assetName,
      assetModelNumber: asset?.assetModelNumber
    });
  }

  // Mock for local dev without a key
  if (!apiKey) {
    return [{
      taskName: `Inspect ${asset?.assetName || 'asset'}`,
      description: 'General inspection to ensure good condition.',
      priority: '2',
      frequency: 'annually',
      difficulty: 'easy',
      duration: '30–60 min',
      who: 'owner',
      steps: ['Visual check', 'Tighten loose parts', 'Record findings'],
      tools: ['Screwdriver', 'Cleaning cloth'],
    }];
  }

  const client = new OpenAI({ apiKey });
  const sys = [
    'Return ONLY valid JSON for a list of tasks (no markdown, no prose).',
    'Each task object MUST include:',
    'taskName, description, priority(one of 1|2|3), frequency, difficulty(one of easy|medium|hard|very hard),',
    'duration, who(one of owner|professional), steps(array of strings), tools(array of strings).',
    'If an asset includes a specific model number (e.g., WA54R7200AV/US), TAILOR the tasks to that exact model or compatible series.',
    'When you rely on OEM/manufacturer documentation SPECIFIC to that model/series, add the following OPTIONAL fields:',
    'manufacturerSnippet (<= 80 words, short verbatim), manufacturerSourceUrl (public OEM URL), manufacturerDocTitle.',
    'Do NOT invent URLs or quotes. If unsure, omit those three fields.',
    'Keep tasks safe and feasible for a homeowner; suggest "professional" for risky work.'
  ].join(' ');


 const user = `Given this asset and prompt, produce a MODEL-SPECIFIC task list when possible.

ASSET:
${JSON.stringify(asset, null, 2)}

PROMPT:
${String(prompt || '')}
`;

  const resp = await client.chat.completions.create({
    model: process.env.OPENAI_TASKS_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: user }
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const content = resp?.choices?.[0]?.message?.content || '{}';
  let parsed = [];
  try {
    const obj = JSON.parse(content);
    parsed = Array.isArray(obj) ? obj : (obj.tasks || []);
    if (!Array.isArray(parsed)) parsed = [];
  } catch (_) {
    parsed = [];
  }
  return parsed.map(normalizeTask);
}

module.exports = { callOpenAIForTasks };
