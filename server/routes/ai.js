import { Router } from 'express';
import { queryAllModels, judgeResponses } from '../services/openrouter.js';
import { rankResponses } from '../services/scoring.js';
import { authenticate } from '../middleware/auth.js';
import PromptHistory from '../models/PromptHistory.js';

const router = Router();

router.post('/compare', async (req, res) => {
  const { prompt, chatId } = req.body;
  if (!prompt?.trim())
    return res.status(400).json({ error: 'Prompt cannot be empty' });

  try {
    // Step 1: Get responses from all models
    const rawResults = await queryAllModels(prompt);

    // Step 2: Judge the responses
    let judgeData = null;
    try {
      judgeData = await judgeResponses(prompt, rawResults);
    } catch (judgeError) {
      console.warn('Judge failed, using heuristic scoring only:', judgeError.message);
    }

    // Step 3: Rank responses
    const judgeScores = judgeData?.scores || null;
    const responses = rankResponses(rawResults, judgeScores);

    // Enrich responses with judge analysis if available
    if (judgeData) {
      responses.forEach((r, i) => {
        r.judgeAnalysis = judgeData.analysis;
        r.judgeReasoning = judgeData.reasoning;
      });
    }

    // Step 4: Save to history only for new chats (first message)
    const userId = req.user?.userId || 'guest';
    if (!chatId) {
      // Only save first message to history
      PromptHistory.create({
        userId,
        prompt,
        responses: responses.map(r => ({
          model: r.model,
          text: r.text,
          score: r.score,
          best: r.best,
          heuristicScore: r.heuristicScore,
          judgeScore: r.judgeScore,
        })),
        judgeData: judgeData || null,
      }).then(doc => {
        console.log('✅ Saved to DB:', {
          id: doc._id,
          userId,
          prompt: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
          models: responses.map(r => `${r.model} (${r.score})`).join(', ')
        });
      }).catch(err => console.error('❌ Failed to save history:', err.message));
    } else {
      console.log('ℹ️ Continuation message - responses handled on frontend');
    }

    res.json({ responses, judgeAnalysis: judgeData?.reasoning || null });
  } catch (err) {
    console.error('Compare error:', err.message);
    res.status(502).json({
      error: 'Failed to get AI responses',
      details: err.message,
    });
  }
});

router.get('/history', async (req, res) => {
  try {
    const userId = req.user?.userId || 'guest';
    const history = await PromptHistory
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    console.log(`📚 Fetching history for ${userId}:`, history.length);
    res.json(history);
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.delete('/history/:id', authenticate, async (req, res) => {
  try {
    const result = await PromptHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!result) {
      return res.status(404).json({ error: 'History item not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete history' });
  }
});

router.post('/generate-title', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt?.trim())
    return res.status(400).json({ error: 'Prompt cannot be empty' });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'user',
            content: `Generate a short, concise title (max 50 characters) for this chat based on the user's prompt. Return ONLY the title, nothing else.\n\nUser prompt: "${prompt}"`
          }
        ],
        max_tokens: 50,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to generate title');
    }

    const title = data.choices?.[0]?.message?.content?.trim() || prompt.substring(0, 50);

    console.log('✨ Generated title:', title);
    res.json({ title });
  } catch (err) {
    console.error('Title generation error:', err.message);
    // Return default title on error
    const defaultTitle = prompt.substring(0, 50) + (prompt.length > 50 ? '...' : '');
    res.json({ title: defaultTitle });
  }
});

export default router;
