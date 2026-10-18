import {Graphics,iso} from './pizza-core.js?v=20261018-bridge3';
import {courtyardGarden} from './pizza-city-gardens.js?v=20261018-bridge3';
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
 const length=s.to-s.from,spans=Math.max(1,Math.round(length/1.5)),edgeWidth=s.width/2+.25;
 const p=(t,v,z=0)=>s.axis===0?point(t,v,z):point(v,t,z);
 const add=(g,role,depth)=>{g.label='city-bridge';g.bridgePart=role;g.bridgeStyle='travertine-arches';g.archCount=spans;g.bridgeBounds={...s};g.zIndex=depth;objects.addChild(g);};
 // A continuous stone deck and landward abutments bind both sides together.
 const deck=new Graphics();deck.poly([p(s.from-.18,s.center-edgeWidth),p(s.to+.18,s.center-edgeWidth),p(s.to+.18,s.center+edgeWidth),p(s.from-.18,s.center+edgeWidth)].flat()).fill(0xc5b28e);
 for(let t=s.from-.15;t<s.to+.18;t+=.2)for(let v=s.center-edgeWidth+.04;v<s.center+edgeWidth-.05;v+=.22){const end=Math.min(t+.18,s.to+.18),ev=Math.min(v+.2,s.center+edgeWidth-.03);deck.poly([p(t,v),p(end,v),p(end,ev),p(t,ev)].flat()).fill((Math.round(t*10)+Math.round(v*10))%3?0xd3c3a2:0xb8a784);}
 add(deck,'deck',-90000);
 for(const side of [-1,1]){
  const edge=s.center+side*edgeWidth,body=new Graphics(),shade=side>0?0xad936c:0xc2ac84;
  // The underside is a real open silhouette: water remains visible through arches.
  for(let i=0;i<spans;i++){
   const start=s.from+i*length/spans,end=s.from+(i+1)*length/spans,archStart=start+length/spans*.15,archEnd=end-length/spans*.15;
   body.poly([p(start,edge),p(archStart,edge),p(archStart,edge,-12),p(start,edge,-12)].flat()).fill(shade);
   body.poly([p(archEnd,edge),p(end,edge),p(end,edge,-12),p(archEnd,edge,-12)].flat()).fill(shade);
   for(let n=0;n<14;n++){
    const u=n/14,v=(n+1)/14,a=archStart+(archEnd-archStart)*u,b=archStart+(archEnd-archStart)*v,za=-12+9*Math.sin(Math.PI*u),zb=-12+9*Math.sin(Math.PI*v);
    body.poly([p(a,edge),p(b,edge),p(b,edge,zb),p(a,edge,za)].flat()).fill(shade);
    body.poly([p(a,edge,za),p(b,edge,zb),p(b,edge,zb+2),p(a,edge,za+2)].flat()).fill(n%2?0xdfcba5:0xd1b98e);
   }
  }
  // Masonry joints use the same isometric direction as the deck.
  for(let row=0;row<3;row++)for(let t=s.from+(row%2)*.13;t<s.to;t+=.3){const a=p(t,edge,-row*3),b=p(Math.min(s.to,t+.27),edge,-row*3);if(row===0)body.moveTo(...a).lineTo(...b).stroke({color:0x9b825e,width:.6});}
  // The rear underside projects into the deck in screen space and must sit behind it.
  body.bridgeSide=side;add(body,'arches',side<0?-90001:-89999);
  // Short segments let traffic sort against the parapet locally, including both axes.
  const count=Math.ceil(length/.32);
  for(let i=0;i<count;i++){
   const a=s.from+length*i/count,b=s.from+length*(i+1)/count,g=new Graphics();
   g.poly([p(a,edge,1),p(b,edge,1),p(b,edge,5),p(a,edge,5)].flat()).fill(side>0?0xc6af86:0xd9c7a3).stroke({color:0x9c845d,width:.5});
   g.moveTo(...p(a,edge,5)).lineTo(...p(b,edge,5)).stroke({color:0xeee0bb,width:1.5});
   const q=p(a,edge,5);g.rect(Math.round(q[0])-1,Math.round(q[1])-1,2,2).fill(0xe6d4ad);
   add(g,'parapet',((a+b)/2+edge)*16);
  }
  for(const t of [s.from,s.to]){const g=new Graphics(),q=p(t,edge);g.poly([p(t-.12,edge,0),p(t+.12,edge,0),p(t+.12,edge,6),p(t-.12,edge,6)].flat()).fill(0xcbb58c);g.moveTo(...p(t-.14,edge,6)).lineTo(...p(t+.14,edge,6)).stroke({color:0xefdfb7,width:2});add(g,'abutment',(t+edge)*16);}
 }
}
