import assert from 'node:assert/strict';
import {MAX_STOREYS,STOREY_HEIGHT,buildingProjection} from '../pizza-city-building-rules.js';
import {BUILDING_ART} from '../pizza-city-building-art.js';
import {BUILDING_FOOTPRINTS} from '../pizza-city-footprints.js';
assert.equal(MAX_STOREYS,2);
const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
let count=0;
for(const frames of Object.values(BUILDING_ART))for(const art of frames){
 count++;assert(art.storeys<=2);assert(art.crop.every(Number.isFinite));if(art.uniform)continue;
 const [left,front,right]=art.corners,u=left.map((n,i)=>n-front[i]),v=right.map((n,i)=>n-front[i]);
 for(const width of [art.worldWidth,art.worldWidth*.6,art.worldWidth*1.4]){
  const p=buildingProjection(art.corners,width,art.storeys,art.facadePixels),base=p.project(front);
  close(base[0],0);close(base[1],0);assert(p.facadeHeight<=art.storeys*STOREY_HEIGHT+1e-8);
  const sample=(a,b,z=0)=>[front[0]+a*u[0]+b*v[0],front[1]+a*u[1]+b*v[1]-z];
  // Test whole roof ridges crossing x=front.x, and offset wings on either side.
  // A different transform for each half fails parallelism and linearity here.
  for(const origin of [[0,0],[-2,1],[2,-1],[.5,.5]])for(const direction of [u,v]){
   const a=sample(...origin,art.facadePixels),b=a.map((n,i)=>n+3*direction[i]),pa=p.project(a),pb=p.project(b);
   close(pb[1]-pa[1],(direction===u?.5:-.5)*(pb[0]-pa[0]));
  }
  for(const a of [sample(1,0),sample(-1,1),sample(2,-2)]){
   const base=p.project(a),up=p.project([a[0],a[1]-25]);close(base[0],up[0]);close(base[1]-up[1],25*p.scaleY);
  }
  const a=sample(-2,1),b=sample(2,1),mid=a.map((n,i)=>(n+b[i])/2),pa=p.project(a),pb=p.project(b),pm=p.project(mid);close(pm[0],(pa[0]+pb[0])/2);close(pm[1],(pa[1]+pb[1])/2);
 }
}
assert.equal(count,54);assert.equal(BUILDING_ART.buildings.length,32);assert.equal(BUILDING_ART.courtyardBuildings.length,4);
assert(new Set(BUILDING_ART.buildings.map(a=>a.name)).size===32);
assert(new Set(BUILDING_ART.buildings.map(a=>a.chimney.type)).size>=6);
assert(new Set(BUILDING_ART.buildings.map(a=>a.chimney.position.join(','))).size>=6);
assert(new Set(BUILDING_ART.buildings.map(a=>a.roof)).size>=3);
assert(BUILDING_FOOTPRINTS.every(t=>t.floors<=2));
for(const floors of [0,3,4,1.5,NaN])assert.throws(()=>buildingProjection([[0,20],[100,70],[200,20]],128,floors,100));
console.log('Building art passed: 54 sprites, including sixteen oriented corner houses, 32 distinct houses in one atlas, four palazzi, roof/chimney variety, two-storey limit and whole-building 2:1 parallelism across roof ridges and courtyard wings.');

assert.equal(BUILDING_ART.cornerBuildings.length,16);assert(BUILDING_ART.cornerBuildings.every(a=>a.shape==='chamfered'&&a.roof==='chamfered-hip'));assert.equal(new Set(BUILDING_ART.cornerBuildings.map(a=>a.buildingFamily)).size,4);assert.equal(new Set(BUILDING_ART.cornerBuildings.map(a=>a.cornerDirection)).size,4);
// A family keeps one fixed mesh. Its four images are actual yaw rotations;
// facade/roof calibration and chimney coordinates cannot change by view.
for(let family=0;family<4;family++){
 const views=BUILDING_ART.cornerBuildings.filter(a=>a.buildingFamily===`clock-corner-family-${family}`);
 assert.deepEqual(views.map(a=>a.modelYaw),[0,90,180,270]);
 assert(views.every(a=>a.clock===(family===0)));
 assert.equal(new Set(views.map(a=>a.facadePixels)).size,1);
 assert.equal(new Set(views.map(a=>a.chimney.position.join(','))).size,1);
 for(const art of views){const p=buildingProjection(art.corners,art.worldWidth,2,art.facadePixels);close(p.skewY,0);close(p.scaleX,p.scaleY);}
}

assert(!Object.hasOwn(BUILDING_ART,'buildingTypes'));
