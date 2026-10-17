// Shared customer expectations. Prices are Pfennig; scores range from zero to two.
export const QUALITY_TIERS=[{id:'simple',name:'Einfach'},{id:'middle',name:'Mittel'},{id:'upscale',name:'Gehoben'}];
const clamp=n=>Math.max(0,Math.min(2,n));
const tier=score=>score>=1.4?2:score>=.65?1:0;
const ingredientLevel={mozzarella:0,basil:0,onion:0,pepper:0,olive:1,mushroom:1,ham:1,salami:1,parmesan:2,tuna:2};
export function restaurantQuality(profile={}){
 const items=profile.items||[],tables=items.filter(i=>i.type==='table'),seats=tables.reduce((n,t)=>n+(t.seats||4),0);
 const furniture=seats?tables.reduce((n,t)=>n+(t.seats||4)*({plastic:0,wood:1,premium:2}[t.variant||'wood']??1),0)/seats:0;
 const renovation=clamp((profile.finishes?.renovation||0)*2/3);
 const variants={oven:{electric:0,brick:1,professional:2},fridge:{compact:0,coldroom:2},bar:{rustic:0,tiled:1,marble:2}},defaults={oven:'brick',fridge:'compact',bar:'rustic'};
 const equipment=Object.keys(variants).reduce((n,type)=>n+Math.max(0,...items.filter(i=>i.type===type).map(i=>variants[type][i.variant||defaults[type]]??0)),0)/3;
 const score=.4*furniture+.3*renovation+.3*equipment;
 const index=Math.min(tier(score),Math.min(furniture,renovation,equipment)<1?1:2);
 return {...QUALITY_TIERS[index],index,score,furniture,renovation,equipment};
}
export function pizzaQuality(recipe){
 const counts={};for(const t of recipe?.toppings||[])if(t.id in ingredientLevel)counts[t.id]=Math.min(8,(counts[t.id]||0)+1);
 const total=Object.values(counts).reduce((a,b)=>a+b,0),premium=Object.entries(counts).reduce((n,[id,count])=>n+(ingredientLevel[id]===2?count:0),0),special=Object.entries(counts).reduce((n,[id,count])=>n+(ingredientLevel[id]>0?count:0),0);
 // A garnish cannot turn a basic pizza into an exclusive one. Repeated stamps cap at eight.
 const index=premium>=6&&premium/Math.max(1,total)>=.35&&Object.keys(counts).length>=2?2:special>=6?1:0;
 return {...QUALITY_TIERS[index],index,total,premium};
}
export function pizzaOffer(profile,item,customerTier=null){
 const restaurant=restaurantQuality(profile),pizza=pizzaQuality(item.recipe),fairPrice=[[850,1050,1250],[1000,1450,1700],[1100,1700,2350]][restaurant.index][pizza.index];
 const overpriced=Math.max(0,item.price/fairPrice-1),mismatch=Math.max(0,pizza.index-restaurant.index)*.8;
 return {restaurantTier:restaurant.index,pizzaTier:pizza.index,fairPrice,overpriced,mismatch,penalty:Math.min(4,overpriced*3+mismatch),fits:pizza.index<=restaurant.index};
}
export function validExpectation(q){return q&&Number.isInteger(q.fairPrice)&&q.fairPrice>=1&&q.fairPrice<=99999&&['restaurantTier','pizzaTier'].every(k=>Number.isInteger(q[k])&&q[k]>=0&&q[k]<=2)&&['overpriced','mismatch','penalty'].every(k=>Number.isFinite(q[k])&&q[k]>=0&&q[k]<=1000);}
export function ratingDemand(rating=4){return Math.max(.08,Math.min(1.5,(rating/4)**2));}
