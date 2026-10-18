import {validRecipe,copyRecipe,recipeCost} from './pizza-recipe.js?v=20261018-public2';

import {ingredientPurchaseCost} from './pizza-procurement.js?v=20261018-public2';
// All prices and contributions are integer Pfennig amounts.
export function parseMenuPrice(value){
  if(typeof value!=='string')return null;
  const text=value.trim();if(!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(text))return null;
  const [whole,fraction='']=text.split(/[.,]/),price=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  return price>0&&price<=99999?price:null;
}
export function menuContribution(item,discount=0){
  const cost=ingredientPurchaseCost(recipeCost(item.recipe),1,discount),amount=item.price-cost;
  return {cost,amount,percent:amount/item.price*100};
}
export function restoreMenu(saved){
  const items=[],names=new Set();
  if(saved?.version!==1||!Array.isArray(saved.items))return items;
  for(const item of saved.items){
    if(items.length===20)break;
    if(!validRecipe(item?.recipe)||!item.recipe.name.trim()||names.has(item.recipe.name)||!Number.isInteger(item.price)||item.price<1||item.price>99999||typeof item.active!=='boolean')continue;
    names.add(item.recipe.name);items.push({recipe:copyRecipe(item.recipe),price:item.price,active:item.active});
  }
  return items;
}
export function putOnMenu(items,recipe){
  if(!validRecipe(recipe)||!recipe.name.trim())return null;
  const index=items.findIndex(item=>item.recipe.name===recipe.name);
  if(index<0&&items.length>=20)return null;
  const next=items.map(item=>({...item,recipe:copyRecipe(item.recipe)}));
  if(index>=0)next[index].recipe=copyRecipe(recipe);
  else next.push({recipe:copyRecipe(recipe),price:Math.ceil(Math.max(600,recipeCost(recipe)*3)/50)*50,active:true});
  return next;
}
