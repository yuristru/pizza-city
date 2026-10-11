import {state,Container,ensureRestaurants} from './pizza-core.js?v=20261011k';
import {project,dimensions} from './pizza-layout.js?v=20261011k';
import {guestSprite,mealSprite} from './pizza-sprites.js?v=20261011k';
import {routePosition,guestSeat} from './pizza-service.js?v=20261011k';
import {serviceMenu} from './pizza-menu-ui.js?v=20261011k';

const maps=new WeakMap(),banners=new Map();
export function syncServiceGuests(objects){
  let nodes=maps.get(objects);if(!nodes){nodes=new Map();maps.set(objects,nodes);}
  const wanted=new Set();
  function get(key,label){wanted.add(key);let g=nodes.get(key);if(!g){g=new Container();g.label=label;g.eventMode='none';objects.addChild(g);nodes.set(key,g);}return g;}
  for(const group of state.service.groups)for(let i=0;i<group.size;i++){
    const seated=group.phase==='waiting'||group.phase==='eating',seat=guestSeat(group,i),position=seated?seat:routePosition(group,i),g=get('guest-'+group.id+'-'+i,'service-guest');
    const ahead=seated?null:routePosition({...group,progress:group.progress+.1},i),dx=ahead?ahead.x-position.x:0,dy=ahead?ahead.y-position.y:0;
    const rotation=seated?seat.r:Math.abs(dx)>Math.abs(dy)?(dx>0?0:2):Math.abs(dy)>.001?(dy>0?1:3):(g.facing??0);
    const eating=group.phase==='eating'&&Math.floor(state.service.elapsed*1.5+i)%2===0,artKey=[group.id*3+i,rotation,seated,eating].join(':');
    if(g.artKey!==artKey){g.removeChildren().forEach(child=>child.destroy());g.addChild(guestSprite(group.id*3+i,rotation,seated,eating));g.artKey=artKey;}
    const p=project(position.x,position.y);g.position.set(p.x,p.y);g.zIndex=p.y+.5;g.facing=rotation;g.groupId=group.id;g.phase=group.phase;g.seated=seated;g.cell={x:position.x,y:position.y};
    if(group.phase==='eating'){
      const portion=Math.min(3,Math.floor((1-group.timer/group.eatDuration)*4)),meal=get('meal-'+group.id+'-'+i,'service-meal');
      if(meal.portion!==portion){meal.removeChildren().forEach(child=>child.destroy());meal.addChild(mealSprite(portion));meal.portion=portion;}
      const point=project(seat.mealX,seat.mealY),size=dimensions(group.table),center=project(group.table.x+(size.w-1)/2,group.table.y+(size.h-1)/2);
      meal.position.set(point.x,point.y);meal.zIndex=center.y+.2;meal.groupId=group.id;
    }
  }
  for(const [key,g]of nodes)if(!wanted.has(key)){g.destroy({children:true});nodes.delete(key);}
}
export function renderServiceUI(){
  const groups=state.service.groups,active=serviceMenu().some(item=>item.active),status=document.getElementById('restaurantServiceStatus');
  const seated=groups.filter(g=>g.phase==='waiting'||g.phase==='eating').length,total=groups.reduce((sum,g)=>sum+g.size,0);
  const text=groups.length?total+(total===1?' Gast · ':' Gäste · ')+seated+(seated===1?' Tisch belegt':' Tische belegt'):active?'Geöffnet · Gäste kommen':'Speisekarte noch leer';if(status.textContent!==text)status.textContent=text;
  const host=document.getElementById('incomeBanners'),wanted=new Set();
  for(const [restaurantId,profile]of Object.entries(ensureRestaurants()))for(const [index,payment]of profile.service.payments.entries()){
    const key=restaurantId+':'+payment.id;wanted.add(key);let b=banners.get(key);if(!b){b=document.createElement('div');b.className='incomeBanner';b.dataset.paymentId=String(payment.id);b.dataset.restaurantId=restaurantId;b.dataset.amountCents=String(payment.amount);b.textContent='+'+(payment.amount/100).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' DM';host.append(b);banners.set(key,b);}
    let point=null;
    if(state.scene==='restaurant'&&restaurantId===state.activeRestaurantId&&state.restaurantCamera&&!state.restaurantCamera.destroyed){const p=project(payment.position.x,payment.position.y);point=state.restaurantCamera.toGlobal({x:p.x,y:p.y-70});}
    else if(state.scene==='city'){const sign=state.cityRestaurantSigns[restaurantId];if(sign&&!sign.destroyed)point=sign.toGlobal({x:0,y:-22});}
    b.hidden=!point;
    if(point){const age=profile.service.elapsed-payment.time;b.style.left=point.x+'px';b.style.top=(point.y-age*5-index*25)+'px';b.style.opacity=String(Math.min(1,(4-age)/.8));b.dataset.scene=state.scene;}
  }
  for(const [id,b]of banners)if(!wanted.has(id)){b.remove();banners.delete(id);}
}
