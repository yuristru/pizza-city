export const WAREHOUSES=[
 {id:'deposito-mercato',name:'Deposito Mercato',district:'Ostviertel',bx:2,by:1,price:18000,dailyCents:3000,discount:20,width:2.2,depth:1.4},
 {id:'deposito-centro',name:'Deposito Centrale',district:'Domviertel',bx:2,by:0,price:18000,dailyCents:3000,discount:20,width:2.2,depth:1.4}
];
export const warehouse=id=>WAREHOUSES.find(w=>w.id===id)||null;
const cents=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e12;
export function restoreProcurement(raw){
 const owned=Array.isArray(raw?.owned)&&raw.owned.length<=WAREHOUSES.length&&new Set(raw.owned).size===raw.owned.length&&raw.owned.every(warehouse)?[...raw.owned]:[];
 const costCents=cents(raw?.costCents)?raw.costCents:0;
 return {owned,costCents,debtCents:cents(raw?.debtCents)&&raw.debtCents<=costCents?raw.debtCents:0,accrued:Number.isFinite(raw?.accrued)&&raw.accrued>=0&&raw.accrued<1?raw.accrued:0};
}
export const purchasingDiscount=procurement=>Math.max(0,...(procurement?.owned||[]).map(id=>warehouse(id)?.discount||0));
export const warehouseDailyCost=procurement=>(procurement?.owned||[]).reduce((sum,id)=>sum+(warehouse(id)?.dailyCents||0),0);
export function ingredientPurchaseCost(unitCost,size=1,discount=0){return Math.max(1,Math.round(unitCost*(1-Math.max(0,Math.min(20,discount))/100)))*size;}
export function warehousePurchaseIssue(id,procurement,balance){
 const w=warehouse(id);if(!w)return 'Dieses Lager existiert nicht.';
 if(procurement.owned.includes(id))return 'Dieses Lager gehört dir bereits.';
 if(!Number.isFinite(balance)||balance<w.price)return 'Nicht genügend Geld für dieses Lager.';
 return null;
}
export function buyWarehouse(id,procurement,balance){if(warehousePurchaseIssue(id,procurement,balance))return null;procurement.owned.push(id);return {balance:balance-warehouse(id).price};}
export function accrueWarehouseCosts(procurement,seconds,balanceCents){
 if(!Number.isFinite(seconds)||seconds<=0)return {balanceCents,paid:0};
 const total=procurement.accrued+warehouseDailyCost(procurement)*seconds/7200,charge=Math.floor(total+1e-9);
 procurement.accrued=Math.max(0,total-charge);procurement.costCents+=charge;procurement.debtCents+=charge;
 const paid=Math.min(balanceCents,procurement.debtCents);procurement.debtCents-=paid;
 return {balanceCents:balanceCents-paid,paid};
}
