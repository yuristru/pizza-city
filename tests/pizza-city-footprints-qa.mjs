import assert from 'node:assert/strict';
import {BUILDING_FOOTPRINTS,footprintCells,footprintAnchor,projectFootprint,footprintFits} from '../pizza-city-footprints.js';
const counts=[4,6,8,6,10,12];
for(const [i,template]of BUILDING_FOOTPRINTS.entries()){
  const cells=footprintCells(template);assert.equal(cells.length,counts[i]);
  const anchor=footprintAnchor(template);assert(template.outline.every(p=>p[0]+p[1]<=anchor[0]+anchor[1]));
  for(const polygon of [template.outline,...template.holes])for(let n=0;n<polygon.length;n++){
    const a=projectFootprint(polygon[n]),b=projectFootprint(polygon[(n+1)%polygon.length]);
    assert(Math.abs(Math.abs((b[1]-a[1])/(b[0]-a[0]))-.5)<1e-12,'All horizontal geometry follows the same 2:1 axes.');
  }
  assert(footprintFits(template,0,0,(x,y)=>x<template.width&&y<template.depth));
  assert(!footprintFits(template,0,0,()=>true,new Set(['0,0'])));
}
const ring=BUILDING_FOOTPRINTS.at(-1);assert(!footprintCells(ring).some(([x,y])=>x===1&&y===1),'The courtyard must remain unoccupied.');
console.log('Building footprints passed: six distinct shapes, exact 2:1 edges, ground anchors, collision cells and empty courtyards.');
