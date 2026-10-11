import {restaurantPlan} from './pizza-floorplans.js?v=20261011l';
import {state,saveLayout,updateMoney,notify,ensureRestaurants} from './pizza-core.js?v=20261011l';
import {money} from './pizza-catalog.js?v=20261011l';
import {PROPERTIES,PROPERTY_SIZES,property,buyProperty,propertyPurchaseIssue} from './pizza-properties.js?v=20261011l';
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
