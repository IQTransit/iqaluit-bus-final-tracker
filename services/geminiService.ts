
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { AIAdvice, Stop } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Local fallback advice to save quota
const getLocalAdvice = (stopsAway: number, userStopName: string): AIAdvice => ({
  message: stopsAway === 0 
    ? `The bus has arrived at ${userStopName}! Please board quickly.` 
    : `Local Dispatch: The bus is ${stopsAway} stops from you. Ensure you are visible at the curb.`,
  eta: `${stopsAway * 4} mins`,
  urgency: stopsAway <= 1 ? 'high' : stopsAway <= 3 ? 'medium' : 'low',
  isQuotaError: true,
  timestamp: Date.now()
});

export const getTransitAdvice = async (
  busStop: Stop,
  userStop: Stop,
  stopsAway: number
): Promise<AIAdvice> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Current bus: ${busStop.name}. User stop: ${userStop.name}. Distance: ${stopsAway} stops. Arctic weather is active.`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            eta: { type: Type.STRING },
            urgency: { type: Type.STRING }
          },
          required: ["message", "eta", "urgency"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    
    const result = JSON.parse(text);
    return { ...result, isQuotaError: false, timestamp: Date.now() };
  } catch (error: any) {
    const errorStr = JSON.stringify(error);
    const isQuota = error?.status === 429 || errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED');
    
    console.warn(isQuota ? "Gemini Quota Exhausted - Switching to Local Engine" : "Gemini Error", error);
    
    return getLocalAdvice(stopsAway, userStop.name);
  }
};
