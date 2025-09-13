// generateTasks.controller.js
// Adds detailed step-by-step logging with a correlation id and timings.
// Dumps full function-call arguments in chunks on JSON parse failure.

const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/generateTasks
 * Body: { taskPrompt: string, taskPromptSchema: object, assets: [{ assetId?, id?, assetName }] }
 * NOTE: Frontend now sends ONE asset per request and strips Mongo `_id`.
 *       The model should return: { plan: [ { assetId, assetName, tools, tasks: [...] } ] }
 */
const generateTasks = async (req, res, next) => {
  const reqId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const t0 = Date.now();
  const log = (...args) => console.log(`[generateTasks][${reqId}]`, ...args);
  const warn = (...args) => console.warn(`[generateTasks][${reqId}]`, ...args);
  const error = (...args) => console.error(`[generateTasks][${reqId}]`, ...args);

  // Helper: log very large strings as standalone console output to avoid Node inspector truncation
  const logLongString = (label, s, chunkSize = 8000) => {
    const str = typeof s === "string" ? s : String(s ?? "");
    log(`${label}: length=${str.length}`);
    for (let i = 0; i < str.length; i += chunkSize) {
      const chunk = str.slice(i, i + chunkSize);
      // IMPORTANT: chunk is logged as a raw string (not inside an object) to avoid truncation
      console.log(`[generateTasks][${reqId}] ${label} chunk ${i}-${i + chunk.length} >>>\n${chunk}\n<<< END CHUNK`);
    }
  };

  try {
    log("START request", { headersKeys: Object.keys(req.headers || {}), ip: req.ip, path: req.originalUrl });
    const { taskPrompt, assets, taskPromptSchema } = req.body || {};
    log("BODY", {
      taskPromptPreview: typeof taskPrompt === "string" ? taskPrompt.slice(0, 120) : typeof taskPrompt,
      assetsCount: Array.isArray(assets) ? assets.length : null,
      hasSchema: !!taskPromptSchema
    });

    // Strict validation
    if (!Array.isArray(assets) || assets.length === 0) {
      warn("VALIDATION FAIL: 'assets' missing or empty");
      return res.status(400).json({
        message: "'assets' must be a non-empty array of { id (string|number), assetName }",
      });
    }
    if (!taskPromptSchema || typeof taskPromptSchema !== "object") {
      warn("VALIDATION FAIL: 'taskPromptSchema' missing or not an object");
      return res.status(400).json({ message: "'taskPromptSchema' is required and must be an object" });
    }

    // Normalize asset shape for the model: ensure assetId is the app id (string)

    const normalizedAssets = assets.map((a) => {
      const id = a?.assetId ?? a?.id;
      if (id == null || !a?.assetName) {
        throw new Error("Each asset must include 'id' (or 'assetId') and 'assetName'.");
      }
      return {
        assetId: String(id),
        assetName: String(a.assetName),
        ...(a.assetModelNumber ? { assetModelNumber: String(a.assetModelNumber) } : {}), // ← NEW
      };
    });

    // Wrap the provided schema under the function parameter as 'plan'
    const wrappedParameters = {
      type: "object",
      properties: {
        plan: taskPromptSchema
      },
      required: ["plan"],
      additionalProperties: false
    };
    log("SCHEMA prepared", { required: wrappedParameters.required, hasPlanProp: !!wrappedParameters.properties?.plan });

    const instructions = "You are a precise maintenance planner. Only respond via the provided function.";
    const input =
      `${taskPrompt || "Create a maintenance plan for each asset."}\n\n` +
      `Assets:\n${JSON.stringify(normalizedAssets, null, 2)}`;

    // Call OpenAI
    const tCall = Date.now();
    log("OPENAI call -> responses.create init", {
      model: "gpt-4.1-mini",
      inputPreview: input.slice(0, 240),
      tools: ["return_task_plan"]
    });

    let resp;
    try {
      resp = await openai.responses.create({
        model: "gpt-4.1-mini", // or gpt-4.1 / gpt-4o
        instructions,
        input,
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
      console.log(`Tasks: ${JSON.stringify(resp)}`)
    } catch (apiErr) {
      const latency = Date.now() - tCall;
      error("OPENAI error during responses.create", {
        latencyMs: latency,
        apiErrMessage: apiErr?.message,
        apiErrName: apiErr?.name,
        apiErrCode: apiErr?.code
      });
      return res.status(502).json({ message: "Upstream model error", detail: apiErr?.message || String(apiErr) });
    }

    const callLatency = Date.now() - tCall;
    log("OPENAI response received", {
      latencyMs: callLatency,
      hasOutput: Array.isArray(resp?.output),
      outputLen: Array.isArray(resp?.output) ? resp.output.length : null
    });

    // Optional: dump full OpenAI response when DEBUG_OPENAI_FULL=1
    if (process.env.DEBUG_OPENAI_FULL === "1") {
      try {
        const full = JSON.stringify(resp);
        logLongString("OPENAI full response JSON", full);
      } catch {
        warn("Could not JSON.stringify full OpenAI response");
      }
    }

    const out = resp?.output ?? [];
    // Compact view of output structure
    try {
      const structure = out.map((it, i) => ({
        i,
        type: it?.type ?? it?.item_type ?? null,
        name: it?.name ?? it?.tool_name ?? null,
        hasArgs: !!it?.arguments || !!(it?.content && it.content.some(c => c?.arguments))
      }));
      log("OUTPUT STRUCTURE", structure);
    } catch {
      // non-fatal
    }

    // Robust extractor for function/tool calls
    const findFunctionCall = (items, expectedName) => {
      for (const item of items) {
        if (item?.type === "function_call" && item?.name === expectedName) return item;
        if (item?.type === "tool_call" && item?.tool_name === expectedName) {
          return { ...item, arguments: item.arguments, name: item.tool_name };
        }
        if (item?.type === "message" && Array.isArray(item?.content)) {
          for (const part of item.content) {
            if (part?.type === "function_call" && part?.name === expectedName) return part;
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
      warn("NO FUNCTION CALL FOUND", { outputPreview: `${preview}...(truncated)` });
      return res.status(502).json({ message: "Model did not call the expected function." });
    }
    log("FUNCTION CALL found", {
      name: fc?.name,
      argsLen: typeof fc?.arguments === "string" ? fc.arguments.length : null
    });

    let parsedArgs;
    try {
      parsedArgs = JSON.parse(fc.arguments || "{}");
      log("FUNCTION ARGUMENTS parsed OK", { keys: Object.keys(parsedArgs || {}) });
    } catch (parseErr) {
      warn("ARGUMENT PARSE FAIL", { err: String(parseErr) });

      // Dump the full raw arguments (no truncation), in chunks
      logLongString("FUNCTION_CALL.arguments (raw)", fc?.arguments);

      // Quick start/end views for scanning
      const argStr = String(fc?.arguments ?? "");
      log("ARG START/END", {
        start200: argStr.slice(0, 200),
        end200: argStr.slice(-200)
      });

      return res.status(502).json({ message: "Failed to parse function arguments as JSON." });
    }

    const plan = parsedArgs?.plan;
    if (!Array.isArray(plan)) {
      warn("VALIDATION FAIL: plan not an array", { typeofPlan: typeof plan });
      return res.status(502).json({ message: "Function result did not include a valid 'plan' array." });
    }

    // Return the plan directly (frontend aggregates per-asset)
    const tEnd = Date.now();
    log("SUCCESS", { planLength: plan.length, totalLatencyMs: tEnd - t0 });
    return res.status(200).json(plan);

  } catch (err) {
    error("UNCAUGHT ERROR", { message: err?.message, stack: err?.stack });
    return next(err);
  }
};

module.exports = { generateTasks };
