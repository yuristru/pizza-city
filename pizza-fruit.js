import {skateSchedule} from './pizza-city-contacts.js?v=20261017b';
import {commissionSabotage,sabotageIssue} from './pizza-rivalry.js?v=20261017b';
export const FRUITS=[{id:'coconut',name:'Kokosnuss',base:220000,color:0xb58a61},{id:'unicorn',name:'Einhorn',base:65000,color:0xd2a8dc},{id:'waldmeister',name:'Grüner Waldmeister',base:15000,color:0x76a64d}];
export const FRUIT_TRADERS=[{id:'carlo',name:'Carlo',start:13*60,end:16*60,skip:1},{id:'marta',name:'Marta',start:18*60,end:22*60,skip:0}];
const day=m=>Math.floor(m/1440),valid=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e12,hash=(a,b,c=0)=>{let n=Math.imul(a+37,374761393)^Math.imul(b+71,668265263)^Math.imul(c+17,1274126177);return (n^(n>>>13))>>>0;};
export const freshFruit=()=>({version:1,stock:{coconut:0,unicorn:0,waldmeister:0},costCents:0,revenueCents:0,bought:{day:-1,count:0},sold:{},giftDay:-1,history:[]});
export const traderOpen=(id,minutes)=>{const t=FRUIT_TRADERS.find(t=>t.id===id),clock=minutes%1440;return !!t&&day(minutes)%3!==t.skip&&clock>=t.start&&clock<t.end;};
export function fruitBuyQuote(fruit,id,quantity,minutes,discount=0){
 const index=FRUITS.findIndex(p=>p.id===id),product=FRUITS[index];if(!product||!Number.isInteger(quantity)||quantity<1||quantity>5||![0,8].includes(discount)||!Number.isFinite(minutes)||minutes<0)return null;
 const unitCents=Math.round(product.base*(90+hash(day(minutes),index)%21)/100*(100-discount)/100),used=fruit.bought.day===day(minutes)?fruit.bought.count:0;
 return {product,quantity,unitCents,totalCents:unitCents*quantity,remaining:Math.max(0,10-used),space:30-Object.values(fruit.stock).reduce((a,b)=>a+b,0)};
}
function remember(fruit,record){fruit.history.push(record);fruit.history=fruit.history.slice(-40);}
export function buyFruit(fruit,id,quantity,minutes,balanceCents,discount=0){
 const q=fruitBuyQuote(fruit,id,quantity,minutes,discount);if(!q)return {ok:false,message:'Sorte und 1 bis 5 Kisten wählen.'};
 if(quantity>q.remaining)return {ok:false,message:'Der Großhandel gibt dir höchstens 10 Kisten pro Spieltag.'};if(quantity>q.space)return {ok:false,message:'Dein Vorrat fasst höchstens 30 Kisten.'};if(!valid(balanceCents)||balanceCents<q.totalCents)return {ok:false,message:'Für diese Lieferung reicht das Guthaben nicht.'};
 fruit.stock[id]+=quantity;fruit.costCents+=q.totalCents;fruit.bought={day:day(minutes),count:10-q.remaining+quantity};remember(fruit,{kind:'buy',product:id,quantity,cents:q.totalCents,minute:minutes});return {ok:true,quote:q,balanceCents:balanceCents-q.totalCents};
}
export function fruitSellQuote(fruit,traderId,id,quantity,minutes){
 const index=FRUITS.findIndex(p=>p.id===id),product=FRUITS[index],t=FRUIT_TRADERS.findIndex(t=>t.id===traderId);if(!product||t<0||!Number.isInteger(quantity)||quantity<1||quantity>5||!Number.isFinite(minutes)||minutes<0)return null;
 const record=fruit.sold[traderId]?.day===day(minutes)?fruit.sold[traderId]:{counts:{coconut:0,unicorn:0,waldmeister:0},spent:0},unitCents=Math.round(product.base*(125+hash(day(minutes),index,t+10)%36)/100),wanted=2+hash(day(minutes),index,t+30)%4;
 return {product,quantity,unitCents,totalCents:unitCents*quantity,wanted:Math.max(0,wanted-(record.counts[id]||0)),cash:1500000-record.spent,stock:fruit.stock[id],open:traderOpen(traderId,minutes)};
}
export function sellFruit(fruit,traderId,id,quantity,minutes,balanceCents){
 const q=fruitSellQuote(fruit,traderId,id,quantity,minutes);if(!q||!valid(balanceCents))return {ok:false,message:'Bitte ein gültiges Angebot wählen.'};if(!q.open)return {ok:false,message:'Der Händler hat für heute eingepackt.'};if(quantity>q.stock)return {ok:false,message:'So viele Kisten hast du nicht dabei.'};if(quantity>q.wanted)return {ok:false,message:'Für diese Sorte ist die Nachfrage heute ausgeschöpft.'};if(q.totalCents>q.cash)return {ok:false,message:'So viel Bargeld hat der Händler heute nicht mehr.'};
 const sold=fruit.sold[traderId]?.day===day(minutes)?fruit.sold[traderId]:{day:day(minutes),counts:{coconut:0,unicorn:0,waldmeister:0},spent:0};sold.counts[id]=(sold.counts[id]||0)+quantity;sold.spent+=q.totalCents;fruit.sold[traderId]=sold;fruit.stock[id]-=quantity;fruit.revenueCents+=q.totalCents;remember(fruit,{kind:'sell',traderId,product:id,quantity,cents:q.totalCents,minute:minutes});return {ok:true,quote:q,balanceCents:balanceCents+q.totalCents};
}
export function giftIssue(fruit,rivalry,target,minutes,balanceCents){if(skateSchedule(minutes)==='absent')return 'Die Crew ist erst ab 12:00 Uhr wieder da.';if(!fruit.stock.waldmeister)return 'Du brauchst eine Kiste Grünen Waldmeister.';if(fruit.giftDay===day(minutes))return 'Die Crew hat heute schon ein Geschenk bekommen.';return sabotageIssue(rivalry,target,'doodle',balanceCents,minutes);}
export function giftSkaters(fruit,rivalry,target,minutes,balanceCents,acceptRoll,actionRoll){
 const issue=giftIssue(fruit,rivalry,target,minutes,balanceCents);if(issue||![acceptRoll,actionRoll].every(n=>Number.isFinite(n)&&n>=0&&n<1))return {ok:false,message:issue||'Ungültiges Geschenk.'};
 const accepted=acceptRoll<.55;let order=null;if(accepted){order=commissionSabotage(rivalry,{target,action:'doodle',channel:'skate',contactId:'skate-crew',gift:true},balanceCents,minutes,actionRoll);if(!order.ok)return order;}
 fruit.stock.waldmeister--;fruit.giftDay=day(minutes);remember(fruit,{kind:'gift',product:'waldmeister',quantity:1,cents:0,minute:minutes,accepted});return {ok:true,accepted,job:order?.job,balanceCents,message:accepted?'Lea grinst: „Kleine Kiste, kleiner Schriftzug. Wir schauen später vorbei.“':'Milo nimmt die Kiste: „Danke. Heute fahren wir lieber noch ein paar Runden.“'};
}
export function restoreFruit(raw,minutes){
 const f=freshFruit();if(raw?.version!==1)return f;
 for(const p of FRUITS)if(Number.isInteger(raw.stock?.[p.id])&&raw.stock[p.id]>=0&&raw.stock[p.id]<=30)f.stock[p.id]=raw.stock[p.id];if(Object.values(f.stock).reduce((a,b)=>a+b,0)>30)f.stock={...freshFruit().stock};
 for(const k of ['costCents','revenueCents'])if(valid(raw[k]))f[k]=raw[k];const today=day(minutes);
 if(raw.bought?.day===today&&Number.isInteger(raw.bought.count)&&raw.bought.count>=0&&raw.bought.count<=10)f.bought={...raw.bought};
 for(const t of FRUIT_TRADERS){const r=raw.sold?.[t.id];if(r?.day!==today||!valid(r.spent)||r.spent>1500000||!FRUITS.every(p=>r.counts?.[p.id]===undefined||Number.isInteger(r.counts[p.id])&&r.counts[p.id]>=0&&r.counts[p.id]<=5))continue;f.sold[t.id]={day:today,spent:r.spent,counts:Object.fromEntries(FRUITS.map(p=>[p.id,r.counts[p.id]||0]))};}
 if(Number.isInteger(raw.giftDay)&&raw.giftDay>=-1&&raw.giftDay<=today)f.giftDay=raw.giftDay;
 if(Array.isArray(raw.history))f.history=raw.history.filter(h=>['buy','sell','gift'].includes(h?.kind)&&FRUITS.some(p=>p.id===h.product)&&Number.isInteger(h.quantity)&&h.quantity>=1&&h.quantity<=5&&valid(h.cents)&&Number.isFinite(h.minute)&&h.minute>=0&&h.minute<=minutes).slice(-40).map(h=>({kind:h.kind,product:h.product,quantity:h.quantity,cents:h.cents,minute:h.minute,...(FRUIT_TRADERS.some(t=>t.id===h.traderId)?{traderId:h.traderId}:{}),...(h.kind==='gift'?{accepted:h.accepted===true}:{})}));return f;
}

export function fruitTraderSites(gardens){return gardens.map((g,i)=>{
 const candidates=[];for(let y=g.y0+.7;y<g.y1-.6;y+=.4)for(let x=g.x0+.7;x<g.x1-.6;x+=.4){if(x>g.apron.x0-.3&&x<g.apron.x1+.3&&y>g.apron.y0-.3&&y<g.apron.y1+.3)continue;if([...g.trees,...g.benches].some(p=>Math.hypot(x-p.x,y-p.y)<.75))continue;candidates.push({x,y,score:-Math.hypot(x-(g.x0+.75),y-(g.y0+(g.y1-g.y0)*.45))});}candidates.sort((a,b)=>b.score-a.score);const site=candidates[0];if(!site)throw new Error('No clear fruit-cart site in '+g.id);return {...site,id:FRUIT_TRADERS[i].id,name:FRUIT_TRADERS[i].name,blockId:g.id};});}
