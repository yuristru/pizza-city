import {counterLayoutIssue} from './pizza-business.js?v=20261016d';
import {state,activePlan,ensureRestaurants} from './pizza-core.js?v=20261016d';
import {kitchenReadiness,kitchenWorkFlow} from './pizza-kitchen.js?v=20261016d';
import {SHIFTS} from './pizza-shifts.js?v=20261016d';
import {restaurantStaff} from './pizza-staff.js?v=20261016d';
export function renderKitchenUI(){
  const dialog=document.getElementById('kitchenDialog');if(!dialog.open)return;
  const status=kitchenReadiness(state.kitchenTiles,state.restaurantState,activePlan()),names={oven:'Ofen',bar:'Tresen',fridge:'Kühlschrank'};
  const rows=[{ok:status.largest>=9,text:status.largest+' zusammenhängende Küchenplatten (mindestens 9, mindestens 3 breit oder hoch)'},...Object.entries(names).map(([type,name])=>({ok:!status.missing.includes(type),text:name+' auf derselben Küchenfläche'}))];
  ensureRestaurants();for(const shift of Object.keys(SHIFTS)){const team=restaurantStaff(state.staff,state.activeRestaurantId,shift),name=shift==='lunch'?'Mittagsschicht':'Abendschicht';rows.push({ok:team.some(p=>p.role==='cook'),text:'Koch für die '+name+' eingeteilt'},{ok:team.some(p=>p.role==='waiter'),text:'Servicekraft für die '+name+' eingeteilt'});}rows.push({ok:status.ready&&!!kitchenWorkFlow(state.kitchenTiles,state.restaurantState,activePlan()),text:counterLayoutIssue(state.restaurantState,activePlan())||'Freie Arbeitsplätze vor beiden Tresenflächen und Laufwege zu Geräten und Küchenzugang'});
  const signature=JSON.stringify(rows),list=document.getElementById('kitchenChecklist');if(list.dataset.signature===signature)return;
  list.dataset.signature=signature;list.replaceChildren(...rows.map(row=>{const li=document.createElement('li');li.textContent=(row.ok?'✓ ':'○ ')+row.text;return li;}));
}
export function mountKitchenUI(){
  const dialog=document.getElementById('kitchenDialog'),open=()=>{dialog.showModal();renderKitchenUI();document.getElementById('kitchenClose').focus();};
  document.addEventListener('kitchen-check',open);const status=document.getElementById('restaurantServiceStatus');status.onclick=open;status.onkeydown=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();open();}};
  document.getElementById('kitchenClose').onclick=()=>dialog.close();
}
