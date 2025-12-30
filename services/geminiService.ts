
import { GoogleGenAI, Type } from "@google/genai";
import { CorpusItem } from "../types";

export const generateCorpusForSubtitle = async (
  subtitleText: string,
  context: string = "General conversation"
): Promise<Partial<CorpusItem>[]> => {
  // DO NOT initialize GoogleGenAI globally; always initialize right before use to ensure the most current process.env.API_KEY is picked up.
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
    The output should be an array of objects with keys: "type" (one of: 'vocabulary', 'grammar', 'culture') and "content" (the explanation).
    Keep explanations concise (under 50 words).
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
              content: {
                type: Type.STRING,
                description: "The explanation for the learning point."
              }
            },
            required: ["type", "content"]
          }
        }
      }
    });

    // Access the .text property directly as it is a getter, not a function.
    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as Partial<CorpusItem>[];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};
