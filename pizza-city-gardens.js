// Small private gardens stay inside the unbuilt courtyard and leave its passage open.
const overlaps=(a,b)=>a.x0<b.x1&&a.x1>b.x0&&a.y0<b.y1&&a.y1>b.y0;
export function courtyardGarden(court,seed=0,gate=null){
 const w=court.x1-court.x0,h=court.y1-court.y0,cx=(court.x0+court.x1)/2,cy=(court.y0+court.y1)/2,style=(seed>>>0)%3;
 const inset=Math.min(.12,w*.12,h*.12),bw=Math.min(.48,w*.22),bh=Math.min(.46,h*.22),pathWidth=Math.min(.34,h*.25,w*.25),entryY=gate?Math.max(court.y0+pathWidth/2,Math.min(court.y1-pathWidth/2,(gate.y0+gate.y1)/2)):cy;
 const path={x0:court.x0,y0:entryY-pathWidth/2,x1:cx+pathWidth/2,y1:entryY+pathWidth/2},beds=[];
 for(const x of [court.x0+inset,court.x1-inset-bw])for(const y of [court.y0+inset,court.y1-inset-bh]){const bed={x0:x,y0:y,x1:x+bw,y1:y+bh};if(!overlaps(bed,path)&&!beds.some(b=>overlaps(b,bed)))beds.push(bed);}
 const centerpiece=w>=1.8&&h>=1.8?{x:cx,y:cy,radius:Math.min(.42,w*.15,h*.15),type:style===1?'herbs':'fountain'}:null;
 if(centerpiece&&Math.abs(entryY-cy)<centerpiece.radius+.1)path.x1=cx-centerpiece.radius-.1;
 let bench=w>=2.6&&h>=2.2?{x:cx,y:court.y1-.3}:null;if(bench&&overlaps({x0:cx-.35,x1:cx+.35,y0:bench.y-.15,y1:bench.y+.15},path))bench=null;
 return {bounds:{...court},style,path,beds,centerpiece,bench};
}
