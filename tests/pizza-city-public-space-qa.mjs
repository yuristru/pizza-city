import assert from 'node:assert/strict';
import {cityLayout} from '../pizza-city-layout.js';
import {cityContactPlan} from '../pizza-city-contacts.js';
import {skateRamps,rampHeight,skaterPose} from '../pizza-city-skate.js';
for(let seed=0;seed<160;seed++){
 const layout=cityLayout(seed),plan=cityContactPlan(layout,[]).skatepark;
 for(const r of skateRamps(plan)){
  assert(r.x0>=plan.x0&&r.x1<=plan.x1&&r.y0>=plan.y0&&r.y1<=plan.y1);
  assert.equal(rampHeight(r,r.high==='left'?r.x0:r.x1),r.height);
  assert.equal(rampHeight(r,r.high==='left'?r.x1:r.x0),0);
 }
 let high=0;
 for(let i=0;i<=360;i++){
  const pose=skaterPose(plan,i/360);assert(pose.x>=plan.x0&&pose.x<=plan.x1&&pose.y>=plan.y0&&pose.y<=plan.y1);
  if(pose.ramp){assert(pose.y>=pose.ramp.y0&&pose.y<=pose.ramp.y1);assert.equal(pose.z,rampHeight(pose.ramp,pose.x));if(pose.z>7)high++;}
  else assert.equal(pose.z,0);
 }
 assert(high>10);
 const start=skaterPose(plan,0),end=skaterPose(plan,1);assert(Math.hypot(start.x-end.x,start.y-end.y)<1e-8);
 const c=layout.canal,r=c.width/2,xy=(a,b)=>c.axis===0?[a,b]:[b,a];
 assert(!layout.water(...xy(c.from+.01,c.center+r*.9)),'Rounded head excludes the old rectangular corners.');
 assert(layout.water(...xy(c.from+r,c.center)));
}
console.log('Public spaces passed: 160 reproducible maps, continuous riding circuits, both measured ramp heights, contained approaches and rounded canal heads.');
