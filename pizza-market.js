import {restaurantQuality,pizzaQuality,pizzaOffer,ratingDemand} from './pizza-quality.js?v=20261018-public2';
import {advertisingMultipliers} from './pizza-advertising.js?v=20261018-public2';
import {taxiMultiplier} from './pizza-taxis.js?v=20261018-public2';
import {property} from './pizza-properties.js?v=20261018-public2';
import {COMPETITORS} from './pizza-competitors.js?v=20261018-public2';
import {shiftAt} from './pizza-shifts.js?v=20261018-public2';
export const CUSTOMER_TIERS=[{id:'simple',name:'Einfach',budget:900},{id:'middle',name:'Mittel',budget:1500},{id:'upscale',name:'Gehoben',budget:2400}];
export const DISTRICTS=[
 {id:'altstadt',name:'Altstadt',bx:0,by:1,customers:[480,300,120]},
 {id:'zentrum',name:'Zentrum',bx:1,by:1,customers:[360,420,240]},
 {id:'domviertel',name:'Domviertel',bx:2,by:0,customers:[220,350,330]},
 {id:'ostviertel',name:'Ostviertel',bx:2,by:1,customers:[550,300,100]},
 {id:'suedviertel',name:'Südviertel',bx:0,by:2,customers:[600,280,90]},
 {id:'fluss',name:'Am Fluss',bx:1,by:2,customers:[260,370,300]},
 {id:'park',name:'Parkviertel',bx:2,by:2,customers:[220,260,200]}
];
export function restaurantDistrict(id){const p=id==='mamma-mia'?{bx:1,by:1}:property(id)||COMPETITORS.find(r=>r.id===id);return DISTRICTS.find(d=>d.bx===p?.bx&&d.by===p?.by);}
export function customerAppeal(profile,menu){
 const q=restaurantQuality(profile),furniture=q.furniture,renovation=profile.finishes?.renovation||0,rating=ratingDemand(profile.service?.rating??4);
 const weights=[[1.35,.38,.035],[.65,1.45,.32],[.2,.8,1.8]][q.index];
 return {furniture,renovation,quality:q,weights:weights.map((n,i)=>{
  const offers=menu.filter(m=>m.active&&m.price<=CUSTOMER_TIERS[i].budget);if(!offers.length)return 0;
  // Customers see the menu: bad value and the wrong food reduce interest before advertising.
  const fit=Math.max(...offers.map(m=>m.recipe?Math.max(.08,1-pizzaOffer(profile,m,CUSTOMER_TIERS[i].id).penalty*.24)*Math.max(.2,1-Math.abs(pizzaQuality(m.recipe).index-i)*.3):1));
  return n*rating*fit;
 })};
}
export function marketReady(p){return p.business.open!==false&&['oven','bar','fridge','table'].every(type=>p.items.some(i=>i.type===type))&&(p.business.cook||0)>0&&(p.business.waiter||0)>0;}
export function districtMarket(district,profiles,menu,rivalry={},minutes=0,{candidate=null,eligible=null,advertising=null,taxis=null}={}){
 const participants=[];
 for(const [id,p]of Object.entries(profiles))if(restaurantDistrict(id)?.id===district.id&&(eligible?eligible[id]:marketReady(p))){const appeal=customerAppeal(p,menu);participants.push({id,own:true,...appeal});}
 if(candidate&&!participants.some(p=>p.id===candidate))participants.push({id:candidate,own:true,...customerAppeal({items:[{type:'table',seats:4,variant:'wood'}],finishes:{renovation:1},service:{rating:4}},menu.length?menu:[{active:true,price:850}])});
 for(const r of COMPETITORS.filter(r=>r.bx===district.bx&&r.by===district.by)){
  const effect=rivalry.effects?.[r.id],factor=effect?.until>minutes?effect.factor:1;
  const appeal=customerAppeal({items:[{type:'table',seats:8,variant:r.id==='enzo'?'premium':'wood'},{type:'oven',variant:r.id==='enzo'?'professional':'brick'},{type:'fridge',variant:'coldroom'},{type:'bar',variant:r.id==='enzo'?'marble':'tiled'}],finishes:{renovation:r.id==='enzo'?3:2},service:{rating:4.2}},[{active:true,price:r.id==='enzo'?1200:850}]);
  participants.push({id:r.id,own:false,...appeal,weights:appeal.weights.map(n=>n*factor)});
 }
 for(const p of participants)if(p.own){p.advertising=advertisingMultipliers(advertising,p.id,minutes);const taxi=taxiMultiplier(taxis,p.id,minutes);p.weights=p.weights.map((n,i)=>n*p.advertising[i]*taxi);}
 const totals=CUSTOMER_TIERS.map((_,i)=>1+participants.reduce((n,p)=>n+p.weights[i],0));
 for(const p of participants){p.shares=p.weights.map((n,i)=>n/totals[i]);p.expected=p.shares.map((n,i)=>Math.floor(n*district.customers[i]));}
 return {district,participants,own:participants.filter(p=>p.own).length,rivals:participants.filter(p=>!p.own).length};
}
export function freshMarket(minutes=0){return {version:1,day:Math.floor(minutes/1440),used:{},credits:{},admitted:{}};}
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&n>=0&&n<=1e9);
export function restoreMarket(raw,minutes,owned=[]){
 const m=freshMarket(minutes);if(raw?.version!==1||raw.day!==m.day)return m;
 for(const d of DISTRICTS)if(vector(raw.used?.[d.id]))m.used[d.id]=raw.used[d.id].map((n,i)=>Math.min(d.customers[i],n));
 for(const id of ['mamma-mia',...owned]){
  if(vector(raw.credits?.[id]))m.credits[id]=raw.credits[id].map(n=>Math.min(16,n));
  if(vector(raw.admitted?.[id]))m.admitted[id]=raw.admitted[id].map(n=>Math.floor(n));
 }
 // Reconcile pending and already requested customers with the shared ledger.
 for(const d of DISTRICTS){const used=m.used[d.id]||[0,0,0];for(let i=0;i<3;i++){
  let spent=0;for(const id of ['mamma-mia',...owned].filter(id=>restaurantDistrict(id)?.id===d.id)){
   if(m.admitted[id]){m.admitted[id][i]=Math.min(m.admitted[id][i],d.customers[i]-spent);spent+=m.admitted[id][i];}
   if(m.credits[id]){m.credits[id][i]=Math.min(m.credits[id][i],d.customers[i]-spent);spent+=m.credits[id][i];}
  }if(spent>used[i]+1e-6){used[i]=spent;m.used[d.id]=used;}
 }}
 return m;
}
export function advanceMarket(m,snapshots,seconds,minutes){
 if(!Number.isFinite(seconds)||seconds<=0)return;
 const day=Math.floor(minutes/1440);if(m.day!==day)Object.assign(m,freshMarket(minutes));
 if(!shiftAt(minutes))return;
 // Eleven opening hours per day; every allocated guest, including rivals,
 // consumes the same finite district pool. Unfilled demand stays unallocated.
 for(const snapshot of snapshots){const d=snapshot.district,used=m.used[d.id]??= [0,0,0];
  for(const p of snapshot.participants){
   const first=p.own&&!m.credits[p.id],credit=p.own?(m.credits[p.id]??=[0,0,0]):null;
   // Release one early party on opening, charged to the same finite pool.
   // This happens once per site and day, including across reloads/reopening.
   if(first){const tier=p.weights.indexOf(Math.max(...p.weights));if(p.weights[tier]>0){const n=Math.min(2,d.customers[tier]-used[tier]);credit[tier]+=n;used[tier]+=n;}}
   for(let i=0;i<3;i++){const amount=Math.max(0,Math.min(d.customers[i]-used[i],d.customers[i]*p.shares[i]*seconds/3300,credit?16-credit[i]:Infinity));used[i]+=amount;if(credit)credit[i]+=amount;}
  }
 }
}
export function claimCustomers(m,id,size,offers){
 if(!Number.isInteger(size)||size<1||size>8)return null;
 const credit=m.credits[id]||[0,0,0],tiers=CUSTOMER_TIERS.map((t,i)=>({t,i})).filter(({t,i})=>credit[i]+1e-8>=size&&offers.some(o=>o.price<=t.budget)).sort((a,b)=>credit[b.i]-credit[a.i]);
 if(!tiers.length)return null;const {t,i}=tiers[0];credit[i]=Math.max(0,credit[i]-size);(m.admitted[id]??=[0,0,0])[i]+=size;return {id:t.id,budget:t.budget};
}
export function purchaseMarket(id,profiles,menu,rivalry,minutes,market,advertising=null,taxis=null){
 const district=restaurantDistrict(id),snapshot=districtMarket(district,profiles,menu,rivalry,minutes,{candidate:(property(id)||id==='mamma-mia')?id:null,advertising,taxis}),site=snapshot.participants.find(p=>p.id===id&&p.own);
 return {...snapshot,site,remaining:district.customers.map((n,i)=>Math.max(0,Math.floor(n-(market?.day===Math.floor(minutes/1440)?market.used[district.id]?.[i]||0:0))))};
}
