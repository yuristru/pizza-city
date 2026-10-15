import assert from 'node:assert/strict';
import {MAX_STOREYS,STOREY_HEIGHT,buildingProjection} from '../pizza-city-building-rules.js';
import {BUILDING_ART} from '../pizza-city-building-art.js';
assert.equal(MAX_STOREYS,2);
let count=0;
for(const [kind,frames]of Object.entries(BUILDING_ART))for(const art of frames){
 count++;assert(art.storeys<=2);assert(art.crop.every(Number.isFinite));const [left,front,right]=art.corners;
 for(const target of [{width:1.65,depth:1.65},{width:3,depth:1.1},{width:1,depth:4.1}]){
  const p=buildingProjection(art.corners,target,art.storeys,art.facadePixels),a=p.project(left),b=p.project(front),c=p.project(right);
  const close=(x,y)=>assert(Math.abs(x-y)<1e-8,`${kind}: ${x} != ${y}`);
  close(a[0],-target.width*32);close(a[1],-target.width*16);close(b[0],0);close(b[1],0);close(c[0],target.depth*32);close(c[1],-target.depth*16);
  assert(p.facadeHeight<=art.storeys*STOREY_HEIGHT+1e-8);
  for(const point of [left,front,right]){const v=p.project([point[0],point[1]-20]),base=p.project(point);close(v[0],base[0]);assert(v[1]<base[1]);}
 }
}
assert.equal(count,29);assert.equal(BUILDING_ART.courtyardBuildings.length,2);assert.equal(BUILDING_ART.landmarks.length,2);
for(const storeys of [0,3,4,1.5,NaN])assert.throws(()=>buildingProjection([[0,20],[100,70],[200,20]],{width:2,depth:2},storeys,100));
console.log('City height passed: all 28 replacement variants plus the narrow-house source, maximum two storeys, exact unchanged footprint edges, vertical walls, bounded facade heights and invalid higher buildings rejected.');
