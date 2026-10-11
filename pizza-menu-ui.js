import {notify} from './pizza-core.js?v=20261011e';
import {INGREDIENTS,copyRecipe} from './pizza-recipe.js?v=20261011e';
import {savedRecipes,drawRecipePreview,showPizza} from './pizza-editor.js?v=20261011e';
import {parseMenuPrice,menuContribution,restoreMenu,putOnMenu} from './pizza-menu.js?v=20261011e';

const el=id=>document.getElementById(id),KEY='pizza-menu-v1';
const money=cents=>(cents/100).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' DM';
let items=[];
try{items=restoreMenu(JSON.parse(localStorage.getItem(KEY)));}catch{}
function save(message){
  try{localStorage.setItem(KEY,JSON.stringify({version:1,items}));el('menuStatus').textContent=message;}
  catch{el('menuStatus').textContent='Änderung gilt für diese Sitzung. Speichern ist gerade nicht möglich.';notify('Speisekarte bleibt in dieser Sitzung erhalten.');}
}
function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function button(text,action){const b=node('button','',text);b.type='button';b.onclick=action;return b;}
function updateSummary(){el('menuSummary').textContent=items.length+' Pizzen · '+items.filter(item=>item.active).length+' im Angebot';}
function economics(card,item){
  const {cost,amount,percent}=menuContribution(item);
  card.classList.toggle('menuLoss',amount<0);card.classList.toggle('menuPaused',!item.active);
  card.querySelector('[data-menu-cost]').textContent=money(cost);
  card.querySelector('[data-menu-contribution]').textContent=money(amount);
  card.querySelector('[data-menu-margin]').textContent=percent.toLocaleString('de-DE',{maximumFractionDigits:1})+' % vom Verkaufspreis';
  const warning=card.querySelector('[data-menu-warning]');warning.hidden=amount>=0;warning.textContent='Verkaufspreis liegt unter den Zutatenkosten.';
}
function card(item,index){
  const c=node('article','menuCard');c.dataset.menuName=item.recipe.name;
  const head=node('div','menuCardHead'),canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;canvas.setAttribute('aria-label','Pizza '+item.recipe.name);drawRecipePreview(item.recipe,canvas);
  const title=node('div','menuCardTitle');title.append(node('h3','',item.recipe.name));
  const names=new Set(item.recipe.toppings.map(t=>t.id));
  title.append(node('p','',[(item.recipe.sauce==='tomato'?'Tomatensauce':'Bianca'),...INGREDIENTS.filter(i=>names.has(i.id)).map(i=>i.name)].join(' · ')));
  head.append(canvas,title);c.append(head);
  const stats=node('div','menuNumbers');
  for(const [label,key]of [['Zutatenkosten','menuCost'],['Deckungsbeitrag','menuContribution']]){
    const stat=node('div');stat.append(node('span','',label));const value=node('strong');value.dataset[key]='';stat.append(value);stats.append(stat);
  }
  c.append(stats);const margin=node('p','menuMargin');margin.dataset.menuMargin='';c.append(margin);
  const form=node('form','menuPriceForm'),label=node('label','', 'Verkaufspreis (DM)'),input=document.createElement('input');
  input.type='text';input.inputMode='decimal';input.maxLength=6;input.required=true;input.id='menuPrice-'+index;input.value=(item.price/100).toFixed(2).replace('.',',');input.dataset.menuPrice='';label.htmlFor=input.id;
  input.setAttribute('aria-label','Verkaufspreis für '+item.recipe.name+' in DM');
  const submit=node('button','', 'Preis speichern');submit.type='submit';form.append(label,input,submit);c.append(form);
  input.oninput=()=>input.setCustomValidity('');
  form.onsubmit=event=>{
    event.preventDefault();const price=parseMenuPrice(input.value);
    if(price===null){input.setCustomValidity('Bitte einen Preis von 0,01 bis 999,99 DM mit maximal zwei Nachkommastellen eingeben.');input.reportValidity();return;}
    item.price=price;input.value=(price/100).toFixed(2).replace('.',',');economics(c,item);save('Preis für '+item.recipe.name+' gespeichert.');
  };
  const warning=node('p','menuWarning');warning.dataset.menuWarning='';warning.setAttribute('role','status');c.append(warning);
  const actions=node('div','menuCardActions');
  const toggle=button('',()=>{item.active=!item.active;syncToggle();economics(c,item);updateSummary();save(item.recipe.name+(item.active?' ist im Angebot.':' ist pausiert.'));});toggle.dataset.menuToggle='';
  function syncToggle(){toggle.textContent=item.active?'Im Angebot':'Pausiert';toggle.setAttribute('aria-pressed',String(item.active));toggle.setAttribute('aria-label',item.recipe.name+(item.active?' pausieren':' ins Angebot nehmen'));}
  syncToggle();const remove=button('Entfernen',()=>{items=items.filter(i=>i!==item);save(item.recipe.name+' von der Karte entfernt. Dein Rezept bleibt gespeichert.');render();el('menuRecipe').focus();});remove.setAttribute('aria-label',item.recipe.name+' von der Speisekarte entfernen');remove.dataset.menuRemove='';actions.append(toggle,remove);c.append(actions);economics(c,item);return c;
}
function render(){
  const recipes=savedRecipes(),select=el('menuRecipe'),selected=select.value;
  select.replaceChildren(new Option(recipes.length?'Gespeichertes Rezept auswählen':'Noch keine Rezepte gespeichert',''),...recipes.map((r,i)=>new Option(r.name,String(i))));
  if(recipes[Number(selected)]&&selected!=='')select.value=selected;
  el('menuAdd').disabled=select.value==='';
  const recipe=select.value===''?null:recipes[Number(select.value)];el('menuAdd').textContent=recipe&&items.some(item=>item.recipe.name===recipe.name)?'Rezept aktualisieren':'Auf die Karte';
  el('menuEmpty').hidden=items.length>0;
  el('menuCards').replaceChildren(...items.map(card));updateSummary();
}
export function openMenu(){render();el('menuStatus').textContent='';const dialog=el('menuDialog');if(!dialog.open)dialog.showModal();el('menuClose').focus();}
export function menuSnapshot(){return items.map(item=>({...item,recipe:copyRecipe(item.recipe)}));}
export function serviceMenu(){return items;}
export function mountMenu(){
  for(const b of document.querySelectorAll('[data-open-menu]'))b.onclick=openMenu;
  el('menuClose').onclick=()=>el('menuDialog').close();
  el('menuCreate').onclick=()=>{el('menuDialog').close();showPizza();el('pizzaName').focus();};
  el('menuRecipe').onchange=()=>{el('menuAdd').disabled=el('menuRecipe').value==='';const recipe=savedRecipes()[Number(el('menuRecipe').value)];el('menuAdd').textContent=recipe&&items.some(item=>item.recipe.name===recipe.name)?'Rezept aktualisieren':'Auf die Karte';};
  el('menuAdd').onclick=()=>{
    const recipe=savedRecipes()[Number(el('menuRecipe').value)];if(el('menuRecipe').value===''||!recipe)return;
    const next=putOnMenu(items,recipe);if(!next){el('menuStatus').textContent='Maximal 20 Pizzen auf der Karte.';return;}
    items=next;save(recipe.name+' auf der Speisekarte gespeichert.');render();el('menuAdd').textContent='Rezept aktualisieren';
  };
  document.addEventListener('pizza-recipes-changed',()=>{
    const recipes=savedRecipes();for(const item of items){const recipe=recipes.find(r=>r.name===item.recipe.name);if(recipe)item.recipe=copyRecipe(recipe);}
    if(items.length)save('Rezepte aktualisiert. Deine Verkaufspreise bleiben erhalten.');
    if(el('menuDialog').open)render();
  });
}
