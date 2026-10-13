import assert from 'node:assert/strict';
import {FLOORPLANS,withKitchen} from '../pizza-floorplans.js';
import {minimalEquipment,emptyRestaurant,AUTO_EQUIP_PRICE} from '../pizza-auto-equip.js';
import {freshRestaurant,restoreRestaurants} from '../pizza-restaurant-profiles.js';
import {kitchenReadiness,kitchenWorkFlow,restoreKitchenTiles,kitchenTileIssue,kitchenComponents,KITCHEN_TILE_PRICE} from '../pizza-kitchen.js';
import {validLayout,copyLayout,occupiedCells} from '../pizza-layout.js';
import {itemPrice} from '../pizza-catalog.js';
import {counterLayoutIssue} from '../pizza-business.js';
import {serviceLayoutIssue,servicePath,advanceService,restoreService} from '../pizza-service.js';
import {blankRecipe} from '../pizza-recipe.js';
const offer={recipe:{...blankRecipe(),name:'Margherita',toppings:[{id:'mozzarella',form:1,x:160,y:160,angle:0}]},price:850,active:true};
assert.equal(AUTO_EQUIP_PRICE,2990);
for(const [id,building] of Object.entries(FLOORPLANS)){
 const profile=freshRestaurant(id);profile.items=[];assert(emptyRestaurant(profile));
 const setup=minimalEquipment(building),plan=withKitchen(building,setup.kitchenTiles);assert(setup,id+' needs an automatic setup.');
 assert.equal(setup.items.length,4);assert.deepEqual(setup.items.map(i=>i.type).sort(),['bar','fridge','oven','table']);assert.equal(setup.items.find(i=>i.type==='table').seats,2);assert.equal(setup.kitchenTiles.length,9);assert.equal(kitchenComponents(setup.kitchenTiles,plan).length,1);
 assert.equal(setup.price,setup.items.reduce((sum,i)=>sum+itemPrice(i),0)+setup.kitchenTiles.length*KITCHEN_TILE_PRICE);assert(setup.items.every(i=>i.paid===itemPrice(i)));assert(setup.kitchenTiles.every(t=>t.paid===50));
 const laid=[];for(const t of setup.kitchenTiles){assert.equal(kitchenTileIssue(t,laid,[],building),null);laid.push(t);}assert.deepEqual(restoreKitchenTiles(setup.kitchenTiles,building),setup.kitchenTiles);
 assert(validLayout(setup.items,plan));assert(kitchenReadiness(setup.kitchenTiles,setup.items,plan).ready);assert(kitchenWorkFlow(setup.kitchenTiles,setup.items,plan));assert.equal(counterLayoutIssue(setup.items,plan),null);assert.equal(serviceLayoutIssue(setup.items,plan),null);if(plan.approach)assert(servicePath(setup.items,plan.entrance,plan.approach,plan));
 const table=setup.items.find(i=>i.type==='table'),k=building.kitchen;assert(occupiedCells(table).every(key=>{const [x,y]=key.split(',').map(Number);return !(x>=k.x&&x<k.x+k.w&&y>=k.y&&y<k.y+k.h);}),id+' keeps the dining table outside the kitchen room or island.');
 profile.items=copyLayout(setup.items);profile.kitchenTiles=setup.kitchenTiles.map(t=>({...t}));profile.investmentCents=setup.price*100;assert(!emptyRestaurant(profile));
 const owned=id==='mamma-mia'?[]:[id],loaded=restoreRestaurants({[id]:profile},owned,null)[id];assert.deepEqual(loaded.items,profile.items);assert.deepEqual(loaded.kitchenTiles,profile.kitchenTiles);assert.equal(loaded.investmentCents,299000);assert.equal(loaded.business.cook,0);assert.equal(loaded.business.waiter,0);
 // Use the real cooking, delivery and clearing chain, then verify exact meal accounting and a reusable table.
 const business={staff:{cook:1,waiter:1},accepting:true,companyDebt:0,finishes:profile.finishes,location:1};let cash=1000000-299000;
 const arrival=advanceService(profile.service,2.1,profile.items,[offer],cash,plan,business);cash=arrival.balanceCents;assert.equal(profile.service.groups.length,1,id+' admits diners.');
 const finish=advanceService(profile.service,250,profile.items,[],cash,plan,business);cash=finish.balanceCents;assert.equal(profile.service.servedGuests,2,id+' completes service.');assert.equal(profile.service.revenueCents,1700);assert.equal(profile.service.costCents,304);assert.equal(profile.service.cleanedTables,1);assert.equal(profile.service.groups.length,0);assert.equal(profile.service.dirtyTables.length,0);assert.equal(profile.service.waiterTasks.length,0);assert.equal(cash,701000+profile.service.netCents-(profile.service.operatingCents||0));assert.deepEqual(restoreService(structuredClone(profile.service),plan),profile.service);
 const snapshot=JSON.stringify(setup);profile.items[0].x++;profile.kitchenTiles[0].paid=0;assert.equal(JSON.stringify(minimalEquipment(building)),snapshot,'Editing purchased furniture never mutates the cached plan.');
}
const empty=freshRestaurant('san-marco');assert(emptyRestaurant(empty));assert(!emptyRestaurant(freshRestaurant('mamma-mia')));
for(const patch of [{items:[{type:'plant'}]},{kitchenTiles:[{x:0,y:0}]},...['groups','machineGuests','dirtyTables','waiterTasks','plateReturns'].map(key=>({service:{...empty.service,[key]:[{}]}}))])assert(!emptyRestaurant({...empty,...patch}));
assert(emptyRestaurant({...empty,finishes:{floor:'checker',renovation:3},service:{...empty.service,staffPositions:{cook:{x:1,y:1}},revenueCents:1700}}),'A bare room can retain its finishes, staff assignments and financial history.');
const tooSmall={...FLOORPLANS['san-marco'],kitchen:{...FLOORPLANS['san-marco'].kitchen,w:2}};assert.equal(minimalEquipment(tooSmall),null);
console.log('Auto equip passed: all ten floor plans, exactly nine paid connected tiles, cheapest editable appliances and two-seat table, safe counter/door/table paths, full cooking/delivery/cleanup, exact equipment/meal accounting, cache isolation, saved investment and strict empty-room availability.');
