import assert from 'node:assert/strict';
import {FLOORPLANS,withKitchen,roomStep} from '../pizza-floorplans.js';
import {placementIssue,validLayout,DEFAULT_LAYOUT} from '../pizza-layout.js';
import {kitchenReadiness,kitchenComponents,restoreKitchenTiles,kitchenTileIssue,legacyKitchen} from '../pizza-kitchen.js';
import {freshService,advanceService,servicePath} from '../pizza-service.js';
import {freshRestaurant,restoreRestaurants} from '../pizza-restaurant-profiles.js';
const building=FLOORPLANS['san-marco'];
const square=Array.from({length:9},(_,i)=>({x:2+i%3,y:2+Math.floor(i/3),paid:50}));
const plan=withKitchen(building,square),devices=[{type:'oven',x:2,y:2,r:0},{type:'bar',x:3,y:2,r:0},{type:'fridge',x:2,y:3,r:0}];
assert(validLayout(devices,plan));assert(kitchenReadiness(square,devices,plan).ready);
assert(!kitchenReadiness(square.slice(0,8),devices,plan).ready);
assert(!kitchenReadiness(square.filter((_,i)=>i%2===0),devices,plan).ready);
for(const type of ['oven','bar','fridge']){assert(!kitchenReadiness(square,devices.filter(item=>item.type!==type),plan).ready);assert.match(placementIssue({type,x:8,y:5,r:0},[],plan),/Küchenplatten/);}
assert.match(placementIssue({type:'bar',x:4,y:2,r:0},[],plan),/Küchenplatten/);
assert.match(placementIssue({type:'table',seats:2,x:2,y:2,r:0},[],plan),/Küchengeräte/);
assert.match(kitchenTileIssue({x:9,y:7},[],[],plan),/Eingang/);
assert.deepEqual(restoreKitchenTiles([...square,square[0]],building),[]);
assert.deepEqual(restoreKitchenTiles([{x:99,y:99}],building),[]);
const split=[...square,...square.map(t=>({...t,x:t.x+4}))],splitPlan=withKitchen(building,split);
assert(!kitchenReadiness(split,[devices[0],devices[1],{...devices[2],x:6}],splitPlan).ready,'Equipment split between separate kitchens must not open the restaurant.');
const annex=FLOORPLANS['via-roma'],empty=withKitchen(annex,[]);
assert.equal(roomStep({x:9,y:2},{x:10,y:2},empty),false);assert.equal(roomStep({x:9,y:4},{x:10,y:4},empty),true);
const path=servicePath([],empty.entrance,{x:13,y:2},empty);assert(path.some(p=>p.x===9&&p.y===4),'Side-room access must use the door.');
const wallTiles=[{x:9,y:2},{x:10,y:2}];assert.equal(kitchenComponents(wallTiles,empty).length,2);
const offer={recipe:{name:'Pizza',sauce:'tomato',toppings:[]},price:850,active:true},table={type:'table',seats:4,x:6,y:5,r:0};
const service=freshService();let balance=10000000;
for(let i=0;i<120;i++)balance=advanceService(service,.25,[table], [offer],balance,withKitchen(building,[])).balanceCents;
assert.equal(service.groups.length,0);assert.equal(balance,10000000);
for(let i=0;i<120;i++)balance=advanceService(service,.25,[table,...devices.slice(0,2)],[offer],balance,plan).balanceCents;
assert.equal(service.groups.length,0);
for(let i=0;i<360;i++)balance=advanceService(service,.25,[table,...devices],[offer],balance,plan).balanceCents;
assert(service.servedGuests>0);assert.equal(balance,10000000+service.netCents);
assert.deepEqual(freshRestaurant('san-marco').kitchenTiles,[]);
for(const p of Object.values(FLOORPLANS)){
 const k=legacyKitchen(p),profile=restoreRestaurants({[p.id]:{items:[],floorPlanVersion:1}},p.id==='mamma-mia'?[]:[p.id],null)[p.id];
 assert(validLayout(profile.items,withKitchen(p,profile.kitchenTiles)));assert.equal(profile.items.length,0,'An old empty restaurant must not receive free kitchen devices.');assert(!kitchenReadiness(profile.kitchenTiles,profile.items,p).ready);assert.equal(p.decor.length,0);
 const next=restoreRestaurants({[p.id]:profile},p.id==='mamma-mia'?[]:[p.id],null)[p.id];assert.deepEqual(next.kitchenTiles,profile.kitchenTiles);assert.deepEqual(next.items,profile.items);
}
console.log('Kitchen model passed: connected floor, minimum size, one-component equipment, complete device footprints, walls/doors, closed/open service and saved migration.');

const oldMain=restoreRestaurants(null,[],{items:[...DEFAULT_LAYOUT,{type:'oven',x:2,y:5,r:0,paid:2400}],finishes:{floor:'stone',renovation:0},service:freshService(),investmentCents:240000})['mamma-mia'];
assert(validLayout(oldMain.items,withKitchen(FLOORPLANS['mamma-mia'],oldMain.kitchenTiles)));assert.equal(oldMain.items.filter(i=>i.type==='oven').length,1);assert.equal(oldMain.items.find(i=>i.type==='oven').paid,2400);assert.equal(oldMain.investmentCents,240000);
assert.deepEqual(restoreRestaurants({'mamma-mia':oldMain},[],null)['mamma-mia'].items,oldMain.items);
console.log('Legacy paid kitchen device migration passed: relocation, purchase price, investment and stable reload.');
