import {Resend} from 'resend';
import {config, db, query} from './config.mjs';
const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const resend = config.resendKey ? new Resend(config.resendKey) : null;
export async function sendEmail({to,subject,text,html,key}) {
  if (!resend) throw new Error('Resend is not configured.');
  const recipient = config.environment === 'test' ? config.testSink || to : to;
  if (config.environment === 'test' && !config.testRecipients.includes(recipient)) throw new Error('Test email recipient is not allowed.');
  const {error} = await resend.emails.send({from:config.from,to:recipient,subject,text,html}, {idempotencyKey:key});
  if (error) throw new Error(error.message || 'Email delivery failed.');
}
export async function sendOtp(email,code,key) {
  const text=`Your Burntboard sign-in code is ${code}. It expires in 10 minutes and can be used once. If you did not request this, ignore this email.`;
  await sendEmail({to:email,subject:'Your Burntboard sign-in code',text,
    html:`<h1>One serve away.</h1><p>Your sign-in code:</p><p style="font-size:32px;letter-spacing:6px"><strong>${code}</strong></p><p>Expires in 10 minutes. If you did not request it, ignore this email.</p>`,key});
}
let busy=false;
export async function deliverOutbox(eventId=null) {
  if (busy || !resend) return;
  busy=true;
  try {
    const rows=await query(db.database.rpc('bb_claim_emails',{p_event:eventId}));
    for (const item of rows) {
      try {
        const people=await query(db.database.from('bb_players').select('id,email,name').in('id',[item.recipient,item.payload.actor]).limit(2));
        const recipient=people.find(p=>p.id===item.recipient), actor=people.find(p=>p.id===item.payload.actor);
        if (!recipient) throw new Error('Recipient not found.');
        const link=item.payload.action==='agent.connected' ? `${config.origin}/#agents` : `${config.origin}/#match/${item.payload.gameId}`;
        const score=item.payload.after;
        const before=item.payload.before;
        const message=item.payload.action==='agent.connected' ? `A new agent connection, ${item.payload.label}, was created for your account. Disconnect it on the Agents page if you did not create it.` : item.payload.action==='comment.added' ? `${actor?.name || 'A player'} commented: ${item.payload.text}` :
          `${actor?.name || 'A player'} ${before ? `corrected the score from ${before.score1}–${before.score2} (${before.matches.map(m=>`${m.score1}–${m.score2}`).join(', ')}) to` : 'recorded a best-of-three game:'} ${score.score1}–${score.score2} (${score.matches.map(m=>`${m.score1}–${m.score2}`).join(', ')}).`;
        await sendEmail({to:recipient.email,subject:item.subject,text:`${message}\n\nView match: ${link}\nManage email preferences in your Burntboard profile.`,
          html:`<h1>Table talk.</h1><p>${escape(message)}</p><p><a href="${escape(link)}">View match</a></p><p>Manage email preferences in your Burntboard profile.</p>`,key:`bb-${item.id}`});
        await query(db.database.from('bb_outbox').update({sent_at:new Date().toISOString(),leased_until:null,last_error:null}).eq('id',item.id));
      } catch {
        // Persist a retry without logging private messages, codes, or recipients.
        await query(db.database.from('bb_outbox').update({leased_until:null,last_error:'Delivery failed',
          next_attempt_at:new Date(Date.now()+Math.min(3600000,30000*2**item.attempts)).toISOString()}).eq('id',item.id));
      }
    }
  } finally { busy=false; }
}
