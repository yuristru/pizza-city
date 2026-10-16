import {mountStaffUI,renderStaffUI} from './pizza-staff-ui.js?v=20261015b';
import {mountBusinessUI,renderBusinessUI} from './pizza-business-ui.js?v=20261015b';
import {mountKitchenUI,renderKitchenUI} from './pizza-kitchen-ui.js?v=20261015b';
import {restaurantPlan} from './pizza-floorplans.js?v=20261015b';
import {mountCommerceUI} from './pizza-commerce-ui.js?v=20261015b';
import {mountProperties} from './pizza-properties-ui.js?v=20261015b';
import {mountMenu} from './pizza-menu-ui.js?v=20261015b';
import {tickService} from './pizza-service-runtime.js?v=20261015b';
import {renderServiceUI} from './pizza-service-ui.js?v=20261015b';
import {mountNightUI,renderNightUI} from './pizza-night-ui.js?v=20261015b';
import {showPizza} from './pizza-editor.js?v=20261015b';
import {app,root,state,loadAssets,updateMoney,restaurantName,ensureRestaurants,setRestaurantOpen,notify} from './pizza-core.js?v=20261015b';
import {showCity,tickCity,resizeCity,zoomCity,centerCity,randomizeCity} from './pizza-city.js?v=20261016a';
import {showRestaurant,tickRestaurant,resizeRestaurant,undoRestaurant,updatePlacementPreview,confirmPlacement,cancelPlacement,zoomRestaurant,centerRestaurant,toggleRestaurantPan,restaurantView,toggleMove,clearSelection,rotateSelection,sellSelection,autoEquipRestaurant} from './pizza-restaurant.js?v=20261015b';

const rotateBtn=document.querySelector('#rotateBtn'),deleteBtn=document.querySelector('#deleteBtn');
import {mountCatalog,renderCatalog} from './pizza-catalog-ui.js?v=20261015b';
mountCommerceUI();mountProperties();mountKitchenUI();mountBusinessUI();mountStaffUI();
mountMenu();
mountCatalog(()=>{if(restaurantView().panMode)toggleRestaurantPan();clearSelection();syncEditUI();});
document.addEventListener('staff-changed',()=>{renderServiceUI();renderKitchenUI();renderBusinessUI(true);});
document.addEventListener('restaurant-opening-changed',()=>{renderServiceUI();renderBusinessUI(true);renderStaffUI(true);});
document.getElementById('restaurantOpenBtn').onclick=()=>{
  const open=ensureRestaurants()[state.activeRestaurantId].business.open===false;setRestaurantOpen(state.activeRestaurantId,open);notify(open?'Restaurant geöffnet.':'Restaurant geschlossen. Laufende Gäste werden weiter bedient.');
};
state.navigate=(where,id)=>where==='restaurant'?showRestaurant(id):showCity();
function renderRestaurantPicker(){
  const picker=document.getElementById('restaurantSelect');
  picker.replaceChildren(...['mamma-mia',...state.ownedProperties].map(id=>new Option(restaurantName(id)+' · '+restaurantPlan(id).area+' m²',id)));
  picker.value=state.activeRestaurantId;
}
document.getElementById('restaurantSelect').onchange=event=>showRestaurant(event.target.value);
document.addEventListener('restaurants-changed',renderRestaurantPicker);renderRestaurantPicker();
document.querySelector('#cityBtn').onclick=showCity;
document.querySelector('#restaurantBtn').onclick=showRestaurant;
document.querySelector('#pizzaBtn').onclick=showPizza;

function syncEditUI(){
  renderCatalog();renderServiceUI();renderKitchenUI();
  updatePlacementPreview();resizeRestaurant();
}
state.onEditChange=syncEditUI;
rotateBtn.onclick=rotateSelection;
document.querySelector('#moveBtn').onclick=toggleMove;
deleteBtn.onclick=sellSelection;
document.querySelector('#placeBtn').onclick=confirmPlacement;
document.querySelector('#autoEquipBtn').onclick=autoEquipRestaurant;
document.querySelector('#cancelBtn').onclick=()=>{cancelPlacement();syncEditUI();};


for(const button of document.querySelectorAll('[data-speed]')) button.onclick=()=>{
  state.speed=Number(button.dataset.speed);
  for(const other of document.querySelectorAll('[data-speed]')){
    const active=other===button;other.classList.toggle('active',active);other.setAttribute('aria-pressed',String(active));
  }
};
document.querySelector('#zoomInBtn').onclick=()=>zoomCity(1.2);
document.querySelector('#zoomOutBtn').onclick=()=>zoomCity(1/1.2);
document.querySelector('#centerBtn').onclick=centerCity;
document.querySelector('#randomCityBtn').onclick=randomizeCity;
document.querySelector('#roomZoomInBtn').onclick=()=>zoomRestaurant(1.25);
document.querySelector('#roomZoomOutBtn').onclick=()=>zoomRestaurant(1/1.25);
document.querySelector('#roomCenterBtn').onclick=centerRestaurant;
document.querySelector('#roomPanBtn').onclick=toggleRestaurantPan;
app.canvas.addEventListener('wheel',event=>{
  if(!['city','restaurant'].includes(state.scene)) return;
  event.preventDefault();const bounds=app.canvas.getBoundingClientRect();
  (state.scene==='city'?zoomCity:zoomRestaurant)(Math.exp(-event.deltaY*.001),{x:(event.clientX-bounds.left)*app.screen.width/bounds.width,y:(event.clientY-bounds.top)*app.screen.height/bounds.height});
},{passive:false});

const dateFormat=new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
const timeFormat=new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
let displayedMinute=-1;
function updateClock(){
  renderNightUI();
  const minute=Math.floor(state.gameMinutes);if(minute===displayedMinute) return;displayedMinute=minute;
  const date=new Date(Date.UTC(2001,3,12)+minute*60000);
  document.querySelector('#gameDate').textContent=dateFormat.format(date);
  document.querySelector('#gameTime').textContent=timeFormat.format(date);
}
mountNightUI(updateClock);updateClock();updateMoney();syncEditUI();
app.ticker.maxFPS=60;
app.ticker.add(ticker=>{
  if(!state.ready) return;
  const dt=Math.min(ticker.deltaTime,3)*state.speed;
  const seconds=Math.min(ticker.deltaMS,50)*state.speed/1000;
  if(seconds>0)tickService(seconds);updateClock();
  if(state.scene==='city'&&dt>0) tickCity(dt);else if(state.scene==='restaurant')tickRestaurant(dt);
  renderServiceUI();renderKitchenUI();renderBusinessUI();renderStaffUI();
});

let resizeFrame;
function resize(){
  root.dataset.compact=matchMedia('(max-height:540px) and (min-width:500px)').matches?'landscape':'portrait';
  cancelAnimationFrame(resizeFrame);
  resizeFrame=requestAnimationFrame(()=>{
    app.resize();
    if(!state.ready) return;
    if(state.scene==='city') resizeCity();else resizeRestaurant();
  });
}
new ResizeObserver(resize).observe(root);window.addEventListener('resize',resize);resize();
document.addEventListener('visibilitychange',()=>document.hidden?app.ticker.stop():app.ticker.start());
window.addEventListener('keydown',event=>{
  if(document.querySelector('dialog[open]')||state.scene!=='restaurant'||event.target.closest?.('input,textarea,select,[contenteditable]')) return;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();undoRestaurant();}
  else if(!event.ctrlKey&&!event.metaKey&&event.key.toLowerCase()==='r') rotateBtn.click();
  else if(event.key==='Enter'&&state.pendingPlacement){event.preventDefault();confirmPlacement();}
  else if(event.key==='Escape'){if(state.selectMode&&!state.moveMode)clearSelection();else cancelPlacement();syncEditUI();}
});

await loadAssets();renderCatalog();state.ready=true;showCity();updateClock();
