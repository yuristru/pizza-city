import assert from 'node:assert/strict';
import {courtyardGarden} from '../pizza-city-gardens.js';
const inside=(r,b)=>r.x0>=b.x0&&r.x1<=b.x1&&r.y0>=b.y0&&r.y1<=b.y1,overlap=(a,b)=>a.x0<b.x1&&a.x1>b.x0&&a.y0<b.y1&&a.y1>b.y0;
let count=0;const styles=new Set();for(const w of [.3,.6,.9,1.8,2.6,4,7])for(const h of [.3,.7,1.8,3,6])for(let seed=0;seed<12;seed++){
 const c={x0:10,y0:20,x1:10+w,y1:20+h},gate={x0:9,x1:10,y0:20+h*.4,y1:20+h*.4+.1},g=courtyardGarden(c,seed,gate);styles.add(g.style);assert.deepEqual(courtyardGarden(c,seed,gate),g);assert(inside(g.path,c));assert(g.beds.every(b=>inside(b,c)&&!overlap(b,g.path)));assert(g.beds.length>0);
 if(g.centerpiece){const a=g.centerpiece;assert(inside({x0:a.x-a.radius,x1:a.x+a.radius,y0:a.y-a.radius,y1:a.y+a.radius},c));}if(g.bench)assert(g.bench.x>c.x0&&g.bench.x<c.x1&&g.bench.y>c.y0&&g.bench.y<c.y1);count++;
}assert.equal(styles.size,3);console.log('Courtyard gardens passed:',count,'deterministic small/large gardens, three styles, contained flower/herb beds, fountains and benches, clear entry path.');
