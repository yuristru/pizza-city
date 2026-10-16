export const AD_FORMATS=[
 {id:'flyer',name:'Flyer',dailyCents:8000,strength:.25,description:'Direkt verteilt in deinem Viertel.'},
 {id:'poster',name:'Plakatwerbung',dailyCents:16000,strength:.45,description:'Präsenz an den Wegen im Viertel.'},
 {id:'newspaper',name:'Zeitung',dailyCents:24000,strength:.65,description:'Eine Anzeige in der lokalen Zeitung.'},
 {id:'radio',name:'Radio',dailyCents:40000,strength:.9,description:'Dein Werbespot im Lokalradio.'}
];
export const AD_QUALITIES=[
 {id:'simple',name:'Basis',audience:'Einfach',factor:100,description:'Klare Angebote für preisbewusste Gäste.'},
 {id:'middle',name:'Klassisch',audience:'Mittel',factor:150,description:'Gutes Essen und einladende Atmosphäre.'},
 {id:'upscale',name:'Premium',audience:'Gehoben',factor:220,description:'Exklusive Gestaltung für hohe Ansprüche.'}
];
export const AD_DURATIONS=[{days:1,discount:0},{days:3,discount:10},{days:7,discount:20},{days:14,discount:30}];
export function campaignQuote(request){
 const {formatId,qualityId,days}=request||{};
 const format=AD_FORMATS.find(f=>f.id===formatId),quality=AD_QUALITIES.find(q=>q.id===qualityId),duration=AD_DURATIONS.find(d=>d.days===days);
 if(!format||!quality||!duration)return null;
 const regularDailyCents=format.dailyCents*quality.factor/100,dailyCents=regularDailyCents*(100-duration.discount)/100;
 return {format,quality,...duration,regularDailyCents,dailyCents,totalCents:dailyCents*days,strength:format.strength};
}
export function freshAdvertising(){return {version:1,nextId:1,campaigns:[]};}
export const activeCampaigns=(ads,minutes)=>ads?.campaigns?.filter(c=>c.starts<=minutes&&minutes<c.until)||[];
export function advertisingMultipliers(ads,restaurantId,minutes){
 const strengths=[0,0,0];
 for(const c of activeCampaigns(ads,minutes))if(c.restaurantId===restaurantId){const q=AD_QUALITIES.findIndex(q=>q.id===c.qualityId),f=AD_FORMATS.find(f=>f.id===c.formatId);if(q>=0&&f)strengths[q]+=f.strength;}
 return strengths.map(s=>1+Math.min(2,s));
}
export function restoreAdvertising(raw,minutes,profiles){
 const ads=freshAdvertising();if(raw?.version!==1||!Array.isArray(raw.campaigns))return ads;
 const ids=new Set(),activeKeys=new Set();
 for(const c of raw.campaigns.slice(0,256)){
  const quote=campaignQuote(c),key=c&&[c.restaurantId,c.formatId,c.qualityId].join(':');
  if(!quote||!Object.hasOwn(profiles,c.restaurantId)||!Number.isSafeInteger(c.id)||c.id<1||c.id>=1e9||ids.has(c.id)||!Number.isFinite(c.starts)||c.starts<0||c.starts>minutes||c.until!==c.starts+c.days*1440||c.totalCents!==quote.totalCents||(c.until>minutes&&activeKeys.has(key)))continue;
  ads.campaigns.push({id:c.id,restaurantId:c.restaurantId,formatId:c.formatId,qualityId:c.qualityId,days:c.days,starts:c.starts,until:c.until,totalCents:c.totalCents});ids.add(c.id);if(c.until>minutes)activeKeys.add(key);
 }
 ads.nextId=Math.max(0,...ids)+1;
 if(Number.isSafeInteger(raw.nextId)&&raw.nextId>=ads.nextId&&raw.nextId<1e9)ads.nextId=raw.nextId;
 return ads;
}
export function commissionCampaign(ads,request,profiles,balanceCents,minutes){
 const quote=campaignQuote(request),profile=profiles[request?.restaurantId];
 if(!quote||!Object.hasOwn(profiles,request?.restaurantId)||!profile?.service||!Number.isFinite(minutes)||minutes<0)return {ok:false,message:'Bitte Restaurant, Format, Qualität und Laufzeit wählen.'};
 if(activeCampaigns(ads,minutes).some(c=>c.restaurantId===request.restaurantId&&c.formatId===request.formatId&&c.qualityId===request.qualityId))return {ok:false,message:'Dieses Format läuft für diese Zielgruppe hier bereits.'};
 if(!Number.isSafeInteger(balanceCents)||balanceCents<quote.totalCents)return {ok:false,message:'Für diesen Auftrag reicht das Guthaben nicht.'};
 if(activeCampaigns(ads,minutes).length>=240)return {ok:false,message:'Bitte warte, bis eine laufende Kampagne endet.'};
 const campaign={id:ads.nextId++,restaurantId:request.restaurantId,formatId:request.formatId,qualityId:request.qualityId,days:request.days,starts:minutes,until:minutes+request.days*1440,totalCents:quote.totalCents};
 // Advertising is paid once, belongs to this branch and cannot be refunded by room undo.
 profile.service.advertisingCents=(profile.service.advertisingCents||0)+quote.totalCents;
 profile.service.operatingCents=(profile.service.operatingCents||0)+quote.totalCents;
 ads.campaigns=[...activeCampaigns(ads,minutes),...ads.campaigns.filter(c=>c.until<=minutes).sort((a,b)=>a.until-b.until||a.id-b.id).slice(-12),campaign];
 return {ok:true,campaign,quote,balanceCents:balanceCents-quote.totalCents};
}
