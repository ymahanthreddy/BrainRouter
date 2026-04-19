export function score(text) {
  if (!text) return 0;
  let s = 0;
  const lower = text.toLowerCase();
  if (text.length > 200)          s += 2;
  if (lower.includes('example'))  s += 2;
  if (lower.includes('step'))     s += 2;
  return s;
}

export function rankResponses(rawResults, judgeScores = null) {
  const scored = rawResults.map(({ name, text }, index) => {
    const basicScore = score(text);
    const judgeScore = judgeScores ? judgeScores[index] || 0 : 0;

    // Combine basic heuristic score (0-6) with judge score (0-10)
    // Weight: 40% heuristic, 60% judge
    const finalScore = judgeScores
      ? Math.round((basicScore * 40 + judgeScore * 60) / 100)
      : basicScore;

    return {
      model: name,
      text,
      heuristicScore: basicScore,
      judgeScore: judgeScores ? judgeScore : null,
      score: finalScore,
      best: false,
    };
  });

  const max = Math.max(...scored.map((r) => r.score));
  const bestIdx = scored.findIndex((r) => r.score === max);
  if (bestIdx !== -1) scored[bestIdx].best = true;

  return scored;
}
