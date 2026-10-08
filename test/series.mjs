import assert from 'node:assert/strict';
import {seriesScore} from '../series.mjs';
const win={score1:11,score2:7},loss={score1:9,score2:11},deuce={score1:14,score2:12};
for(const matches of [[win,win],[loss,loss],[win,loss,deuce],[loss,win,loss]]) {
  const result=seriesScore(matches);
  assert.equal(result.matches.length,matches.length);
  assert.equal(Math.max(result.score1,result.score2),2);
}
for(const matches of [undefined,[],[win],[win,loss],[win,win,loss],[loss,loss,win],[win,loss,win,win],
  [win,{score1:11,score2:10}],[win,{score1:12,score2:7}],[win,{score1:13,score2:10}],
  [win,{score1:100,score2:98}],[win,{score1:11,score2:-1}],[win,{score1:'11',score2:9}],
  [win,{score1:11.5,score2:9.5}],[win,null]]) {
  assert.throws(()=>seriesScore(matches),e=>e.status===400);
}
assert.equal(seriesScore([win,loss,deuce]).score1,2);
assert.equal(seriesScore([win,loss,deuce]).score2,1);
assert.equal(seriesScore([loss,loss]).score1,0);
console.log('Best-of-three series validation passed.');
