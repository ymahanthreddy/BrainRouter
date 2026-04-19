import axios from 'axios';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const RESPONSE_MODELS = [
  { id: 'meta-llama/llama-3.1-8b-instruct',    name: 'Llama 3.1 8B' },
  { id: 'openai/gpt-oss-20b',                  name: 'GPT OSS 20B' },
  { id: 'google/gemma-3-4b-it',                name: 'Gemma 3 4B' },
  { id: 'amazon/nova-micro-v1',                name: 'Nova Micro' },
];

const JUDGE_MODEL = 'deepseek/deepseek-chat-v3.1';

async function callModel(modelId, prompt, temperature = 0.7, conversationHistory = []) {
  try {
    const messages = [...conversationHistory, { role: 'user', content: prompt }];

    const res = await axios.post(
      OPENROUTER_URL,
      {
        model: modelId,
        messages: messages,
        temperature: temperature,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://brainrouter.app',
          'X-Title': 'BrainRouter',
        },
        timeout: 60000,
      }
    );
    return res.data.choices[0].message.content;
  } catch (error) {
    console.error(`Error calling model ${modelId}:`, error.message);
    throw error;
  }
}

export async function queryAllModels(prompt, conversationHistory = []) {
  try {
    const results = await Promise.allSettled(
      RESPONSE_MODELS.map(async ({ id, name }) => {
        const text = await callModel(id, prompt, 0.7, conversationHistory);
        return { name, text, modelId: id };
      })
    );

    return results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : {
            name: RESPONSE_MODELS[i].name,
            text: `Error: ${r.reason?.message || 'Failed to get response'}`,
            modelId: RESPONSE_MODELS[i].id
          }
    );
  } catch (error) {
    console.error('Error querying all models:', error.message);
    throw error;
  }
}

export async function judgeResponses(prompt, responses) {
  try {
    const responseTexts = responses
      .map((r, i) => `${i + 1}. [${r.name}]\n${r.text}`)
      .join('\n\n---\n\n');

    const judgingPrompt = `You are an expert judge evaluating AI model responses.

Original Question: "${prompt}"

Model Responses:
${responseTexts}

Analyze these responses and:
1. Identify the best response
2. Rate each response (1-10)
3. Provide brief reasoning

Format your response as JSON:
{
  "bestIndex": <number (0-based index of best response)>,
  "reasoning": "<brief explanation>",
  "scores": [<score1>, <score2>, <score3>, <score4>],
  "analysis": "<1-2 sentence analysis>"
}`;

    const result = await callModel(JUDGE_MODEL, judgingPrompt, 0.5);

    // Parse the JSON response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse judge response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error judging responses:', error.message);
    throw error;
  }
}

export function getModelsList() {
  return RESPONSE_MODELS;
}

export function getJudgeModel() {
  return JUDGE_MODEL;
}
