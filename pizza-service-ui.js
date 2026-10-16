import {kitchenReadiness,kitchenWorkFlow} from './pizza-kitchen.js?v=20261016d';
import {state,Container,ensureRestaurants,activePlan,label} from './pizza-core.js?v=20261016d';
import {project,dimensions} from './pizza-layout.js?v=20261016d';
import {guestSprite,mealSprite} from './pizza-sprites.js?v=20261016d';
import {routePosition,guestSeat} from './pizza-service.js?v=20261016d';
import {machinePosition,MACHINE_RULES} from './pizza-machines.js?v=20261016d';
import {serviceMenu} from './pizza-menu-ui.js?v=20261016d';

import {businessIssue,workPath,counterLayoutIssue,counterHandoff} from './pizza-business.js?v=20261016d';
import {staffSchedule,shiftLabel} from './pizza-shifts.js?v=20261016d';
import {personSprite,staffPersonSprite} from './pizza-sprites.js?v=20261016d';
const maps=new WeakMap(),banners=new Map();
export function syncServiceGuests(objects){
  let nodes=maps.get(objects);if(!nodes){nodes=new Map();maps.set(objects,nodes);}
  const wanted=new Set(),workingIds=new Set();
  function get(key,label){wanted.add(key);let g=nodes.get(key);if(!g){g=new Container();g.label=label;g.eventMode='none';objects.addChild(g);nodes.set(key,g);}return g;}
  function worker(key,w,employeeId,stage,task,groupId,carry){
    if(employeeId)workingIds.add(employeeId);
    const g=get(employeeId?'employee-'+employeeId:key,'service-worker'),position=routePosition(w),segment=Math.min(Math.floor(w.progress),w.route.length-2);let rotation=g.facing??0;
    if(segment>=0){const a=w.route[segment],b=w.route[segment+1],dx=b.x-a.x,dy=b.y-a.y;rotation=dx?(dx>0?0:2):dy?(dy>0?1:3):rotation;}
    const employee=state.staff.employees.find(p=>p.id===employeeId),artKey=stage+':'+rotation+':'+(employee?.avatarSeed??'default')+':'+(carry||'empty');
    if(g.artKey!==artKey){g.removeChildren().forEach(c=>c.destroy());g.addChild(employee?staffPersonSprite(employee,rotation):personSprite(stage>=3?1:0,rotation));if(carry){const tray=mealSprite(carry==='plates'?4:0);tray.position.set(rotation===0?8:rotation===2?-8:0,rotation===1?7:rotation===3?-5:0);g.addChild(tray);}g.artKey=artKey;}
    const p=project(position.x,position.y);g.position.set(p.x,p.y);g.zIndex=p.y+.6;Object.assign(g,{employeeId,stage,facing:rotation,groupId,cell:position,task,carry});
  }
  function plate(key,position,portion,label,groupId,lift=0){const g=get(key,label);if(g.portion!==portion){g.removeChildren().forEach(c=>c.destroy());g.addChild(mealSprite(portion));g.portion=portion;}const p=project(position.x,position.y);g.position.set(p.x,p.y-lift);g.zIndex=p.y+.3;g.groupId=groupId;g.cell=position;}
  for(const group of state.service.groups)for(let i=0;i<group.size;i++){
    if((state.service.machineGuests||[]).some(v=>v.id===group.id&&v.member===i))continue;
    const seated=group.phase==='waiting'||group.phase==='eating',seat=guestSeat(group,i),position=seated?seat:routePosition(group,i),g=get('guest-'+group.id+'-'+i,'service-guest');
    const ahead=seated?null:routePosition({...group,progress:group.progress+.1},i),dx=ahead?ahead.x-position.x:0,dy=ahead?ahead.y-position.y:0;
    const rotation=seated?seat.r:Math.abs(dx)>Math.abs(dy)?(dx>0?0:2):Math.abs(dy)>.001?(dy>0?1:3):(g.facing??0);
    const eating=group.phase==='eating'&&Math.floor(state.service.elapsed*1.5+i)%2===0,artKey=[group.id*3+i,rotation,seated,eating].join(':');
    if(g.artKey!==artKey){g.removeChildren().forEach(child=>child.destroy());g.addChild(guestSprite(group.id*3+i,rotation,seated,eating));g.artKey=artKey;}
    const p=project(position.x,position.y);g.position.set(p.x,p.y);g.zIndex=p.y+.5;g.facing=rotation;g.groupId=group.id;g.phase=group.phase;g.seated=seated;g.cell={x:position.x,y:position.y};g.machineType=null;
    if(group.phase==='eating'){
      const portion=Math.min(3,Math.floor((1-group.timer/group.eatDuration)*4)),meal=get('meal-'+group.id+'-'+i,'service-meal');
      if(meal.portion!==portion){meal.removeChildren().forEach(child=>child.destroy());meal.addChild(mealSprite(portion));meal.portion=portion;}
      const point=project(seat.mealX,seat.mealY),size=dimensions(group.table),center=project(group.table.x+(size.w-1)/2,group.table.y+(size.h-1)/2);
      meal.position.set(point.x,point.y);meal.zIndex=center.y+.2;meal.groupId=group.id;
    }
  }
  for(const v of state.service.machineGuests||[]){
    const position=machinePosition(v),ahead=machinePosition({...v,progress:v.progress+.1}),dx=ahead.x-position.x,dy=ahead.y-position.y,g=get('guest-'+v.id+'-'+v.member,'service-guest');
    const rotation=v.phase==='using'?(v.machine.r+2)%4:Math.abs(dx)>Math.abs(dy)?(dx>0?0:2):Math.abs(dy)>.001?(dy>0?1:3):(g.facing??0),artKey=[v.id*3+v.member,rotation,false,false].join(':');
    if(g.artKey!==artKey){g.removeChildren().forEach(c=>c.destroy());g.addChild(guestSprite(v.id*3+v.member,rotation));g.artKey=artKey;}
    const p=project(position.x,position.y);g.position.set(p.x,p.y);g.zIndex=p.y+.5;Object.assign(g,{facing:rotation,groupId:v.id,phase:'machine-'+v.phase,seated:false,cell:position,machineType:v.machine.type,task:v.blocked?'Weg zum Ausgang blockiert':v.phase==='leaving'?'Zum Ausgang gehen':MACHINE_RULES[v.machine.type].action});
    if(v.phase==='using'){const use=get('machine-use-'+v.id,'service-machine-use');if(!use.children.length)use.addChild(label(v.machine.type==='jukebox'?'♪ Musikwahl':'Spielt',9,'#fff0ce'));const q=project(v.machine.x,v.machine.y);use.position.set(q.x-20,q.y-75);use.zIndex=q.y+.7;use.groupId=v.id;use.machineType=v.machine.type;}
  }
  for(const group of state.service.groups)if(group.phase==='waiting'&&group.work){
    const w=group.work;
    const hasCounter=state.restaurantState.some(i=>i.type==='bar'&&[i.x,i.y,i.r].join(':')===w.flow?.stationKey);
    if(!w.blocked&&hasCounter&&w.flow?.prepSurface&&((w.stage===0&&w.progress>=w.route.length-1)||w.stage===1&&!w.ovenReserved))plate('preparing-'+group.id,w.flow.prepSurface,0,'service-preparation',group.id,3);
    if(!w.blocked&&hasCounter&&w.outputReserved!==false&&w.flow?.readySurface&&w.stage===3&&(!w.started||w.deliveryStage==='pickup'))plate('ready-'+group.id,w.flow.readySurface,0,'service-ready-pizza',group.id,3);
    if(!w.blocked&&w.flow?.ovenKey&&w.stage===1&&w.ovenReserved&&w.progress>=w.route.length-1){const g=get('baking-'+group.id,'service-baking');if(!g.children.length)g.addChild(label('Im Ofen',9,'#fff0ce'));const [x,y]=w.flow.ovenKey.split(':').map(Number),p=project(x,y);g.position.set(p.x-15,p.y-72);g.zIndex=p.y+.3;g.groupId=group.id;}
    if(w.stage===3&&!w.started)continue;
    const carry=w.stage===2&&(w.outputReserved||w.pizzaCollected)||w.stage===1&&w.ovenReserved&&w.progress<w.route.length-1||w.stage===3&&w.deliveryStage==='deliver'?'pizza':null;
    const task=['Pizza belegen','Pizza in den Ofen bringen und backen',w.outputReserved?'Fertige Pizza zur Abholfläche bringen':w.pizzaCollected?'Abholfläche belegt, Pizza wartet auf dem Tablett':'Abholfläche belegt, Pizza wartet im Ofen',w.deliveryStage==='pickup'?'Pizza am Tresen abholen':'Pizza zum Tisch bringen'][w.stage];
    worker('worker-'+group.id,w,w.stage===3?w.waiterId:w.cookId,w.stage,w.blocked||task,group.id,carry);
  }
  for(const d of state.service.dirtyTables||[])for(let i=0;i<d.size;i++){const seat=guestSeat(d,i);plate('dirty-'+d.id+'-'+i,{x:seat.mealX,y:seat.mealY},4,'service-dirty-plate',d.id);}
  for(const t of state.service.waiterTasks||[])worker('returner-'+t.employeeId,t,t.employeeId,t.kind==='clear'?4:5,t.blocked||(t.kind==='clear'?'Teller am Tisch abräumen':t.plates?'Teller zum Tresen zurückbringen':'Zur Abholfläche zurückgehen'),t.dirtyId,t.plates?'plates':null);
  const plan=activePlan(),flow=kitchenWorkFlow(state.kitchenTiles,state.restaurantState,plan),schedule=staffSchedule(state.staff,state.activeRestaurantId,state.gameMinutes,state.service),taken=new Set([...nodes.values()].filter(g=>workingIds.has(g.employeeId)&&wanted.has('employee-'+g.employeeId)).map(g=>`${Math.round(g.cell.x)},${Math.round(g.cell.y)}`));
  for(const employee of schedule.working)if(!workingIds.has(employee.id)){
    const old=state.service.staffPositions[employee.id],preferred=old||((employee.role==='cook'?flow?.fridge:flow?.handoff)||plan.entrance);
    const cells=plan.cells.slice().sort((a,b)=>Math.abs(a.x-preferred.x)+Math.abs(a.y-preferred.y)-Math.abs(b.x-preferred.x)-Math.abs(b.y-preferred.y));
    const point=old&&workPath(state.restaurantState,old,old,plan)?old:cells.find(p=>!taken.has(`${p.x},${p.y}`)&&workPath(state.restaurantState,plan.entrance,p,plan));
    if(point){taken.add(`${point.x},${point.y}`);state.service.staffPositions[employee.id]={...point};worker('idle-'+employee.id,{route:[point],progress:0},employee.id,employee.role==='cook'?0:3,schedule.closing?'Schichtende, auf Abschluss warten':'Einsatzbereit · '+shiftLabel(employee.shift),null,null);}
  }
  for(const [i,p]of (state.service.plateReturns||[]).entries())plate('plate-return-'+i,{x:p.position.x+.2,y:p.position.y+.1},4,'service-returned-plate',null,3);
  for(const [key,g]of nodes)if(!wanted.has(key)){g.destroy({children:true});nodes.delete(key);}
}
export function renderServiceUI(){
  const groups=state.service.groups,active=serviceMenu().some(item=>item.active),status=document.getElementById('restaurantServiceStatus');
  const seated=groups.filter(g=>g.phase==='waiting'||g.phase==='eating').length,total=groups.reduce((sum,g)=>sum+g.size,0)+(state.service.machineGuests||[]).filter(v=>!groups.some(g=>g.id===v.id)).length;
  const readiness=kitchenReadiness(state.kitchenTiles,state.restaurantState,activePlan());status.title=readiness.issue||counterLayoutIssue(state.restaurantState,activePlan())||'Küche betriebsbereit';status.dataset.kitchenReady=String(readiness.ready);
  const profile=ensureRestaurants()[state.activeRestaurantId],plan=activePlan(),schedule=staffSchedule(state.staff,state.activeRestaurantId,state.gameMinutes,state.service),staff={...profile.business,cook:schedule.working.filter(p=>p.role==='cook').length,waiter:schedule.working.filter(p=>p.role==='waiter').length};
  const shiftName=schedule.active==='lunch'?'Mittagsschicht':'Abendschicht',teamIssue=!staff.cook?'Koch für die '+shiftName+' einteilen.':!staff.waiter?'Servicekraft für die '+shiftName+' einteilen.':null;
  const issue=(profile.service.debtCents||0)>0||state.staff.reserveDebtCents>0||state.procurement.debtCents>0?'Offene Betriebskosten':profile.business.open===false?'Restaurant geschlossen':!schedule.active?(schedule.closing?'Schichtende, Bestellungen abschließen':'Außerhalb der Schichten'):readiness.issue||counterLayoutIssue(state.restaurantState,plan)||teamIssue||businessIssue(staff,readiness.ready?kitchenWorkFlow(state.kitchenTiles,state.restaurantState,plan):null);
  const open=profile.business.open!==false,button=document.getElementById('restaurantOpenBtn');
  if(button.dataset.open!==String(open)){button.dataset.open=String(open);button.setAttribute('aria-pressed',String(open));button.setAttribute('aria-label',open?'Restaurant schließen':'Restaurant öffnen');button.title=open?'Geöffnet: keine neuen Gäste mehr zulassen':'Geschlossen: Restaurant öffnen';document.getElementById('restaurantOpenIcon').setAttribute('d',open?'M6 4h4v16H6zM14 4h4v16h-4z':'M7 4l14 8-14 8z');}
  const stars=document.querySelector('.stars'),rating=state.service.rating||4;stars.textContent='★'.repeat(Math.round(rating))+'☆'.repeat(5-Math.round(rating));stars.setAttribute('aria-label',rating.toFixed(1)+' von 5 Sternen');
  const dirty=state.service.dirtyTables?.length||0,waitingReturn=state.service.waiterTasks.some(t=>t.plates&&t.blocked),missingCounter=(dirty||waitingReturn)&&!counterHandoff(state.restaurantState,plan),text=(total?(!open?'Geschlossen · ':'')+total+(total===1?' Gast · ':' Gäste · ')+seated+(seated===1?' Tisch belegt':' Tische belegt'):!open?'Geschlossen':issue?'Geschlossen · '+issue:active?'Geöffnet · Gäste kommen':'Speisekarte noch leer')+(missingCounter?' · Abräumen wartet auf Tresen':dirty?' · '+dirty+(dirty===1?' Tisch abräumen':' Tische abräumen'):'');if(status.textContent!==text)status.textContent=text;
  const host=document.getElementById('incomeBanners'),wanted=new Set();
  for(const [restaurantId,profile]of Object.entries(ensureRestaurants()))for(const [index,payment]of profile.service.payments.entries()){
    const key=restaurantId+':'+payment.id+':'+(payment.kind||'meal');wanted.add(key);let b=banners.get(key);if(!b){b=document.createElement('div');b.className='incomeBanner';b.dataset.paymentId=String(payment.id);b.dataset.paymentKind=payment.kind||'meal';b.dataset.restaurantId=restaurantId;b.dataset.amountCents=String(payment.amount);b.textContent='+'+(payment.amount/100).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' DM';if(payment.kind==='machine')b.title=MACHINE_RULES[payment.machineType]?.action||'Automat';host.append(b);banners.set(key,b);}
    let point=null;
    if(state.scene==='restaurant'&&restaurantId===state.activeRestaurantId&&state.restaurantCamera&&!state.restaurantCamera.destroyed){const p=project(payment.position.x,payment.position.y);point=state.restaurantCamera.toGlobal({x:p.x,y:p.y-70});}
    else if(state.scene==='city'){const sign=state.cityRestaurantSigns[restaurantId];if(sign&&!sign.destroyed)point=sign.toGlobal({x:0,y:-22});}
    b.hidden=!point;
    if(point){const age=profile.service.elapsed-payment.time;b.style.left=point.x+'px';b.style.top=(point.y-age*5-index*25)+'px';b.style.opacity=String(Math.min(1,(4-age)/.8));b.dataset.scene=state.scene;}
  }
  for(const [id,b]of banners)if(!wanted.has(id)){b.remove();banners.delete(id);}
}
