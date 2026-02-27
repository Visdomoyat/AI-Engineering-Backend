export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmResponse {
  text: string;
  model: string;
}

export async function generateWithXai(messages: ChatMessage[]): Promise<LlmResponse | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
  const model = process.env.XAI_MODEL || 'grok-4-latest';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`xAI request failed (${response.status}): ${errorText}`);
  }

  const json = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('xAI response did not include a message content');
  }

  return { text, model };
}
