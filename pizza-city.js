import {frontageRow} from './pizza-city-frontages.js?v=20261013e';
import {BUILDING_FOOTPRINTS,footprintAnchor,footprintCells,footprintFits} from './pizza-city-footprints.js?v=20261013e';
import {cityGround} from './pizza-city-ground.js?v=20261013e';
import {districtOrder,nextCitySeed,cityLayout,advanceStreetActor} from './pizza-city-layout.js?v=20261013e';
import {PROPERTIES,PROPERTY_SIZES} from './pizza-properties.js?v=20261013e';
import {openProperty} from './pizza-properties-ui.js?v=20261013e';
import {app,world,state,TW,TH,CITY_N,Container,Graphics,Sprite,Rectangle,iso,hash,label,clearWorld,sceneUI,sceneViewport,saveLayout,notify} from './pizza-core.js?v=20261013e';
import {citySprite} from './pizza-city-art.js?v=20261013e';
import {personSprite} from './pizza-sprites.js?v=20261013e';
import {carSprite} from './pizza-city-traffic.js?v=20261013e';

let districts=districtOrder();
function cityHash(x,y,s=0){return hash(x,y,(state.citySeed+s)>>>0);}
function sourceBlock(bx,by){
  if(bx<0||bx>2||by<0||by>2)return [bx,by];
  const source=districts[by*3+bx];return [source%3,Math.floor(source/3)];
}
const DEFAULT_VIEW={x:0,y:432,zoom:.88};
let layout=cityLayout();
const road=(x,y,pad=0)=>layout.road(x,y,pad);
const water=(x,y)=>layout.water(x,y);
const bridge=(x,y)=>layout.bridge(x,y);
function park(x,y){
  const b=layout.blocks.find(b=>x>=b.x0&&x<=b.x1&&y>=b.y0&&y<=b.y1);
  if(!b)return false;const [sx,sy]=sourceBlock(b.bx,b.by);
  return sx===2&&sy===2&&x>b.x0+2.6;
}
function fountainCell(x,y){return layout.blocks.some(b=>{const [sx,sy]=sourceBlock(b.bx,b.by);return sx===2&&sy===2&&Math.abs(x-(b.x1-1.5))<1&&Math.abs(y-(b.y1-1.8))<1;});}
function place(layer,object,x,y){const p=iso(x,y);object.position.set(p.x,p.y);object.zIndex=p.y;layer.addChild(object);return object;}

function fallbackTree(){const g=new Graphics();g.ellipse(0,0,12,4).fill({color:0,alpha:.16});g.rect(-2,-20,4,20).fill(0x78553a);g.poly([-17,-23,-15,-41,-7,-52,8,-54,18,-43,20,-27,7,-19]).fill(0x426641);g.poly([-15,-33,-10,-47,2,-51,12,-39,1,-27]).fill(0x6a8b4d);return g;}
function tree(index=0,scale=1){const g=citySprite('props',index)||fallbackTree();g.scale.set(scale);g.label='city-tree';return g;}
function lamp(){const g=new Graphics();g.ellipse(1,1,4,2).fill({color:0,alpha:.17});g.rect(-2,-2,5,3).fill(0x35372f);g.rect(0,-29,2,28).fill(0x383c32);g.poly([-4,-32,1,-35,6,-32,5,-25,-3,-25]).fill(0x343a31);g.rect(-2,-31,6,4).fill(0xe9cc7e);g.rect(-3,-24,8,2).fill(0x32372f);return g;}
function bench(){return citySprite('props',5)||new Graphics().poly([-14,-8,4,-17,16,-11,-2,-2]).fill(0x795534);}
function planter(){return citySprite('props',6)||new Graphics().rect(-5,-9,10,9).fill(0x996842).ellipse(0,-12,8,6).fill(0x557549);}
function patioTable(){const g=citySprite('props',7)||new Graphics().poly([-13,-16,0,-23,13,-16,0,-10]).fill(0xb94832).rect(-1,-10,2,10).fill(0x78593a);g.label='city-terrace';return g;}
function fountain(){return citySprite('props',4)||new Graphics().ellipse(0,-5,36,18).fill(0xb4b096).ellipse(0,-6,30,13).fill(0x598d9e).rect(-3,-25,6,21).fill(0xcac2a8);}

function bridges(objects){
  for(const s of layout.streets.filter(s=>s.axis===0&&s.center>=12))for(const edge of [s.center-s.width/2-.27,s.center+s.width/2+.27]){
    const wall=new Graphics(),a=iso(26.15,edge),b=iso(28.35,edge);
    wall.poly([0,-8,b.x-a.x,b.y-a.y-8,b.x-a.x,b.y-a.y,0,0]).fill(0x8c836c).stroke({color:0xd6cbb0,width:1});
    for(let n=0;n<=5;n++){const px=n*14.08,py=n*7.04;wall.rect(px-1,py-12,3,7).fill(0xbeb397);}
    wall.position.set(a.x,a.y);wall.zIndex=(a.y+b.y)/2;wall.label='city-bridge';objects.addChild(wall);
  }
}
function waterfront(objects){
  for(let y=12;y<34;y+=1.3){
    if(layout.horizontal(y,.8))continue;
    const g=new Graphics();g.poly([0,-4,-28,10,-28,15,0,1]).fill(0x807b69).stroke({color:0xcac4ab,width:1});
    g.rect(-1,-12,3,10).fill(0x55594b);g.poly([-27,2,0,-12]).stroke({color:0x4e5549,width:1});
    place(objects,g,26.35,y+.1);
  }
}

function openRestaurant(id='mamma-mia'){if(state.scene==='city'&&!state.cityGesture?.moved)state.navigate('restaurant',typeof id==='string'?id:'mamma-mia');}
function pizzaBadge(g,x){
  g.circle(x,0,9).fill(0xcf9e52).stroke({color:0x75502f,width:1});g.circle(x,0,6.5).fill(0xaf3b2a);
  g.poly([x,0,x-5,-4,x-2,-6]).fill(0xf0cf82);g.poly([x,0,x+5,-4,x+6,1]).fill(0xf0cf82);g.poly([x,0,x-2,6,x-6,2]).fill(0xf0cf82);
}
function building(objects,labels,x,y,index=0,name=null,player=false,kind='buildings'){
  let object=citySprite(kind,index)||citySprite('buildings',0);
  if(!object){const type=index>=4?'small':index%2?'medium':'big',textures=state.cityTex[type];object=new Sprite(textures[Math.floor(cityHash(x,y)*textures.length)]);object.anchor.set(.5,1);object.scale.set(2);}
  const p=iso(x,y);place(objects,object,x,y);object.label=player?'player-restaurant':'city-building';object.buildingVariant=index;object.buildingKind=kind;
  if(player){object.eventMode='static';object.cursor='pointer';object.on('pointertap',openRestaurant);}
  if(name){
    const tablePositions=[[-.55,.4],[.65,.2]];
    for(const [dx,dy]of tablePositions)place(objects,patioTable(),x+dx,y+dy);
    place(objects,planter(),x-1.6,y+.15);place(objects,planter(),x+1.25,y-.7);
    const tag=new Container(),text=label(name,12,'#3a2b1f'),width=Math.ceil(text.width)+36;tag.position.set(p.x,p.y-object.height-11);tag.zIndex=p.y;
    const bg=new Graphics();bg.roundRect(-width/2,-13,width,26,4).fill(0xf0dfbf).stroke({color:0x745238,width:2});
    bg.poly([-width/2+4,-10,width/2-4,-10]).stroke({color:0xfff1d4,width:1});pizzaBadge(bg,-width/2+13);
    text.anchor.set(0,.5);text.x=-width/2+28;tag.addChild(bg,text);
    if(player){state.restaurantSign=tag;state.cityRestaurantSigns['mamma-mia']=tag;tag.label='restaurant-sign';tag.eventMode='static';tag.cursor='pointer';tag.hitArea=new Rectangle(-width/2,-14,width,28);tag.on('pointertap',openRestaurant);}
    labels.addChild(tag);
  }
  return object;
}
function landmark(objects,labels,x,y,index){
  const object=citySprite('landmarks',index)||building(objects,labels,x,y,7);
  place(objects,object,x,y);object.label=index?'city-cathedral':'city-colosseum';
}
function propertyBuilding(objects,labels,x,y,site){
  const owned=state.ownedProperties.includes(site.id),size=PROPERTY_SIZES[site.size];
  building(objects,labels,x,y,site.sprite,null,false,site.art);
  const object=objects.children.at(-1);object.label='city-property';object.propertyId=site.id;
  object.eventMode='static';object.cursor='pointer';object.on('pointertap',()=>{if(!state.cityGesture?.moved)state.ownedProperties.includes(site.id)?openRestaurant(site.id):openProperty(site.id);});
  const marker=new Container(),p=iso(x,y),bg=new Graphics(),text=label('',9,'#fff1ce');
  marker.label='city-property-marker';marker.propertyId=site.id;marker.position.set(p.x,p.y+(owned?-object.height-18:9));marker.roofY=p.y-object.height-18;marker.zIndex=p.y+30;
  bg.roundRect(-43,-9,86,18,3).fill(owned?0x426440:size.color).stroke({color:0xead4a5,width:1});
  text.anchor.set(.5);text.text=(owned?'DEIN':'KAUFEN')+' · '+size.badge;
  marker.addChild(bg,text);marker.eventMode='static';marker.cursor='pointer';marker.hitArea=new Rectangle(-43,-12,86,28);
  marker.on('pointertap',()=>{if(!state.cityGesture?.moved)state.ownedProperties.includes(site.id)?openRestaurant(site.id):openProperty(site.id);});labels.addChild(marker);if(owned)state.cityRestaurantSigns[site.id]=marker;return object;
}
function refreshPropertyMarkers(){
  if(state.scene!=='city')return;
  const labels=state.camera.children.at(-1);
  for(const marker of labels.children.filter(c=>c.label==='city-property-marker')){
    const site=PROPERTIES.find(p=>p.id===marker.propertyId),owned=state.ownedProperties.includes(site.id),size=PROPERTY_SIZES[site.size];
    marker.children[0].clear().roundRect(-43,-9,86,18,3).fill(owned?0x426440:size.color).stroke({color:0xead4a5,width:1});
    marker.children[1].text=(owned?'DEIN':'KAUFEN')+' · '+size.badge;
    if(owned){marker.y=marker.roofY;state.cityRestaurantSigns[site.id]=marker;}
  }
}

function block(objects,labels,b){
  let {bx,by,x0,x1,y0,y1}=b;const w=x1-x0,h=y1-y0;
  [bx,by]=sourceBlock(bx,by);
  const put=(object,x,y)=>place(objects,object,x0+x,y0+y);
  // The canal edge is a promenade, not another copy of a residential square.
  if(b.bx===3){
    for(let y=1;y<h;y+=2)put(tree(3,.75),1,y);
    put(bench(),.7,h*.65);return;
  }
  if(bx===0&&by===0){
    landmark(objects,labels,x0+w*.55,y0+h-.4,0);
    put(tree(2,.85),.3,h*.45);put(tree(3,.8),w-.3,h*.5);put(lamp(),w-.25,.3);return;
  }
  if(bx===1&&by===0){
    landmark(objects,labels,x0+w*.48,y0+h-.5,1);
    put(tree(2,.85),.3,1);put(tree(2,.8),w-.2,h-.4);return;
  }
  if(bx===2&&by===2){
    put(fountain(),w-1.5,h-1.8);
    building(objects,labels,x0+2.4,y0+h-1.15,6,'Donatello');
    [[.25,.8],[w*.55,.5],[w-.35,1.5],[w-.4,h-.5]].forEach(([x,y],i)=>put(tree(i%4,.8),x,y));
    put(bench(),w-1.4,h-.35);put(bench(),w-.3,h-2.5);return;
  }
  const size=(kind,index)=>state.cityArt[kind]?.[index]?.groundSize||{width:1.65,depth:1.65};
  const item=(kind,index,extra={})=>({kind,index,...size(kind,index),...extra});
  const pool=[];
  for(let index=8;index<16;index++)pool.push(item('buildings',index));
  for(const index of [0,1,3,4,5,6,7])pool.push(item('buildingTypes',index));
  const sites=PROPERTIES.filter(p=>p.bx===bx&&p.by===by);
  const required=sites.map(site=>item(site.art,site.sprite,{site}));
  function row(which,mandatory,candidates,edge){
    const houses=frontageRow(w,mandatory,candidates,n=>cityHash(bx*11+n,by,which==='back'?81:83));
    if(which==='front'&&!mandatory.length&&houses.length>2&&cityHash(bx,by,101)>.55)houses.pop();
    // Restaurants sit within the front rather than behind the camera controls at its end.
    if(mandatory.some(h=>h.name)&&houses.length>1){
      const start=houses[0].start,restaurant=houses.shift();houses.splice(Math.floor(houses.length/2),0,restaurant);
      let cursor=start;for(const house of houses){house.start=cursor;cursor+=house.width;}
    }
    for(const house of houses){
      const x=x0+house.start+house.width,y=which==='back'?edge+house.depth:edge;
      const object=house.site?propertyBuilding(objects,labels,x,y,house.site):building(objects,labels,x,y,house.index,house.name,house.player,house.kind);
      object.frontage=which;object.blockKey=b.bx+','+b.by;
      object.groundBounds={x0:x-house.width,x1:x,y0:y-house.depth,y1:y};
    }
    return houses;
  }
  const courtIndex=bx===0&&by===2?1:((bx===0&&by===1)||(bx===1&&by===2))?0:-1;
  if(courtIndex>=0&&state.cityArt.courtyardBuildings){
    const template=BUILDING_FOOTPRINTS.find(t=>t.id===(courtIndex?'courtyard-u':'corner-l'));
    const cx=x0+(w-template.width)/2,cy=y1-template.depth-.2;
    const shallow=pool.filter(p=>p.depth<=1.85);
    const allowed=(x,y)=>x>=x0&&x<=x1&&y>=y0+2&&y<=y1&&!road(x,y)&&!water(x,y);
    if(footprintFits(template,cx,cy,allowed)){
      row('back',required,shallow,y0+.15);
      const object=citySprite('courtyardBuildings',courtIndex),anchor=footprintAnchor(template);
      place(objects,object,cx+anchor[0],cy+anchor[1]);object.label='city-courtyard-building';
      object.footprintId=template.id;object.groundOrigin={x:cx,y:cy};object.blockKey=b.bx+','+b.by;
      object.occupiedGroundCells=footprintCells(template).map(([x,y])=>[cx+x,cy+y]);
      object.groundBounds={x0:cx,x1:cx+template.width,y0:cy,y1:cy+template.depth};
      put(lamp(),.08,h-.08);return;
    }
  }
  // Two fronts enclose a narrow, deliberately open interior instead of scattering
  // separate houses at four fixed anchors. Widths vary; each row shares an edge.
  const back=row('back',required,pool,y0+.15);
  const restaurant=bx===1&&by===1?item('buildings',4,{name:'Mamma Mia',player:true}):bx===2&&by===1?item('buildings',5,{name:"Luigi's"}):null;
  const frontCandidates=pool.filter(p=>p.depth<=h-Math.max(...back.map(p=>p.depth))-.7);
  const front=row('front',restaurant?[restaurant]:[],frontCandidates,y1-(restaurant?.85:.15));
  const innerBack=y0+.15+Math.max(...back.map(p=>p.depth));
  const innerFront=y1-(restaurant?.85:.15)-Math.max(...front.map(p=>p.depth));
  // Occasionally connect one side with a short wing, leaving the other as a
  // clear passage. A wing is added only if its full foundation fits the gap.
  const gap=innerFront-innerBack;
  const wings=pool.filter(p=>p.depth<=gap-.2&&p.width<2);
  if(wings.length&&cityHash(bx,by,89)>.35){
    const wing=wings[Math.min(wings.length-1,Math.floor(cityHash(bx,by,91)*wings.length))];
    const x=x0+.18+wing.width,y=innerBack+.1+wing.depth;
    const object=building(objects,labels,x,y,wing.index,null,false,wing.kind);
    object.frontage='wing';object.blockKey=b.bx+','+b.by;
    object.groundBounds={x0:x-wing.width,x1:x,y0:y-wing.depth,y1:y};
  }
  if(wings.length&&gap>1.5&&cityHash(bx,by,103)>.6){const wing=wings[Math.floor(cityHash(bx,by,107)*wings.length)],x=x1-.18,y=innerFront-.1;const object=building(objects,labels,x,y,wing.index,null,false,wing.kind);object.frontage='wing';object.blockKey=b.bx+','+b.by;object.groundBounds={x0:x-wing.width,x1:x,y0:y-wing.depth,y1:y};}
  if(gap>.8){put(planter(),w*.62,(innerBack+innerFront)/2-y0);if(gap>1.3)put(bench(),w*.68,(innerBack+innerFront)/2-y0);}
  put(lamp(),.08,h-.08);

}

let viewOffset=0;
function orientationOffset(){return matchMedia('(max-height:540px) and (min-width:500px)').matches?-72:0;}
function viewCenter(){const area=sceneViewport();return {x:(area.left+area.right)/2,y:(area.top+area.bottom)/2};}
function captureView(){
  const center=viewCenter(),camera=state.camera;
  state.cityView={x:(center.x-camera.x)/camera.scale.x,y:(center.y-camera.y)/camera.scale.y,zoom:camera.scale.x};
}
function clampCamera(){
  const center=viewCenter(),camera=state.camera,z=camera.scale.x;
  const x=(center.x-camera.x)/z,y=(center.y-camera.y)/z;
  const gx=Math.max(2,Math.min(CITY_N-3,(x/(TW/2)+y/(TH/2))/2));
  const gy=Math.max(2,Math.min(CITY_N-3,(y/(TH/2)-x/(TW/2))/2)),p=iso(gx,gy);
  camera.position.set(center.x-p.x*z,center.y-p.y*z);captureView();
}
export function resizeCity(){
  if(state.scene!=='city') return;
  const offset=orientationOffset(),view=state.cityView?{...state.cityView,y:state.cityView.y+offset-viewOffset}:{...DEFAULT_VIEW,y:DEFAULT_VIEW.y+offset},center=viewCenter();
  viewOffset=offset;
  state.camera.scale.set(view.zoom);state.camera.position.set(center.x-view.x*view.zoom,center.y-view.y*view.zoom);
  app.stage.hitArea=new Rectangle(0,0,app.screen.width,app.screen.height);captureView();
}
export function centerCity(){viewOffset=orientationOffset();state.cityView={...DEFAULT_VIEW,y:DEFAULT_VIEW.y+viewOffset};if(state.scene==='city') resizeCity();}
export function zoomCity(factor,anchor=viewCenter()){
  if(state.scene!=='city') return;
  const camera=state.camera,oldZoom=camera.scale.x,zoom=Math.max(.65,Math.min(2.2,oldZoom*factor));
  const x=(anchor.x-camera.x)/oldZoom,y=(anchor.y-camera.y)/oldZoom;
  camera.scale.set(zoom);camera.position.set(anchor.x-x*zoom,anchor.y-y*zoom);clampCamera();
}

function bindGestures(){
  const pointers=new Map();let lastPinch=0;
  state.cityGesture={moved:false,distance:0};
  app.stage.on('pointerdown',event=>{
    if(!pointers.size){state.cityGesture.moved=false;state.cityGesture.distance=0;}
    pointers.set(event.pointerId,{x:event.global.x,y:event.global.y});
    try{app.canvas.setPointerCapture(event.pointerId);}catch{}
    if(pointers.size===2){const [a,b]=[...pointers.values()];lastPinch=Math.hypot(a.x-b.x,a.y-b.y);state.cityGesture.moved=true;}
  });
  app.stage.on('globalpointermove',event=>{
    const previous=pointers.get(event.pointerId);if(!previous) return;
    const point={x:event.global.x,y:event.global.y};pointers.set(event.pointerId,point);
    if(pointers.size>=2){
      const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);
      if(lastPinch>0) zoomCity(distance/lastPinch,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});lastPinch=distance;
    }else{
      const dx=point.x-previous.x,dy=point.y-previous.y;
      state.cityGesture.distance+=Math.hypot(dx,dy);
      if(state.cityGesture.distance>6) state.cityGesture.moved=true;
      state.camera.x+=dx;state.camera.y+=dy;clampCamera();
    }
  });
  const release=event=>{pointers.delete(event.pointerId);lastPinch=0;try{app.canvas.releasePointerCapture(event.pointerId);}catch{}};
  app.stage.on('pointerup',release);app.stage.on('pointerupoutside',release);app.stage.on('pointercancel',release);
}

export function showCity(){
  if(state.scene==='city') return;
  districts=districtOrder(state.citySeed);layout=cityLayout(state.citySeed);state.cityLayout=layout;
  clearWorld();state.scene='city';sceneUI('city');
  state.restaurantSign=null;state.cityRestaurantSigns={};
  state.camera=new Container();world.addChild(state.camera);
  const ground=cityGround({...layout,park,fountainCell},state.citySeed),markings=new Container(),objects=new Container(),labels=new Container();
  ground.label='city-ground';objects.label='city-objects';objects.sortableChildren=true;labels.sortableChildren=true;
  state.camera.addChild(ground,markings,objects,labels);
  bridges(objects);waterfront(objects);
  for(const b of layout.blocks)block(objects,labels,b);
  for(let i=0;i<40;i++){
    const kind=i<16?'car':'person',link=layout.links[Math.floor(cityHash(i,8)*layout.links.length)];
    const from=i%2?link.a:link.b,to=i%2?link.b:link.a;
    const a=layout.nodes[from],b=layout.nodes[to],length=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
    const actor={kind,from,to,progress:cityHash(i,9)*length,offset:kind==='car'?.16:.67,variant:i,speed:kind==='car'?.43+(i%4)*.065:.095+(i%5)*.011};
    advanceStreetActor(actor,layout,0,()=>cityHash(i,10));
    actor.g=kind==='car'?carSprite(i,actor.axis,actor.dir):personSprite(i%4,actor.axis===0?(actor.dir>0?0:2):(actor.dir>0?1:3));
    if(kind==='person')actor.g.scale.set(.33);actor.g.label=kind==='car'?'city-car':'city-pedestrian';
    objects.addChild(actor.g);state.movers.push(actor);
  }
  state.restaurantSign=state.cityRestaurantSigns[state.activeRestaurantId]||state.cityRestaurantSigns['mamma-mia'];
  state.onPropertyChange=refreshPropertyMarkers;
  resizeCity();bindGestures();tickCity(0);
}

export function randomizeCity(){
  if(state.scene!=='city'||!state.ready)return;
  const entropy=crypto.getRandomValues(new Uint32Array(1))[0];
  state.citySeed=nextCitySeed(state.citySeed,entropy);saveLayout();
  state.scene=null;showCity();notify('Neue Stadtkarte erzeugt.');
}

export function tickCity(dt){
  for(const mover of state.movers){
    const previous=mover.axis+':'+mover.dir;
    advanceStreetActor(mover,layout,mover.speed*dt*.035,()=>cityHash(mover.variant,Math.floor(state.gameMinutes*17),mover.to));
    if(previous!==mover.axis+':'+mover.dir){
      const next=mover.kind==='car'?carSprite(mover.variant,mover.axis,mover.dir):personSprite(mover.variant%4,mover.axis===0?(mover.dir>0?0:2):(mover.dir>0?1:3));
      mover.g.texture=next.texture;next.destroy();
    }
    const p=iso(mover.x,mover.y);
    mover.g.position.set(Math.round(p.x),Math.round(p.y));mover.g.zIndex=p.y;
  }
}
