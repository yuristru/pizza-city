export const DEFAULT_CITY_SEED=94117;
export function districtOrder(seed=DEFAULT_CITY_SEED){
  const order=Array.from({length:9},(_,i)=>i);
  if(seed===DEFAULT_CITY_SEED)return order;
  let value=seed>>>0;
  const random=()=>{value=(value+0x6d2b79f5)>>>0;let n=value;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296;};
  for(let i=8;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  return order;
}
export function nextCitySeed(current,entropy){
  let candidate=entropy>>>0;
  const previous=districtOrder(current).join(',');
  while(candidate===current||districtOrder(candidate).join(',')===previous)candidate=(candidate+1)>>>0;
  return candidate;
}

// The pixel grid defines projection, not the shape or spacing of city blocks.
export function cityLayout(seed=DEFAULT_CITY_SEED){
  const jitter=(n)=>seed===DEFAULT_CITY_SEED?0:((Math.imul((seed+n)>>>0,1597334677)>>>0)/4294967296-.5)*.7;
  const ys=[-7.5,.5,8.2,16.9,24.5,32.5];
  const xs=[
    [-7.5,.5,8.4,16.6,24.5,32.5],
    [-7.5,.5,8.4+jitter(1),16.6+jitter(2),24.5,32.5],
    [-7.5,.5,7.5+jitter(3),17.2+jitter(4),24.5,32.5],
    [-7.5,.5,9.5+jitter(5),16.1+jitter(6),24.5,32.5],
    [-7.5,.5,8.1,16.8,24.5,32.5]
  ];
  const streets=[],blocks=[],nodes=[],links=[];
  const node=(x,y)=>{let i=nodes.findIndex(n=>Math.abs(n.x-x)<1e-7&&Math.abs(n.y-y)<1e-7);if(i<0){i=nodes.length;nodes.push({x,y,neighbors:[]});}return i;};
  const connect=(a,b,width)=>{nodes[a].neighbors.push(b);nodes[b].neighbors.push(a);links.push({a,b,width});};
  for(let row=0;row<ys.length;row++){
    const width=row===3?.95:.7;
    streets.push({axis:0,center:ys[row],from:-8,to:34,width});
    const junctions=[...new Set([...(xs[row-1]||xs[0]),...(xs[row]||xs.at(-1))])].sort((a,b)=>a-b);
    const ids=junctions.map(x=>node(x,ys[row]));
    for(let i=1;i<ids.length;i++)connect(ids[i-1],ids[i],width);
  }
  for(let row=0;row<xs.length;row++)for(let col=0;col<xs[row].length;col++){
    const width=col===1||col===4?.8:.6,x=xs[row][col];
    streets.push({axis:1,center:x,from:ys[row],to:ys[row+1],width});
    connect(node(x,ys[row]),node(x,ys[row+1]),width);
    if(col<xs[row].length-1){
      const pad=.58;
      blocks.push({bx:col-1,by:row-1,x0:x+pad,x1:xs[row][col+1]-pad,y0:ys[row]+pad,y1:ys[row+1]-pad});
    }
  }
  const road=(x,y,pad=0)=>streets.some(s=>{const along=s.axis===0?x:y,across=s.axis===0?y:x;return along>=s.from-pad&&along<=s.to+pad&&Math.abs(across-s.center)<=s.width/2+pad;});
  const horizontal=(y,pad=0)=>streets.some(s=>s.axis===0&&Math.abs(y-s.center)<=s.width/2+pad);
  const water=(x,y)=>x>=26.4&&x<=28.1&&y>=12;
  const bridge=(x,y)=>water(x,y)&&horizontal(y,.28);
  return {streets,blocks,nodes,links,road,horizontal,water,bridge};
}

export function advanceStreetActor(actor,layout,distance,random=Math.random){
  actor.progress+=distance;
  for(let guard=0;guard<20;guard++){
    const a=layout.nodes[actor.from],b=layout.nodes[actor.to],length=Math.abs(b.x-a.x)+Math.abs(b.y-a.y);
    if(actor.progress<=length){
      const t=actor.progress/length,dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y);
      // Offset right of travel; cars use two narrow opposing lanes, walkers the sidewalk.
      actor.axis=dx?0:1;actor.dir=dx||dy;
      actor.x=a.x+(b.x-a.x)*t-dy*actor.offset;actor.y=a.y+(b.y-a.y)*t+dx*actor.offset;
      return;
    }
    actor.progress-=length;
    const choices=b.neighbors.filter(i=>i!==actor.from),next=choices.length?choices[Math.min(choices.length-1,Math.floor(random()*choices.length))]:actor.from;
    actor.from=actor.to;actor.to=next;
  }
}
