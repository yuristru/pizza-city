// Original flat 2D construction drawings, used as geometry references for Imagegen.
// This script draws guides only; the production illustrated PNGs are Imagegen edits.
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'qa/isometric-guides');fs.mkdirSync(out,{recursive:true});
const {houses,types,courts}=JSON.parse(fs.readFileSync(new URL('./isometric-building-blueprints.json',import.meta.url),'utf8'));

let fragments=[],meta=[];const fmt=n=>Math.round(n*1000)/1000;
function poly(points,fill,stroke='#634f3d',width=1.3){fragments.push(`<polygon points="${points.map(p=>p.map(fmt).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`);}
function drawBlock(def,unit,ox,oy,rect=[0,0,...def.footprint],roof='hip'){
 const [u0,v0,w,d]=rect,H=def.storeys*68,rise=roof==='terrace'?0:25;
 const P=(u,v,z=0)=>[ox+(u-v)*unit,oy+(u+v)*unit/2-z];
 const A=P(u0,v0,H),B=P(u0+w,v0,H),C=P(u0+w,v0+d,H),D=P(u0,v0+d,H);
 poly([D,C,P(u0+w,v0+d),P(u0,v0+d)],'#ddc8a0');poly([C,B,P(u0+w,v0),P(u0+w,v0+d)],'#b8aa8b');
 for(let row=0;row<def.storeys;row++){
  const bottom=row*68+17,top=bottom+34;
  for(let n=0;n<Math.max(1,Math.round(w));n++){const u=u0+w*(n+.5)/Math.max(1,Math.round(w)),a=Math.min(.17,w*.15);poly([P(u-a,v0+d,top),P(u+a,v0+d,top),P(u+a,v0+d,bottom),P(u-a,v0+d,bottom)],'#45695c','#6a6d57',.7);}
  for(let n=0;n<Math.max(1,Math.round(d));n++){const v=v0+d*(n+.5)/Math.max(1,Math.round(d)),a=Math.min(.17,d*.15);poly([P(u0+w,v-a,top),P(u0+w,v+a,top),P(u0+w,v+a,bottom),P(u0+w,v-a,bottom)],'#45695c','#6a6d57',.7);}
 }
 const e=.045;
 if(roof==='terrace'){
  poly([A,B,C,D],'#cfc5a2');poly([D,C,[C[0],C[1]-9],[D[0],D[1]-9]],'#e6d6b3');poly([C,B,[B[0],B[1]-9],[C[0],C[1]-9]],'#b7aa89');
 }else{
  const a=P(u0-e,v0-e,H),b=P(u0+w+e,v0-e,H),c=P(u0+w+e,v0+d+e,H),d0=P(u0-e,v0+d+e,H);
  if(roof==='gable'){
   const r0=P(u0-e,v0+d/2,H+rise),r1=P(u0+w+e,v0+d/2,H+rise);
   poly([a,b,r1,r0],'#b46442');poly([b,c,r1],'#c8b390');poly([d0,c,r1,r0],'#d0784d');poly([a,d0,r0],'#ddc8a0');
  }else{
   const inset=Math.min(w,d)*.35,r0=P(u0+inset,v0+d/2,H+rise),r1=P(u0+w-inset,v0+d/2,H+rise);
   poly([a,b,r1,r0],'#ad5d3d');poly([b,c,r1],'#a94f33');poly([c,d0,r0,r1],'#d37e51');poly([d0,a,r0],'#c66b43');
  }
 }
 return P;
}
function stack(def,P){
 const [w,d]=def.footprint,[fu,fv]=def.chimney.position,u=w*fu,v=d*fv,z=def.storeys*68+(def.roof==='terrace'?0:19),a=.12,h=22;
 poly([P(u,v,z+h),P(u+a,v,z+h),P(u+a,v,z),P(u,v,z)],'#b9a385');poly([P(u+a,v,z+h),P(u+a,v+a,z+h),P(u+a,v+a,z),P(u+a,v,z)],'#91785c');poly([P(u,v,z+h),P(u+a,v,z+h),P(u+a,v+a,z+h),P(u,v+a,z+h)],'#964a35');
}
function makeSheet(key,defs,columns,rows,cellW,cellH,unit){
 fragments=[];meta=[];
 for(const [i,def]of defs.entries()){
  const col=i%columns,row=Math.floor(i/columns),[w,d]=def.footprint;
  const ox=col*cellW+cellW/2-(w-d)*unit/2,oy=(row+1)*cellH-30-(w+d)*unit/2;
  if(!def.shape){const P=drawBlock(def,unit,ox,oy,undefined,def.roof);stack(def,P);}
  else{
   // Draw each wing in its true world position. All roof ridges share the same axes.
   drawBlock(def,unit,ox,oy,[0,0,w,1]);drawBlock(def,unit,ox,oy,[0,1,1,d-1]);if(def.shape==='u')drawBlock(def,unit,ox,oy,[w-1,1,1,d-1]);
  }
  const P=(u,v,z=0)=>[fmt(ox+(u-v)*unit),fmt(oy+(u+v)*unit/2-z)];
  const frontV=def.shape==='l'?1:d;
  meta.push({...def,cell:[col*cellW,row*cellH,cellW,cellH],corners:[P(0,frontV),P(w,frontV),P(w,0)],facadePixels:def.storeys*68,unit});
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${columns*cellW}" height="${rows*cellH}" viewBox="0 0 ${columns*cellW} ${rows*cellH}">${fragments.join('')}</svg>`;
 fs.writeFileSync(path.join(out,key+'.svg'),svg);fs.writeFileSync(path.join(out,key+'.json'),JSON.stringify({width:columns*cellW,height:rows*cellH,frames:meta},null,2));
}
makeSheet('houses-32',houses,8,4,384,512,64);
makeSheet('building-types-8',types,4,2,384,512,64);
makeSheet('courtyards-4',courts,2,2,768,768,64);
console.log('Wrote original 2:1 roof-and-wall reference drawings to '+out);
