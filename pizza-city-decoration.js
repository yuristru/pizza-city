import {Graphics,iso} from './pizza-core.js?v=20261018-demo1';
import {courtyardGarden} from './pizza-city-gardens.js?v=20261018-demo1';
const point=(x,y,z=0)=>{const p=iso(x,y);return [p.x,p.y-z];};
const quad=(g,r,color)=>g.poly([point(r.x0,r.y0),point(r.x1,r.y0),point(r.x1,r.y1),point(r.x0,r.y1)].flat()).fill(color);
export function drawCourtyardGarden(objects,block,seed){
 const plan=courtyardGarden(block.court,seed,block.gate),{bounds:c,style}=plan,floor=new Graphics();quad(floor,c,[0xd6c8a8,0xc9bf9e,0xd4c3a6][style]);const margin=Math.min(.22,(c.x1-c.x0)*.1,(c.y1-c.y0)*.1),lawn={x0:c.x0+margin,y0:c.y0+margin,x1:c.x1-margin,y1:c.y1-margin};quad(floor,lawn,[0x8f9d70,0x82915f,0x91a276][style]);
 for(let x=c.x0+.14;x<c.x1;x+=.38)for(let y=c.y0+.14;y<c.y1;y+=.38){const p=point(x,y);floor.rect(Math.round(p[0]),Math.round(p[1]),2,1).fill(style===1?0x6f8054:0xb3b58a);}
 quad(floor,plan.path,0xe4d5b4);const cx=(c.x0+c.x1)/2,cy=(c.y0+c.y1)/2,pw=Math.min(.16,(c.x1-c.x0)*.08);quad(floor,{x0:cx-pw,y0:c.y0+margin,x1:cx+pw,y1:c.y1-margin},0xd9c7a4);
 for(const bed of plan.beds){quad(floor,bed,0x987a51);const inset={x0:bed.x0+.025,y0:bed.y0+.025,x1:bed.x1-.025,y1:bed.y1-.025};quad(floor,inset,style===1?0x567444:0x6a854a);}
 floor.label='city-courtyard-garden';floor.blockKey=block.id;floor.gardenPlan=plan;floor.zIndex=-100000;objects.addChild(floor);
 function add(g,x,y,label){const p=iso(x,y);g.position.set(p.x,p.y);g.zIndex=p.y;g.label=label;g.blockKey=block.id;objects.addChild(g);}
 for(const [i,bed]of plan.beds.entries()){
  const x=(bed.x0+bed.x1)/2,y=(bed.y0+bed.y1)/2,g=new Graphics(),small=Math.min(1,(bed.x1-bed.x0)/.36,(bed.y1-bed.y0)/.32);
  g.ellipse(0,0,7,3).fill({color:0,alpha:.13}).poly([-5,-5,5,-5,4,1,-4,1]).fill(0xa65c39).ellipse(0,-5,5,2).fill(0xcb8150).rect(-1,-14,2,9).fill(0x806344);
  if(style===1){for(const [dx,dy]of [[-4,-8],[3,-10],[-1,-13]])g.circle(dx,dy,3).fill(i%2?0x8f9857:0x3e6d47);}
  else{g.circle(-3,-15,5).fill(0x466b3c).circle(3,-15,5).fill(0x587d43).circle(0,-19,4).fill(0x63864c);for(const [dx,dy]of [[-4,-15],[3,-17],[0,-21]])g.rect(dx,dy,2,2).fill(style===2?0xf0d66b:0xe5bc4d);}
  g.scale.set(small);add(g,x,y,'city-courtyard-plant');
 }
 const center=plan.centerpiece;if(center){const g=new Graphics(),r=center.radius*32;
  if(center.type==='fountain'){g.ellipse(0,1,r,r*.5).fill(0xa28d6a).ellipse(0,-2,r,r*.5).fill(0xdfcfaa).ellipse(0,-3,r*.76,r*.35).fill(0x6f9e9e).rect(-2,-13,4,10).fill(0xc6b38b).ellipse(0,-13,5,2).fill(0xe6d6b1);g.moveTo(0,-17).lineTo(0,-14).stroke({color:0xb6d7ce,width:1});}
  else{g.poly([-r,0,0,-r*.5,r,0,0,r*.5]).fill(0xa06643);for(let i=-1;i<=1;i++){g.moveTo(-r*.6+i*3,0).lineTo(i*3,-r*.3).stroke({color:0x4c713e,width:3});}}
  add(g,center.x,center.y,'city-courtyard-'+center.type);
 }
 if(plan.bench){const g=new Graphics().poly([-11,-4,0,-10,11,-4,0,2]).fill(0xb18a51).poly([-11,-10,0,-16,11,-10,0,-4]).fill(0xc49b60);g.moveTo(-7,0).lineTo(-7,4).moveTo(7,0).lineTo(7,4).stroke({color:0x4c4938,width:2});add(g,plan.bench.x,plan.bench.y,'city-courtyard-bench');}
 return plan;
}

export function drawItalianBridge(objects,s){
 const length=s.to-s.from,spans=Math.max(1,Math.round(length/1.15));
 for(const [side,edge]of [s.center-s.width/2-.27,s.center+s.width/2+.27].entries()){
  const a=s.axis===0?iso(s.from,edge):iso(edge,s.from),b=s.axis===0?iso(s.to,edge):iso(edge,s.to),dx=b.x-a.x,dy=b.y-a.y,g=new Graphics(),p=(t,z=0)=>[dx*t,dy*t+z];
  g.poly([p(0,-3),p(1,-3),p(1,15),p(0,15)].flat()).fill(side?0xa98b61:0xbfa37a).stroke({color:0x806b4e,width:1});
  for(let i=0;i<spans;i++){
   const start=(i+.13)/spans,end=(i+.87)/spans,arch=[];for(let n=0;n<=12;n++){const t=n/12;arch.push(p(start+(end-start)*t,14-12*Math.sin(Math.PI*t)));}
   g.poly([...arch,p(end,16),p(start,16)].flat()).fill(0x356a73);
   for(let n=0;n<9;n++){const t=(n+.5)/9,x=start+(end-start)*t,z=14-12*Math.sin(Math.PI*t);g.moveTo(...p(x,z)).lineTo(...p(x,z-3)).stroke({color:0xe2cba2,width:2});}
  }
  g.poly([p(0,-8),p(1,-8),p(1,-3),p(0,-3)].flat()).fill(side?0xd7c29d:0xe6d4b0).stroke({color:0xab9068,width:1});
  const posts=Math.max(2,Math.ceil(length/.45));for(let i=0;i<=posts;i++){const t=i/posts,q=p(t);g.rect(Math.round(q[0])-2,Math.round(q[1])-13,4,7).fill(0xc8ad7f);g.rect(Math.round(q[0])-3,Math.round(q[1])-14,6,2).fill(0xead8b0);}
  g.moveTo(...p(0,-13)).lineTo(...p(1,-13)).stroke({color:0xe1cca4,width:2});
  g.position.set(a.x,a.y);g.zIndex=(a.y+b.y)/2;g.label='city-bridge';g.bridgeStyle='travertine-arches';g.archCount=spans;g.bridgeBounds={...s,edge};objects.addChild(g);
 }
}
