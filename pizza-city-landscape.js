// Ground plans for the two landmark precincts, independent of the renderer.
const rect=(x0,y0,x1,y1)=>({x0,y0,x1,y1});
export const inGardenRect=(r,x,y)=>x>=r.x0&&x<=r.x1&&y>=r.y0&&y<=r.y1;

export function landmarkGarden(block,index,size){
  const {x0,x1,y0,y1}=block,w=x1-x0,h=y1-y0;
  const cx=(x0+x1)/2,cy=y0+h*.43;
  const foundation=rect(cx-size.width/2,cy-size.depth/2,cx+size.width/2,cy+size.depth/2);
  const apron=rect(foundation.x0-.42,foundation.y0-.35,foundation.x1+.42,foundation.y1+.58);
  const lawn=rect(x0+.12,y0+.12,x1-.12,y1-.12);
  const walk=rect(x0+.62,y0+.62,x1-.62,y1-.62),half=.22;
  const paths=[
    rect(walk.x0-half,walk.y0-half,walk.x1+half,walk.y0+half),
    rect(walk.x0-half,walk.y1-half,walk.x1+half,walk.y1+half),
    rect(walk.x0-half,walk.y0,walk.x0+half,walk.y1),
    rect(walk.x1-half,walk.y0,walk.x1+half,walk.y1),
    rect(cx-.34,foundation.y1,cx+.34,y1),
    rect(x0,cy-.22,apron.x0,cy+.22),
    rect(apron.x1,cy-.22,x1,cy+.22)
  ];
  const beds=[
    rect(x0+1.04,y0+1.04,apron.x0-.32,cy-.48),
    rect(x0+1.04,cy+.48,apron.x0-.32,apron.y1-.16),
    rect(apron.x1+.32,y0+1.04,x1-1.04,cy-.48),
    rect(apron.x1+.32,cy+.48,x1-1.04,apron.y1-.16),
    rect(x0+1.04,apron.y1+.3,cx-.66,y1-1.04),
    rect(cx+.66,apron.y1+.3,x1-1.04,y1-1.04)
  ].filter(r=>r.x1-r.x0>.3&&r.y1-r.y0>.3);
  // Trees are kept outside the building apron. Front trees are lower so the
  // entrance and facade remain visible from the fixed isometric camera.
  const trees=[];
  for(const side of [-1,1]){
    const x=side<0?x0+.97:x1-.97;
    for(const [i,y]of [y0+1.05,cy-.7,cy+.85,y1-1.05].entries()){
      if(inGardenRect({...apron,x0:apron.x0-.4,x1:apron.x1+.4,y0:apron.y0-.3,y1:apron.y1+.3},x,y))continue;
      if(trees.some(t=>Math.hypot(t.x-x,t.y-y)<1.1))continue;
      trees.push({x,y,index:i%2?2:index?3:1,scale:y>cy?.62:.78});
    }
  }
  const benches=[{x:walk.x0,y:walk.y1-.5},{x:walk.x1,y:walk.y1-.5},{x:walk.x0,y:walk.y0+.65},{x:walk.x1,y:walk.y0+.65}];
  const lamps=[{x:cx-.68,y:y1-.16},{x:cx+.68,y:y1-.16}];
  return {id:block.id,index,x0,x1,y0,y1,lawn,foundation,apron,paths,beds,trees,benches,lamps,entrance:{x:cx,y:foundation.y1},streetEntrance:{x:cx,y:y1}};
}
