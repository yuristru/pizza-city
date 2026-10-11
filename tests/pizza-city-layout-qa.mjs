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
  assert(layout.streets.every(s=>s.width>=.75&&s.width<=1.1),'Residential streets stay narrower than the old two-cell roads.');
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
