import {COMPETITORS,competitor} from './pizza-competitors.js?v=20261016e';
export const PHONE_BOOK=[{name:'Ordnungsamt',number:'326500'},{name:'Pronto Pizza',number:'445566'},{name:'Wetteransage',number:'118144'},{name:'Stadtinformation',number:'220011'}];
const say=(call,who,text)=>call.transcript.push({who,text});
export function startPhoneCall(number){
 const entry=PHONE_BOOK.find(p=>p.number===number),call={number,service:entry?.name||null,stage:'ended',credibility:3,target:null,transcript:[]};
 if(!entry){say(call,'Leitung','Kein Anschluss unter dieser Nummer. Bitte prüfen Sie Ihre Wahl.');return call;}
 if(entry.name==='Ordnungsamt'){call.stage='intro';say(call,'Ordnungsamt','Ordnungsamt, Abteilung besondere Vorkommnisse. Bellini am Apparat. Was kann ich für Sie tun?');}
 if(entry.name==='Pronto Pizza'){call.stage='pizza';say(call,'Pronto Pizza','Pronto! Extra Käse oder extra Ärger? Für Beschwerden drücken Sie bitte gedanklich die Eins.');}
 if(entry.name==='Wetteransage')say(call,'Wetteransage','Sonne über der Stadt. Leichter Gegenwind auf der Halfpipe. Beste Aussichten für alle, die lieber draußen Geschäfte machen.');
 if(entry.name==='Stadtinformation')say(call,'Stadtinformation','Die Rampencrew trifft sich am Skaterpark. Zeitung gelesen wird auf den Bänken in den großen Gärten. Mehr wissen wir selbstverständlich nicht.');
 return call;
}
export function phoneChoices(call){
 if(call.stage==='intro')return [{id:'polite',text:'Ich möchte einen diskreten Hinweis geben.'},{id:'boss',text:'Ich verlange sofort Ihren Vorgesetzten!'},{id:'hours',text:'Eigentlich wollte ich nur nach den Öffnungszeiten fragen.'}];
 if(call.stage==='target')return COMPETITORS.map(r=>({id:'target:'+r.id,text:r.name}));
 if(call.stage==='story')return [{id:'calm',text:'Ich bleibe ruhig und komme direkt zum Punkt.'},{id:'dramatic',text:'Ich mache daraus eine ausgesprochen dramatische Geschichte.'},{id:'ramble',text:'Ein Freund von einem Freund hat da so etwas gehört ...'}];
 if(call.stage==='followup')return [{id:'anonymous',text:'Bitte behandeln Sie meinen Hinweis anonym.'},{id:'nervous',text:'Meinen Namen? Äh. Die Verbindung wird gerade ganz schlecht.'},{id:'withdraw',text:'Wissen Sie was, ich ziehe den Hinweis zurück.'}];
 if(call.stage==='pizza')return [{id:'wrong',text:'Falsche Nummer. Aber guter Spruch.'},{id:'cheese',text:'Ist extra Ärger auch mit Käse überbacken?'}];
 return [];
}
export function choosePhoneReply(call,id){
 const choice=phoneChoices(call).find(c=>c.id===id);if(!choice)return false;say(call,'Du',choice.text);
 if(call.stage==='pizza'){say(call,'Pronto Pizza',id==='cheese'?'Nur donnerstags. Und dann ausschließlich mit Vorbestellung. Ciao!':'Passiert den Besten. Die anderen rufen beim Ordnungsamt an. Ciao!');call.stage='ended';return true;}
 if(call.stage==='intro'){
  if(id==='hours'){say(call,'Ordnungsamt','Wir schließen immer genau dann, wenn man uns am dringendsten braucht. Schönen Tag noch!');call.stage='ended';return true;}
  if(id==='boss')call.credibility--;
  say(call,'Ordnungsamt',id==='boss'?'Der Vorgesetzte bin heute ich. Atmen wir einmal durch. Um welches Restaurant geht es?':'Verstehe. Für welches Restaurant möchten Sie einen Vorgang anlegen?');call.stage='target';return true;
 }
 if(call.stage==='target'){const target=id.slice(7);if(!competitor(target))return false;call.target=target;say(call,'Ordnungsamt','Notiert. Und wie möchten Sie Ihren Hinweis vortragen?');call.stage='story';return true;}
 if(call.stage==='story'){
  call.credibility=Math.max(0,Math.min(4,call.credibility+(id==='calm'?1:id==='dramatic'?-1:-2)));
  say(call,'Ordnungsamt',id==='calm'?'Das klingt zumindest geordnet. Eine Rückfrage: Möchten Sie Ihren Namen hinterlassen?':id==='dramatic'?'Weniger Oper, mehr Verwaltungsakt, bitte. Möchten Sie Ihren Namen hinterlassen?':'Ein Freund eines Freundes. Ich nehme vorsichtshalber einen Bleistift. Und Ihr Name?');call.stage='followup';return true;
 }
 if(call.stage==='followup'){
  if(id==='withdraw'){say(call,'Ordnungsamt','Vorgang verworfen. Das Papier verwenden wir für die nächste Kaffeebestellung.');call.stage='ended';return true;}
  if(id==='nervous')call.credibility=Math.max(0,call.credibility-1);
  say(call,'Ordnungsamt',id==='anonymous'?'Anonym vermerkt. Eine missbräuchliche Meldung kann trotzdem auf Sie zurückfallen. Prüfen Sie den Vorgang, bevor Sie ihn verbindlich freigeben.':'Die Verbindung ist ausgezeichnet. Ihre Nervosität vermerke ich trotzdem. Prüfen Sie jetzt den Vorgang, bevor Sie ihn freigeben.');call.stage='review';return true;
 }
 return false;
}
export function phoneOrder(call){return call?.stage==='review'&&competitor(call.target)?{target:call.target,action:'inspection',channel:'phone',credibility:call.credibility}:null;}
export function confirmPhoneCall(call,job){if(!phoneOrder(call))return false;say(call,'Du','Ich gebe den angezeigten Vorgang verbindlich frei.');say(call,'Ordnungsamt','Vorgang '+String(job.id).padStart(4,'0')+' ist aufgenommen. Der Außendienst macht sich in Kürze auf den Weg. Einen unauffälligen Tag noch.');call.stage='ordered';return true;}
