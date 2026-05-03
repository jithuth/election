export function calculateTrendVelocity(oldSnapshot, newSnapshot) {
  const gains = {};
  const losses = {};
  let totalChanges = 0;

  for (const newRes of newSnapshot) {
    const oldRes = oldSnapshot.find(o => o.constituency === newRes.constituency && o.state === newRes.state);
    if (oldRes && oldRes.leading_party !== newRes.leading_party) {
      totalChanges++;
      gains[newRes.leading_party] = (gains[newRes.leading_party] || 0) + 1;
      if (oldRes.leading_party) {
        losses[oldRes.leading_party] = (losses[oldRes.leading_party] || 0) + 1;
      }
    }
  }
  return { gains, losses, totalChanges };
}

export function detectSwings(oldSnapshot, newSnapshot) {
  const swings = [];
  for (const newRes of newSnapshot) {
    const oldRes = oldSnapshot.find(o => o.constituency === newRes.constituency && o.state === newRes.state);
    if (oldRes && oldRes.leading_party && oldRes.leading_party !== newRes.leading_party) {
      swings.push({
        state: newRes.state,
        constituency: newRes.constituency,
        oldLeader: oldRes.leading_party,
        newLeader: newRes.leading_party,
        margin: newRes.margin
      });
    }
  }
  return swings;
}

export function calculateMomentumIndex(results) {
  const scores = {};
  for (const res of results) {
    if (!res.leading_party) continue;
    if (!scores[res.leading_party]) scores[res.leading_party] = { leads: 0, marginScore: 0, totalScore: 0 };
    scores[res.leading_party].leads += 1;
    scores[res.leading_party].marginScore += (res.margin > 10000 ? 2 : res.margin > 5000 ? 1 : 0);
  }
  
  for (const party in scores) {
    scores[party].totalScore = (scores[party].leads * 10) + scores[party].marginScore;
  }
  return scores;
}

export function findVolatileSeats(snapshots) {
  // Mock logic - in a real scenario we'd query historical records
  // For now, we simulate volatility based on current margin. Low margin = volatile.
  if (!snapshots || snapshots.length === 0) return [];
  const latest = snapshots; // Assuming latest snapshot
  return latest.filter(r => r.margin > 0 && r.margin < 2000).map(r => ({
    state: r.state,
    constituency: r.constituency,
    margin: r.margin,
    leading: r.leading_party,
    trailing: r.trailing_party
  })).sort((a,b) => a.margin - b.margin).slice(0, 10);
}
