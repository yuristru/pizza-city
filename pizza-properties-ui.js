import {restaurantPlan} from './pizza-floorplans.js?v=20261013f';
import {state,saveLayout,updateMoney,notify,ensureRestaurants} from './pizza-core.js?v=20261013f';
import {money} from './pizza-catalog.js?v=20261013f';
import {PROPERTIES,PROPERTY_SIZES,property,buyProperty,propertyPurchaseIssue} from './pizza-properties.js?v=20261013f';
const el=id=>document.getElementById(id);
let selected=null,filter='small';
function render(){
  const owned=state.ownedProperties;
  el('propertySummary').textContent=`9 Standorte · ${owned.length} in deinem Besitz · Konto ${money(state.balance)}`;
  el('propertyList').hidden=!!selected;el('propertyDetail').hidden=!selected;el('propertyFilters').hidden=!!selected;
  el('propertyTitle').textContent=selected?'Standort ansehen':'Immobilien';
  if(!selected){
    el('propertyFilters').replaceChildren(...Object.entries(PROPERTY_SIZES).map(([key,size])=>{
      const button=document.createElement('button');button.type='button';button.textContent=size.name+' · '+Math.min(...PROPERTIES.filter(p=>p.size===key).map(p=>p.area))+' bis '+Math.max(...PROPERTIES.filter(p=>p.size===key).map(p=>p.area))+' m²';button.classList.toggle('active',filter===key);button.setAttribute('aria-pressed',String(filter===key));button.onclick=()=>{filter=key;render();};return button;
    }));
    el('propertyList').replaceChildren(...PROPERTIES.filter(p=>p.size===filter).map(p=>{
      const button=document.createElement('button');button.type='button';button.dataset.property=p.id;
      const name=document.createElement('strong'),detail=document.createElement('span');name.textContent=p.name;detail.textContent=p.district+' · '+p.area+' m² · '+(owned.includes(p.id)?'Dein Standort':money(p.price));button.append(name,detail);button.onclick=()=>openProperty(p.id);return button;
    }));return;
  }
  const p=property(selected),size=PROPERTY_SIZES[p.size],isOwned=owned.includes(p.id),issue=propertyPurchaseIssue(p.id,owned,state.balance);
  el('propertyName').textContent=p.name;el('propertyInfo').textContent=`${p.district} · ${size.name} · ${p.area} m²`;
  const plan=restaurantPlan(p.id);el('propertyDescription').textContent=(plan.kitchen.kind==='annex'?'Gastraum mit Nebenraum und Verbindungstür. ':plan.kitchen.kind==='room'?'Gastraum mit abgetrenntem Nebenraum. ':'Offener Gastraum. ')+(isOwned?'Küchenboden: '+(ensureRestaurants()[p.id]?.kitchenTiles.length||0)+' m².':'Küche frei planen: Platten und Geräte selbst platzieren.');
  el('propertyPrice').textContent=money(p.price);el('propertyBuy').disabled=!!issue;el('propertyBuy').textContent=isOwned?'Bereits gekauft':'Standort kaufen';
  el('propertyStatus').textContent=isOwned?'Dein Restaurant. Einrichtung und Gäste werden separat gespeichert.':issue||'Einmaliger Kaufpreis. Keine automatische Abbuchung.';
  el('propertyOpen').hidden=!isOwned;
  const fc=el('propertyFloorplan'),fx=fc.getContext('2d'),scale=Math.min(260/plan.w,180/plan.h);fx.clearRect(0,0,280,200);
  const tiles=new Set((ensureRestaurants()[p.id]?.kitchenTiles||[]).map(t=>`${t.x},${t.y}`));
  for(const c of plan.cells){fx.fillStyle=tiles.has(`${c.x},${c.y}`)?'#7d9c90':'#e8cdaa';fx.fillRect(10+c.x*scale,10+c.y*scale,scale-1,scale-1);}
  fx.strokeStyle='#775134';fx.lineWidth=2;
  for(const c of plan.cells)for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]])if(!plan.cells.some(n=>n.x===c.x+dx&&n.y===c.y+dy)){const x=10+(c.x+(dx===1?1:0))*scale,y=10+(c.y+(dy===1?1:0))*scale;fx.beginPath();fx.moveTo(x,y);fx.lineTo(x+(dx===0?scale:0),y+(dy===0?scale:0));fx.stroke();}
  const k=plan.kitchen;if(k.kind!=='island'){fx.strokeRect(10+k.x*scale,10+k.y*scale,k.w*scale,k.h*scale);const d=k.door,right=d.side==='north'||d.side==='south',x=10+(k.x+(right?d.offset:d.side==='east'?k.w:0))*scale,y=10+(k.y+(right?(d.side==='south'?k.h:0):d.offset))*scale;fx.strokeStyle='#4f907a';fx.lineWidth=5;fx.beginPath();fx.moveTo(x,y);fx.lineTo(x+(right?scale:0),y+(right?0:scale));fx.stroke();}
  fx.fillStyle='#a43e2f';fx.fillRect(10+plan.entrance.x*scale,10+plan.entrance.y*scale,scale,scale);
  const canvas=el('propertyPreview'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,180,180);ctx.imageSmoothingEnabled=false;
  const image=(state.cityArt[p.art]?.[p.sprite]||state.cityArt.buildings?.[0])?.texture.source.resource;
  if(image){const scale=Math.min(160/image.width,170/image.height);ctx.drawImage(image,Math.round((180-image.width*scale)/2),Math.round(175-image.height*scale),Math.round(image.width*scale),Math.round(image.height*scale));}
}
export function openProperty(id=null){
  if(id&&!property(id))return;
  selected=id;render();const dialog=el('propertyDialog');if(!dialog.open)dialog.showModal();
  (selected?el('propertyBuy'):el('propertyFilters').querySelector('button')).focus();
}
export function mountProperties(){
  el('propertyOpen').onclick=()=>{el('propertyDialog').close();state.navigate('restaurant',selected);};
  el('propertiesBtn').onclick=()=>openProperty();el('propertyClose').onclick=()=>el('propertyDialog').close();
  el('propertyBack').onclick=()=>{selected=null;render();el('propertyFilters').querySelector('button').focus();};
  el('propertyBuy').onclick=()=>{
    const result=buyProperty(selected,state.ownedProperties,state.balance);if(!result)return;
    state.balance=result.balance;state.ownedProperties=result.owned;
    saveLayout();updateMoney();state.onPropertyChange?.();render();document.dispatchEvent(new Event('restaurants-changed'));notify(property(selected).name+' gekauft.');
  };
}
