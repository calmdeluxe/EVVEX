import axios from 'axios';
import { getAppUrl } from './utils';
import { supabase } from '../supabase';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPEN_ROUTER_KEY || import.meta.env.VITE_OPENROUTER_API_KEY;
const SITE_URL = getAppUrl();
const SITE_NAME = 'CalmReader';

export interface AiResponse {
  text: string;
  data?: any;
}

export interface AiRequestOptions {
  systemInstruction?: string;
  responseMimeType?: 'text/plain' | 'application/json';
  model?: string;
  max_tokens?: number;
  userId?: string;
}

const extractErrorMessage = (err: any): string => {
  if (!err) return "Failed to generate AI content.";
  let msg = "";
  const respData = err.response?.data;
  if (typeof respData === "string" && respData.trim()) msg = respData;
  else if (respData?.error) {
    if (typeof respData.error === "string" && respData.error.trim()) msg = respData.error;
    else if (respData.error.message) msg = respData.error.message;
  } else if (respData?.message) msg = respData.message;
  else if (respData?.details) msg = respData.details;
  else msg = err.message || "Failed to generate AI content.";

  if (!msg || msg.trim() === "" || msg.trim() === "." || msg.includes("Details: .")) {
    return "AI generation service is currently busy. Please try again in a moment.";
  }
  if (msg.toLowerCase().includes("user not found")) {
    return "AI service session issue. Please sign in or try again in a moment.";
  }
  return msg;
};

const attemptGenerate = async (prompt: string, options: AiRequestOptions = {}): Promise<AiResponse> => {
  let model = options.model || "google/gemini-2.5-flash";
  if (model === "google/gemini-2.0-flash-001" || model.includes("gemini-2.0-flash")) {
    model = "google/gemini-2.5-flash";
  }
  const systemInstruction = options.systemInstruction || "You are a professional content architect and editor for CalmReader, a swipeable card-based eBook platform.";

  try {
    // Safely extract active user identity and session token
    let token: string | undefined;
    let userId: string | undefined = options.userId;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      token = sessionData?.session?.access_token;
      if (!userId) {
        userId = sessionData?.session?.user?.id;
      }
      if (!token || !userId) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userId) userId = userData?.user?.id;
      }
    } catch (sessionErr) {
      console.warn("[AI Client] Could not resolve Supabase session:", sessionErr);
    }

    if (!userId) {
      userId = "anonymous-reader";
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Call the resilient, secure server-side proxy
    const response = await axios.post("/api/ai/generate", {
      prompt,
      userId: userId || undefined,
      options: {
        ...options,
        userId: userId || undefined,
        model,
        systemInstruction,
        responseMimeType: options.responseMimeType,
        max_tokens: options.max_tokens || 1500
      }
    }, { headers });

    const resData = response.data || {};
    const text = resData.text || resData.choices?.[0]?.message?.content;
    
    if (!text) {
      throw new Error("No text content returned from the AI proxy.");
    }
    
    if (options.responseMimeType === 'application/json') {
      try {
        const cleanedData = cleanAndParseJson(text);
        return { text, data: cleanedData };
      } catch (e: any) {
        console.error("Failed to parse server proxy AI response as JSON:", text, e);
        throw new Error(`JSON parsing failed: ${e.message || e}`);
      }
    }

    return { text };
  } catch (err: any) {
    if (err.response?.status === 429) {
      throw err;
    }
    console.warn("Server-side AI Proxy issue occurred, trying client-side fallback...");
    const apiKey = OPENROUTER_API_KEY;
    if (!apiKey) {
      const serverErr = extractErrorMessage(err);
      throw new Error(`AI Content generation failed: ${serverErr}`);
    }

    try {
      const isFreeModel = model.endsWith(":free") || model === "openrouter/free";
      const referer = isFreeModel ? "https://calmreader.com" : SITE_URL;
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: model,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ],
          response_format: options.responseMimeType === 'application/json' ? { type: "json_object" } : undefined,
          max_tokens: options.max_tokens || 1500
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": referer,
            "X-Title": SITE_NAME,
            "Content-Type": "application/json"
          }
        }
      );

      const text = response.data.choices[0].message.content;
      
      if (options.responseMimeType === 'application/json') {
        try {
          const cleanedData = cleanAndParseJson(text);
          return { text, data: cleanedData };
        } catch (e: any) {
          console.error("Failed to parse client-side fallback AI response as JSON:", text, e);
          throw new Error(`JSON parsing failed: ${e.message || e}`);
        }
      }

      return { text };
    } catch (clientError: any) {
      console.error("Client fallback OpenRouter API Error:", clientError.response?.data || clientError.message);
      throw clientError;
    }
  }
};

export const generateAiContent = async (prompt: string, options: AiRequestOptions = {}): Promise<AiResponse> => {
  let primaryModel = options.model || "google/gemini-2.5-flash";
  if (primaryModel === "google/gemini-2.0-flash-001" || primaryModel.includes("gemini-2.0-flash")) {
    primaryModel = "google/gemini-2.5-flash";
  }

  // Construct fallback model list
  const modelsToTry = [primaryModel];
  if (primaryModel.endsWith(":free") || primaryModel === "openrouter/free") {
    modelsToTry.push("google/gemini-2.0-flash-exp:free");
    modelsToTry.push("google/gemini-2.5-flash");
    modelsToTry.push("openrouter/free");
  } else {
    modelsToTry.push("google/gemini-2.5-flash");
    modelsToTry.push("openrouter/auto");
  }

  const uniqueModels = Array.from(new Set(modelsToTry)).filter(Boolean);
  let lastError: any = null;
  let delay = 2000; // start with 2s

  for (let modelIndex = 0; modelIndex < uniqueModels.length; modelIndex++) {
    const currentModel = uniqueModels[modelIndex];
    const maxRetriesPerModel = 3;

    for (let attempt = 0; attempt < maxRetriesPerModel; attempt++) {
      try {
        const result = await attemptGenerate(prompt, { ...options, model: currentModel });
        return result;
      } catch (err: any) {
        lastError = err;
        const status = err.response?.status || err.status;
        const errMsg = (err.response?.data?.error?.message || err.message || "").toLowerCase();
        
        const isRateLimit =
          status === 429 ||
          errMsg.includes("429") ||
          errMsg.includes("rate limit") ||
          errMsg.includes("too many requests") ||
          errMsg.includes("busy");

        if (isRateLimit) {
          console.warn(`[AI Gen] Rate limited on "${currentModel}". Waiting ${delay / 1000}s and retrying...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, 30000);
          continue;
        } else {
          console.warn(`[AI Gen] Non-rate-limit error on "${currentModel}": ${err.message}. Trying next fallback model...`);
          break;
        }
      }
    }
  }

  const finalStatus = lastError?.response?.status || lastError?.status;
  const finalErrMsg = (lastError?.response?.data?.error?.message || lastError?.message || "").toLowerCase();
  const isFinalRateLimit =
    finalStatus === 429 ||
    finalErrMsg.includes("429") ||
    finalErrMsg.includes("rate limit") ||
    finalErrMsg.includes("too many requests") ||
    finalErrMsg.includes("busy");

  if (isFinalRateLimit) {
    throw new Error("Trivia generation is busy. Please try again in a few moments.");
  }

  throw new Error(extractErrorMessage(lastError));
};

function findNextNonWhitespaceChar(str: string, startIndex: number): string | null {
  for (let i = startIndex; i < str.length; i++) {
    const char = str[i];
    if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
      return char;
    }
  }
  return null;
}

function isQuoteEscaped(str: string, index: number): boolean {
  let count = 0;
  for (let i = index - 1; i >= 0; i--) {
    if (str[i] === '\\') {
      count++;
    } else {
      break;
    }
  }
  return count % 2 === 1;
}

function repairJsonStrings(jsonStr: string): string {
  let result = '';
  let inString = false;
  
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    
    if (char === '"') {
      if (isQuoteEscaped(jsonStr, i)) {
        result += char;
        continue;
      }
      
      if (!inString) {
        // Opening quote of key or string value
        inString = true;
        result += char;
      } else {
        // We are currently inside a string, check if this is the true closing quote
        const nextChar = findNextNonWhitespaceChar(jsonStr, i + 1);
        const isTrueClosing = nextChar === null || nextChar === ':' || nextChar === ',' || nextChar === '}' || nextChar === ']';
        
        if (isTrueClosing) {
          inString = false;
          result += char;
        } else {
          // This must be an unescaped quote! Let's escape it.
          result += '\\"';
        }
      }
    } else {
      result += char;
    }
  }
  
  return result;
}

function removeTrailingCommas(jsonStr: string): string {
  let inString = false;
  let isEscaped = false;
  const chars = [...jsonStr];
  let lastCommaIdx = -1;
  const positionsToDrop: number[] = [];

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === '\\') {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }

    if (char === ',') {
      lastCommaIdx = i;
    } else if (char === '}' || char === ']') {
      if (lastCommaIdx !== -1) {
        const rangeStr = chars.slice(lastCommaIdx + 1, i).join('');
        if (/^\s*$/.test(rangeStr)) {
          positionsToDrop.push(lastCommaIdx);
        }
      }
      lastCommaIdx = -1;
    } else if (!/^\s*$/.test(char)) {
      lastCommaIdx = -1;
    }
  }

  if (positionsToDrop.length > 0) {
    return chars.filter((_, idx) => !positionsToDrop.includes(idx)).join('');
  }
  return jsonStr;
}

function repairJsonStringValues(jsonStr: string): string {
  let result = '';
  let inString = false;
  let isEscaped = false;
  
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    
    if (isEscaped) {
      if (char === '\n') {
        result += 'n';
      } else if (char === '\r') {
        if (jsonStr[i + 1] === '\n') {
          // skip
        }
        result += 'n';
      } else {
        result += char;
      }
      isEscaped = false;
      continue;
    }
    
    if (char === '\\') {
      isEscaped = true;
      result += char;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    
    if (inString) {
      const code = char.charCodeAt(0);
      if (code < 32) {
        if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          if (jsonStr[i + 1] === '\n') {
            // skip
          } else {
            result += '\\n';
          }
        } else if (char === '\t') {
          result += '\\t';
        } else {
          result += ' ';
        }
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }
  
  return result;
}

function balanceAndCloseJson(jsonStr: string): string {
  let s = jsonStr.trim();
  if (!s) return '{}';
  
  let inString = false;
  let isEscaped = false;
  const stack: string[] = [];
  let cleanStr = '';
  
  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    
    if (isEscaped) {
      cleanStr += char;
      isEscaped = false;
      continue;
    }
    
    if (char === '\\') {
      cleanStr += char;
      isEscaped = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      cleanStr += char;
      continue;
    }
    
    if (inString) {
      cleanStr += char;
      continue;
    }
    
    if (char === '{' || char === '[') {
      stack.push(char);
    } else if (char === '}') {
      if (stack.length > 0 && stack[stack.length - 1] === '{') {
        stack.pop();
      }
    } else if (char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === '[') {
        stack.pop();
      }
    }
    
    cleanStr += char;
  }
  
  if (inString) {
    if (cleanStr.endsWith('\\')) {
      cleanStr = cleanStr.slice(0, -1);
    }
    cleanStr += '"';
  }
  
  cleanStr = cleanStr.trim();
  
  let changed = true;
  while (changed) {
    changed = false;
    
    if (cleanStr.endsWith(',') || cleanStr.endsWith(':')) {
      cleanStr = cleanStr.slice(0, -1).trim();
      changed = true;
      continue;
    }
    
    const trailingKeyRegex = /,\s*"[^"]+"\s*$/;
    if (trailingKeyRegex.test(cleanStr)) {
      cleanStr = cleanStr.replace(trailingKeyRegex, '').trim();
      changed = true;
      continue;
    }
  }
  
  while (stack.length > 0) {
    const last = stack.pop();
    if (last === '{') {
      cleanStr += '}';
    } else if (last === '[') {
      cleanStr += ']';
    }
  }
  
  return cleanStr;
}

function cleanAndParseJson(text: string): any {
  let cleaned = text.trim();
  
  if (cleaned.startsWith('```')) {
    const firstNewlineIdx = cleaned.indexOf('\n');
    if (firstNewlineIdx !== -1) {
      cleaned = cleaned.substring(firstNewlineIdx + 1);
    } else {
      cleaned = cleaned.replace(/^```(json)?/i, '');
    }
    cleaned = cleaned.replace(/```\s*$/, '');
    cleaned = cleaned.trim();
  }

  // Pre-clean extremely common AI-malformed quote/comma swap anomalies
  cleaned = cleaned
    .replace(/,"(\s*\r?\n\s*"[a-zA-Z0-9_]+"\s*:)/g, '",$1')
    .replace(/,"(\s*\r?\n\s*})/g, '",$1')
    .replace(/,"(\s*\r?\n\s*])/g, '",$1');
  
  // Try parsing repaired JSON first
  let repaired = cleaned;
  try {
    repaired = repairJsonStrings(cleaned);
    repaired = repairJsonStringValues(repaired);
  } catch (err) {
    console.warn("[JSON Clean] Error during quote/string repair fallback processing:", err);
  }

  try {
    return JSON.parse(repaired);
  } catch (err) {
    console.warn("[JSON Clean] Direct JSON parse of repaired string failed. Trying dynamic balancing...", err);
  }

  try {
    const balanced = balanceAndCloseJson(repaired);
    return JSON.parse(balanced);
  } catch (err) {
    console.warn("[JSON Clean] Balanced repaired JSON parse failed. Trying direct raw balancing...", err);
  }

  try {
    const balancedRaw = balanceAndCloseJson(cleaned);
    return JSON.parse(balancedRaw);
  } catch (err) {
    console.warn("[JSON Clean] Direct raw balanced JSON parse failed. Fallback to raw parsing...", err);
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("[JSON Clean] Direct raw JSON parse failed. Cleaning trailing commas...", err);
  }

  try {
    const commaCleaned = removeTrailingCommas(repaired);
    return JSON.parse(commaCleaned);
  } catch (err) {
    try {
      const commaCleanedRaw = removeTrailingCommas(cleaned);
      return JSON.parse(commaCleanedRaw);
    } catch (errRaw: any) {
      console.error("[JSON Clean] Failed clean & parse fallback with both repaired and raw. Error:", errRaw);
      console.error("[JSON Clean] Raw AI Response was:\n", text);
      throw new Error(`JSON Clean parse failure. Error: ${errRaw?.message || errRaw}. Raw text length: ${text?.length}`);
    }
  }
}

