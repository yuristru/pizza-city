import assert from 'node:assert/strict';
import {counterWorkplaces,counterAccessIssue,counterLayoutIssue,kitchenWorkflow} from '../pizza-business.js';
import {restaurantPlan,withKitchen} from '../pizza-floorplans.js';
import {serviceLayoutIssue} from '../pizza-service.js';
import {legacyKitchen} from '../pizza-kitchen.js';

const base=restaurantPlan('san-marco'),tiles=base.cells.filter(c=>c.x!==base.entrance.x||c.y!==base.entrance.y),plan=withKitchen(base,tiles);
const devices=[{type:'fridge',x:1,y:1,r:0},{type:'oven',x:2,y:1,r:0}];
for(const r of [0,1,2,3]){
 const bar={type:'bar',x:4,y:3,r},items=[...devices,bar],front=counterWorkplaces(bar),[dx,dy]=[[0,1],[-1,0],[0,-1],[1,0]][r];
 assert.deepEqual(front.counter,{x:front.prepSurface.x+dx,y:front.prepSurface.y+dy});assert.deepEqual(front.handoff,{x:front.readySurface.x+dx,y:front.readySurface.y+dy});
 assert.equal(counterAccessIssue(bar,items,plan),null);assert.equal(serviceLayoutIssue(items,plan),null);
 const flow=kitchenWorkflow(items,plan,tiles);assert(flow);assert.deepEqual(flow.counter,front.counter);assert.deepEqual(flow.handoff,front.handoff);
 for(const type of ['oven','fridge'])for(const workplace of [front.counter,front.handoff]){
  const blocked=[...items,{type,...workplace,r:0}];assert.match(counterAccessIssue(bar,blocked,plan),/Arbeitsplätze/);assert.match(serviceLayoutIssue(blocked,plan),/Tresenflächen/);assert.equal(kitchenWorkflow(blocked,plan,tiles),null,'Access from the back or the short ends must not bypass the blocked front.');
 }
 const noFloor=withKitchen(base,tiles.filter(c=>c.x!==front.counter.x||c.y!==front.counter.y));assert.match(counterLayoutIssue(items,noFloor),/Küchenplatte/);
 const noEntry=[...items,{type:'oven',x:8,y:7,r:0},{type:'fridge',x:9,y:6,r:0}];assert.match(counterAccessIssue(bar,noEntry,plan),/Laufweg/);
}
const room=restaurantPlan('mamma-mia'),roomTiles=room.cells.filter(c=>c.x>=8&&c.y<4),roomPlan=withKitchen(room,roomTiles),againstWall={type:'bar',x:8,y:1,r:1};
assert.match(counterAccessIssue(againstWall,[againstWall],roomPlan),/Wand/);
for(const id of ['mamma-mia','san-marco','piazza-limone','bottega','via-roma','belvedere','lungofiume','palazzo-sole','mercato','teatro']){
 const building=restaurantPlan(id),k=legacyKitchen(building),p=withKitchen(building,k.tiles);assert.equal(counterLayoutIssue(k.items,p),null,id);assert(kitchenWorkflow(k.items,p,k.tiles),id);
}
console.log('Counter access passed: both fixed front workplaces in all four rotations, appliance blockers, missing floor, blocked entrance, walls, exact production endpoints and accessible legacy fixtures for every restaurant.');
