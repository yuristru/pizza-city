// One grid cell represents one square metre, including the fixed kitchen.
const rect=(x,y,w,h)=>({x,y,w,h});
const kitchen=(x,y,w,h,kind,side,offset)=>({x,y,w,h,kind,door:side?{side,offset}:null});
function plan(id,name,w,h,rooms,k,entrance,decor=[{type:'wine',x:0,y:0,r:0},{type:'jukebox',x:0,y:1,r:0}]){
  const cells=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(rooms.some(r=>x>=r.x&&y>=r.y&&x<r.x+r.w&&y<r.y+r.h))cells.push({x,y});
  const keys=new Set(cells.map(p=>`${p.x},${p.y}`));
  const approach=k.door?(k.door.side==='south'?{x:k.x+k.door.offset,y:k.y+k.h}:k.door.side==='west'?{x:k.x-1,y:k.y+k.door.offset}:k.door.side==='east'?{x:k.x+k.w,y:k.y+k.door.offset}:{x:k.x+k.door.offset,y:k.y-1}):null;
  return {id,name,w,h,rooms,kitchen:k,entrance,decor,cells,keys,approach,area:cells.length,kitchenArea:k.w*k.h,diningArea:cells.length-k.w*k.h};
}
export const FLOORPLANS={
  'mamma-mia':plan('mamma-mia','Klassischer Gastraum',12,10,[rect(0,0,12,10)],kitchen(8,0,4,4,'room','south',1),{x:11,y:9}),
  'san-marco':plan('san-marco','Kompakter Raum mit offener Kücheninsel',10,8,[rect(0,0,10,8)],kitchen(5,2,3,3,'island'),{x:9,y:7}),
  'piazza-limone':plan('piazza-limone','Quadratischer Gastraum mit rückwärtiger Küche',9,9,[rect(0,0,9,9)],kitchen(0,0,4,3,'room','south',2),{x:8,y:8},[{type:'wine',x:0,y:4,r:0},{type:'jukebox',x:0,y:5,r:0}]),
  'bottega':plan('bottega','Schmaler Gastraum mit zurückgesetzter Ecke',11,8,[rect(0,0,8,8),rect(8,3,3,5)],kitchen(0,0,3,4,'room','east',2),{x:10,y:7},[{type:'wine',x:0,y:5,r:0},{type:'jukebox',x:0,y:6,r:0}]),
  'via-roma':plan('via-roma','Langer Gastraum mit seitlichem Küchenanbau',14,12,[rect(0,0,10,12),rect(10,2,4,5)],kitchen(10,2,4,5,'annex','west',2),{x:9,y:11}),
  'belvedere':plan('belvedere','L-Grundriss mit Eckküche',14,12,[rect(0,0,14,9),rect(3,9,11,3)],kitchen(0,0,4,4,'room','east',2),{x:13,y:11},[{type:'wine',x:5,y:0,r:0},{type:'jukebox',x:7,y:0,r:0}]),
  'lungofiume':plan('lungofiume','Breiter Gastraum mit versetzter Seitenküche',16,11,[rect(0,0,12,3),rect(0,3,16,8)],kitchen(11,3,5,4,'room','west',2),{x:15,y:10}),
  'palazzo-sole':plan('palazzo-sole','Großer L-Grundriss mit zentraler Showküche',18,16,[rect(0,0,18,12),rect(4,12,14,4)],kitchen(6,5,5,4,'island'),{x:17,y:15}),
  'mercato':plan('mercato','Großer quadratischer Saal mit breiter Rückküche',17,17,[rect(0,0,17,17)],kitchen(0,0,6,4,'room','south',3),{x:16,y:16},[{type:'wine',x:7,y:0,r:0},{type:'jukebox',x:9,y:0,r:0}]),
  'teatro':plan('teatro','Tiefer Saal mit eigenem seitlichen Küchenraum',20,17,[rect(0,0,15,17),rect(15,4,5,6)],kitchen(15,4,5,6,'annex','west',3),{x:14,y:16})
};
export const DEFAULT_PLAN=FLOORPLANS['mamma-mia'];
export function restaurantPlan(id){return FLOORPLANS[id]||DEFAULT_PLAN;}
export function roomCell(x,y,p=DEFAULT_PLAN){return p.keys.has(`${x},${y}`);}
export function kitchenCell(x,y,p=DEFAULT_PLAN){const k=p.kitchen;return x>=k.x&&y>=k.y&&x<k.x+k.w&&y<k.y+k.h;}
export function passageCell(x,y,p=DEFAULT_PLAN){return p.approach?.x===x&&p.approach?.y===y;}
export function boundaryEdges(p=DEFAULT_PLAN){
  const edges=[];for(const {x,y}of p.cells)for(const [side,dx,dy]of [['north',0,-1],['west',-1,0],['south',0,1],['east',1,0]])if(!roomCell(x+dx,y+dy,p))edges.push({x,y,side});return edges;
}
