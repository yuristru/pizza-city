import {groundProjection} from './pizza-isometric-art.js?v=20261017-house3d';
export const MAX_STOREYS=2,STOREY_HEIGHT=36;

// One affine projection covers the whole drawing, including all roofs and wings.
// Never transform the two halves independently: that bends a ridge crossing the
// front corner and changes the camera direction halfway through a courtyard.
export function buildingProjection(corners,worldWidth,storeys,facadePixels){
 if(!Number.isInteger(storeys)||storeys<1||storeys>MAX_STOREYS)throw new Error('City buildings support at most two storeys.');
 if(!Array.isArray(corners)||corners.length!==3||!corners.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))throw new Error('Invalid building corners.');
 const [left,front,right]=corners;
 if(!(left[0]<front[0]&&front[0]<right[0]&&worldWidth>0&&Number.isFinite(worldWidth)&&facadePixels>0&&Number.isFinite(facadePixels)))throw new Error('Invalid building calibration.');
 const base=groundProjection(corners),scale=Math.min(worldWidth/((right[0]-left[0])*base.scaleX),storeys*STOREY_HEIGHT/facadePixels);
 const scaleX=base.scaleX*scale,scaleY=scale,skewY=base.skewY*scale;
 return {scaleX,scaleY,skewY,facadeHeight:facadePixels*scale,groundSize:{width:(front[0]-left[0])*scaleX/32,depth:(right[0]-front[0])*scaleX/32},project([x,y]){const dx=x-front[0],dy=y-front[1];return [dx*scaleX,dy*scaleY+dx*skewY];}};
}
