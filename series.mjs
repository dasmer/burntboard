export function seriesScore(matches) {
  const fail = message => { throw Object.assign(new Error(message), {status:400}); };
  if (!Array.isArray(matches) || matches.length < 2 || matches.length > 3) fail('Record two or three matches for a best-of-three game.');
  let score1=0, score2=0;
  for (const [i,match] of matches.entries()) {
    if (score1===2 || score2===2) fail('The game ends after two match wins. Do not record another match.');
    const a=match?.score1,b=match?.score2,hi=Math.max(a,b),lo=Math.min(a,b);
    if (!Number.isInteger(a) || !Number.isInteger(b) || lo<0 || hi>99 || !((hi===11 && lo<=9) || (hi>=12 && hi-lo===2))) fail(`Match ${i+1}: play to 11, win by two. Check the final score.`);
    if (a>b) score1++; else score2++;
  }
  if (Math.max(score1,score2)!==2) fail('The game is not finished. Add the deciding match.');
  return {matches:matches.map(({score1,score2})=>({score1,score2})),score1,score2};
}
