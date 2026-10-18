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

function cityRandom(seed){
  let value=seed>>>0;
  return ()=>{
    value=(value+0x6d2b79f5)>>>0;let n=value;
    n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);
    return ((n^(n>>>14))>>>0)/4294967296;
  };
}

// Parcel edges define the street network. Independent subdivisions meet at
// T-junctions, so changing the seed changes routes as well as building skins.
export function cityLayout(seed=DEFAULT_CITY_SEED){
  const random=cityRandom(seed^0x51c17a9d),snap=n=>Math.round(n*8)/8;
  const min=-7.5,max=32.5,parcels=[],streets=[],blocks=[],nodes=[],links=[];
  const partition=(from,to,count,minimum)=>{
    const weights=Array.from({length:count},()=>.12+random()**2),sum=weights.reduce((a,b)=>a+b,0);
    const spare=to-from-count*minimum,edges=[from];let cursor=from;
    for(let i=0;i<count-1;i++){cursor+=minimum+spare*weights[i]/sum;edges.push(snap(cursor));}
    edges.push(to);return edges;
  };
  const left=snap(-.5+random()*1.5),right=snap(24.75+random()*1.5);
  const top=snap(-.5+random()*1.5),bottom=snap(25.5+random()*1.25);
  const ys=partition(top,bottom,3,7.5),order=districtOrder(seed);
  const add=(id,bx,by,x0,x1,y0,y1,core=false)=>{
    const source=core?order[by*3+bx]:null;
    random(); // Keep the existing seed's parcel and street sequence stable.
    parcels.push({id,bx,by,x0,x1,y0,y1,core,source,density:'dense',landUse:'housing'});
  };
  for(let row=0;row<3;row++){
    const xs=partition(left,right,3,7);
    for(let col=0;col<3;col++)add('district-'+col+'-'+row,col,row,xs[col],xs[col+1],ys[row],ys[row+1],true);
  }
  // Longer perimeter parcels sometimes replace several small blocks. Their
  // side lanes terminate at the central avenues instead of crossing the map.
  for(const [side,a,b]of [['north',min,top],['south',bottom,max]]){
    const count=3+Math.floor(random()*4),xs=partition(min,max,count,5.2);
    for(let i=0;i<count;i++)add(side+'-'+i,10+i,side==='north'?-1:3,xs[i],xs[i+1],a,b);
  }
  for(const [side,a,b]of [['west',min,left],['east',right,max]]){
    const count=2+Math.floor(random()*3),edges=partition(top,bottom,count,5.2);
    for(let i=0;i<count;i++)add(side+'-'+i,side==='west'?-1:3,10+i,a,b,edges[i],edges[i+1]);
  }

  const axis=random()<.5?0:1,near=random()<.5;
  const low=axis===0?top:left,high=axis===0?bottom:right;
  const shore0=near?min:high,shore1=near?low:max;
  const canal={axis,side:axis===0?(near?'north':'south'):(near?'west':'east'),
    center:snap((shore0+shore1)/2+(random()-.5)*.5),width:1.5+random()*.65,
    from:random()<.5?min-.5:snap(1+random()*8),to:max+.5};
  const water=(x,y)=>{
    const along=canal.axis===0?x:y,across=canal.axis===0?y:x;
    const r=canal.width/2,cap=canal.from+r;
    return along>=canal.from&&along<=canal.to&&Math.abs(across-canal.center)<=r&&(along>=cap||((along-cap)/r)**2+((across-canal.center)/r)**2<=1);
  };
  for(const p of parcels){
    const across0=axis===0?p.y0:p.x0,across1=axis===0?p.y1:p.x1;
    const along1=axis===0?p.x1:p.y1;
    if(across0<canal.center+canal.width/2&&across1>canal.center-canal.width/2&&along1>canal.from)p.landUse='waterfront';
  }
  const publicSites=parcels.filter(p=>!p.core&&p.landUse==='housing');
  for(let i=0;i<Math.min(3,publicSites.length);i++){
    const index=Math.floor(random()*publicSites.length),p=publicSites.splice(index,1)[0];
    p.landUse=i===2?'piazza':'park';
  }

  const segments=new Map();
  const edge=(axis,center,from,to)=>{
    const key=axis+':'+center;
    if(!segments.has(key))segments.set(key,[]);
    segments.get(key).push({axis,center,from,to});
  };
  for(const p of parcels){
    for(const y of [p.y0,p.y1])edge(0,y,p.x0,p.x1);
    for(const x of [p.x0,p.x1])edge(1,x,p.y0,p.y1);
    const pad=.58;
    blocks.push({...p,x0:p.x0+pad,x1:p.x1-pad,y0:p.y0+pad,y1:p.y1-pad});
  }
  const mainY=ys[1+Math.floor(random()*2)];
  for(const group of segments.values()){
    group.sort((a,b)=>a.from-b.from);
    const width=group[0].axis===0&&group[0].center===mainY?.95:.6+Math.floor(random()*4)*.05;
    let current=null;
    for(const s of group){
      if(current&&s.from<=current.to+1e-7)current.to=Math.max(current.to,s.to);
      else{current={...s,width};streets.push(current);}
    }
  }
  const nodeIds=new Map();
  const node=(x,y)=>{
    const key=x+','+y;
    if(!nodeIds.has(key)){nodeIds.set(key,nodes.length);nodes.push({x,y,neighbors:[]});}
    return nodeIds.get(key);
  };
  for(const s of streets){
    const cuts=[s.from,s.to];
    for(const cross of streets){
      if(cross.axis===s.axis||cross.center<s.from||cross.center>s.to||s.center<cross.from||s.center>cross.to)continue;
      cuts.push(cross.center);
    }
    const sorted=[...new Set(cuts)].sort((a,b)=>a-b);
    const ids=sorted.map(t=>s.axis===0?node(t,s.center):node(s.center,t));
    for(let i=1;i<ids.length;i++){
      const a=ids[i-1],b=ids[i];nodes[a].neighbors.push(b);nodes[b].neighbors.push(a);links.push({a,b,width:s.width});
    }
  }
  const contains=(s,x,y,pad=0)=>{
    const along=s.axis===0?x:y,across=s.axis===0?y:x;
    return along>=s.from-pad&&along<=s.to+pad&&Math.abs(across-s.center)<=s.width/2+pad;
  };
  const road=(x,y,pad=0)=>streets.some(s=>contains(s,x,y,pad));
  const horizontal=(y,pad=0)=>streets.some(s=>s.axis===0&&Math.abs(y-s.center)<=s.width/2+pad);
  const crossings=streets.filter(s=>s.axis!==canal.axis&&s.center>=canal.from&&s.center<=canal.to&&s.from<=canal.center-canal.width/2&&s.to>=canal.center+canal.width/2)
    .map(s=>({...s,from:canal.center-canal.width/2-.28,to:canal.center+canal.width/2+.28}));
  const bridge=(x,y)=>water(x,y)&&crossings.some(s=>contains(s,x,y,.28));
  const greenAreas=blocks.filter(b=>b.landUse==='park'||b.landUse==='waterfront').map(b=>({x0:b.x0,x1:b.x1,y0:b.y0,y1:b.y1}));
  return {streets,blocks,nodes,links,road,horizontal,water,bridge,canal,crossings,greenAreas};
}

export function advanceStreetActor(actor,layout,distance,random=Math.random){
  actor.progress+=distance;
  for(let guard=0;guard<20;guard++){
    const a=layout.nodes[actor.from],b=layout.nodes[actor.to],length=Math.abs(b.x-a.x)+Math.abs(b.y-a.y);
    if(actor.progress<=length){
      const t=actor.progress/length,dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y);
      // Offset right of travel; cars use two narrow opposing lanes, walkers the sidewalk.
      actor.axis=dx?0:1;actor.dir=dx||dy;
      const cx=a.x+(b.x-a.x)*t,cy=a.y+(b.y-a.y)*t,crossing=layout.crossings.find(s=>s.axis===actor.axis&&Math.abs((s.axis===0?cy:cx)-s.center)<1e-7&&(s.axis===0?cx:cy)>=s.from&&(s.axis===0?cx:cy)<=s.to),offset=crossing?Math.min(actor.offset,crossing.width/2+.18):actor.offset;
      actor.x=cx-dy*offset;actor.y=cy+dx*offset;
      return;
    }
    actor.progress-=length;
    const choices=b.neighbors.filter(i=>i!==actor.from),next=choices.length?choices[Math.min(choices.length-1,Math.floor(random()*choices.length))]:actor.from;
    actor.from=actor.to;actor.to=next;
  }
}
