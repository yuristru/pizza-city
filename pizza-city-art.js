import {BUILDING_ART} from './pizza-city-building-art.js?v=20261018-bridge3';
import {buildingProjection} from './pizza-city-building-rules.js?v=20261018-bridge3';
import {groundProjection} from './pizza-isometric-art.js?v=20261018-bridge3';
import {Sprite,Texture,state} from './pizza-core.js?v=20261018-bridge3';

export const ATLASES=[
 {key:'contacts',url:'italian-city-contacts-v1.png',frames:[[0,0,512,480,50],[512,0,512,480,50],[1024,0,512,480,40],[0,512,512,450,38],[512,512,512,450,38],[1024,512,512,450,38]]},
 {key:'buildings',url:'italian-houses-32-two-storey-v2.png',frames:BUILDING_ART.buildings},
 {key:'cornerBuildings',url:'italian-chamfered-corners-3d-v1.png',frames:BUILDING_ART.cornerBuildings},
 {key:'courtyardBuildings',url:'italian-courtyards-two-storey-v2.png',frames:BUILDING_ART.courtyardBuildings},
 {key:'landmarks',url:'italian-landmarks-two-storey-v2.png',frames:BUILDING_ART.landmarks},
  {key:'props',url:'italian-props-v2.png',frames:[
    [16,74,433,472,58],[455,20,383,533,57],[896,23,168,540,22],[1118,97,404,453,58],
    [33,592,392,352,82],[488,664,292,283,33],[834,633,277,316,20],[1153,556,347,416,38]
  ]}
];

function frame(image,[x,y,w,h,width,corners,edgeUnits]){
  const projection=corners?groundProjection(corners):null;
  // Calibrate a measured foundation edge in world units, independent of PNG padding.
  const scale=edgeUnits?edgeUnits*32/(projection.scaleX*(corners[1][0]-corners[0][0])):width/w;
  const scaleX=projection?.scaleX||1,skewY=projection?.skewY||0,minY=Math.min(0,skewY*w);
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(w*scaleX*scale);canvas.height=Math.ceil((h+Math.abs(skewY)*w)*scale);
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  ctx.setTransform(scaleX*scale,skewY*scale,0,scale,0,-minY*scale);
  ctx.drawImage(image,x,y,w,h,0,0,w,h);
  const front=corners?[corners[1][0]-x,corners[1][1]-y]:[w/2,h];
  const anchor={x:front[0]*scaleX*scale/canvas.width,y:(front[1]+skewY*front[0]-minY)*scale/canvas.height};
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  const texture=Texture.from(canvas);texture.source.scaleMode='nearest';
  const groundSize=corners?{width:(corners[1][0]-corners[0][0])*scaleX*scale/32,depth:(corners[2][0]-corners[1][0])*scaleX*scale/32}:null;
  return {texture,anchor,groundSize,projection:projection?{scaleX,skewY}:null,hitArea:{contains(px,py){
    const ix=Math.floor(px+anchor.x*canvas.width),iy=Math.floor(py+anchor.y*canvas.height);
    return ix>=0&&iy>=0&&ix<canvas.width&&iy<canvas.height&&pixels[(iy*canvas.width+ix)*4+3]>100;
  }}};
}

function buildingFrame(image,art){
 const [x,y,w,h]=art.crop;
 if(art.uniform){
  const width=Math.min(art.worldWidth,72*w/art.facadePixels),result=frame(image,[x,y,w,h,width]);
  return {...result,storeys:art.storeys,facadeHeight:art.facadePixels*width/w,id:art.id,name:art.name};
 }
 const corners=art.corners.map(([a,b])=>[a-x,b-y]),p=buildingProjection(corners,art.worldWidth,art.storeys,art.facadePixels),front=corners[1];
 const bounds=[[0,0],[w,0],[w,h],[0,h]].map(p.project);bounds.push([0,0]);
 const minX=Math.floor(Math.min(...bounds.map(v=>v[0]))),minY=Math.floor(Math.min(...bounds.map(v=>v[1])));
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(Math.max(...bounds.map(v=>v[0])))-minX;canvas.height=Math.ceil(Math.max(...bounds.map(v=>v[1])))-minY;
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 // Draw the whole bitmap once. The same matrix applies on both sides of every
 // front corner and to all courtyard wings, cornices, ridges and chimneys.
 ctx.setTransform(p.scaleX,p.skewY,0,p.scaleY,-front[0]*p.scaleX-minX,-front[1]*p.scaleY-front[0]*p.skewY-minY);
 ctx.drawImage(image,x,y,w,h,0,0,w,h);
 const anchor={x:-minX/canvas.width,y:-minY/canvas.height},pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,texture=Texture.from(canvas);texture.source.scaleMode='nearest';
 return {texture,anchor,groundSize:p.groundSize,storeys:art.storeys,facadeHeight:p.facadeHeight,projection:{scaleX:p.scaleX,scaleY:p.scaleY,skewY:p.skewY},id:art.id,name:art.name,roof:art.roof,chimney:art.chimney,shape:art.shape,cornerDirection:art.cornerDirection,buildingFamily:art.buildingFamily,hitArea:{contains(px,py){const ix=Math.floor(px+anchor.x*canvas.width),iy=Math.floor(py+anchor.y*canvas.height);return ix>=0&&iy>=0&&ix<canvas.width&&iy<canvas.height&&pixels[(iy*canvas.width+ix)*4+3]>100;}}};
}

export async function loadCityArt(){
 await Promise.all(ATLASES.map(async atlas=>{
  try{
   const image=new Image();image.src='./assets/pizza/city/'+atlas.url;await image.decode();
   state.cityArt[atlas.key]=atlas.frames.map(art=>BUILDING_ART[atlas.key]?buildingFrame(image,art):frame(image,art));
  }catch(error){console.warn('City art unavailable: '+atlas.key,error);state.assetFailures.push(atlas.key);}
 }));
}

export function citySprite(kind,index=0){
 const art=state.cityArt[kind]?.[index];if(!art)return null;
 const sprite=new Sprite(art.texture);sprite.anchor.set(art.anchor.x,art.anchor.y);sprite.hitArea=art.hitArea;
 if(art.storeys){sprite.storeys=art.storeys;sprite.facadeHeight=art.facadeHeight;sprite.artId=art.id;}
 return sprite;
}
