/**
 * geminiService.ts
 *
 * AI chat via Groq (free tier — llama-3.3-70b).
 * Uses the OpenAI-compatible Groq REST API.
 */

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const TEXT_MODEL   = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const SYSTEM_PROMPT = `You are AccessAid Assistant — a compassionate, knowledgeable AI health companion built into the AccessAid app, which is designed for people with disabilities and chronic health conditions.

Your role:
- Answer health, medication, and accessibility questions clearly and empathetically
- Help users understand medical documents, prescriptions, or terminology
- Suggest reminders (e.g. "You could set a medication reminder for that")
- Provide mental health support and encouragement when users feel low
- Explain disability-related rights and accessibility accommodations
- Give practical daily living tips for people with various disabilities

Your tone:
- Warm, patient, and non-judgmental
- Use simple, plain language — avoid jargon
- Short responses unless detail is needed
- Always acknowledge the user's feelings before giving advice

Important:
- You are NOT a replacement for professional medical advice. Always recommend consulting a doctor for diagnosis or treatment decisions.
- If a user expresses a mental health crisis or mentions self-harm, respond with empathy and provide crisis resources (e.g. call 988 in the US).
- Keep responses concise and mobile-friendly (no long walls of text).`;

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function sendChatMessage(
  history: ChatMessage[],
  newMessage: string,
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY_MISSING');
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
    { role: 'user', content: newMessage },
  ];

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `HTTP ${response.status}`);
  }

  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content ?? '';

  if (!text) throw new Error('Empty response');
  return text.trim();
}

/**
 * Send an image (base64) with an optional text prompt to the vision model.
 * @param base64 - Pure base64 string (no data URI prefix)
 * @param mimeType - e.g. 'image/jpeg'
 * @param prompt  - Optional user question about the image
 */
export async function sendImageMessage(
  base64: string,
  mimeType: string = 'image/jpeg',
  prompt: string = 'Please describe and explain what you see in this image in simple, clear language.',
): Promise<string> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY_MISSING');

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      temperature: 0.5,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `HTTP ${response.status}`);
  }

  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('Empty response');
  return text.trim();
}
