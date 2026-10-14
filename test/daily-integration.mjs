import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {config,db,query,rpc} from '../server/config.mjs';
import {hash} from '../server/auth.mjs';
import {dailyPairs,dailyToken} from '../server/daily-matchups.mjs';
import {weeklyToken} from '../server/weekly-recap.mjs';
const link=JSON.parse(readFileSync(new URL('../.insforge/project.json',import.meta.url)));
assert.equal(config.environment,'test');assert(['burntboard-test','burntboard-series-test'].includes(link.project_name));assert.equal(config.deliveryEnabled,false);
const origin=process.env.TEST_ORIGIN,prefix='daily'+Date.now(),ids=Array.from({length:4},()=>randomUUID()),credential=randomUUID(),gameIds=Array.from({length:3},()=>randomUUID());
const days=['2026-10-14','2026-11-09','2026-11-10','2026-11-11','2026-11-12'];
async function cleanup(day){const runs=await query(db.database.from('bb_daily_runs').select('event_id').eq('day',day));for(const r of runs)await query(db.database.from('bb_outbox').delete().eq('event_id',r.event_id));await query(db.database.from('bb_daily_runs').delete().eq('day',day));}
async function call(token,method='GET',body){const response=await fetch(origin+'/api/v1/daily-preference'+(method==='GET'?'?token='+encodeURIComponent(token):''),{method,headers:{Origin:origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()};}
try {
 for(const day of days)await cleanup(day);
 const people=await query(db.database.from('bb_players').insert(ids.map((id,i)=>({id,email:prefix+i+'@useallowance.com',username:prefix+i,name:'Daily '+i,created_at:'2026-10-13T12:00:00Z'}))).select());assert(people.every(p=>p.daily_matchups));
 await query(db.database.from('bb_sessions').insert([{player_id:ids[0],token_hash:hash(credential),kind:'agent',label:'Daily test',expires_at:'2030-01-01T00:00:00Z'}]));
 const token=dailyToken(ids[0],config.otpSecret);assert.equal((await call(token)).data.enabled,true);assert.equal((await call(token)).data.enabled,true);
 assert.equal((await call(weeklyToken(ids[0],config.otpSecret))).status,401,'Weekly token cannot update daily preference');
 assert.equal((await call(token.slice(0,-2)+'xx')).status,401);assert.equal((await call(token,'POST',{token,enabled:true})).status,403);
 assert.equal((await call(token,'POST',{token,enabled:false})).data.enabled,false);
 const response=await fetch(origin+'/api/v1/daily-preference',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+credential},body:JSON.stringify({enabled:true,player:ids[1]})});assert.equal(response.status,200);
 const own=await(await fetch(origin+'/api/v1/state',{headers:{Authorization:'Bearer '+credential}})).json();assert.equal(own.user.dailyMatchups,true);assert(own.players.every(p=>!('dailyMatchups' in p)));
 await query(db.database.from('bb_players').update({daily_matchups:false}).eq('id',ids[2]));await query(db.database.from('bb_players').update({created_at:'2026-10-14T16:00:00Z'}).eq('id',ids[3]));
 await query(db.database.from('bb_games').insert(gameIds.map((id,i)=>({id,player1:ids[0],player2:ids[1],date:['2026-10-13','2026-09-15','2026-10-14'][i],matches:[{score1:11,score2:7},{score1:11,score2:8}],created_at:'2026-10-13T12:00:00Z'}))));
 assert.equal(await rpc('bb_daily_snapshot',{p_now:'2026-10-14T14:59:59Z'}),null,'Not before 8 AM PDT');
 assert.equal(await rpc('bb_daily_snapshot',{p_now:'2026-10-17T15:00:00Z'}),null,'No Saturday send');assert.equal(await rpc('bb_daily_snapshot',{p_now:'2026-10-18T15:00:00Z'}),null,'No Sunday send');
 const snapshots=await Promise.all(Array.from({length:3},()=>rpc('bb_daily_snapshot',{p_now:'2026-10-14T15:00:00Z'})));assert.deepEqual(snapshots[0],snapshots[1]);
 const snapshot=snapshots[0];assert(!snapshot.players.some(p=>p.id===ids[2]||p.id===ids[3]),'Opted out / late signup are excluded');assert(snapshot.players.some(p=>p.id===ids[0]));assert.equal(snapshot.history.find(h=>[h.player1,h.player2].includes(ids[0])&&[h.player1,h.player2].includes(ids[1])).games,1,'Four-week window excludes old and same-day games');
 const pairs=dailyPairs(snapshot);
 await assert.rejects(()=>rpc('bb_queue_daily_matchups',{p_day:days[0],p_pairs:[[ids[0],ids[0]]]}),'Reject invalid lineup before any delivery queues');
 const results=await Promise.all(Array.from({length:3},()=>rpc('bb_queue_daily_matchups',{p_day:days[0],p_pairs:pairs})));assert.equal(results.filter(n=>n>0).length,1);
 const run=(await query(db.database.from('bb_daily_runs').select('*').eq('day',days[0])))[0];assert.deepEqual(run.snapshot.pairs,pairs);assert.equal(Date.parse(run.cutoff),Date.parse('2026-10-14T15:00:00Z'));
 const outbox=await query(db.database.from('bb_outbox').select('recipient').eq('event_id',run.event_id));assert.equal(outbox.length,snapshot.players.length);assert(!outbox.some(o=>o.recipient===ids[2]||o.recipient===ids[3]));
 assert.equal(await rpc('bb_daily_snapshot',{p_now:'2026-10-14T15:30:00Z'}),null,'Restart cannot create a second lineup');
 assert.equal(await rpc('bb_daily_snapshot',{p_now:'2026-11-09T15:59:59Z'}),null,'PST before 8 AM');const winter=await rpc('bb_daily_snapshot',{p_now:'2026-11-09T16:00:00Z'});assert.equal(Date.parse(winter.cutoff),Date.parse('2026-11-09T16:00:00Z'));
 assert.equal(await rpc('bb_daily_snapshot',{p_now:'2026-11-10T18:00:00Z'}),null,'Skip stale catchup after 10 AM');
 for(const [index,n] of [[2,0],[3,1],[4,2]]) {
   const day=days[index],small={day,players:people.slice(0,n).map(p=>({id:p.id,name:p.name})),history:[]};await query(db.database.from('bb_daily_runs').insert([{day,cutoff:day+'T16:00:00Z',snapshot:small}]));
   assert.equal(await rpc('bb_queue_daily_matchups',{p_day:day,p_pairs:dailyPairs(small)}),n===2?2:0,'Small roster fallback');
 }
 console.log('Daily real-backend checks passed: signed/read-only preferences, default on, public privacy, PDT/PST, weekdays, two-hour catchup, cutoff roster/history, validated reciprocal pairs, concurrent/restart deduplication and zero/one/two players. No emails sent.');
} finally {
 for(const day of days)await cleanup(day);
 await query(db.database.from('bb_activity').delete().in('actor',ids));await query(db.database.from('bb_games').delete().in('id',gameIds));await query(db.database.from('bb_sessions').delete().in('player_id',ids));await query(db.database.from('bb_players').delete().in('id',ids));
}
