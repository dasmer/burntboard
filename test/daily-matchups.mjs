import assert from 'node:assert/strict';
import {dailyPairs,dailyEmail,dailyToken,dailyTokenPlayer} from '../server/daily-matchups.mjs';
import {weeklyToken} from '../server/weekly-recap.mjs';
const id=i=>`${String(i).padStart(8,'0')}-1111-4111-8111-111111111111`;
const players=Array.from({length:6},(_,i)=>({id:id(i),name:'Player '+i,avatar:'🏓'}));
for(let n=0;n<=40;n++) {
 const roster=Array.from({length:n},(_,i)=>({id:id(i)})),s={day:'2026-10-14',players:roster,history:[]},pairs=dailyPairs(s);
 const degree=new Map(roster.map(p=>[p.id,0]));
 for(const pair of pairs){assert.notEqual(pair[0],pair[1]);for(const p of pair)degree.set(p,degree.get(p)+1);}
 assert.equal(new Set(pairs.map(p=>p.join(':'))).size,pairs.length);
 assert([...degree.values()].every(d=>d===Math.min(2,Math.max(0,n-1))));
 assert.deepEqual(dailyPairs({...s,players:[...roster].reverse()}),pairs,'Input order does not affect lineup');
}
const s={day:'2026-10-14',players:players.slice(0,4),history:[{player1:id(0),player2:id(1),games:9,lastPlayed:'2026-10-13'},{player1:id(2),player2:id(3),games:9,lastPlayed:'2026-10-13'}]};
const pairs=dailyPairs(s);assert(!pairs.some(p=>p.join(':')===[id(0),id(1)].join(':')));assert(!pairs.some(p=>p.join(':')===[id(2),id(3)].join(':')));
const groups={day:s.day,players,history:players.slice(0,3).flatMap(a=>players.slice(3).map(b=>({player1:a.id,player2:b.id,games:10,lastPlayed:'2026-10-13'})))};
assert(dailyPairs(groups).every(pair=>pair.every(p=>players.slice(0,3).some(x=>x.id===p))||pair.every(p=>players.slice(3).some(x=>x.id===p))),'Do not force a single cycle when smaller groups avoid repeats');
const recency={...s,history:s.history.map((h,i)=>({...h,games:1})).concat([{player1:id(0),player2:id(2),games:1,lastPlayed:'2026-09-17'},{player1:id(1),player2:id(3),games:1,lastPlayed:'2026-09-17'},{player1:id(0),player2:id(3),games:1,lastPlayed:'2026-09-17'},{player1:id(1),player2:id(2),games:1,lastPlayed:'2026-09-17'}])};
assert(!dailyPairs(recency).some(p=>p.join(':')===[id(0),id(1)].join(':')),'Recency breaks equal game counts');
const variants=new Set(Array.from({length:10},(_,i)=>JSON.stringify(dailyPairs({day:`2026-10-${14+i}`,players:s.players,history:[]}))));assert(variants.size>1,'Date-seeded ties rotate');
const token=dailyToken(id(0),'key');assert.equal(dailyTokenPlayer(token,'key'),id(0));assert.equal(dailyTokenPlayer(token,'wrong'),null);assert.equal(dailyTokenPlayer(weeklyToken(id(0),'key'),'key'),null,'Weekly links cannot alter daily preferences');
const snapshot={...s,pairs,players:s.players.map(p=>({...p,name:'<b>'+p.name}))};
const email=dailyEmail({snapshot,recipientId:id(0),origin:'https://burntboard.com',key:'key'});
assert.equal(email.subject,'🏓 <b>Player & <b>Player are your two today');assert(email.html.includes('&lt;b&gt;'));assert(!email.html.includes('<b>Player'));assert(email.html.includes('daily-emails/'));assert(email.text.includes('A fresh matchup—no games together in four weeks.'));
const opponent=pairs.find(p=>p.includes(id(0))).find(p=>p!==id(0));
for(const [lastPlayed,expected] of [['2026-10-13','Back to the table—last played yesterday.'],['2026-10-02','Time to catch up—last played 12 days ago.']]) {
 const recent=dailyEmail({snapshot:{...snapshot,history:[{player1:id(0),player2:opponent,games:2,lastPlayed}]},recipientId:id(0),origin:'https://burntboard.com',key:'key'});
 assert(recent.html.includes(expected));assert(recent.text.includes(expected),'Relative copy uses the frozen lineup date');
}
assert.equal(dailyEmail({snapshot,recipientId:id(0),origin:'https://burntboard.com',key:'key',activeIds:[]}),null);
const one=dailyEmail({snapshot,recipientId:id(0),origin:'https://burntboard.com',key:'key',activeIds:[pairs.find(p=>p.includes(id(0))).find(p=>p!==id(0))]});assert.equal(one.subject,'🏓 <b>Player is your matchup today');
console.log('Daily pairing checks passed: reciprocal two-opponent lineups, small/odd/even rosters, variety/recency priorities, stable rotating ties, scoped tokens and escaped emails.');

const named={...snapshot,players:snapshot.players.map((p,i)=>({...p,name:i===0?'Dasmer Singh':i===1?'JJ Kumar':i===2?'RJ Sharma':'Jay Smith'}))};
const namedEmail=dailyEmail({snapshot:named,recipientId:id(0),origin:'https://burntboard.com',key:'key'});
assert.equal(namedEmail.subject,'🏓 '+pairs.filter(p=>p.includes(id(0))).map(p=>named.players.find(x=>x.id===p.find(x=>x!==id(0))).name.split(' ')[0]).join(' & ')+' are your two today');
assert(namedEmail.html.includes('Wednesday, October 14'));
for(const noisy of ['Best of three','Suggestions, not assignments','Your opponents got the same','Open the page, then tap']) {assert(!namedEmail.html.includes(noisy));assert(!namedEmail.text.includes(noisy));}

assert(!namedEmail.html.includes('Yesterday at the table'),'Omit empty recap for prior snapshots');
assert(!dailyEmail({snapshot:{...named,yesterdayGames:[]},recipientId:id(0),origin:'https://burntboard.com',key:'key'}).html.includes('Yesterday at the table'));
const resultPlayer={id:id(5),name:'<script>Other Player',avatar:'<x>',image:'/api/v1/photos/'+id(5)};
const withResults={...named,yesterdayGames:[{id:'game-a',player1:named.players[0],player2:resultPlayer,score1:2,score2:1},{id:'game-b',player1:resultPlayer,player2:named.players[0],score1:0,score2:2}]};
const recapEmail=dailyEmail({snapshot:withResults,recipientId:id(0),origin:'https://burntboard.com',key:'key'});
assert(recapEmail.html.includes('Yesterday at the table'));assert(recapEmail.html.indexOf('Yesterday at the table')>recapEmail.html.indexOf('View player'));
assert(recapEmail.html.includes('&lt;script&gt;Other Player'));assert(!recapEmail.html.includes('<script>'));assert(recapEmail.html.includes('/api/v1/photos/'+id(5)));
assert(recapEmail.html.includes('/#match/game-a'));assert(recapEmail.html.includes('/#match/game-b'));assert(recapEmail.text.includes('Dasmer Singh 2–1 <script>Other Player'));
assert(!recapEmail.html.includes('Match 1'),'Recap contains series totals only');assert.equal(recapEmail.subject,namedEmail.subject,'Recap does not change opponent subject');
