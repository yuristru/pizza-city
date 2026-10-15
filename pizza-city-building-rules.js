export const MAX_STOREYS=2,STOREY_HEIGHT=36;

// Calibrate the two painted ground edges independently. This keeps the existing
// parcels fixed when a redrawn sprite shifts by a few source pixels. Vertical
// walls remain vertical; this is a flat 2D image projection.
export function buildingProjection(corners,footprint,storeys,facadePixels){
 if(!Number.isInteger(storeys)||storeys<1||storeys>MAX_STOREYS)throw new Error('City buildings support at most two storeys.');
 const [left,front,right]=corners;
 if(!(left[0]<front[0]&&front[0]<right[0]&&left[1]<front[1]&&right[1]<front[1]&&footprint.width>0&&footprint.depth>0&&facadePixels>0))throw new Error('Invalid building calibration.');
 const leftScale=footprint.width*32/(front[0]-left[0]),rightScale=footprint.depth*32/(right[0]-front[0]);
 const verticalScale=Math.min((leftScale+rightScale)/2,storeys*STOREY_HEIGHT/facadePixels);
 const leftSkew=(-footprint.width*16-(left[1]-front[1])*verticalScale)/(left[0]-front[0]);
 const rightSkew=(-footprint.depth*16-(right[1]-front[1])*verticalScale)/(right[0]-front[0]);
 return {leftScale,rightScale,verticalScale,leftSkew,rightSkew,facadeHeight:facadePixels*verticalScale,project([x,y]){const dx=x-front[0];return [dx*(dx<0?leftScale:rightScale),(y-front[1])*verticalScale+dx*(dx<0?leftSkew:rightSkew)];}};
}
