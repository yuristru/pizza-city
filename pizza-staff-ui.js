import {state,ensureRestaurants,restaurantName,saveLayout,notify} from './pizza-core.js?v=20261012f';
import {STAFF_ROLES,LEVEL_NAMES,skillLevel,averageSkill,monthlyPayroll,restaurantStaff,hireEmployee,assignEmployee,assignShift,dismissEmployee,employeeBusy} from './pizza-staff.js?v=20261012f';
import {SHIFTS,shiftLabel,staffSchedule} from './pizza-shifts.js?v=20261012f';
import {drawStaffAvatar} from './pizza-staff-avatar.js?v=20261012f';
import {money} from './pizza-catalog.js?v=20261012f';
const el=id=>document.getElementById(id),portraits=new Map(),roles={market:'all',files:'all',restaurants:'all'};
let view='market',restaurant=null,stamp=0,shiftFilter='all';
function node(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function button(text,action,className){const e=node('button',text,className);e.type='button';e.onclick=action;return e;}
function portrait(person){const key=person.role+':'+person.avatarSeed;if(!portraits.has(key)){const canvas=document.createElement('canvas');drawStaffAvatar(canvas,person);portraits.set(key,canvas.toDataURL());}const img=node('img');img.src=portraits.get(key);img.alt='Avatar von '+person.name;img.width=80;img.height=96;img.className='staffAvatar';return img;}
function selectRestaurant(person,profiles,market=false){
 const label=node('label',market?'Arbeitsplatz bei Einstellung':'Restaurant','staffAssignment');const select=node('select');select.setAttribute('aria-label','Restaurant für '+person.name);select.dataset[market?'hireRestaurant':'assignment']=person.id;
 select.append(new Option('Ohne Restaurant', ''));
 for(const id of Object.keys(profiles))select.append(new Option(restaurantName(id),id));
 select.value=market?(restaurant||state.activeRestaurantId):(person.restaurantId||'');
 if(!market)select.onchange=()=>{const result=assignEmployee(state.staff,person.id,select.value||null,profiles);if(!result.ok)select.value=person.restaurantId||'';finish(result,result.ok?person.name+' wurde neu zugeordnet.':null);};
 label.append(select);return label;
}
function finish(result,message){el('staffStatus').textContent=result.ok?message:result.issue;el('staffStatus').dataset.kind=result.ok?'success':'error';if(!result.ok){notify(result.issue);return;}saveLayout();document.dispatchEvent(new Event('staff-changed'));renderStaffUI(true);}
function selectShift(person,profiles,market){const label=node('label','Schicht','staffAssignment'),select=node('select');select.setAttribute('aria-label','Schicht für '+person.name);select.dataset[market?'hireShift':'shiftAssignment']=person.id;for(const id of Object.keys(SHIFTS))select.append(new Option(shiftLabel(id),id));select.value=person.shift||'lunch';if(!market)select.onchange=()=>{const result=assignShift(state.staff,person.id,select.value,profiles);if(!result.ok)select.value=person.shift;finish(result,result.ok?person.name+' arbeitet in der '+(person.shift==='lunch'?'Mittagsschicht.':'Abendschicht.'):null);};label.append(select);return label;}
function card(person,profiles,market){
 const article=node('article',undefined,'staffCard');article.dataset[market?'candidate':'employee']=person.id;article.dataset.role=person.role;article.setAttribute('role','listitem');
 const head=node('div',undefined,'staffCardHead'),copy=node('div',undefined,'staffIdentity'),level=skillLevel(person);
 copy.append(node('span',STAFF_ROLES[person.role].name,'staffRole'),node('h3',person.name),node('span','Level '+level+' / 5 · '+LEVEL_NAMES[level],'staffLevel level-'+level));head.append(portrait(person),copy);article.append(head);
 const skills=node('div',undefined,'staffSkills');skills.setAttribute('aria-label','Drei Kompetenzen von '+person.name);
 for(const s of STAFF_ROLES[person.role].skills){const row=node('div',undefined,'staffSkill'),label=node('div',undefined,'staffSkillLabel');label.append(node('span',s.name),node('strong',person.skills[s.id]+' / 100'));const track=node('div',undefined,'staffSkillTrack');track.setAttribute('role','meter');track.setAttribute('aria-label',s.name);track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow',String(person.skills[s.id]));const fill=node('span');fill.style.width=person.skills[s.id]+'%';fill.className=person.skills[s.id]>=75?'skillHigh':person.skills[s.id]>=40?'skillMedium':'skillLow';track.append(fill);row.append(label,track);skills.append(row);}article.append(skills);
 const salary=node('div',undefined,'staffSalary');salary.append(node('strong',money(person.salaryCents/100)),node('span','pro Monat'));article.append(salary);
 const footer=node('div',undefined,'staffCardFooter'),assignment=selectRestaurant(person,profiles,market),shift=selectShift(person,profiles,market);footer.append(assignment,shift);
 if(market){const hire=button('Einstellen',()=>finish(hireEmployee(state.staff,person.id,assignment.querySelector('select').value||null,profiles,shift.querySelector('select').value),person.name+' eingestellt.'),'staffHire');hire.dataset.hire=person.id;hire.dataset.role=person.role;footer.append(hire);}
 else {const action=button('Entlassen',()=>finish(dismissEmployee(state.staff,person.id,profiles),person.name+' entlassen.'),'staffDismiss');action.dataset.dismiss=person.id;footer.append(action);const busy=node('p',undefined,'staffWorkStatus');busy.dataset.workStatus=person.id;footer.append(busy);}
 article.append(footer);return article;
}
function roleFilters(host){const bar=node('div',undefined,'staffRoleFilters');bar.setAttribute('aria-label','Fachbereich filtern');for(const [key,label]of [['all','Alle Fachbereiche'],...Object.entries(STAFF_ROLES).map(([key,r])=>[key,r.name])]){const b=button(label,()=>{roles[view]=key;renderStaffUI(true);});b.dataset.staffRole=key;b.setAttribute('aria-pressed',String(roles[view]===key));bar.append(b);}host.append(bar);}
export function renderStaffUI(force=false){
 const dialog=el('staffDialog');if(!dialog.open)return;const profiles=ensureRestaurants();
 if(!restaurant||!profiles[restaurant])restaurant=state.activeRestaurantId;
 const summary=state.staff.employees.length+' Mitarbeitende · '+money(monthlyPayroll(state.staff)/100)+' Gehalt / Monat · '+state.staff.employees.filter(p=>!p.restaurantId).length+' ohne Restaurant';if(el('staffSummary').textContent!==summary)el('staffSummary').textContent=summary;
 if(force){
  for(const tab of document.querySelectorAll('[data-staff-view]')){const active=tab.dataset.staffView===view;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
  const host=el('staffContent');host.setAttribute('aria-labelledby','staff-tab-'+view);host.replaceChildren();
  if(view==='restaurants'){
   const controls=node('div',undefined,'staffBranchControls'),label=node('label','Restaurant auswählen'),select=node('select');select.id='staffRestaurantFilter';select.setAttribute('aria-label','Restaurant filtern');for(const id of Object.keys(profiles))select.append(new Option(restaurantName(id),id));select.value=restaurant;select.onchange=()=>{restaurant=select.value;renderStaffUI(true);};label.append(select);const shiftLabelNode=node('label','Schicht filtern'),shifts=node('select');shifts.id='staffShiftFilter';shifts.append(new Option('Alle Schichten','all'),...Object.keys(SHIFTS).map(id=>new Option(shiftLabel(id),id)));shifts.value=shiftFilter;shifts.onchange=()=>{shiftFilter=shifts.value;renderStaffUI(true);};shiftLabelNode.append(shifts);controls.append(label,shiftLabelNode,button('Restaurant ansehen',()=>{dialog.close();state.navigate('restaurant',restaurant);}));host.append(controls);
   const team=restaurantStaff(state.staff,restaurant),summary=node('div',undefined,'staffBranchSummary');summary.id='staffBranchSummary';summary.append(node('h3',restaurantName(restaurant)),node('p',team.filter(p=>p.role==='cook').length+' Küche · '+team.filter(p=>p.role==='waiter').length+' Service · '+money(monthlyPayroll(state.staff,restaurant)/100)+' / Monat'));const accepting=button(profiles[restaurant].business.open===false?'Neue Gäste zulassen':'Neue Gäste stoppen',()=>{profiles[restaurant].business.open=profiles[restaurant].business.open===false;saveLayout();renderStaffUI(true);});accepting.id='staffAcceptGuests';summary.append(accepting);host.append(summary);
  }else{host.append(node('h3',view==='market'?'Arbeitsmarkt':'Personalakten'),node('p',view==='market'?'Wähle Qualifikation und Restaurant. Höhere Kompetenzwerte bedeuten ein höheres Monatsgehalt.':'Deine Leute mit ihren Kompetenzen und der aktuellen Restaurantzuordnung.','staffIntro'));}
  roleFilters(host);
  const people=(view==='market'?state.staff.market:view==='files'?state.staff.employees:restaurantStaff(state.staff,restaurant)).filter(p=>(roles[view]==='all'||p.role===roles[view])&&(view!=='restaurants'||shiftFilter==='all'||p.shift===shiftFilter)).slice().sort((a,b)=>view==='market'?averageSkill(a)-averageSkill(b):a.name.localeCompare(b.name,'de'));
  const list=node('div',undefined,'staffCards');list.setAttribute('role','list');list.dataset.staffList=view;
  if(!people.length){const empty=node('div',undefined,'staffEmpty');empty.append(node('h3',view==='market'?'Keine passende Bewerbung':'Noch kein Personal in dieser Auswahl'),node('p','Auf dem Arbeitsmarkt kannst du Mitarbeitende einstellen und einem Restaurant zuordnen.'));if(view!=='market')empty.append(button('Zum Arbeitsmarkt',()=>setView('market')));host.append(empty);}else{for(const person of people)list.append(card(person,profiles,view==='market'));host.append(list);}
 }
 if(force||performance.now()-stamp>750){stamp=performance.now();for(const e of state.staff.employees){const busy=employeeBusy(e,profiles),status=dialog.querySelector('[data-work-status="'+e.id+'"]'),dismiss=dialog.querySelector('[data-dismiss="'+e.id+'"]');if(status){const schedule=e.restaurantId?staffSchedule(state.staff,e.restaurantId,state.gameMinutes,profiles[e.restaurantId].service):null;status.textContent=busy?'Arbeitet an einer Bestellung oder räumt Teller ab. Zuordnung nach Abschluss möglich.':e.restaurantId?(schedule.working.some(p=>p.id===e.id)?'Im Dienst · ':'Außerhalb der Schicht · ')+restaurantName(e.restaurantId)+' · '+shiftLabel(e.shift):'Ohne Restaurant. Gehalt läuft weiter.';}if(dismiss)dismiss.disabled=busy;}}
}
function setView(next){view=next;el('staffStatus').textContent='';renderStaffUI(true);}
export function mountStaffUI(){
 el('staffBtn').onclick=()=>{if(el('businessDialog').open)el('businessDialog').close();restaurant=state.activeRestaurantId;el('staffDialog').showModal();renderStaffUI(true);};
 el('staffClose').onclick=()=>el('staffDialog').close();
 for(const tab of document.querySelectorAll('[data-staff-view]')){tab.onclick=()=>setView(tab.dataset.staffView);tab.onkeydown=event=>{const tabs=[...document.querySelectorAll('[data-staff-view]')],index=tabs.indexOf(tab);let target;if(event.key==='ArrowRight')target=tabs[(index+1)%tabs.length];if(event.key==='ArrowLeft')target=tabs[(index+tabs.length-1)%tabs.length];if(event.key==='Home')target=tabs[0];if(event.key==='End')target=tabs.at(-1);if(target){event.preventDefault();setView(target.dataset.staffView);target.focus();}};}
 document.addEventListener('restaurants-changed',()=>renderStaffUI(true));
}
