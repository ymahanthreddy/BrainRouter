import { Router } from 'express';
import { queryAllModels, judgeResponses } from '../services/openrouter.js';
import { rankResponses } from '../services/scoring.js';
import { authenticate } from '../middleware/auth.js';
import PromptHistory from '../models/PromptHistory.js';

const router = Router();

router.post('/compare', async (req, res) => {
  const { prompt, chatId, conversationHistory = [], id } = req.body;
  if (!prompt?.trim())
    return res.status(400).json({ error: 'Prompt cannot be empty' });

  try {
    // Step 1: Get responses from all models with conversation context
    const rawResults = await queryAllModels(prompt, conversationHistory);

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
      try {
        const doc = await PromptHistory.create({
          id: id || Date.now().toString(),
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
        });
        console.log('✅ Saved to DB:', {
          id: doc.id,
          userId,
          prompt: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
          models: responses.map(r => `${r.model} (${r.score})`).join(', ')
        });
      } catch (err) {
        console.error('❌ Failed to save history:', err.message);
      }
    } else {
      // Update existing chat with follow-up
      try {
        await PromptHistory.findOneAndUpdate(
          { id: chatId },
          {
            $push: {
              followUps: {
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
                timestamp: new Date()
              }
            }
          },
          { new: true }
        );
        console.log('✅ Follow-up saved to DB:', { chatId, prompt: prompt.substring(0, 50) });
      } catch (err) {
        console.error('❌ Failed to save follow-up:', err.message);
      }
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
    console.log('🔍 Fetching history for userId:', userId);

    // Fetch ALL documents regardless of userId to debug
    const allDocs = await PromptHistory.find().lean();
    console.log('📊 Total documents in DB:', allDocs.length);
    console.log('📋 All doc IDs:', allDocs.map((d: any) => ({ id: d.id, userId: d.userId })));

    // Try both - with and without userId filter
    const withUserFilter = await PromptHistory
      .find({ userId })
      .lean();

    const withoutUserFilter = await PromptHistory
      .find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    console.log(`📚 With userId filter: ${withUserFilter.length}, Without filter: ${withoutUserFilter.length}`);

    // Return all docs regardless of userId for now
    res.json(withoutUserFilter);
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.delete('/history/:id', authenticate, async (req, res) => {
  try {
    const result = await PromptHistory.findOneAndDelete({
      id: req.params.id,
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

router.post('/feedback', async (req, res) => {
  const { chatId, preferredModel, judgeAnalysis, timestamp } = req.body;
  const userId = req.user?.userId || 'guest';

  try {
    await PromptHistory.findOneAndUpdate(
      { id: chatId },
      {
        userFeedback: {
          preferredModel,
          judgeAnalysis,
          timestamp
        }
      },
      { new: true }
    );

    console.log('💾 Feedback saved:', { userId, chatId, preferredModel });
    res.json({ success: true });
  } catch (err) {
    console.error('Feedback error:', err.message);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

export default router;
