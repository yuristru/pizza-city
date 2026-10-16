import {restoreAdvertising} from './pizza-advertising.js?v=20261016e';
import {restoreMarket} from './pizza-market.js?v=20261016e';
import {restoreRivalry} from './pizza-rivalry.js?v=20261016e';
import {restoreProcurement} from './pizza-procurement.js?v=20261016e';
import {restoreStaff,syncStaffCounts} from './pizza-staff.js?v=20261016e';
import {shiftAt} from './pizza-shifts.js?v=20261016e';
import {restoreDaily,ensureDaily} from './pizza-daily.js?v=20261016e';
import {profilePlan} from './pizza-kitchen.js?v=20261016e';
import {restaurantPlan,DEFAULT_PLAN,withKitchen} from './pizza-floorplans.js?v=20261016e';
import {DEFAULT_CITY_SEED} from './pizza-city-layout.js?v=20261016e';
import {restoreProperties,propertySpend} from './pizza-properties.js?v=20261016e';
import {Application,Container,Graphics,Sprite,Texture,Text,Rectangle} from './assets/pizza/vendor/pixi-8.22.0.mjs';
import {copyLayout,upgradeLayout} from './pizza-layout.js?v=20261016e';
import {START_MONEY,money,defaultFinishes,restoreFinishes} from './pizza-catalog.js?v=20261016e';
import {freshService,restoreService} from './pizza-service.js?v=20261016e';
import {MAIN_RESTAURANT,freshRestaurant,restoreRestaurants} from './pizza-restaurant-profiles.js?v=20261016e';
import {property} from './pizza-properties.js?v=20261016e';
export {Container,Graphics,Sprite,Texture,Text,Rectangle};

export const root=document.querySelector('#app');
const loading=document.querySelector('#loading');
export const app=new Application();
await app.init({resizeTo:root,background:'#171416',antialias:false,autoDensity:true,resolution:Math.min(devicePixelRatio||1,2),preference:'webgl'});
root.prepend(app.canvas);
app.canvas.setAttribute('aria-label','Isometrische Stadt und Restaurant-Einrichtung');
app.stage.eventMode='static';
export const world=new Container();
app.stage.addChild(world);
export const TW=64,TH=32,CITY_N=26;
const SAVE_KEY='pizza-city-layout-v1';

function restore(){
  try{
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY));
    const items=upgradeLayout(saved?.items,saved?.version,saved?.version>=8?withKitchen(restaurantPlan(saved.activeRestaurantId),saved.kitchenTiles||[]):saved?.version===7?restaurantPlan(saved.activeRestaurantId):DEFAULT_PLAN);
    const current=[5,6,7,8,9,10,11,12,13].includes(saved?.version)&&Number.isSafeInteger(saved.balanceCents)&&saved.balanceCents>=0&&saved.balanceCents<=1e12;
    const owned=restoreProperties(saved?.ownedProperties),ownedProperties=current||propertySpend(owned)<=START_MONEY?owned:[];
    if(items) return {hasLegacy:true,items,ownedProperties,service:current?restoreService(saved.service,saved.version>=8?withKitchen(restaurantPlan(saved.activeRestaurantId),saved.kitchenTiles||[]):saved.version===7?restaurantPlan(saved.activeRestaurantId):DEFAULT_PLAN):freshService(),gameMinutes:current&&Number.isFinite(saved.gameMinutes)&&saved.gameMinutes>=0&&saved.gameMinutes<=1e10?saved.gameMinutes:11*60+30,citySeed:Number.isInteger(saved.citySeed)&&saved.citySeed>=0&&saved.citySeed<=0xffffffff?saved.citySeed:DEFAULT_CITY_SEED,finishes:saved.version>=4?restoreFinishes(saved.finishes):defaultFinishes(),balance:current?saved.balanceCents/100:saved.version>=3&&Number.isInteger(saved.balance)&&saved.balance>=0&&saved.balance<=START_MONEY?Math.min(saved.balance,START_MONEY-propertySpend(ownedProperties)):START_MONEY-propertySpend(ownedProperties)};
  }catch{}
  return {items:copyLayout(),ownedProperties:[],service:freshService(),gameMinutes:11*60+30,citySeed:DEFAULT_CITY_SEED,finishes:defaultFinishes(),balance:START_MONEY};
}
const restored=restore();
let savedProfiles=null;
try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY));if([6,7,8,9,10,11,12,13].includes(saved?.version))savedProfiles=saved;}catch{}
const legacy=restored.hasLegacy?{items:restored.items,finishes:restored.finishes,service:restored.service,investmentCents:Math.max(0,Math.round((START_MONEY-propertySpend(restored.ownedProperties)-restored.balance)*100)+restored.service.netCents),history:[]}:null;
const restaurants=restoreRestaurants(savedProfiles?.restaurants,restored.ownedProperties,savedProfiles?null:legacy);
const staff=restoreStaff(savedProfiles?.staff,restaurants,shiftAt(restored.gameMinutes)||(restored.gameMinutes%1440>=960&&restored.gameMinutes%1440<1020?'lunch':'evening'));syncStaffCounts(staff,restaurants);
const procurement=restoreProcurement(savedProfiles?.procurement);
const market=restoreMarket(savedProfiles?.market,restored.gameMinutes,restored.ownedProperties),rivalry=restoreRivalry(savedProfiles?.rivalry);
const advertising=restoreAdvertising(savedProfiles?.advertising,restored.gameMinutes,restaurants);
const daily=restoreDaily(savedProfiles?.daily,restored.gameMinutes,restaurants,staff,procurement,rivalry);
const activeRestaurantId=Object.hasOwn(restaurants,savedProfiles?.activeRestaurantId)?savedProfiles.activeRestaurantId:MAIN_RESTAURANT;
const active=restaurants[activeRestaurantId];
restored.balance+=Object.values(restaurants).reduce((sum,p)=>sum+(p.migrationRefundCents||0),0)/100;
export function updateMoney(){const el=document.querySelector('.money');el.textContent=money(state.balance);el.dataset.fraction=String(Math.round(state.balance*100)%100!==0);el.setAttribute('aria-label','Kontostand: '+money(state.balance));}

export const state={daily,staff,procurement,market,rivalry,advertising,scene:null,camera:null,restaurantCamera:null,restaurantSign:null,cityRestaurantSigns:{},restaurants,activeRestaurantId,kitchenTiles:active.kitchenTiles||[],service:active.service,cityView:null,cityGesture:null,citySeed:restored.citySeed,ownedProperties:restored.ownedProperties,onPropertyChange:null,movers:[],selectedTool:'table',selectedVariant:'wood',selectedSeats:4,balance:restored.balance,finishes:active.finishes,rotation:0,deleteMode:false,selectMode:true,moveMode:false,pendingPlacement:null,navigate:null,onEditChange:null,cityTex:{},cityArt:{},restaurantState:active.items,history:active.history,speed:1,gameMinutes:restored.gameMinutes,ready:false,assetFailures:[]};

export function activePlan(){return profilePlan(state.activeRestaurantId,captureRestaurant());}
export function restaurantName(id=state.activeRestaurantId){return id===MAIN_RESTAURANT?'Mamma Mia':property(id)?.name||'Restaurant';}
export function captureRestaurant(){
  const profile=state.restaurants[state.activeRestaurantId];
  profile.kitchenTiles=state.kitchenTiles;profile.items=state.restaurantState;profile.finishes=state.finishes;profile.service=state.service;profile.history=state.history;
  return profile;
}
export function ensureRestaurants(){
  captureRestaurant();
  for(const id of state.ownedProperties)if(!state.restaurants[id])state.restaurants[id]=freshRestaurant(id);
  syncStaffCounts(state.staff,state.restaurants);ensureDaily(state.daily,state.gameMinutes,state.restaurants,state.staff,state.procurement,state.rivalry);
  return state.restaurants;
}
export function setRestaurantOpen(id,open){
  const profile=ensureRestaurants()[id];if(!profile)return false;
  profile.business.open=!!open;saveLayout();document.dispatchEvent(new CustomEvent('restaurant-opening-changed',{detail:{id,open:!!open}}));return true;
}
export function activateRestaurant(id){
  if(id!==MAIN_RESTAURANT&&!state.ownedProperties.includes(id))return false;
  ensureRestaurants();const profile=state.restaurants[id];state.activeRestaurantId=id;
  state.kitchenTiles=profile.kitchenTiles||[];state.restaurantState=profile.items;state.finishes=profile.finishes;state.service=profile.service;state.history=profile.history;
  state.pendingPlacement=null;state.rotation=0;state.deleteMode=false;state.moveMode=false;return true;
}
export function sealRestaurantEdit(){
  const profile=captureRestaurant(),edit=state.history.at(-1);
  if(edit&&edit.refundCents===undefined){edit.refundCents=Math.round((edit.balance-state.balance)*100);profile.investmentCents=Math.max(0,profile.investmentCents+edit.refundCents);}
}

export function iso(x,y,ox=0,oy=0){return{x:ox+(x-y)*TW/2,y:oy+(x+y)*TH/2};}
export function hash(x,y,s=94117){let n=(x*374761393+y*668265263+s*69069)>>>0;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
export function label(text,size=11,color='#fff1cf'){return new Text({text,style:{fontFamily:'Georgia, serif',fontSize:size,fill:color,fontWeight:'900'}});}
export function clearWorld(){
  app.stage.removeAllListeners();
  state.movers=[];
  state.pendingPlacement=null;
  world.removeChildren().forEach(child=>child.destroy({children:true}));
}

export function sceneUI(scene){
  const restaurant=scene==='restaurant';
  for(const id of ['commerceDialog','propertyDialog','menuDialog','kitchenDialog','businessDialog','staffDialog','advertisingDialog','underworldDialog']){const dialog=document.getElementById(id);if(dialog?.open)dialog.close();}
  root.dataset.scene=scene;
  document.querySelector('#pizzaEditor').hidden=scene!=='pizza';
  document.querySelector('#tools').hidden=!restaurant;
  document.querySelector('#roomControls').hidden=!restaurant;
  document.querySelector('#restaurantHead').hidden=!restaurant;
  document.querySelector('#placementHint').hidden=!restaurant;
  document.querySelector('#cityHint').hidden=scene!=='city';
  document.querySelector('#cityControls').hidden=scene!=='city';
  document.querySelector('#credit').hidden=restaurant;
  for(const id of ['city','restaurant','pizza']){
    const button=document.querySelector(`#${id}Btn`),active=id===scene;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  }
}

export function localRect(element){
  const rect=element.getBoundingClientRect(),base=root.getBoundingClientRect();
  return {left:rect.left-base.left,right:rect.right-base.left,top:rect.top-base.top,bottom:rect.bottom-base.top};
}

export function sceneViewport(restaurant=false){
  const topElement=restaurant?(root.dataset.compact==='landscape'?'#restaurantHead':'#placementHint'):'.topbar';
  const top=localRect(document.querySelector(topElement)).bottom+12;
  const nav=localRect(document.querySelector('#cityBtn').closest('.bottomnav'));
  let right=app.screen.width-12,bottom=nav.top-12;
  if(restaurant){
    const tools=localRect(document.querySelector('#tools'));
    if(root.dataset.compact==='landscape') right=tools.left-12;
    else bottom=tools.top-12;
  }
  return {left:12,top,right,bottom,width:Math.max(1,right-12),height:Math.max(1,bottom-top)};
}

let toastTimer;
export function notify(message){
  const toast=document.querySelector('#toast');
  toast.textContent=message;toast.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},2400);
}

export function saveLayout(quiet=false){
  const profiles=ensureRestaurants(),savedRestaurants=Object.fromEntries(Object.entries(profiles).map(([id,p])=>[id,{business:p.business,items:p.items,finishes:p.finishes,service:p.service,investmentCents:p.investmentCents,floorPlanVersion:1,kitchenVersion:1,kitchenTiles:p.kitchenTiles}]));
  try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:13,advertising:state.advertising,market:state.market,rivalry:state.rivalry,procurement:state.procurement,daily:state.daily,staff:state.staff,kitchenTiles:state.kitchenTiles,activeRestaurantId:state.activeRestaurantId,restaurants:savedRestaurants,items:state.restaurantState,balance:state.balance,balanceCents:Math.round(state.balance*100),service:state.service,gameMinutes:state.gameMinutes,finishes:state.finishes,ownedProperties:state.ownedProperties,citySeed:state.citySeed}));return true;}
  catch{if(!quiet)notify('Einrichtung bleibt in dieser Sitzung erhalten.');return false;}
}

export function rememberEdit(){
  state.history.push({kitchenTiles:state.kitchenTiles.map(t=>({...t})),items:copyLayout(state.restaurantState),balance:state.balance,businessNetCents:state.service.netCents,investmentCents:captureRestaurant().investmentCents,finishes:{...state.finishes}});
  if(state.history.length>50) state.history.shift();
}

// The city remains usable even if its atlas cannot be loaded.
const fallbackCache=new Map();
function fallback(){
  if(fallbackCache.has('city')) return fallbackCache.get('city');
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  const polygon=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
  polygon([[7,18],[32,31],[32,55],[7,42]],'#c39362');polygon([[32,31],[57,18],[57,42],[32,55]],'#956f48');polygon([[7,18],[32,5],[57,18],[32,31]],'#b15e36');
  for(const row of [0,1]){polygon([[12,24+row*12],[19,27.5+row*12],[19,35.5+row*12],[12,32+row*12]],'#345c47');polygon([[38,29+row*12],[45,25.5+row*12],[45,33.5+row*12],[38,37+row*12]],'#345c47');}
  const texture=Texture.from(canvas);texture.source.scaleMode='nearest';fallbackCache.set('city',texture);return texture;
}

// Missing sheets use a native two-storey drawing instead of the obsolete tall atlas.
async function loadCityAtlas(){for(const type of ['small','medium','big'])state.cityTex[type]=[fallback()];}

export async function loadAssets(){
  const {loadCityArt}=await import('./pizza-city-art.js?v=20261016e');
  const {loadRestaurantArt}=await import('./pizza-restaurant-art.js?v=20261016e');
  const {loadIngredientArt}=await import('./pizza-ingredient-art.js?v=20261016e');
  await Promise.all([loadCityArt(),loadRestaurantArt(),loadIngredientArt()]);
  if(!state.cityArt.buildings) await loadCityAtlas();
  loading.hidden=true;
  if(state.assetFailures.length) notify('Einige Grafiken konnten nicht geladen werden.');
}

export function makePerson(i){
  const g=new Graphics(),colors=[0xb34536,0x416f98,0x56804b,0xca9a36,0x80567b];
  g.ellipse(0,1,4,2).fill({color:0,alpha:.22});g.rect(-2,-10,4,7).fill(colors[i%colors.length]);g.rect(-1,-13,3,3).fill(0xce9870);g.rect(-2,-3,1,4).fill(0x282630);g.rect(1,-3,1,4).fill(0x282630);return g;
}
