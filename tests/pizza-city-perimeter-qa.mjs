import assert from 'node:assert/strict';
import {BUILDING_ART} from '../pizza-city-building-art.js';
import {buildingProjection} from '../pizza-city-building-rules.js';
import {oldtownQuarter,perimeterBlock,packPerimeterRow,foundationsOverlap,neighboringFoundations,MIN_PERIMETER_SCALE} from '../pizza-city-perimeter.js';

const catalog=BUILDING_ART.buildings.map((a,index)=>({kind:'buildings',index,...buildingProjection(a.corners,a.worldWidth,a.storeys,a.facadePixels).groundSize}));
for(const seed of [0,1,61,94117,0xffffffff,...Array.from({length:64},(_,i)=>Math.imul(i+1,2654435761)>>>0)]){
  const q=oldtownQuarter(catalog,seed);assert.equal(q.blocks.length,3);
  assert.deepEqual(oldtownQuarter(catalog,seed),q,'The same seed must reproduce every building and passage.');
  for(const b of q.blocks){
    assert.equal(b.parts.filter(p=>p.corner).length,4);
    assert.equal(b.parts.filter(p=>p.restaurant).length,1);
    for(const [side,coverage]of Object.entries(b.coverage)){
      assert(coverage.ratio>=.9,'At least 90% of every street front is built.');
      if(side!=='south')assert(Math.abs(coverage.ratio-1)<1e-7,'Only the planned southern passage can interrupt a front.');
    }
    assert(b.court.x1-b.court.x0>2&&b.court.y1-b.court.y0>2,'Courtyards remain usable, deliberate inner spaces.');
    for(const p of b.parts){
      assert(p.scale>=MIN_PERIMETER_SCALE-1e-7&&p.scale<=1);
      assert(p.x0>=b.x0-1e-7&&p.x1<=b.x1+1e-7&&p.y0>=b.y0-1e-7&&p.y1<=b.y1+1e-7);
      assert(!foundationsOverlap(p,b.court),'The inner courtyard is not filled by bounding boxes.');
      assert(!foundationsOverlap(p,b.gate),'The entrance passage is clear all the way to the courtyard.');
      const art=catalog[p.index];assert(Math.abs(p.width/art.width-p.depth/art.depth)<1e-10,'Each complete image has one uniform scale.');
      if(p.restaurant){assert.equal(p.entrance.y,b.y1);assert(p.approach.y>b.y1);}
    }
  }
  for(let i=0;i<q.parts.length;i++)for(let j=i+1;j<q.parts.length;j++)assert(!foundationsOverlap(q.parts[i],q.parts[j]),'No two foundations overlap.');
  assert(q.rim.parts.every(p=>p.edge==='south'||p.edge==='east'||['ne','sw','se'].includes(p.corner)));
  assert(q.piazza.x1-q.piazza.x0>4&&q.piazza.y1-q.piazza.y0>4);
}
assert.throws(()=>packPerimeterRow(0,[]));
assert.throws(()=>perimeterBlock(catalog,{id:'small',x0:0,y0:0,width:3,depth:3}));
assert.throws(()=>packPerimeterRow(1,[{index:0,width:2,depth:2,span:2}]),/No frontage fits/);
console.log('Old-town perimeter passed: 69 reproducible quarters, four joined corners per block, 90%+ coverage on every edge, three clear courtyards/passages, restaurant approaches, uniform image scaling and no foundation overlaps.');

// Exercise the actual variable parcels and every fixed gameplay identity.
const {closedCityBlock}=await import('../pizza-city-perimeter.js');
const {cityLayout}=await import('../pizza-city-layout.js');
const {PROPERTIES}=await import('../pizza-properties.js');
const {WAREHOUSES}=await import('../pizza-procurement.js');
const {COMPETITORS}=await import('../pizza-competitors.js');
const productionCatalog=Object.entries(BUILDING_ART).filter(([kind])=>['buildings','buildingTypes'].includes(kind)).flatMap(([kind,art])=>art.map((a,index)=>({kind,index,...buildingProjection(a.corners,a.worldWidth,a.storeys,a.facadePixels).groundSize}))).filter(p=>!(p.kind==='buildings'&&p.index===28)&&!(p.kind==='buildingTypes'&&p.index===2));
const item=(kind,index,extra={})=>({...productionCatalog.find(p=>p.kind===kind&&p.index===index),...extra});
let count=0,cityCount=0;
for(const seed of [94117,0,1,42,...Array.from({length:124},(_,i)=>Math.imul(i+1,2654435761)>>>0)]){
  const layout=cityLayout(seed),identities=[];
  for(const b of layout.blocks){
    if(b.landUse!=='housing'||b.source===0||b.source===1)continue;
    const bx=b.core?b.source%3:b.bx,by=b.core?Math.floor(b.source/3):b.by;
    const rival=COMPETITORS.find(r=>r.bx===bx&&r.by===by);
    const required=[...(bx===1&&by===1?[item('buildings',4,{identity:'mamma'})]:rival?[item('buildings',rival.sprite,{identity:rival.id})]:[]),...WAREHOUSES.filter(p=>p.bx===bx&&p.by===by).map(p=>({kind:'warehouse',index:0,width:p.width,depth:p.depth,identity:p.id})),...PROPERTIES.filter(p=>p.bx===bx&&p.by===by).map(p=>item(p.art,p.sprite,{identity:p.id}))];
    const plan=closedCityBlock(productionCatalog,{...b,seed:(seed+Math.floor((b.x0+20)*971+(b.y0+20)*7919))>>>0,required});
    assert(Object.values(plan.coverage).every(p=>p.ratio>=.9));
    for(const p of plan.parts){
      assert(p.scale>=.9-1e-7&&p.scale<=1);
      assert(!foundationsOverlap(p,plan.court)&&!foundationsOverlap(p,plan.gate));
      assert(p.x0>=b.x0-1e-7&&p.x1<=b.x1+1e-7&&p.y0>=b.y0-1e-7&&p.y1<=b.y1+1e-7);
      if(p.identity)identities.push(p.identity);
    }
    for(let i=0;i<plan.parts.length;i++)for(let j=i+1;j<plan.parts.length;j++){const a=plan.parts[i],b=plan.parts[j];assert(!foundationsOverlap(a,b));assert(!(neighboringFoundations(a,b)&&a.kind===b.kind&&a.index===b.index),'Direct neighbors must never use the same building model.');}
    count++;
  }
  if(++cityCount%16===0)console.log(`Checked ${cityCount} production cities.`);
  assert.equal(identities.length,24);assert.equal(new Set(identities).size,24);
}
console.log(`Production perimeters passed: ${count} closed parcels across 128 city layouts, all 24 gameplay identities, clear courts and gates, uniform scaling, no overlaps and no identical direct neighbors.`);
