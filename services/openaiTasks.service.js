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
    who: oneOf(t.who, ['owner','professional'], 'owner'),
    steps: Array.isArray(t.steps) ? t.steps : [],
    tools: Array.isArray(t.tools) ? t.tools : [],
  };
}

async function callOpenAIForTasks({ prompt, asset }) {
  const apiKey = process.env.OPENAI_API_KEY;

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
    'Return ONLY valid JSON for a list of tasks.',
    'Each task has keys:',
    'taskName, description, priority(one of 1|2|3),',
    'frequency, difficulty(one of easy|medium|hard|very hard),',
    'duration, who(one of owner|professional), steps(array), tools(array).'
  ].join(' ');

  const user = `Given this asset and prompt, produce a task list.
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
