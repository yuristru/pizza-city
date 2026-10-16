import {state,ensureRestaurants,saveLayout,updateMoney,notify} from './pizza-core.js?v=20261016e';
import {COMPETITORS,competitor} from './pizza-competitors.js?v=20261016e';
import {SABOTAGE_ACTIONS,ORDER_CHANNELS,orderQuote,sabotageIssue,commissionSabotage} from './pizza-rivalry.js?v=20261016e';
import {PHONE_BOOK,startPhoneCall,phoneChoices,choosePhoneReply,phoneOrder,confirmPhoneCall} from './pizza-phone.js?v=20261016e';
import {dayLabel,minuteLabel} from './pizza-daily.js?v=20261016e';
import {money} from './pizza-catalog.js?v=20261016e';
const el=id=>document.getElementById(id),node=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;};
const button=(value,action,cls)=>{const b=node('button',value,cls);b.type='button';b.onclick=action;return b;};
const when=n=>dayLabel(Math.floor(n/1440))+' '+minuteLabel(n)+' Uhr';
let mode='guide',site=null,phase='intro',action=null,target='',preferredTarget='',number='',call=null,connecting=false,callToken=0,sound=true,audio=null,lastOrder=null,stamp=0,journalKey='';
function portrait(host,entry){
 const art=state.cityArt.contacts?.[entry.art],canvas=document.createElement('canvas');canvas.width=150;canvas.height=125;canvas.setAttribute('aria-label',entry.type==='phone'?'Telefonzelle':entry.type==='skate'?'Skater auf dem Board':'Kontakt auf einer Parkbank');
 if(art){const image=art.texture.source.resource,scale=Math.min(145/image.width,118/image.height),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(image,(150-image.width*scale)/2,123-image.height*scale,image.width*scale,image.height*scale);}
 host.append(canvas);
}
function bubble(host,who,text){const p=node('div',undefined,'streetBubble');p.dataset.speaker=who==='Du'?'you':'contact';p.append(node('small',who),node('p',text));host.append(p);}
function show(kind,title,eyebrow){
 mode=kind;const dialog=el('underworldDialog');dialog.dataset.kind=kind;el('underworldTitle').textContent=title;el('underworldEyebrow').textContent=eyebrow;el('underworldStatus').textContent='';
 if(!dialog.open)dialog.showModal();el('underworldClose').focus({preventScroll:true});dialog.scrollTop=0;
}
function receipt(host,job){
 const history=state.rivalry.history.find(h=>h.orderId===job.id),quote=orderQuote(job.action,job.channel,job.credibility),pending=state.rivalry.pending.some(j=>j.id===job.id);host.replaceChildren();host.className='streetReceipt';host.dataset.outcome=history?(history.caught?'caught':'success'):'pending';
 host.append(node('span','AUFTRAG '+String(job.id).padStart(4,'0'),'streetEyebrow'),node('h3',history?(history.caught?'Das ist aufgeflogen.':'Die Sache ist erledigt.'):'Abgemacht. Wir kümmern uns.'),node('p',quote.name+' · '+competitor(job.target).name));
 host.append(node('strong',money(quote.costCents/100)+' einmalig bezahlt'));
 if(pending)host.append(node('p','Geplant für '+when(job.due)+'. Noch '+Math.max(1,Math.ceil(job.due-state.gameMinutes))+' Spielminuten.'),node('small','Du kannst weiterbauen. Der Auftrag läuft mit der Spielzeit und bleibt gespeichert. Pause hält ihn an.'));
 if(history)host.append(node('p',history.caught?'Aktion gescheitert. Strafe: '+money(quote.fineCents/100)+'.':'Die Nachfrage des Konkurrenten ist für '+quote.duration/60+' Spielstunden reduziert.'));
 if(state.rivalry.debtCents)host.append(node('p','Offene Strafen insgesamt: '+money(state.rivalry.debtCents/100), 'streetFine'));
}
function journal(host,force=false){
 const key=state.rivalry.pending.map(j=>j.id).join(',')+':'+state.rivalry.history.map(h=>(h.orderId||'alt')+':'+h.minute+':'+h.caught).join(',')+':'+Math.floor(state.gameMinutes)+':'+state.rivalry.debtCents;if(!force&&key===journalKey)return;journalKey=key;host.replaceChildren(node('h3','Deine diskreten Geschäfte'));
 if(!state.rivalry.pending.length&&!state.rivalry.history.length)host.append(node('p','Noch nichts in Auftrag. Lerne zuerst die Leute in der Stadt kennen.','streetEmpty'));
 for(const job of state.rivalry.pending){const row=node('article',undefined,'streetJob');row.dataset.job=String(job.id);row.append(node('strong',SABOTAGE_ACTIONS.find(a=>a.id===job.action).name+' · '+competitor(job.target).name),node('span','Läuft · '+Math.max(1,Math.ceil(job.due-state.gameMinutes))+' Spielminuten · '+when(job.due)));host.append(row);}
 for(const h of state.rivalry.history.slice(-4).reverse()){const row=node('article',undefined,'streetJob');row.dataset.result=h.caught?'caught':'success';row.append(node('strong',(h.caught?'Aufgeflogen':'Erledigt')+' · '+competitor(h.target).name),node('span',SABOTAGE_ACTIONS.find(a=>a.id===h.action).name+' · '+when(h.minute)));host.append(row);}
 if(state.rivalry.debtCents)host.append(node('p','Offene Strafen: '+money(state.rivalry.debtCents/100),'streetFine'));
}
export function openContactGuide(targetId=''){
 preferredTarget=competitor(targetId)?targetId:'';lastOrder=null;show('guide','Die andere Seite der Stadt','PARKBÄNKE · RAMPEN · TELEFONZELLEN');const host=el('underworldContent');host.replaceChildren(node('p','Manche Geschäfte beginnen mit einem Gespräch. Finde einen Ort auf der Karte und tippe dort die Person oder die Telefonzelle an.','streetIntro'));const grid=node('div',undefined,'streetPlaces');
 for(const entry of state.cityContactPlan?.sites||[]){const card=node('article',undefined,'streetPlace'),image=node('div',undefined,'streetPlaceArt');portrait(image,entry);card.append(image,node('h3',entry.name),node('p',entry.type==='bench'?'Kakerlaken und Stinkbomben':entry.type==='skate'?'Fassaden besprühen':'Telefonbuch, Wähltastatur und Anrufe'),node('small',entry.place));const b=button('Auf Karte zeigen',()=>{el('underworldDialog').close();state.onContactFocus?.(entry.id);},'streetFind');b.dataset.findContact=entry.id;card.append(b);grid.append(card);}
 const log=node('section',undefined,'streetJournal');log.id='streetJournal';host.append(grid,log);journal(log,true);
}
export function openCityContact(id){
 const entry=state.cityContactPlan?.sites.find(s=>s.id===id);if(!entry||state.scene!=='city')return;site=entry;phase='intro';action=null;target=preferredTarget;lastOrder=null;call=null;number='';connecting=false;callToken++;show(entry.type==='phone'?'phone':'contact',entry.name,entry.type==='phone'?'FERNSPRECHER · NUR ORTSGESPRÄCHE':entry.type==='skate'?'ROLLEN, RAMPEN, RUFZEICHEN':'KEINE VISITENKARTEN. KEINE FRAGEN.');
 if(entry.type==='phone')renderPhone();else renderContact();
}
function renderContact(){
 const host=el('underworldContent');host.replaceChildren();const hero=node('div',undefined,'streetContactHero'),image=node('div',undefined,'streetPortrait');portrait(image,site);const copy=node('div');copy.append(node('span',site.place,'streetEyebrow'),node('h3',site.type==='skate'?'Guter Trick. Schlechte Ideen.':'Die Zeitung ist von gestern. Die Kontakte sind aktuell.'));hero.append(image,copy);host.append(hero);
 const chat=node('div',undefined,'streetChat');chat.id='contactChat';host.append(chat);
 if(phase==='intro'){
  bubble(chat,site.type==='skate'?'Rampencrew':site.name.split(',')[0],site.type==='skate'?'Milo landet einen Ollie. Lea grinst: „Wenn du wegen der Farbe hier bist, sag es einfach.“':site.id==='bench-nino'?'Nino senkt die Zeitung. „Du stehst auf meiner Sonne. Oder hast du ein interessantes Anliegen?“':'Rocco klopft auf den freien Platz. „Manchmal hilft der Stadt ein bisschen Unruhe. Was führt dich her?“');
  const choices=node('div',undefined,'streetReplies');
  for(const [id,label]of [['business',site.type==='skate'?'Ich hätte einen Auftrag für eure Kunst.':'Ich suche jemanden für eine diskrete Angelegenheit.'],['smalltalk',site.type==='skate'?'Sauberer Trick. Habt ihr kurz Zeit?':'Liest sich die Zeitung heute besonders spannend?']]){const b=button(label,()=>{phase='offer';renderContact();const log=el('contactChat');log.prepend(node('p',label,'streetYourLine'));});b.dataset.contactReply=id;choices.append(b);}choices.append(button('Ich schaue mich nur um.',()=>el('underworldDialog').close()));host.append(choices);return;
 }
 bubble(chat,site.type==='skate'?'Lea':site.name.split(',')[0],site.type==='skate'?'„Wir machen Farbe, keine anderen Geschichten. Sag uns, welche Fassade. Und lies das Kleingedruckte.“':'„Zwei Möglichkeiten. Keine Einzelheiten. Du nennst das Restaurant, ich nenne Preis und Risiko.“');
 if(phase==='receipt'){const paper=node('section');paper.id='contactReceipt';host.append(paper);receipt(paper,lastOrder);return;}
 const cards=node('div',undefined,'streetOffers');
 for(const id of ORDER_CHANNELS[site.type]){const q=orderQuote(id,site.type),b=button('',()=>{action=id;renderContact();});b.dataset.streetAction=id;b.setAttribute('aria-pressed',String(action===id));b.append(node('strong',id==='roaches'?'Kakerlaken':id==='stinkbomb'?'Stinkbombe':'Fassade besprühen'),node('span',money(q.costCents/100)+' · '+Math.round(q.risk*100)+' % Risiko'),node('small',q.description));cards.append(b);}host.append(cards);
 const field=node('label','Welches Konkurrenzrestaurant?','streetTarget'),select=document.createElement('select');select.id='streetTarget';select.append(new Option('Restaurant wählen',''),...COMPETITORS.map(r=>new Option(r.name,r.id)));select.value=target;select.onchange=()=>{target=select.value;updateContactQuote();};field.append(select);host.append(field);
 const quote=node('section',undefined,'streetOrderQuote');quote.id='streetOrderQuote';const confirm=button('Auftrag auswählen',()=>{if(!action||!target)return;const result=book({target,action,channel:site.type,contactId:site.id});if(result.ok){lastOrder=result.job;phase='receipt';renderContact();}});confirm.id='streetConfirm';confirm.className='streetConfirm';host.append(quote,confirm);updateContactQuote();
}
function updateContactQuote(){
 const q=orderQuote(action,site.type),host=el('streetOrderQuote');if(!host)return;host.replaceChildren();const issue=q&&target?sabotageIssue(state.rivalry,target,action,Math.round(state.balance*100),state.gameMinutes):null;
 if(q){host.append(node('strong','Aktionsbudget: '+money(q.costCents/100)),node('p','Ausführung in '+q.delay+' Spielminuten · '+Math.round(q.risk*100)+' % Entdeckungsrisiko · Strafe '+money(q.fineCents/100)),node('small','Einmalig bei Auftragserteilung bezahlt. Bei Entdeckung scheitert die Aktion und die volle Strafe wird fällig.'));}else host.append(node('p','Wähle zuerst eine Aktion.'));
 if(issue)host.append(node('p',issue,'streetFine'));const b=el('streetConfirm');b.disabled=!q||!target||!!issue;b.textContent=q?'Für '+money(q.costCents/100)+' beauftragen':'Auftrag auswählen';
}
function book(request){
 ensureRestaurants();const result=commissionSabotage(state.rivalry,request,Math.round(state.balance*100),state.gameMinutes,crypto.getRandomValues(new Uint32Array(1))[0]/4294967296);
 if(!result.ok){el('underworldStatus').textContent=result.message;return result;}state.balance=result.balanceCents/100;saveLayout();updateMoney();state.onRivalryChange?.();el('underworldStatus').textContent='Auftrag '+String(result.job.id).padStart(4,'0')+' aufgenommen. '+money(result.quote.costCents/100)+' einmalig bezahlt.';notify('Diskreter Auftrag erteilt.');return result;
}
function tone(key,ring=false){
 if(!sound)return;try{const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;audio??=new Context();audio.resume().catch(()=>{});const keys=['123','456','789','*0#'],row=keys.findIndex(s=>s.includes(key)),col=row<0?0:keys[row].indexOf(key),frequencies=ring?[425]:[[697,770,852,941][row],[1209,1336,1477][col]],now=audio.currentTime;
  for(const frequency of frequencies){if(!frequency)continue;const osc=audio.createOscillator(),gain=audio.createGain();osc.frequency.value=frequency;gain.gain.setValueAtTime(.025,now);gain.gain.exponentialRampToValueAtTime(.001,now+(ring?.25:.09));osc.connect(gain).connect(audio.destination);osc.start(now);osc.stop(now+(ring?.26:.1));}
 }catch{}
}
function enterDigit(digit){if(call||connecting||number.length>=12)return;number+=digit;tone(digit);updateDial();}
function resetDial(){callToken++;connecting=false;call=null;number='';lastOrder=null;el('underworldStatus').textContent='';renderPhone();}
function updateDial(){
 if(!el('phoneNumber'))return;el('phoneNumber').value=number;el('phoneLineStatus').textContent=connecting?'FREIZEICHEN ...':call?(call.stage==='ended'||call.stage==='ordered'?'AUFGELEGT':'VERBUNDEN'):'NUMMER WÄHLEN';el('phoneCall').disabled=!!call||connecting||number.length<3;el('phoneDelete').disabled=!!call||connecting||!number;for(const b of el('phoneKeys').children)b.disabled=!!call||connecting;el('phoneLayout').dataset.connected=String(!!call);el('phoneLamp').dataset.on=String(connecting||!!call&&call.stage!=='ended'&&call.stage!=='ordered');
}
function dial(){
 if(call||connecting||number.length<3)return;connecting=true;const token=++callToken;updateDial();tone('',true);el('phoneTranscript').replaceChildren(node('p','Es klingelt. Irgendwo wird eine Kaffeetasse abgestellt.','phoneRinging'));
 setTimeout(()=>{if(token!==callToken||!el('underworldDialog').open)return;call=startPhoneCall(number);connecting=false;updateDial();renderPhoneConversation();},650);
}
function renderPhone(){
 const host=el('underworldContent');host.innerHTML='<div class="phoneLayout" id="phoneLayout"><section class="phoneDevice" aria-label="Klassisches Tastentelefon"><div class="phoneBrand"><span>TELEFONO PUBBLICO</span><button id="phoneSound" type="button" aria-label="Telefontöne" aria-pressed="true">Ton an</button></div><div class="phoneReceiver" aria-hidden="true">☎<span>LINEA LOCALE</span><i id="phoneLamp"></i></div><div class="phoneDisplay"><span id="phoneLineStatus">NUMMER WÄHLEN</span><input id="phoneNumber" aria-label="Gewählte Telefonnummer" readonly placeholder="_ _ _ _ _ _" inputmode="numeric" autocomplete="off"></div><div id="phoneKeys" class="phoneKeys" aria-label="Telefontastatur"></div><div class="phoneActions"><button id="phoneDelete" type="button">⌫ Löschen</button><button id="phoneCall" type="button">☎ Telefonieren</button></div><button id="phoneHangup" class="phoneHangup" type="button">Auflegen / neu wählen</button><details class="phoneDirectory" id="phoneDirectory" open><summary>Das örtliche Telefonbuch</summary><p>Nummer ablesen und über die Tasten eingeben.</p><dl id="phoneBook"></dl></details></section><section class="phoneConversation" id="phoneConversation" aria-label="Telefonat"><div class="phoneConversationHead"><span>AM ANDEREN ENDE DER LEITUNG</span><h3>Wen möchtest du sprechen?</h3></div><div id="phoneTranscript" class="phoneTranscript" role="log" aria-live="polite"></div><div id="phoneCredibility" class="phoneCredibility" hidden></div><div id="phoneReplies" class="streetReplies"></div><div id="phoneReview"></div></section></div>';
 const labels=['','ABC','DEF','GHI','JKL','MNO','PQRS','TUV','WXYZ','','',''];for(const [i,key]of [...'123456789*0#'].entries()){const b=button('',()=>enterDigit(key));b.dataset.phoneKey=key;b.setAttribute('aria-label','Taste '+key);b.append(node('strong',key),node('small',labels[i]||'·'));el('phoneKeys').append(b);}
 for(const entry of PHONE_BOOK)el('phoneBook').append(node('dt',entry.name),node('dd',entry.number));
 el('phoneDelete').onclick=()=>{if(!call&&!connecting){number=number.slice(0,-1);updateDial();}};el('phoneCall').onclick=dial;el('phoneHangup').onclick=resetDial;el('phoneSound').setAttribute('aria-pressed',String(sound));el('phoneSound').textContent=sound?'Ton an':'Ton aus';el('phoneSound').onclick=()=>{sound=!sound;el('phoneSound').setAttribute('aria-pressed',String(sound));el('phoneSound').textContent=sound?'Ton an':'Ton aus';};
 el('phoneTranscript').append(node('p','Das Telefonbuch hat keine Kurzwahltasten. Manche Nummern führen zu hilfreichen Leuten. Andere immerhin zu einer guten Pointe.','phoneIdle'));updateDial();
}
function renderPhoneConversation(){
 const transcript=el('phoneTranscript');transcript.replaceChildren();for(const line of call.transcript)bubble(transcript,line.who,line.text);
 el('phoneConversation').querySelector('h3').textContent=call.service||'Falsche Nummer';const credibility=el('phoneCredibility');credibility.hidden=call.service!=='Ordnungsamt'||call.stage==='ended';credibility.replaceChildren(node('span','Glaubwürdigkeit'));if(!credibility.hidden){const pips=node('span',undefined,'phonePips');for(let i=0;i<4;i++){const dot=node('i');dot.dataset.active=String(i<call.credibility);pips.append(dot);}credibility.append(pips,node('small',['Sehr verdächtig','Wackelige Geschichte','Auffällig','Sachlich','Überzeugend'][call.credibility]));}
 const replies=el('phoneReplies');replies.replaceChildren();for(const choice of phoneChoices(call)){const b=button(choice.text,()=>{if(choosePhoneReply(call,choice.id))renderPhoneConversation();});b.dataset.phoneReply=choice.id;replies.append(b);}
 if(call.stage==='ended')replies.append(button('Neue Nummer wählen',resetDial));renderPhoneReview();updateDial();if(matchMedia('(max-width:700px)').matches){el('phoneDirectory').open=false;replies.scrollIntoView({block:'nearest'});}
}
function renderPhoneReview(){
 const host=el('phoneReview');host.replaceChildren();if(call.stage==='ordered'&&lastOrder){receipt(host,lastOrder);return;}const request=phoneOrder(call);if(!request)return;const q=orderQuote('inspection','phone',call.credibility),issue=sabotageIssue(state.rivalry,request.target,'inspection',Math.round(state.balance*100),state.gameMinutes);host.className='streetOrderQuote';host.append(node('span','VORGANG ZUR FREIGABE','streetEyebrow'),node('h3',competitor(request.target).name),node('p','Fingierter Hinweis beim Ordnungsamt · Kontrolle in '+q.delay+' Spielminuten.'),node('strong',money(q.costCents/100)+' Aktionsbudget, einmalig'),node('p',Math.round(q.risk*100)+' % Entdeckungsrisiko · Strafe '+money(q.fineCents/100)),node('small','Deine Gesprächsführung bestimmt das Risiko. Erst die Freigabe löst Kosten und Auftrag aus.'));
 const issueLine=node('p',issue||'','streetFine');issueLine.id='phoneIssue';host.append(issueLine);const confirm=button('Für '+money(q.costCents/100)+' Vorgang freigeben',()=>{const request=phoneOrder(call);if(!request)return;const result=book({...request,contactId:site.id});if(result.ok){lastOrder=result.job;confirmPhoneCall(call,result.job);renderPhoneConversation();}});confirm.id='phoneConfirm';confirm.className='streetConfirm';confirm.disabled=!!issue;host.append(confirm);
}
export function renderUnderworldUI(force=false){
 if(!el('underworldDialog').open||(!force&&performance.now()-stamp<750))return;stamp=performance.now();if(mode==='guide')journal(el('streetJournal'));else if(mode==='contact'&&phase==='offer')updateContactQuote();else if(mode==='contact'&&lastOrder)receipt(el('contactReceipt'),lastOrder);else if(mode==='phone'&&call?.stage==='ordered'&&lastOrder)receipt(el('phoneReview'),lastOrder);else if(mode==='phone'&&call?.stage==='review'){
  const confirm=el('phoneConfirm'),request=phoneOrder(call);if(confirm&&request){const issue=sabotageIssue(state.rivalry,request.target,'inspection',Math.round(state.balance*100),state.gameMinutes);confirm.disabled=!!issue;el('phoneIssue').textContent=issue||'';}
 }
}
export function mountUnderworldUI(){
 el('contactsBtn').onclick=()=>openContactGuide();el('underworldClose').onclick=()=>el('underworldDialog').close();el('underworldDialog').addEventListener('close',()=>{callToken++;connecting=false;call=null;});
 document.addEventListener('rivalry-changed',()=>renderUnderworldUI(true));document.addEventListener('keydown',event=>{if(!el('underworldDialog').open||mode!=='phone'||call||connecting||event.ctrlKey||event.metaKey||event.altKey)return;if(/^[0-9*#]$/.test(event.key)){event.preventDefault();enterDigit(event.key);}else if(event.key==='Backspace'){event.preventDefault();number=number.slice(0,-1);updateDial();}else if(event.key==='Enter'&&document.activeElement===el('phoneNumber')){event.preventDefault();dial();}});
}
