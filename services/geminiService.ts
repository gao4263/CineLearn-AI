
import { GoogleGenAI, Type } from "@google/genai";
import { CorpusItem, Subtitle } from "../types";

export const generateCorpusForSubtitle = async (
  subtitleText: string,
  context: string = "General conversation"
): Promise<Partial<CorpusItem>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (!process.env.API_KEY) {
    console.warn("No API Key provided for Gemini.");
    return [
      {
        type: 'culture',
        content: 'API Key missing. Please configure your environment to see AI insights.',
      }
    ];
  }

  const prompt = `
    Analyze the following English subtitle line from a TV show: "${subtitleText}".
    Context: ${context}.
    
    Provide 2-3 short, distinct learning points in JSON format.
    The output should be an array of objects with keys: 
    "type" (one of: 'vocabulary', 'grammar', 'culture'),
    "anchor" (the specific English word or phrase from the subtitle text that this point refers to. It MUST be an exact substring of the subtitle),
    and "content" (the explanation).

    IMPORTANT RULES:
    1. "anchor": MUST be in English (the specific word/phrase from the subtitle).
    2. "content": MUST be in Simplified Chinese (the explanation/definition).
    3. Keep explanations concise (under 50 words).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: "The type of learning point: vocabulary, grammar, or culture."
              },
              anchor: {
                type: Type.STRING,
                description: "The exact English substring from the subtitle text."
              },
              content: {
                type: Type.STRING,
                description: "The explanation in Simplified Chinese."
              }
            },
            required: ["type", "content"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as Partial<CorpusItem>[];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};

export const generateCorpusBatch = async (
  subtitles: Subtitle[],
  contextInfo: string
): Promise<Partial<CorpusItem>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (!process.env.API_KEY) return [];

  // Simplify input to save tokens
  const inputData = subtitles.map(s => ({
    id: s.id,
    text: s.text.replace(/\n/g, ' ')
  }));

  const prompt = `
    You are an expert English teacher. Analyze the following batch of subtitle lines from "${contextInfo}".
    Identify noteworthy learning points such as:
    1. Advanced Vocabulary (idioms, phrasal verbs, uncommon words)
    2. Grammar patterns (complex structures, colloquial usage)
    3. Cultural references or context.

    Input Data: ${JSON.stringify(inputData)}

    Return a JSON array of learning points. Each point MUST map to a specific "subtitleId" from the input.
    If a subtitle has no significant learning points, omit it. 
    
    IMPORTANT RULES: 
    1. "content" field MUST be in Simplified Chinese.
    2. "anchor" field MUST be the specific English word or phrase from the text.
    3. Keep explanations concise (max 30 words).
  `;

  try {
     const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as Partial<CorpusItem>[];
  } catch (e) {
    console.error("Batch Corpus Gen Error", e);
    return [];
  }
};

export const lookupWord = async (word: string, contextSentence: string): Promise<{ definition: string; pronunciation: string; translation: string } | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    if (!process.env.API_KEY) return null;

    const prompt = `
      Provide the definition, IPA pronunciation, and Chinese translation for the word/phrase "${word}" found in this context: "${contextSentence}".
      Keep the definition concise (under 20 words).
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        definition: { type: Type.STRING },
                        pronunciation: { type: Type.STRING, description: "IPA format" },
                        translation: { type: Type.STRING, description: "Chinese translation" }
                    },
                    required: ["definition", "pronunciation", "translation"]
                }
            }
        });

        const text = response.text;
        if (!text) return null;
        return JSON.parse(text);
    } catch (e) {
        console.error("Word Lookup Error", e);
        return null;
    }
}