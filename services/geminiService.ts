
import { GoogleGenAI, Type } from "@google/genai";
import { CorpusItem, Subtitle, AIConfig } from "../types";

// --- Helper: Get Config ---
const getConfig = (): AIConfig => {
    const saved = localStorage.getItem('ai_config');
    if (saved) return JSON.parse(saved);
    // Fallback to Env if exists (for demo purposes) or default to Gemini
    return {
        provider: 'gemini',
        apiKey: process.env.API_KEY || '',
        model: 'gemini-3-flash-preview'
    };
};

// --- Helper: Generic API Call for OpenAI-Compatible endpoints ---
const callOpenAICompatible = async (config: AIConfig, messages: any[], responseFormat?: boolean) => {
    if (!config.apiKey) throw new Error("Missing API Key");
    
    const body: any = {
        model: config.model,
        messages: messages,
        temperature: 0.7
    };

    if (responseFormat) {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
};

// --- Main Service Functions ---

export const generateCorpusForSubtitle = async (
  subtitleText: string,
  context: string = "General conversation"
): Promise<Partial<CorpusItem>[]> => {
  const config = getConfig();

  if (!config.apiKey) {
    console.warn("No API Key configured.");
    return [{ type: 'culture', content: '请先在设置中配置 API Key。' }];
  }

  const systemPrompt = `
    Analyze the English subtitle: "${subtitleText}". Context: ${context}.
    Provide 2-3 short learning points.
    Return ONLY valid JSON array. Each object:
    {
      "type": "vocabulary" | "grammar" | "culture",
      "anchor": "exact English substring",
      "content": "Simplified Chinese explanation (max 50 words)"
    }
  `;

  try {
    let jsonString = '';

    if (config.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
            model: config.model || 'gemini-3-flash-preview',
            contents: systemPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, enum: ['vocabulary', 'grammar', 'culture'] },
                            anchor: { type: Type.STRING },
                            content: { type: Type.STRING }
                        },
                        required: ["type", "content"]
                    }
                }
            }
        });
        jsonString = response.text || '';
    } else {
        // OpenAI / DeepSeek / Qwen
        const messages = [
            { role: "system", content: "You are a helpful English tutor. Output JSON only." },
            { role: "user", content: systemPrompt }
        ];
        jsonString = await callOpenAICompatible(config, messages, true);
    }

    if (!jsonString) return [];
    // Cleanup markdown code blocks if present (common with DeepSeek/ChatGPT)
    const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error("AI Service Error:", error);
    return [{ type: 'culture', content: `AI Error: ${(error as Error).message}` }];
  }
};

export const generateCorpusBatch = async (
  subtitles: Subtitle[],
  contextInfo: string
): Promise<Partial<CorpusItem>[]> => {
  const config = getConfig();
  if (!config.apiKey) return [];

  const inputData = subtitles.map(s => ({ id: s.id, text: s.text.replace(/\n/g, ' ') }));
  
  const prompt = `
    Analyze these subtitles from "${contextInfo}".
    Identify learning points (Vocabulary, Grammar, Culture).
    Input: ${JSON.stringify(inputData)}
    Return JSON Array. Each item:
    { "subtitleId": "id_from_input", "type": "vocabulary"|"grammar"|"culture", "anchor": "english_text", "content": "Chinese_explanation" }
  `;

  try {
    let jsonString = '';

    if (config.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
            model: config.model || 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            subtitleId: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ["vocabulary", "grammar", "culture"] },
                            anchor: { type: Type.STRING },
                            content: { type: Type.STRING }
                        },
                        required: ["subtitleId", "type", "content"]
                    }
                }
            }
        });
        jsonString = response.text || '';
    } else {
         const messages = [
            { role: "system", content: "You are an expert English teacher. Output JSON only." },
            { role: "user", content: prompt }
        ];
        jsonString = await callOpenAICompatible(config, messages, true);
    }

    if (!jsonString) return [];
    const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Batch Gen Error", e);
    return [];
  }
};

export const lookupWord = async (word: string, contextSentence: string): Promise<{ definition: string; pronunciation: string; translation: string } | null> => {
    const config = getConfig();
    if (!config.apiKey) return null;

    const prompt = `
      Define "${word}" in context: "${contextSentence}".
      Return JSON: { "definition": "concise English def", "pronunciation": "IPA", "translation": "Chinese meaning" }
    `;

    try {
        let jsonString = '';

        if (config.provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey: config.apiKey });
            const response = await ai.models.generateContent({
                model: config.model || 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            definition: { type: Type.STRING },
                            pronunciation: { type: Type.STRING },
                            translation: { type: Type.STRING }
                        },
                        required: ["definition", "pronunciation", "translation"]
                    }
                }
            });
            jsonString = response.text || '';
        } else {
            const messages = [
                { role: "system", content: "Dictionary output JSON only." },
                { role: "user", content: prompt }
            ];
            jsonString = await callOpenAICompatible(config, messages, true);
        }

        if (!jsonString) return null;
        const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Word Lookup Error", e);
        return null;
    }
}
