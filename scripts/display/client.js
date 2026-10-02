import QRCode from 'qrcode';
import {cleanSnapshot} from './protocol';
const config = window.COLD_CALL_CONFIG?.reviews;
const DISPLAY_URL = new URL('display.html', location.href.split('#')[0]);
const HOME_URL = new URL('./', DISPLAY_URL);
const isDisplay = !!document.getElementById('pupil-display');
const STORE = isDisplay ? 'tnt-display-screen-v1' : 'tnt-display-controller-v1';
const textEncoder = new TextEncoder();
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('');
const secret = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const fromHex = value => new Uint8Array(value.match(/../g).map(v => parseInt(v,16)));
const base64 = bytes => btoa(String.fromCharCode(...bytes));
const bytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const importKey = value => crypto.subtle.importKey('raw',fromHex(value),'AES-GCM',false,['encrypt','decrypt']);
const encrypt = async (key,value) => {
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await importKey(key),textEncoder.encode(JSON.stringify(value)));
 return base64(iv)+'.'+base64(new Uint8Array(data));
};
const decrypt = async (key,value) => {
 const [iv,data]=value.split('.');
 return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv)},await importKey(key),bytes(data))));
};
const rpc = async (name,body) => {
 if (!config || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url)) throw Error('Display not configured');
 const response=await fetch(config.url+'/rest/v1/rpc/display_'+name,{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 if (!response.ok) {const error=Error('Connection unavailable');error.terminal=[400,401,403,404].includes(response.status);throw error;}
 const result=await response.text();return result ? JSON.parse(result) : null;
};
let session, pending, phase='idle', message='', snapshot={mode:'idle'}, stopped=false;
try {session=JSON.parse(sessionStorage.getItem(STORE));if(session && (!validSession(session) || Date.parse(session.expires)<=Date.now())) session=null;} catch {}
function validSession(value) {return value && /^[0-9a-f-]{36}$/.test(value.id) && /^[a-f0-9]{64}$/.test(value.key) && /^[a-f0-9]{64}$/.test(isDisplay ? value.reader : value.writer);}
const save=()=>{try {session ? sessionStorage.setItem(STORE,JSON.stringify(session)) : sessionStorage.removeItem(STORE);} catch {}};
const notify=()=>window.dispatchEvent(new Event('tnt-display-status'));
const setStatus=(next,text)=>{phase=next;message=text;notify();};
const end = async () => {
 const old=session;session=null;pending=null;save();setStatus('idle','Classroom display disconnected.');
 if(isDisplay) {clearPupil();document.getElementById('display-setup').hidden=false;document.getElementById('display-confirm').hidden=true;document.getElementById('display-controls').hidden=true;document.getElementById('pair-qr').removeAttribute('src');document.getElementById('pair-link').value='';document.getElementById('pair-details').hidden=true;}
 if(old) try {await rpc('close_session',{p_id:old.id,p_token:isDisplay?old.reader:old.writer});} catch {}
};
// Pairing credentials live in the fragment, removed before website analytics runs.
if(!isDisplay && location.hash.startsWith('#classroom/pair/')) {
 try {
  const value=JSON.parse(decodeURIComponent(location.hash.slice('#classroom/pair/'.length)));
  if(/^[0-9a-f-]{36}$/.test(value.id) && /^[a-f0-9]{64}$/.test(value.key) && /^[a-f0-9]{64}$/.test(value.pairing)) pending=value;
 } catch {}
 history.replaceState(null,'',location.pathname+location.search+'#classroom');
 if(pending) {if(session) {const old=session;rpc('close_session',{p_id:old.id,p_token:old.writer}).catch(()=>{});}session=null;save();setStatus('invited','Connect this phone to the classroom screen.');}
 else setStatus('error','This pairing link is invalid. Create a new code on the laptop.');
}
const connect = async () => {
 if(!pending) return;
 setStatus('connecting','Connecting…');
 try {
  const writer=secret();const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');
  const expiry=await rpc('claim_session',{p_id:pending.id,p_pairing:pending.pairing,p_writer:writer,p_ciphertext:await encrypt(pending.key,{mode:'pair',code})});
  session={id:pending.id,key:pending.key,writer,code,expires:expiry,sequence:1};pending=null;save();setStatus('confirm','Check '+code+' on the laptop, then confirm there.');
 } catch {setStatus('error','Could not pair. This code may have been used or expired. Create a new code on the laptop.');}
};
// A strict whitelist: never accept a class object, history, student IDs or outcomes.

window.COLD_CALL_DISPLAY={status:()=>({phase,message,code:session?.code,available:!!config}),connect,end,publish:value=>{snapshot=cleanSnapshot(value);},clear:()=>{snapshot={mode:'paused'};}};
let lastSent='',lastSendAt=0,lastPoll=0,inFlight=false;
async function controllerTick() {
 if(!session || inFlight || document.hidden) return;
 inFlight=true;
 try {
  if(Date.parse(session.expires)<=Date.now()) {await end();setStatus('expired','Session ended. Pair again on the laptop.');return;}
  if(Date.now()-lastPoll>2500) {
   const state=await rpc('session_status',{p_id:session.id,p_writer:session.writer});lastPoll=Date.now();
   if(!state.active) {setStatus('confirm','Check '+session.code+' on the laptop, then confirm there.');return;}
   if(!state.display_seen_at || Date.now()-Date.parse(state.display_seen_at)>15000) {setStatus('reconnecting','Laptop disconnected. Keep both pages open.');return;}
   setStatus('connected','Connected to classroom screen. Keep this phone page open and awake.');
  }
  if(phase!=='connected') return;
  const payload=JSON.stringify(snapshot);
  if(payload===lastSent && Date.now()-lastSendAt<4000) return;
  const current=session;const sequence=++current.sequence;save();
  await rpc('write_session',{p_id:current.id,p_writer:current.writer,p_sequence:sequence,p_ciphertext:await encrypt(current.key,{...snapshot,sentAt:Date.now()})});
  lastSent=payload;lastSendAt=Date.now();
 } catch(error) {if(error.terminal){session=null;save();setStatus('expired','Screen session ended. Create a new pairing code on the laptop.');}else{setStatus('reconnecting','Connection lost. Reconnecting… Keep both pages open.');lastPoll=0;}}
 finally {inFlight=false;}
}
function clearPupil() {if(!isDisplay)return;document.getElementById('pupil-content').hidden=true;document.getElementById('pupil-name').textContent='';document.getElementById('pupil-progress').textContent='';}
const setText=(id,value)=>{document.getElementById(id).textContent=value;};
let lastSequence=-1,lastUpdate=0,currentState=null,confirmReady=false;
function renderPupil(v) {
 const state=cleanSnapshot(v);currentState=state;
 document.getElementById('pupil-content').hidden=false;
 setText('pupil-avatar',state.mode==='name'?state.avatar:state.mode==='timer'?(state.phase==='pair'?'🗣️':state.phase==='check'?'✍️':'💭'):'💭');
 setText('pupil-name',state.mode==='name'?state.name:state.mode==='timer'?(state.prompt || 'Thinking time'):state.mode==='paused'?'Pause for a moment':'Ready when you are');
 setText('pupil-prompt',state.mode==='name'?(state.prompt || 'We’re listening to your thinking'):state.mode==='timer'?(state.phase==='pair'?'Pair and rehearse':state.phase==='check'?'Everyone responds':'Everyone prepares an answer'):'Everyone prepares an answer');
 setText('pupil-progress',state.progress?'Round '+state.progress.round+' · '+state.progress.picked+' of '+state.progress.total+' voices heard':'');
 renderTimer();
}
function renderTimer() {
 if(!isDisplay)return;const el=document.getElementById('pupil-timer');el.hidden=currentState?.mode!=='timer';
 if(currentState?.mode==='timer')el.textContent=String(Math.max(0,Math.ceil((currentState.endsAt-Date.now())/1000)));
}
async function displayTick() {
 if(!session || inFlight || document.hidden)return;
 inFlight=true;
 try {
  const result=await rpc('read_session',{p_id:session.id,p_reader:session.reader});
  if(!session)return;
  if(result.ciphertext && result.sequence!==lastSequence) {
   const value=await decrypt(session.key,result.ciphertext);lastSequence=result.sequence;
   if(value.mode==='pair' && /^\d{6}$/.test(value.code)) {
    session.code=value.code;save();confirmReady=true;document.getElementById('display-confirm').hidden=false;document.getElementById('pair-details').hidden=true;setText('confirm-code',value.code);setText('display-status','Check this code matches the phone.');
   } else if(result.active) {renderPupil(value);}
  }
  if(result.active) {
   document.getElementById('display-setup').hidden=true;document.getElementById('display-confirm').hidden=true;document.getElementById('display-controls').hidden=false;
   lastUpdate=Date.parse(result.updated_at||0);
   if(Date.now()-lastUpdate>15000) {currentState=null;clearPupil();setText('display-status','Phone disconnected. Waiting to reconnect…');}
   else {setText('display-status','');if(!currentState) {const value=await decrypt(session.key,result.ciphertext);if(value.mode!=='pair')renderPupil(value);}}
  }
 } catch(error) {
  if(error.terminal){session=null;save();currentState=null;clearPupil();document.getElementById('display-setup').hidden=false;document.getElementById('display-confirm').hidden=true;document.getElementById('display-controls').hidden=true;document.getElementById('pair-details').hidden=true;}
  setText('display-status',error.terminal || Date.parse(session?.expires||0)<=Date.now()?'Session ended. Create a new pairing code.':'Connection lost. Reconnecting…');
  if(Date.now()-lastUpdate>15000) {currentState=null;clearPupil();}
 }
 finally {inFlight=false;}
}
if(isDisplay) {
 document.getElementById('pair-create').onclick=async()=>{
  const button=document.getElementById('pair-create');button.disabled=true;setText('display-status','Creating your pairing code…');
  try {
   await end();const id=crypto.randomUUID(),reader=secret(),pairing=secret(),key=secret();
   const expires=await rpc('create_session',{p_id:id,p_reader:reader,p_pairing:pairing});session={id,reader,key,pairing,expires};save();lastSequence=-1;confirmReady=false;currentState=null;
   const link=HOME_URL.href+'#classroom/pair/'+encodeURIComponent(JSON.stringify({id,pairing,key}));
   document.getElementById('pair-link').value=link;document.getElementById('pair-qr').src=await QRCode.toDataURL(link,{width:280,margin:2,errorCorrectionLevel:'M'});
   document.getElementById('pair-details').hidden=false;setText('display-status','Scan with your phone camera, then open the link.');
  } catch {setText('display-status','Could not create a code. Check your connection and try again.');}
  finally {button.disabled=false;}
 };
 document.getElementById('pair-copy').onclick=async()=>{try {await navigator.clipboard.writeText(document.getElementById('pair-link').value);setText('display-status','Pairing link copied. Share only with your own phone.');}catch {document.getElementById('pair-link').select();}};
 document.getElementById('pair-confirm').onclick=async()=>{
  if(!session || !confirmReady)return;
  try {await rpc('activate_session',{p_id:session.id,p_reader:session.reader});session.active=true;delete session.pairing;save();confirmReady=false;renderPupil({mode:'idle'});await displayTick();}
  catch {setText('display-status','Could not confirm. Please try again.');}
 };
 document.querySelectorAll('[data-end-display]').forEach(button=>button.onclick=()=>{end();setText('display-status','Session ended. You can pair another phone.');});
 document.getElementById('display-fullscreen').onclick=()=>{document.documentElement.requestFullscreen?.().catch(()=>{setText('display-status','Use your browser’s fullscreen option.');});};
 if(session?.active) {document.getElementById('display-setup').hidden=true;document.getElementById('display-controls').hidden=false;}
 else if(session) {end();setText('display-status','Create a new code to pair your phone.');}
 setInterval(()=>{renderTimer();if(session && currentState && lastUpdate && Date.now()-lastUpdate>15000){currentState=null;clearPupil();setText('display-status','Phone disconnected. Waiting to reconnect…');}},200);setInterval(displayTick,1000);displayTick();
} else {setInterval(controllerTick,750);controllerTick();}
// Resume promptly after a tab or network interruption; no updates run in the background.
window.addEventListener('online',()=>{lastPoll=0;isDisplay?displayTick():controllerTick();});
document.addEventListener('visibilitychange',()=>{lastPoll=0;lastSent='';if(!document.hidden)(isDisplay?displayTick():controllerTick());});
