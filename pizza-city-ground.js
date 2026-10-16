import {Sprite,Texture,CITY_N,hash} from './pizza-core.js?v=20261016f';

// One texture pixel per world pixel matches the city sprites; bake once per map.
export function cityGround({road,water,park,fountainCell,streets,links,nodes,canal,crossings,landmarkGardens=[]},seed){
  const min=-8,max=CITY_N+7,left=(min-max)*32-32,top=min*32-16;
  const canvas=document.createElement('canvas');
  canvas.width=(max-min)*64+64;canvas.height=(max-min)*32+32;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  const random=(x,y,s=0)=>hash(x,y,(seed+s)>>>0);
  const point=(x,y)=>[(x-y)*32-left,(x+y)*16-top];
  const stats={asphalt:0,crossings:0,manholes:0,curbs:0,landmarkGardens:landmarkGardens.length,gardenBeds:0,gardenPaths:0};
  function polygon(points,color,worn=0){
    const ys=points.map(p=>p[1]),start=Math.ceil(Math.min(...ys)-.5),end=Math.ceil(Math.max(...ys)-.5);
    ctx.fillStyle=color;
    for(let y=start;y<end;y++){
      const scan=y+.5,intersections=[];
      for(let i=0;i<points.length;i++){
        const a=points[i],b=points[(i+1)%points.length];
        if((a[1]<=scan&&b[1]>scan)||(b[1]<=scan&&a[1]>scan))intersections.push(a[0]+(scan-a[1])*(b[0]-a[0])/(b[1]-a[1]));
      }
      intersections.sort((a,b)=>a-b);
      for(let i=0;i+1<intersections.length;i+=2){
        const x0=Math.ceil(intersections[i]-.5),x1=Math.ceil(intersections[i+1]-.5);
        if(!worn)ctx.fillRect(x0,y,x1-x0,1);
        else for(let x=x0;x<x1;x++)if(random(x,y,37)>worn)ctx.fillRect(x,y,1,1);
      }
    }
  }
  function quad(x,y,w,h,color,worn=0){polygon([point(x,y),point(x+w,y),point(x+w,y+h),point(x,y+h)],color,worn);}
  function pixel(x,y,color,width=1){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),width,1);}
  function line(a,b,color){
    let x=Math.round(a[0]),y=Math.round(a[1]);const endX=Math.round(b[0]),endY=Math.round(b[1]);
    const dx=Math.abs(endX-x),sx=x<endX?1:-1,dy=-Math.abs(endY-y),sy=y<endY?1:-1;let error=dx+dy;
    while(true){pixel(x,y,color);if(x===endX&&y===endY)break;const e=2*error;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}
  }
  function stone(x,y){
    const palette=['#b8ae96','#c6baa0','#cec0a6','#bdb39d','#d2c6ac'];
    quad(x-.5,y-.5,1,1,'#958b75');
    for(let a=0;a<3;a++)for(let b=0;b<3;b++){
      const px=x-.48+a/3,py=y-.48+b/3,color=palette[Math.floor(random(x*3+a,y*3+b,8)*palette.length)];
      quad(px,py,.3,.3,color);
      line(point(px,py),point(px+.3,py),'#dfd1b5');
      line(point(px+.3,py),point(px+.3,py+.3),'#a79a81');
      for(let n=0;n<5;n++){
        const p=point(px+.035+random(x*9+a,y*9+b,n+310)*.23,py+.035+random(y*9+b,x*9+a,n+330)*.23);
        pixel(p[0],p[1],n%2?'#c3b79d':'#b0a58f');
      }
      if(random(x*3+a,y*3+b,351)>.9)line(point(px+.09,py+.08),point(px+.21,py+.1),'#9e947f');
    }
  }
  function waterTile(x,y){
    for(let n=0;n<24;n++){
      const gx=x-.45+random(x,y,n+120)*.9,gy=y-.45+random(y,x,n+140)*.9;
      if(!water(gx,gy))continue;
      const p=point(gx,gy);
      pixel(p[0],p[1],n%3?'#518c99':'#256578',3+(n%4));
    }
  }
  for(let y=min;y<=max;y++)for(let x=min;x<=max;x++){
    if(park(x,y)&&!fountainCell(x,y)&&!road(x,y,.5)){
      quad(x-.5,y-.5,1,1,'#788851');
      for(let n=0;n<60;n++){const p=point(x-.45+random(x,y,n+170)*.9,y-.45+random(y,x,n+190)*.9);pixel(p[0],p[1],n%2?'#87995c':'#677a49');}
    }else stone(x,y);
  }
  // Fractional, contained garden surfaces replace the empty paved landmark
  // parcels. Paint before streets so curbs and asphalt retain priority.
  const surface=(r,color)=>quad(r.x0,r.y0,r.x1-r.x0,r.y1-r.y0,color);
  for(const garden of landmarkGardens){
    const r=garden.lawn;
    surface(r,'#d3c5a5');surface({x0:r.x0+.07,y0:r.y0+.07,x1:r.x1-.07,y1:r.y1-.07},'#7e9055');
    const area=(r.x1-r.x0)*(r.y1-r.y0);
    for(let n=0;n<area*42;n++){
      const p=point(r.x0+.09+random(r.x0,r.y0,n+710)*(r.x1-r.x0-.18),r.y0+.09+random(r.y0,r.x0,n+810)*(r.y1-r.y0-.18));
      pixel(p[0],p[1],n%3?'#889b60':'#6f834d',n%3?1:2);
    }
    for(const path of garden.paths){
      surface(path,'#b7a685');
      surface({x0:path.x0+.04,y0:path.y0+.04,x1:path.x1-.04,y1:path.y1-.04},garden.index?'#d8c9a8':'#c7b58e');stats.gardenPaths++;
    }
    const a=garden.apron;surface(a,'#a99d83');
    surface({x0:a.x0+.05,y0:a.y0+.05,x1:a.x1-.05,y1:a.y1-.05},garden.index?'#d0c4a8':'#cbbb98');
    for(let x=a.x0+.4;x<a.x1;x+=.4)line(point(x,a.y0+.05),point(x,a.y1-.05),'#b5a88d');
    for(let y=a.y0+.4;y<a.y1;y+=.4)line(point(a.x0+.05,y),point(a.x1-.05,y),'#b5a88d');
    for(const [i,bed]of garden.beds.entries()){
      surface(bed,'#cab995');surface({x0:bed.x0+.06,y0:bed.y0+.06,x1:bed.x1-.06,y1:bed.y1-.06},'#3e6240');
      surface({x0:bed.x0+.14,y0:bed.y0+.14,x1:bed.x1-.14,y1:bed.y1-.14},'#6b7750');
      for(let x=bed.x0+.2;x<bed.x1-.14;x+=.18)for(let y=bed.y0+.2;y<bed.y1-.14;y+=.18){const p=point(x,y);pixel(p[0],p[1],i%2?'#d3bc65':'#b56c65',2);}
      stats.gardenBeds++;
    }
  }
  function ribbon(s,width,color){
    if(s.axis===0)quad(s.from,s.center-width/2,s.to-s.from,width,color);
    else quad(s.center-width/2,s.from,width,s.to-s.from,color);
  }
  // Paint the exact canal banks instead of rounding the water to whole tiles.
  ribbon(canal,canal.width+.24,'#a2967c');ribbon(canal,canal.width,'#397b8d');
  for(let y=min;y<=max;y++)for(let x=min;x<=max;x++)if(water(x,y)||water(x+.5,y+.5)||water(x-.5,y-.5))waterTile(x,y);
  // Streets are continuous fractional-width ribbons, independent of tile size.
  for(const s of streets){ribbon(s,s.width+.56,'#b9ab91');ribbon(s,s.width+.08,'#e0d0ae');stats.curbs++;}
  for(const s of streets)ribbon(s,s.width,'#484d4b');
  for(let y=min;y<=max;y++)for(let x=min;x<=max;x++){
    if(!road(x,y,.5))continue;stats.asphalt++;
    for(let n=0;n<60;n++){
      const gx=x-.5+random(x,y,n*3+10),gy=y-.5+random(x,y,n*3+11);
      if(!road(gx,gy))continue;
      const p=point(gx,gy);pixel(p[0],p[1],['#505652','#424945','#575c55','#454b47'][n%4]);
    }
  }
  for(const s of streets){
    // Only the main boulevard has a center line; residential lanes stay quiet.
    if(s.width>.9)for(let t=s.from+.5;t<s.to;t+=2){
      if(s.axis===0)quad(t,s.center-.025,.6,.05,'#b7baa5',.08);
      else quad(s.center-.025,t,.05,.6,'#b7baa5',.08);
    }
    if(s.axis===1)for(const y of [s.from+.9,s.to-.9]){
      stats.crossings++;
      for(let n=0;n<4;n++)quad(s.center-s.width/2+.04+n*s.width/4,y-.13,s.width/7,.26,'#e5dcc4',.045);
    }
  }
  for(const [i,link]of links.entries()){
    if(i%5)continue;const a=nodes[link.a],b=nodes[link.b],gx=(a.x+b.x)/2,gy=(a.y+b.y)/2;
    if(water(gx,gy))continue;stats.manholes++;const p=point(gx,gy);
    for(let dy=-3;dy<=3;dy++)for(let dx=-6;dx<=6;dx++){
      const radius=dx*dx/36+dy*dy/9;if(radius<=1)pixel(p[0]+dx,p[1]+dy,radius>.65?'#777b6b':dy%2?'#333c39':'#454f48');
    }
    pixel(p[0]-3,p[1]-2,'#9b9c86',4);
  }
  for(const s of crossings){
    ribbon(s,s.width+.56,'#bbae94');
    for(let t=s.from;t<s.to;t+=.18){
      const a=s.axis===0?[t,s.center-s.width/2-.28]:[s.center-s.width/2-.28,t];
      const b=s.axis===0?[t,s.center+s.width/2+.28]:[s.center+s.width/2+.28,t];
      line(point(...a),point(...b),'#a39780');
    }
  }
  const texture=Texture.from(canvas);texture.source.scaleMode='nearest';
  const sprite=new Sprite(texture);sprite.position.set(left,top);sprite.scale.set(1);sprite.label='city-ground';sprite.pixelScale=1;sprite.groundDetails=stats;
  sprite.once('destroyed',()=>texture.destroy(true));
  return sprite;
}
