import {Resend} from 'resend';
import {config, db, query} from './config.mjs';
import {otpEmail,activityEmail} from './email-templates.mjs';
const resend = config.resendKey ? new Resend(config.resendKey) : null;
export async function sendEmail({to,subject,text,html,key}) {
  if (!resend) throw new Error('Resend is not configured.');
  const recipient = config.environment === 'test' ? config.testSink || to : to;
  if (config.environment === 'test' && !config.testRecipients.includes(recipient)) throw new Error('Test email recipient is not allowed.');
  const {error} = await resend.emails.send({from:config.from,to:recipient,subject,text,html}, {idempotencyKey:key});
  if (error) throw new Error(error.message || 'Email delivery failed.');
}
export async function sendOtp(email,code,key) {
  await sendEmail({to:email,subject:'Your Burntboard sign-in code',...otpEmail({origin:config.origin,code}),key});
}
let busy=false;
export async function deliverOutbox(eventId=null) {
  if (busy || !resend) return;
  busy=true;
  try {
    const rows=await query(db.database.rpc('bb_claim_emails',{p_event:eventId}));
    for (const item of rows) {
      try {
        const game=item.payload.action.startsWith('game.') ? (await query(db.database.from('bb_games').select('player1,player2').eq('id',item.payload.gameId).limit(1)))[0] : null;
        const ids=[...new Set([item.recipient,item.payload.actor,game?.player1,game?.player2].filter(Boolean))];
        const people=await query(db.database.from('bb_players').select('id,email,name').in('id',ids).limit(ids.length));
        const recipient=people.find(p=>p.id===item.recipient), actor=people.find(p=>p.id===item.payload.actor);
        if (!recipient) throw new Error('Recipient not found.');
        const template=activityEmail({origin:config.origin,payload:item.payload,actorName:actor?.name || 'A player',recipientId:recipient.id,
          player1Name:people.find(p=>p.id===game?.player1)?.name,player2Name:people.find(p=>p.id===game?.player2)?.name});
        await sendEmail({to:recipient.email,subject:item.subject,...template,key:`bb-${item.id}`});
        await query(db.database.from('bb_outbox').update({sent_at:new Date().toISOString(),leased_until:null,last_error:null}).eq('id',item.id));
      } catch {
        // Persist a retry without logging private messages, codes, or recipients.
        await query(db.database.from('bb_outbox').update({leased_until:null,last_error:'Delivery failed',
          next_attempt_at:new Date(Date.now()+Math.min(3600000,30000*2**item.attempts)).toISOString()}).eq('id',item.id));
      }
    }
  } finally { busy=false; }
}
