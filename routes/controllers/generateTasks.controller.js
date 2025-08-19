// generateTasks.controller.js
// Responses API + function calling (request style) with robust extraction for function_call

const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/generateTasks
 * Body: { taskPrompt: string, taskPromptSchema: object, assets: [{ assetId, assetName }] }
 */
const generateTasks = async (req, res, next) => {
  try {
    const { taskPrompt, assets, taskPromptSchema } = req.body || {};
    console.log(`generateTasks, body: ${JSON.stringify(req.body)}`);

    if (!Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({
        message: "'assets' must be a non-empty array of { assetId, assetName }",
      });
    }
    if (!taskPromptSchema || typeof taskPromptSchema !== 'object') {
      return res.status(400).json({
        message: "'taskPromptSchema' must be a valid JSON Schema object",
      });
    }

    // Wrap your array schema so the function returns a single object
    const wrappedParameters = {
      type: "object",
      properties: {
        plan: taskPromptSchema
      },
      required: ["plan"],
      additionalProperties: false
    };

    const instructions =
      "You are a precise maintenance planner. Only respond via the provided function.";

    const input =
      `${taskPrompt || "Create a maintenance plan for each asset."}\n\n` +
      `Assets:\n${JSON.stringify(assets, null, 2)}`;

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini", // or gpt-4.1 / gpt-4o
      instructions,
      input, // plain string
      tools: [
        {
          type: "function",
          name: "return_task_plan",
          description: "Return the maintenance task plan in the required JSON structure.",
          parameters: wrappedParameters
        }
      ],
      tool_choice: { type: "function", name: "return_task_plan" },
      parallel_tool_calls: false,
      max_output_tokens: 2048
    });

    const out = resp?.output ?? [];

    // --- Robust extractor: supports function_call (preferred) and tool_call (legacy) ---
    const findFunctionCall = (items, expectedName) => {
      for (const item of items) {
        // A) Top-level function_call
        if (item?.type === "function_call" && item?.name === expectedName) {
          return item;
        }
        // B) Legacy/alternate: top-level tool_call
        if (item?.type === "tool_call" && item?.tool_name === expectedName) {
          return { ...item, arguments: item.arguments, name: item.tool_name };
        }
        // C) Nested in a message's content
        if (item?.type === "message" && Array.isArray(item?.content)) {
          for (const part of item.content) {
            if (part?.type === "function_call" && part?.name === expectedName) {
              return part;
            }
            if (part?.type === "tool_call" && part?.tool_name === expectedName) {
              return { ...part, arguments: part.arguments, name: part.tool_name };
            }
          }
        }
      }
      return null;
    };

    const fc = findFunctionCall(out, "return_task_plan");
    if (!fc) {
      const preview = JSON.stringify(out).slice(0, 1200);
      console.error("No function_call found. Output preview:", preview, "...(truncated)");
      return res.status(502).json({ message: "Model did not call the expected function." });
    }

    let parsedArgs;
    try {
      parsedArgs = JSON.parse(fc.arguments || "{}");
    } catch {
      return res.status(502).json({ message: "Failed to parse function call arguments as JSON." });
    }

    const plan = parsedArgs?.plan;
    if (!Array.isArray(plan)) {
      return res.status(502).json({ message: "Function result did not include a valid 'plan' array." });
    }

    return res.status(200).json(plan);
  } catch (err) {
    next(err);
  }
};

module.exports = { generateTasks };
