import assert from 'node:assert/strict';
import {districtOrder,nextCitySeed,DEFAULT_CITY_SEED,cityLayout,advanceStreetActor} from '../pizza-city-layout.js';
assert.deepEqual(districtOrder(),[0,1,2,3,4,5,6,7,8]);
for(const seed of [0,1,42,0xffffffff,DEFAULT_CITY_SEED]){
  const order=districtOrder(seed);assert.deepEqual([...order].sort(),[0,1,2,3,4,5,6,7,8]);
  assert.deepEqual(districtOrder(seed),order);
  for(const entropy of [seed,0,1,0xffffffff]){
    const next=nextCitySeed(seed,entropy);assert.notEqual(next,seed);assert.notDeepEqual(districtOrder(next),order);
  }
}
for(const seed of [0,1,42,0xffffffff,DEFAULT_CITY_SEED]){
  const layout=cityLayout(seed),visited=new Set([0]),pending=[0];
  while(pending.length)for(const n of layout.nodes[pending.pop()].neighbors)if(!visited.has(n)){visited.add(n);pending.push(n);}
  assert.equal(visited.size,layout.nodes.length,'Every street junction must be connected.');
  assert(layout.streets.every(s=>s.width>=.6&&s.width<=.95),'Residential streets stay narrower than the old two-cell roads.');
  assert(new Set(layout.blocks.map(b=>(b.x1-b.x0).toFixed(2))).size>=4,'Blocks have different widths.');
  assert(layout.nodes.some(n=>n.neighbors.length===3),'Offset streets create T-junctions.');
  for(const b of layout.blocks){assert(b.x1>b.x0&&b.y1>b.y0);assert(!layout.road((b.x0+b.x1)/2,(b.y0+b.y1)/2));}
  for(const link of layout.links){
    const actor={from:link.a,to:link.b,progress:0,offset:.16};
    for(let i=0;i<100;i++){
      advanceStreetActor(actor,layout,.3,()=>.37);
      assert(Number.isFinite(actor.x)&&Number.isFinite(actor.y));
      assert(layout.road(actor.x,actor.y),'Cars stay on the connected road network.');
      assert(!layout.water(actor.x,actor.y)||layout.bridge(actor.x,actor.y),'Canal crossings use bridges.');
    }
  }
}
console.log('City generation passed: unique district permutation, reproducibility, repeated seed protection and unsigned wrap.');
console.log('Street layout passed: narrower roads, varied blocks, T-junctions, connected routes and safe canal crossings.');

const blockCounts=new Set(),streetCounts=new Set(),shores=new Set(),shapes=new Set();
const baseline=cityLayout(),baselineStreets=new Set(baseline.streets.map(s=>JSON.stringify(s)));
for(let i=0;i<128;i++){
  const seed=Math.imul(i+1,2654435761)>>>0,layout=cityLayout(seed);
  const core=layout.blocks.filter(b=>b.core),visited=new Set([0]),pending=[0];
  assert.equal(core.length,9,'Every logical district must retain a guaranteed parcel.');
  assert.deepEqual(core.map(b=>b.source).sort(),[0,1,2,3,4,5,6,7,8]);
  for(const b of core){
    assert(b.x1-b.x0>=5.7&&b.y1-b.y0>=6.2,'Properties and full courtyard groups must fit every core parcel.');
    for(const x of [b.x0,(b.x0+b.x1)/2,b.x1])for(const y of [b.y0,(b.y0+b.y1)/2,b.y1])assert(!layout.road(x,y)&&!layout.water(x,y));
  }
  while(pending.length)for(const n of layout.nodes[pending.pop()].neighbors)if(!visited.has(n)){visited.add(n);pending.push(n);}
  assert.equal(visited.size,layout.nodes.length,'Side lanes and merged perimeter blocks remain connected.');
  assert(layout.crossings.length>=2,'Each canal has several usable crossings.');
  assert.equal(layout.blocks.filter(b=>b.landUse==='park').length,2);
  assert.equal(layout.blocks.filter(b=>b.landUse==='piazza').length,1);
  for(const s of layout.crossings){
    const x=s.axis===0?(s.from+s.to)/2:s.center,y=s.axis===0?s.center:(s.from+s.to)/2;
    assert(layout.water(x,y)&&layout.road(x,y)&&layout.bridge(x,y),'Rendered bridges and traffic must use the same crossing geometry.');
  }
  const unchanged=layout.streets.filter(s=>baselineStreets.has(JSON.stringify(s))).length;
  assert(unchanged/layout.streets.length<.35,'Most roads must change, rather than just shuffling district contents.');
  const shape=JSON.stringify(layout.streets);
  assert(!shapes.has(shape),'Sampled seeds produce distinct street plans.');shapes.add(shape);
  assert.deepEqual(cityLayout(seed).blocks,layout.blocks,'A saved seed reproduces its parcels and land use.');
  blockCounts.add(layout.blocks.length);streetCounts.add(layout.streets.length);shores.add(layout.canal.side);
}
assert(blockCounts.size>=5&&streetCounts.size>=5,'Road and block counts must vary between cities.');
assert.deepEqual([...shores].sort(),['east','north','south','west']);
console.log('City variety passed: 128 distinct plans, variable block/road counts, all four canal shores, parks, plazas, connected side lanes and nine protected gameplay districts.');

// Keep the footprint geometry checks in the existing city QA entry point.
await import('./pizza-city-footprints-qa.mjs');
