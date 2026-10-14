import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
const compare=(a,b)=>a<b?-1:a>b?1:0;
export const dailyToken=(id,key)=>id+'.'+createHmac('sha256',key).update('daily-preference-v1:'+id).digest('base64url');
export function dailyTokenPlayer(token,key) {
  if(typeof token!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[A-Za-z0-9_-]{43}$/.test(token))return null;
  const id=token.split('.')[0],expected=dailyToken(id,key);
  return timingSafeEqual(Buffer.from(token),Buffer.from(expected))?id:null;
}
// Start with a shared cycle giving everyone two distinct, reciprocal opponents.
// Cheapest insertion followed by improving edge swaps reduces a lexicographic
// cost: recent game count, then recency, then a date-seeded tie score. No LLM.
export function dailyPairs(snapshot) {
  const seed=value=>createHash('sha256').update(snapshot.day+':'+value).digest('hex');
  const ids=snapshot.players.map(p=>p.id).sort((a,b)=>compare(seed(a),seed(b))||compare(a,b));
  const history=new Map(snapshot.history.map(h=>[[h.player1,h.player2].sort().join(':'),h]));
  const costs=new Map();
  const cost=(a,b)=>{const pair=[a,b].sort().join(':');if(!costs.has(pair)){const h=history.get(pair);costs.set(pair,[Number(h?.games||0),h?Math.max(0,28-(Date.parse(snapshot.day)-Date.parse(h.lastPlayed))/86400000):0,parseInt(seed(pair).slice(0,8),16)]);}return costs.get(pair);};
  const sum=(...values)=>[0,1,2].map(i=>values.reduce((total,v)=>total+v[i],0));
  const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
  const less=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]<b[i];return false;};
  if(ids.length<2)return [];
  if(ids.length===2)return [[...ids].sort()];
  const cycle=ids.slice(0,3);
  for(const id of ids.slice(3)) {
    let best=0,delta;
    for(let i=0;i<cycle.length;i++) {const a=cycle[i],b=cycle[(i+1)%cycle.length],d=subtract(sum(cost(a,id),cost(id,b)),cost(a,b));if(!delta||less(d,delta)){best=i;delta=d;}}
    cycle.splice(best+1,0,id);
  }
  const edges=cycle.map((id,i)=>[id,cycle[(i+1)%cycle.length]].sort());
  // Swaps may split the initial cycle into smaller groups, avoiding unnecessary
  // repeat opponents. Each preserves two distinct opponents for every person.
  for(let pass=0;pass<ids.length;pass++) {
    let change=null,best=[0,0,0];
    const existing=new Set(edges.map(pair=>pair.join(':')));
    for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++) {
      const [a,b]=edges[i],[c,d]=edges[j];if(new Set([a,b,c,d]).size!==4)continue;
      for(const replacement of [[[a,c].sort(),[b,d].sort()],[[a,d].sort(),[b,c].sort()]]) {
        if(replacement.some(pair=>existing.has(pair.join(':'))))continue;
        const delta=subtract(sum(...replacement.map(pair=>cost(...pair))),sum(cost(a,b),cost(c,d)));
        if(less(delta,best)){best=delta;change=[i,j,replacement];}
      }
    }
    if(!change)break;
    edges[change[0]]=change[2][0];edges[change[1]]=change[2][1];
  }
  return edges.sort((a,b)=>compare(a.join(':'),b.join(':')));
}
export function dailyEmail({snapshot,recipientId,origin,key,activeIds}) {
  const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const opponents=snapshot.pairs.filter(pair=>pair.includes(recipientId)).map(pair=>snapshot.players.find(p=>p.id===pair.find(id=>id!==recipientId))).filter(p=>p&&(!activeIds||activeIds.includes(p.id)));
  if(!opponents.length)return null;
  const reason=p=>{const h=snapshot.history.find(h=>[h.player1,h.player2].includes(recipientId)&&[h.player1,h.player2].includes(p.id));return h?`${h.games} ${Number(h.games)===1?'game':'games'} together in the past four weeks. Last played ${h.lastPlayed}.`:'No games together in the past four weeks.';};
  const preference=origin+'/#daily-emails/'+dailyToken(recipientId,key),title=opponents.length===2?'Your two for today.':'Your opponent for today.';
  const avatar=p=>p.image?`<img src="${e(origin+p.image)}" width="72" height="72" alt="" style="border-radius:50%;display:block">`:`<span style="font-size:42px">${e(p.avatar||'🏓')}</span>`;
  const cards=opponents.map(p=>`<tr><td style="padding:20px 24px;border-top:1px solid #e3e5db"><table role="presentation" width="100%"><tr><td width="88">${avatar(p)}</td><td><h2 style="margin:0 0 8px;font-size:24px">${e(p.name)}</h2><p style="margin:0;color:#557566;font-size:14px;line-height:1.5">${e(reason(p))}</p></td></tr></table><p style="margin:18px 0 0"><a href="${e(origin)}/#profile/${e(p.id)}" style="color:#f0532c;font-weight:bold;text-decoration:none">Meet at the table →</a></p></td></tr>`).join('');
  const subject=`🏓 ${opponents.length===2?'Your two':'Your opponent'} for today · Burntboard`;
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f4f2ec;font-family:Arial,Helvetica,sans-serif;color:#24251f"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:25px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffefa"><tr><td style="background:#242a21;padding:25px 24px;border-bottom:4px solid #f0532c"><a href="${e(origin)}/#feed" style="font-size:26px;font-weight:900;color:#fffefa;text-decoration:none">BURNT<span style="color:#f0532c">BOARD.</span></a></td></tr><tr><td style="padding:28px 24px"><p style="font-size:10px;letter-spacing:2px;color:#557566;font-weight:bold">${e(snapshot.day)} · THE DAILY LINEUP</p><h1 style="font-size:32px;margin:12px 0">${title}</h1><p style="color:#6c7367;line-height:1.5;margin-bottom:0">${opponents.length===2?"Two games":"A game"}. A little friendly competition. Your opponents got the same matchup suggestions.<br>Best of three. Play whenever works for you.</p></td></tr>${cards}<tr><td style="padding:24px;background:#edf1e7;font-size:12px;color:#557566;line-height:1.7">Suggestions, not assignments. Only recorded games shape future lineups.<br><a href="${e(preference)}" style="color:#557566">Manage daily matchups</a> · Open the page, then tap Unsubscribe.</td></tr></table></td></tr></table></body></html>`;
  return {subject,html,text:`${title} — ${snapshot.day}\n\n${opponents.map(p=>`${p.name}\n${reason(p)}\n${origin}/#profile/${p.id}`).join('\n\n')}\n\nBest of three. Suggestions, not assignments. Your opponents got the same matchup suggestions.\nManage daily matchups: ${preference}\nOpen the page, then tap Unsubscribe.`};
}
