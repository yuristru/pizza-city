import {Graphics,iso} from './pizza-core.js?v=20261018-brick4';
import {courtyardGarden} from './pizza-city-gardens.js?v=20261018-brick4';
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

// Brick courses follow the bridge faces, with stone dressings around every opening.
export function drawItalianBridge(objects,s){
 const length=s.to-s.from,spans=Math.max(1,Math.round(length/1.5)),edgeWidth=s.width/2+.25;
 const p=(t,v,z=0)=>s.axis===0?point(t,v,z):point(v,t,z);
 const add=(g,role,depth)=>{g.label='city-bridge';g.bridgePart=role;g.bridgeStyle='terracotta-brick-travertine';g.archCount=spans;g.bridgeBounds={...s};g.zIndex=depth;objects.addChild(g);};
 const noise=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
 const brickPalette=[0xb36643,0xc57a50,0xad593b,0xcc8659,0xb96c47,0xd08b5e];
 const darken=c=>{const r=(c>>16)&255,g=(c>>8)&255,b=c&255;return (Math.round(r*.82)<<16)|(Math.round(g*.8)<<8)|Math.round(b*.78);};
 const face=(g,a,b,v,low,high,color)=>g.poly([p(a,v,low),p(b,v,low),p(b,v,high),p(a,v,high)].flat()).fill(color);
 // Clip each individual brick to the arch silhouette in the wall plane.
 function masonry(g,a,b,v,low,high,side,bottom=()=>low,backing=true){
  if(backing)face(g,a,b,v,low,high,side>0?0x704531:0x8c573b);
  const step=.135,rise=1.65;let row=0;
  for(let z=high;z>low;z-=rise,row++)for(let t=a-step+(row%2)*step/2;t<b;t+=step){
   const left=Math.max(a,t+.009),right=Math.min(b,t+step-.009),top=z-.16,base=Math.max(low,z-rise+.16);if(right<=left||base>=top)continue;
   const ba=bottom(left),bb=bottom(right),signed=q=>q[1]-(ba+(bb-ba)*(q[0]-left)/(right-left));
   const polygon=[[left,base],[right,base],[right,top],[left,top]],clipped=[];
   for(let i=0;i<polygon.length;i++){
    const u=polygon[i],vtx=polygon[(i+1)%polygon.length],fu=signed(u),fv=signed(vtx);
    if(fu>=0)clipped.push(u);if((fu>=0)!==(fv>=0)){const f=fu/(fu-fv);clipped.push([u[0]+(vtx[0]-u[0])*f,u[1]+(vtx[1]-u[1])*f]);}
   }
   if(clipped.length<3)continue;
   const variation=noise(Math.floor(t/step),row+side*19),color=brickPalette[Math.floor(variation*brickPalette.length)];
   g.poly(clipped.map(([t,z])=>p(t,v,z)).flat()).fill(side>0?darken(color):color);
   // Fine wear and a sunlit upper edge give the same granular finish as the houses.
   if(base>Math.max(ba,bb)){const aa=p(left,v,top),zz=p(right,v,top);g.moveTo(...aa).lineTo(...zz).stroke({color:side>0?0xb77c52:0xe0a476,width:.35});}
  }
 }
 const deck=new Graphics();deck.poly([p(s.from-.18,s.center-edgeWidth),p(s.to+.18,s.center-edgeWidth),p(s.to+.18,s.center+edgeWidth),p(s.from-.18,s.center+edgeWidth)].flat()).fill(0xab9370);
 // Small staggered sandstone pavers replace the oversized checkerboard.
 const paving=[0xd6c29b,0xcab58d,0xc3ad85,0xdbc8a3,0xd0ba92];let row=0;
 for(let v=s.center-edgeWidth+.02;v<s.center+edgeWidth-.02;v+=.115,row++)for(let t=s.from-.32+(row%2)*.11;t<s.to+.18;t+=.22){
  const a=Math.max(s.from-.18,t+.008),b=Math.min(s.to+.18,t+.21),vb=Math.min(v+.105,s.center+edgeWidth-.02);if(b<=a)continue;
  deck.poly([p(a,v),p(b,v),p(b,vb),p(a,vb)].flat()).fill(paving[Math.floor(noise(row,Math.floor(t*9))*paving.length)]);
 }
 add(deck,'deck',-90000);
 for(const side of [-1,1]){
  const edge=s.center+side*edgeWidth,body=new Graphics();
  for(let i=0;i<spans;i++){
   const start=s.from+i*length/spans,end=s.from+(i+1)*length/spans,archStart=start+length/spans*.15,archEnd=end-length/spans*.15;
   const bottom=t=>t<=archStart||t>=archEnd?-12:-12+9*Math.sin(Math.PI*(t-archStart)/(archEnd-archStart));
   // Build the mortar silhouette first so the openings remain genuinely transparent.
   for(let n=0;n<28;n++){const a=start+(end-start)*n/28,b=start+(end-start)*(n+1)/28;body.poly([p(a,edge),p(b,edge),p(b,edge,bottom(b)),p(a,edge,bottom(a))].flat()).fill(side>0?0x704531:0x8c573b);}
   // Brick tiles are clipped against the opening instead of covering it with water colour.
   masonry(body,start,end,edge,-12,0,side,bottom,false);
   for(let n=0;n<16;n++){
    const u=n/16,v=(n+1)/16,a=archStart+(archEnd-archStart)*u,b=archStart+(archEnd-archStart)*v,za=bottom(a),zb=bottom(b);
    body.poly([p(a,edge,za),p(b,edge,zb),p(b,edge,zb+2.25),p(a,edge,za+2.25)].flat()).fill(n%3===0?0xe2cba1:side>0?0xc7af84:0xd6c29a).stroke({color:0x8e7758,width:.35});
    body.moveTo(...p(a,edge,za+2.25)).lineTo(...p(b,edge,zb+2.25)).stroke({color:0xeddcba,width:.4});
   }
   // The central keystone projects slightly beyond the dressed arch.
   const mid=(archStart+archEnd)/2,z=bottom(mid);body.poly([p(mid-.055,edge,z-.3),p(mid+.055,edge,z-.3),p(mid+.08,edge,z+3.1),p(mid-.08,edge,z+3.1)].flat()).fill(0xedd7ad).stroke({color:0x9b805d,width:.4});
  }
  // Cut-stone string course separates the brick spandrels from the parapet.
  face(body,s.from,s.to,edge,-1.6,-.5,side>0?0xc7ae83:0xe1c99f);
  body.bridgeSide=side;add(body,'arches',side<0?-90001:-89999);
  const count=Math.ceil(length/.32);
  for(let i=0;i<count;i++){
   const a=s.from+length*i/count,b=s.from+length*(i+1)/count,g=new Graphics();
   masonry(g,a,b,edge,.5,6.5,side);
   // Limestone plinth, stepped cornice and a visible top surface.
   face(g,a,b,edge,.5,1.5,side>0?0xbfa176:0xd7be92);face(g,a,b,edge,6.1,7,0xc5ab80);
   g.poly([p(a,edge,7),p(b,edge,7),p(b,edge-side*.065,8),p(a,edge-side*.065,8)].flat()).fill(0xe5cfaa);
   g.moveTo(...p(a,edge-side*.065,8)).lineTo(...p(b,edge-side*.065,8)).stroke({color:0xf1dfbd,width:.7});
   // Recessed stone medallions repeat over brick panels, like house facade details.
   if(i%2===0){const mid=(a+b)/2;g.poly([p(mid-.055,edge,3.9),p(mid,edge,5.1),p(mid+.055,edge,3.9),p(mid,edge,2.7)].flat()).fill(side>0?0xc7aa7b:0xe0c79d).stroke({color:0x825b3e,width:.4});const q=p(mid,edge,3.9);g.rect(Math.round(q[0]),Math.round(q[1]),1,1).fill(0x9b754c);}
   add(g,'parapet',((a+b)/2+edge)*16);
  }
  for(const t of [s.from,s.to]){
   const g=new Graphics();masonry(g,t-.12,t+.12,edge,0,10.5,side);
   face(g,t-.14,t+.14,edge,1,2,0xd1b78a);face(g,t-.16,t+.16,edge,9.5,10.8,0xc9af82);
   g.poly([p(t-.17,edge,10.8),p(t+.17,edge,10.8),p(t+.17,edge-side*.13,12),p(t-.17,edge-side*.13,12)].flat()).fill(0xe6d1a9);
   const q=p(t,edge-side*.06,13);g.circle(q[0],q[1],1.25).fill(0xe2cda3);
   add(g,'abutment',(t+edge)*16);
  }
 }
}
