// Pure ground plan for the old-town study. Existing sprites are only uniformly
// reduced, never stretched, rotated or enlarged beyond their facade-height cap.
export const MIN_PERIMETER_SCALE=.9;
const EPS=1e-7;
const randomFrom=seed=>{let n=seed>>>0;return()=>{n=(n+0x6d2b79f5)>>>0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};};

export function packPerimeterRow(length,pool,{seed=1,required=[]}={}){
  if(!(length>0&&Number.isFinite(length))||!pool.length)throw new Error('Invalid frontage or empty building catalog.');
  const random=randomFrom(seed),candidates=[...pool].sort((a,b)=>a.index-b.index);
  for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  if([...required,...candidates].some(p=>!(p.span>0&&p.width>0&&p.depth>0)))throw new Error('Invalid building foundation.');
  const limit=length/MIN_PERIMETER_SCALE,initial=required.reduce((n,p)=>n+p.span,0);
  if(initial>limit+EPS)throw new Error('Required building cannot fit this street front.');
  let frontier=[{sum:initial,picks:[...required]}],best=null;
  const consider=entry=>{
    if(entry.sum<length-EPS)return false;
    const repeats=entry.picks.reduce((n,p,i)=>n+(i>0&&p.index===entry.picks[i-1].index),0);
    const score=entry.sum-length+repeats*.08;
    if(!best||score<best.score)best={...entry,score};
    return true;
  };
  if(consider(frontier[0]))frontier=[];
  for(let count=0;count<14&&frontier.length;count++){
    const next=new Map();
    for(const entry of frontier)for(const part of candidates){
      const sum=entry.sum+part.span;if(sum>limit+EPS)continue;
      const result={sum,picks:[...entry.picks,part]};
      if(consider(result))continue;
      const key=Math.round(sum*256);if(!next.has(key))next.set(key,result);
    }
    frontier=[...next.values()];
  }
  if(!best)throw new Error('No frontage fits without distorting its sprites.');
  const scale=Math.min(1,length/best.sum);let cursor=0;
  return best.picks.map((part,index)=>{
    const span=part.span*scale,result={...part,index:part.index,slot:index,offset:cursor,span,scale,width:part.width*scale,depth:part.depth*scale};
    cursor+=span;return result;
  });
}

export const foundationsOverlap=(a,b)=>Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)>EPS&&Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0)>EPS;

export function perimeterCoverage(block,parts=block.parts){
  const {x0,x1,y0,y1}=block,edges={north:[],south:[],west:[],east:[]};
  for(const p of parts){
    if(Math.abs(p.y0-y0)<EPS)edges.north.push([p.x0,p.x1]);
    if(Math.abs(p.y1-y1)<EPS)edges.south.push([p.x0,p.x1]);
    if(Math.abs(p.x0-x0)<EPS)edges.west.push([p.y0,p.y1]);
    if(Math.abs(p.x1-x1)<EPS)edges.east.push([p.y0,p.y1]);
  }
  const result={};
  for(const [side,intervals]of Object.entries(edges)){
    intervals.sort((a,b)=>a[0]-b[0]);let start=0,end=0,used=0,first=true;
    for(const [a,b]of intervals){if(first){start=a;end=b;first=false;}else if(a<=end+EPS)end=Math.max(end,b);else{used+=end-start;start=a;end=b;}}
    if(!first)used+=end-start;
    const length=side==='north'||side==='south'?x1-x0:y1-y0;
    result[side]={built:used,total:length,ratio:Math.min(1,used/length)};
  }
  return result;
}

export function perimeterBlock(catalog,{id,x0,y0,width,depth,seed=1,restaurant='Mamma Mia',gateWidth=.55}={}){
  if(!id||width<6||depth<5.4||gateWidth<0||gateWidth>.6)throw new Error('Block too small for a closed street perimeter.');
  const x1=x0+width,y1=y0+depth,parts=[],random=randomFrom(seed);
  const catalogItem=index=>{const p=catalog.find(p=>p.index===index);if(!p)throw new Error('Missing corner or restaurant art.');return p;};
  const cornerIndexes=[24,16,20,24];
  if(random()>.5)[cornerIndexes[0],cornerIndexes[2]]=[cornerIndexes[2],cornerIndexes[0]];
  const corners={};
  for(const [i,name]of ['nw','ne','sw','se'].entries()){
    const p=catalogItem(cornerIndexes[i]),right=name.endsWith('e'),bottom=name.startsWith('s');
    const part={...p,id:id+'-'+name,blockId:id,edge:'corner',corner:name,scale:1,
      x0:right?x1-p.width:x0,x1:right?x1:x0+p.width,y0:bottom?y1-p.depth:y0,y1:bottom?y1:y0+p.depth};
    corners[name]=part;parts.push(part);
  }
  const excluded=new Set([3,4,5,6,9,11,13,15]);
  const ordinary=catalog.filter(p=>!excluded.has(p.index));
  function row(side,from,to,required=[],gap=0){
    if(to-from<EPS)return;
    const horizontal=side==='north'||side==='south';
    const maxThickness=side==='north'?Math.min(corners.nw.depth,corners.ne.depth):side==='south'?Math.min(corners.sw.depth,corners.se.depth):side==='west'?Math.min(corners.nw.width,corners.sw.width):Math.min(corners.ne.width,corners.se.width);
    const candidates=ordinary.filter(p=>(horizontal?p.depth:p.width)<=maxThickness+EPS).map(p=>({...p,span:horizontal?p.width:p.depth}));
    const packed=packPerimeterRow(to-from-gap,candidates,{seed:(seed+parts.length*971)>>>0,required:required.map(p=>({...p,span:horizontal?p.width:p.depth}))});
    // Put the restaurant within the row instead of losing it behind a corner.
    if(required.length&&packed.length>1){const p=packed.shift();packed.splice(Math.floor(packed.length/2),0,p);}
    let cursor=from,gateFrom=null;
    for(const [i,p]of packed.entries()){
      if(gap&&i===Math.max(1,Math.floor(packed.length/2))){gateFrom=cursor;cursor+=gap;}
      const a=horizontal?cursor:side==='west'?x0:x1-p.width,b=horizontal?(side==='north'?y0:y1-p.depth):cursor;
      const part={...p,id:id+'-'+side+'-'+parts.length,blockId:id,edge:side,x0:a,x1:a+p.width,y0:b,y1:b+p.depth};
      if(p.restaurant){part.entrance={x:(part.x0+part.x1)/2,y:y1};part.approach={x:part.entrance.x,y:y1+.42};}
      parts.push(part);cursor+=horizontal?p.width:p.depth;
    }
    return gateFrom;
  }
  row('north',corners.nw.x1,corners.ne.x0);
  row('west',corners.nw.y1,corners.sw.y0);
  row('east',corners.ne.y1,corners.se.y0);
  const from=corners.sw.x1,to=corners.se.x0;
  const required={...catalogItem(4),restaurant};
  const gateFrom=row('south',from,to,[required],gateWidth);
  const gate=gateWidth?{x0:gateFrom,x1:gateFrom+gateWidth,y0:y1-Math.max(corners.sw.depth,corners.se.depth)-.15,y1:y1+.5}:null;
  const court={x0:x0+Math.max(...parts.filter(p=>p.edge==='west'||p.corner==='nw'||p.corner==='sw').map(p=>p.width))+.08,
    x1:x1-Math.max(...parts.filter(p=>p.edge==='east'||p.corner==='ne'||p.corner==='se').map(p=>p.width))-.08,
    y0:y0+Math.max(...parts.filter(p=>p.edge==='north'||p.corner==='nw'||p.corner==='ne').map(p=>p.depth))+.08,
    y1:y1-Math.max(...parts.filter(p=>p.edge==='south'||p.corner==='sw'||p.corner==='se').map(p=>p.depth))-.08};
  const result={id,x0,x1,y0,y1,width,depth,parts,gate,court,restaurant};
  result.coverage=perimeterCoverage(result);return result;
}

export function oldtownQuarter(catalog,seed=61){
  const blocks=[
    perimeterBlock(catalog,{id:'forno',x0:0,y0:0,width:6.8,depth:6.2,seed:seed+1,restaurant:'Forno San Luca'}),
    perimeterBlock(catalog,{id:'mamma',x0:7.9,y0:0,width:7.1,depth:6.2,seed:seed+2,restaurant:'Mamma Mia'}),
    perimeterBlock(catalog,{id:'vicolo',x0:0,y0:7.3,width:6.8,depth:6.8,seed:seed+3,restaurant:'Trattoria del Vicolo'})
  ];
  const rim=perimeterBlock(catalog,{id:'piazza',x0:7.9,y0:7.3,width:7.1,depth:6.8,seed:seed+4,restaurant:'Caffè della Piazza',gateWidth:0});
  rim.parts=rim.parts.filter(p=>['south','east'].includes(p.edge)||['ne','sw','se'].includes(p.corner));
  const piazza={x0:7.9,y0:7.3,x1:rim.court.x1,y1:rim.court.y1};
  return {seed,blocks,rim,piazza,parts:[...blocks.flatMap(b=>b.parts),...rim.parts],alley:{x0:6.8,x1:7.9,y0:0,y1:6.2}};
}
