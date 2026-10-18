import {restaurantPlan} from './pizza-floorplans.js?v=20261018-bridge3';
export const PROPERTY_SIZES={
  small:{name:'Klein',badge:'S',area:80,color:0x66834b},
  medium:{name:'Mittel',badge:'M',area:160,color:0xc09242},
  large:{name:'Groß',badge:'L',area:280,color:0xa85138}
};
export const PROPERTIES=[
  {id:'san-marco',name:'San Marco',district:'Altstadt',size:'small',price:28000,bx:0,by:1,slot:0,art:'buildings',sprite:9},
  {id:'via-roma',name:'Via Roma',district:'Altstadt',size:'medium',price:64000,bx:0,by:1,slot:1,art:'buildings',sprite:20},
  {id:'piazza-limone',name:'Piazza Limone',district:'Zentrum',size:'small',price:32000,bx:1,by:1,slot:1,art:'buildings',sprite:13},
  {id:'belvedere',name:'Belvedere',district:'Domviertel',size:'medium',price:72000,bx:2,by:0,slot:0,art:'buildings',sprite:13},
  {id:'palazzo-sole',name:'Palazzo del Sole',district:'Domviertel',size:'large',price:118000,bx:2,by:0,slot:1,art:'buildings',sprite:7},
  {id:'mercato',name:'Il Mercato',district:'Südviertel',size:'large',price:138000,bx:0,by:2,slot:0,art:'buildings',sprite:11},
  {id:'bottega',name:'La Bottega',district:'Südviertel',size:'small',price:38000,bx:0,by:2,slot:1,art:'buildings',sprite:16},
  {id:'lungofiume',name:'Lungofiume',district:'Am Fluss',size:'medium',price:84000,bx:1,by:2,slot:0,art:'buildings',sprite:12},
  {id:'vicolo',name:'Il Vicolo',district:'Altstadt',size:'small',price:34000,bx:0,by:1,slot:2,art:'buildings',sprite:26},
  {id:'fontana',name:'La Fontana',district:'Zentrum',size:'small',price:46000,bx:1,by:1,slot:2,art:'buildings',sprite:19},
  {id:'corso',name:'Corso Centrale',district:'Zentrum',size:'medium',price:94000,bx:1,by:1,slot:3,art:'buildings',sprite:17},
  {id:'officina',name:'Officina della Pizza',district:'Ostviertel',size:'small',price:30000,bx:2,by:1,slot:1,art:'buildings',sprite:13},
  {id:'forno',name:'Il Forno',district:'Südviertel',size:'small',price:26000,bx:0,by:2,slot:2,art:'buildings',sprite:30},
  {id:'portici',name:'I Portici',district:'Südviertel',size:'large',price:124000,bx:0,by:2,slot:3,art:'buildings',sprite:24},
  {id:'darsena',name:'La Darsena',district:'Am Fluss',size:'medium',price:89000,bx:1,by:2,slot:1,art:'buildings',sprite:18},
  {id:'ponte',name:'Al Ponte',district:'Am Fluss',size:'medium',price:76000,bx:1,by:2,slot:2,art:'buildings',sprite:22},
  {id:'giardino',name:'Il Giardino',district:'Parkviertel',size:'small',price:44000,bx:2,by:2,slot:0,art:'buildings',sprite:21},
  {id:'teatro',name:'Il Teatro',district:'Ostviertel',size:'large',price:156000,bx:2,by:1,slot:0,art:'buildings',sprite:14}
].map(p=>({...p,area:restaurantPlan(p.id).area}));
export function property(id){return PROPERTIES.find(p=>p.id===id)||null;}
export function restoreProperties(value){
  if(!Array.isArray(value)||value.length>PROPERTIES.length||new Set(value).size!==value.length||value.some(id=>!property(id)))return [];
  return [...value];
}
export function propertySpend(owned=[]){return restoreProperties(owned).reduce((sum,id)=>sum+property(id).price,0);}
export function propertyPurchaseIssue(id,owned,balance){
  const p=property(id);
  if(!p)return 'Dieser Standort existiert nicht.';
  if(owned.includes(id))return 'Dieser Standort gehört dir bereits.';
  if(!Number.isFinite(balance)||balance<p.price)return 'Nicht genügend Geld für diesen Standort.';
  return null;
}
export function buyProperty(id,owned,balance){
  if(propertyPurchaseIssue(id,owned,balance))return null;
  return {owned:[...owned,id],balance:balance-property(id).price};
}
