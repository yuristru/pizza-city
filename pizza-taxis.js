export const TAXI_DRIVERS=[
 {id:'gino',name:'Gino',variant:1,line:'Bei mir fragt jeder zweite Fahrgast, wo man hier eine gute Pizza bekommt.'},
 {id:'ada',name:'Ada',variant:6,line:'Bahnhof, Hotel, Altstadt. Meine Fahrgäste haben meistens auch Hunger.'},
 {id:'paolo',name:'Paolo',variant:11,line:'Du machst die Pizza. Ich erzähle meinen Fahrgästen davon.'}
];
export const TAXI_DURATIONS=[{days:7,label:'Eine Woche',discount:0},{days:30,label:'Ein Monat',discount:20},{days:365,label:'Ein Jahr',discount:40}];
export const TAXI_STRENGTH=.2;
export function taxiQuote(request){
 const driver=TAXI_DRIVERS.find(d=>d.id===request?.driverId),duration=TAXI_DURATIONS.find(d=>d.days===request?.days);
 if(!driver||!duration)return null;
 const dailyCents=6000*(100-duration.discount)/100;
 return {driver,...duration,dailyCents,totalCents:dailyCents*duration.days,strength:TAXI_STRENGTH};
}
export const freshTaxis=()=>({version:1,nextId:1,contracts:[]});
export const activeTaxiContracts=(taxis,minutes)=>taxis?.contracts?.filter(c=>c.starts<=minutes&&minutes<c.until)||[];
export function taxiMultiplier(taxis,id,minutes){return 1+Math.min(.6,activeTaxiContracts(taxis,minutes).filter(c=>c.restaurantId===id).length*TAXI_STRENGTH);}
export function restoreTaxis(raw,minutes,profiles){
 const result=freshTaxis(),ids=new Set(),drivers=new Set();if(raw?.version!==1||!Array.isArray(raw.contracts))return result;
 for(const c of raw.contracts.slice(0,128)){
  const q=taxiQuote(c);if(!q||!Object.hasOwn(profiles,c.restaurantId)||!Number.isSafeInteger(c.id)||c.id<1||c.id>=1e9||ids.has(c.id)||!Number.isFinite(c.starts)||c.starts<0||c.starts>minutes||c.until!==c.starts+c.days*1440||c.totalCents!==q.totalCents||c.until>minutes&&drivers.has(c.driverId))continue;
  result.contracts.push({id:c.id,driverId:c.driverId,restaurantId:c.restaurantId,days:c.days,starts:c.starts,until:c.until,totalCents:c.totalCents});ids.add(c.id);if(c.until>minutes)drivers.add(c.driverId);
 }
 result.nextId=Math.max(0,...ids)+1;if(Number.isSafeInteger(raw.nextId)&&raw.nextId>=result.nextId&&raw.nextId<1e9)result.nextId=raw.nextId;return result;
}
export function commissionTaxi(taxis,request,profiles,balanceCents,minutes){
 const q=taxiQuote(request),p=profiles[request?.restaurantId];
 if(!q||!Object.hasOwn(profiles,request?.restaurantId)||!p?.service||!Number.isFinite(minutes)||minutes<0)return {ok:false,message:'Bitte Fahrer, Restaurant und Laufzeit wählen.'};
 if(activeTaxiContracts(taxis,minutes).some(c=>c.driverId===request.driverId))return {ok:false,message:'Dieser Fahrer hat bereits einen laufenden Vertrag.'};
 if(!Number.isSafeInteger(balanceCents)||balanceCents<q.totalCents)return {ok:false,message:'Für diesen Taxi-Vertrag reicht das Guthaben nicht.'};
 const contract={id:taxis.nextId++,driverId:request.driverId,restaurantId:request.restaurantId,days:request.days,starts:minutes,until:minutes+request.days*1440,totalCents:q.totalCents};
 p.service.advertisingCents=(p.service.advertisingCents||0)+q.totalCents;p.service.operatingCents=(p.service.operatingCents||0)+q.totalCents;
 taxis.contracts=[...activeTaxiContracts(taxis,minutes),...taxis.contracts.filter(c=>c.until<=minutes).sort((a,b)=>a.until-b.until).slice(-9),contract];
 return {ok:true,contract,quote:q,balanceCents:balanceCents-q.totalCents};
}
