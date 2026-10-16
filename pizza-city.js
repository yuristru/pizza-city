import {cityContactPlan} from './pizza-city-contacts.js?v=20261016f';
import {drawCityContact,drawSkatepark,tickCityLife} from './pizza-city-life.js?v=20261016f';
import {openCityContact} from './pizza-underworld-ui.js?v=20261016f';
import {WAREHOUSES} from './pizza-procurement.js?v=20261016f';
import {COMPETITORS} from './pizza-competitors.js?v=20261016f';
import {openCommerce} from './pizza-commerce-ui.js?v=20261016f';
import {warehouseCanvas} from './pizza-warehouse-art.js?v=20261016f';
import {closedCityBlock} from './pizza-city-perimeter.js?v=20261016f';
import {cityGround} from './pizza-city-ground.js?v=20261016f';
import {landmarkGarden} from './pizza-city-landscape.js?v=20261016f';
import {districtOrder,nextCitySeed,cityLayout,advanceStreetActor} from './pizza-city-layout.js?v=20261016f';
import {PROPERTIES,PROPERTY_SIZES} from './pizza-properties.js?v=20261016f';
import {openProperty} from './pizza-properties-ui.js?v=20261016f';
import {app,world,state,TW,TH,CITY_N,Container,Graphics,Sprite,Texture,Rectangle,iso,hash,label,clearWorld,sceneUI,sceneViewport,saveLayout,notify} from './pizza-core.js?v=20261016f';
import {BUILDING_ART} from './pizza-city-building-art.js?v=20261016f';
import {buildingProjection} from './pizza-city-building-rules.js?v=20261016f';
import {citySprite} from './pizza-city-art.js?v=20261016f';
import {personSprite} from './pizza-sprites.js?v=20261016f';
import {carSprite} from './pizza-city-traffic.js?v=20261016f';
import {TAXI_DRIVERS} from './pizza-taxis.js?v=20261016f';
import {openTaxi} from './pizza-taxis-ui.js?v=20261016f';

const foundation=(kind,index)=>{const art=BUILDING_ART[kind]?.[index];return art?buildingProjection(art.corners,art.worldWidth,art.storeys,art.facadePixels).groundSize:{width:1.65,depth:1.65};};
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
  if(layout.greenAreas.some(a=>x>=a.x0&&x<=a.x1&&y>=a.y0&&y<=a.y1))return true;
  return false;
}
function fountainCell(x,y){return layout.blocks.some(b=>['park','piazza'].includes(b.landUse)&&Math.abs(x-(b.x0+b.x1)/2)<1&&Math.abs(y-(b.y0+b.y1)/2)<1);}
function place(layer,object,x,y){const p=iso(x,y);object.position.set(p.x,p.y);object.zIndex=p.y;layer.addChild(object);return object;}

function fallbackTree(){const g=new Graphics();g.ellipse(0,0,12,4).fill({color:0,alpha:.16});g.rect(-2,-20,4,20).fill(0x78553a);g.poly([-17,-23,-15,-41,-7,-52,8,-54,18,-43,20,-27,7,-19]).fill(0x426641);g.poly([-15,-33,-10,-47,2,-51,12,-39,1,-27]).fill(0x6a8b4d);return g;}
function tree(index=0,scale=1){const g=citySprite('props',index)||fallbackTree();g.scale.set(scale);g.label='city-tree';return g;}
function lamp(){const g=new Graphics();g.ellipse(1,1,4,2).fill({color:0,alpha:.17});g.rect(-2,-2,5,3).fill(0x35372f);g.rect(0,-29,2,28).fill(0x383c32);g.poly([-4,-32,1,-35,6,-32,5,-25,-3,-25]).fill(0x343a31);g.rect(-2,-31,6,4).fill(0xe9cc7e);g.rect(-3,-24,8,2).fill(0x32372f);return g;}
function bench(){return citySprite('props',5)||new Graphics().poly([-14,-8,4,-17,16,-11,-2,-2]).fill(0x795534);}
function planter(){return citySprite('props',6)||new Graphics().rect(-5,-9,10,9).fill(0x996842).ellipse(0,-12,8,6).fill(0x557549);}
function patioTable(){const g=citySprite('props',7)||new Graphics().poly([-13,-16,0,-23,13,-16,0,-10]).fill(0xb94832).rect(-1,-10,2,10).fill(0x78593a);g.label='city-terrace';return g;}
function fountain(){return citySprite('props',4)||new Graphics().ellipse(0,-5,36,18).fill(0xb4b096).ellipse(0,-6,30,13).fill(0x598d9e).rect(-3,-25,6,21).fill(0xcac2a8);}

function bridges(objects){
  for(const s of layout.crossings)for(const edge of [s.center-s.width/2-.27,s.center+s.width/2+.27]){
    const wall=new Graphics(),a=s.axis===0?iso(s.from,edge):iso(edge,s.from),b=s.axis===0?iso(s.to,edge):iso(edge,s.to);
    wall.poly([0,-8,b.x-a.x,b.y-a.y-8,b.x-a.x,b.y-a.y,0,0]).fill(0x8c836c).stroke({color:0xd6cbb0,width:1});
    const posts=Math.ceil((s.to-s.from)/.45);
    for(let n=0;n<=posts;n++){const t=n/posts;wall.rect((b.x-a.x)*t-1,(b.y-a.y)*t-12,3,7).fill(0xbeb397);}
    wall.position.set(a.x,a.y);wall.zIndex=(a.y+b.y)/2;wall.label='city-bridge';objects.addChild(wall);
  }
}
function waterfront(objects){
  const c=layout.canal;
  for(const side of [-1,1])for(let t=c.from+.2;t<c.to-.9;t+=1.3){
    const edge=c.center+side*(c.width/2+.09),x=c.axis===0?t:edge,y=c.axis===0?edge:t;
    const endX=c.axis===0?t+1.05:edge,endY=c.axis===0?edge:t+1.05;
    if(road(x,y,.65)||road(endX,endY,.65))continue;
    const a=iso(x,y),b=iso(endX,endY),dx=b.x-a.x,dy=b.y-a.y,g=new Graphics();
    g.poly([0,-3,dx,dy-3,dx,dy+1,0,1]).fill(0x807b69).stroke({color:0xcac4ab,width:1});
    g.rect(-1,-12,3,10).fill(0x55594b);g.rect(dx-1,dy-12,3,10).fill(0x55594b);
    g.moveTo(0,-11).lineTo(dx,dy-11).stroke({color:0x4e5549,width:1});
    place(objects,g,x,y);g.label='city-quay';
  }
}

function openRestaurant(id='mamma-mia'){if(state.scene==='city'&&!state.cityGesture?.moved)state.navigate('restaurant',typeof id==='string'?id:'mamma-mia');}
function pizzaBadge(g,x){
  g.circle(x,0,9).fill(0xcf9e52).stroke({color:0x75502f,width:1});g.circle(x,0,6.5).fill(0xaf3b2a);
  g.poly([x,0,x-5,-4,x-2,-6]).fill(0xf0cf82);g.poly([x,0,x+5,-4,x+6,1]).fill(0xf0cf82);g.poly([x,0,x-2,6,x-6,2]).fill(0xf0cf82);
}
function building(objects,labels,x,y,index=0,name=null,player=false,kind='buildings',rival=null,scale=1,court=null){
  let object=citySprite(kind,index);
  if(!object){
    const {width:w,depth:d}=foundation(kind,index),left=iso(0,d),right=iso(w,0),back=iso(0,0),front=iso(w,d),height=48;
    object=new Graphics();
    object.poly([left.x-front.x, left.y-front.y,0,0,0,-height,left.x-front.x,left.y-front.y-height]).fill(0xd5b97d);
    object.poly([0,0,right.x-front.x,right.y-front.y,right.x-front.x,right.y-front.y-height,0,-height]).fill(0xe6d1a1);
    object.poly([left.x-front.x,left.y-front.y-height,back.x-front.x,back.y-front.y-height,right.x-front.x,right.y-front.y-height,0,-height]).fill(0xae4933);
    for(const t of [.3,.7]){const px=(left.x-front.x)*t,py=(left.y-front.y)*t;object.rect(px-3,py-37,6,10).fill(0x45634b);object.rect(px-3,py-18,6,10).fill(0x45634b);}
    object.storeys=2;object.facadeHeight=height;
  }
  object.scale.set(object.scale.x*scale);object.facadeHeight*=scale;
  const p=iso(x,y);place(objects,object,x,y);object.label=rival?'city-competitor':player?'player-restaurant':'city-building';if(rival){object.competitorId=rival.id;object.eventMode='static';object.cursor='pointer';object.on('pointertap',()=>{if(!state.cityGesture?.moved)openCommerce(rival.id);});}object.buildingVariant=index;object.buildingKind=kind;
  if(player){object.eventMode='static';object.cursor='pointer';object.on('pointertap',openRestaurant);}
  if(name){
    const tablePositions=court?[[court.x0+(court.x1-court.x0)*.3,court.y1-.15],[court.x0+(court.x1-court.x0)*.7,court.y1-.15]]:[[x-.55,y+.4],[x+.65,y+.2]];
    for(const [tx,ty]of tablePositions)place(objects,patioTable(),tx,ty);
    const tag=new Container(),text=label(name,rival?10:12,rival?'#fff1ce':'#3a2b1f'),width=Math.ceil(text.width)+36;tag.position.set(p.x,p.y-object.height-(rival?27:11));tag.zIndex=p.y;
    const bg=new Graphics();bg.roundRect(-width/2,-13,width,rival?36:26,4).fill(rival?0x854439:0xf0dfbf).stroke({color:0x745238,width:2});
    bg.poly([-width/2+4,-10,width/2-4,-10]).stroke({color:0xfff1d4,width:1});pizzaBadge(bg,-width/2+13);
    text.anchor.set(0,.5);text.x=-width/2+28;tag.addChild(bg,text);
    if(rival){const caption=label('KONKURRENZ',8,'#ffe0a6');caption.anchor.set(.5);caption.y=12;tag.addChild(caption);tag.label='city-competitor-sign';tag.competitorId=rival.id;tag.eventMode='static';tag.cursor='pointer';tag.hitArea=new Rectangle(-width/2,-14,width,38);tag.on('pointertap',()=>{if(!state.cityGesture?.moved)openCommerce(rival.id);});}
    if(player){state.restaurantSign=tag;state.cityRestaurantSigns['mamma-mia']=tag;tag.label='restaurant-sign';tag.eventMode='static';tag.cursor='pointer';tag.hitArea=new Rectangle(-width/2,-14,width,28);tag.on('pointertap',openRestaurant);}
    labels.addChild(tag);
  }
  return object;
}
function landmarkPark(objects,labels,b,index){
  const garden=state.cityLandmarkGardens.find(g=>g.id===b.id),f=garden.foundation;
  const object=citySprite('landmarks',index)||building(objects,labels,f.x1,f.y1,7);
  const art=BUILDING_ART.landmarks[index];
  if(art.uniform&&object.artId===art.id){
    const [ax,ay,aw,ah]=art.crop,[fx,fy]=art.corners[1];object.anchor.set((fx-ax)/aw,(fy-ay)/ah);
  }
  place(objects,object,f.x1,f.y1);object.label=index?'city-cathedral':'city-colosseum';object.landmarkBlock=b.id;object.landmarkFoundation=f;
  for(const t of garden.trees){const g=tree(t.index,t.scale);g.landmarkBlock=b.id;place(objects,g,t.x,t.y);}
  for(const p of garden.benches){if(state.cityContactPlan.sites.some(s=>s.type==='bench'&&s.blockId===b.id&&Math.hypot(s.x-p.x,s.y-p.y)<.01))continue;const g=bench();g.label='city-park-bench';g.landmarkBlock=b.id;place(objects,g,p.x,p.y);}
  for(const p of garden.lamps){const g=lamp();g.label='city-park-lamp';g.landmarkBlock=b.id;place(objects,g,p.x,p.y);}
}
function propertyBuilding(objects,labels,x,y,site,scale=1){
  const owned=state.ownedProperties.includes(site.id),size=PROPERTY_SIZES[site.size];
  building(objects,labels,x,y,site.sprite,null,false,site.art,null,scale);
  const object=objects.children.at(-1);object.label='city-property';object.propertyId=site.id;
  object.eventMode='static';object.cursor='pointer';object.on('pointertap',()=>{if(!state.cityGesture?.moved)state.ownedProperties.includes(site.id)?openRestaurant(site.id):openProperty(site.id);});
  const marker=new Container(),p=iso(x,y),bg=new Graphics(),text=label('',9,'#fff1ce');
  marker.label='city-property-marker';marker.propertyId=site.id;marker.position.set(p.x,p.y+(owned?-object.height-18:9));marker.roofY=p.y-object.height-18;marker.zIndex=p.y+30;
  bg.roundRect(-43,-9,86,18,3).fill(owned?0x426440:size.color).stroke({color:0xead4a5,width:1});
  text.anchor.set(.5);text.text=(owned?'DEIN':'KAUFEN')+' · '+size.badge;
  marker.addChild(bg,text);marker.eventMode='static';marker.cursor='pointer';marker.hitArea=new Rectangle(-43,-12,86,28);
  marker.on('pointertap',()=>{if(!state.cityGesture?.moved)state.ownedProperties.includes(site.id)?openRestaurant(site.id):openProperty(site.id);});labels.addChild(marker);if(owned)state.cityRestaurantSigns[site.id]=marker;return object;
}
let warehouseTexture=null;
function warehouseBuilding(objects,labels,x,y,site,scale=1){
  const texture=warehouseTexture||(warehouseTexture=Texture.from(warehouseCanvas()));texture.source.scaleMode='nearest';const object=new Sprite(texture);object.anchor.set(76/124,94/98);object.scale.set(scale);place(objects,object,x,y);object.label='city-warehouse';object.storeys=1;object.facadeHeight=32*scale;object.warehouseId=site.id;object.eventMode='static';object.cursor='pointer';object.on('pointertap',()=>{if(!state.cityGesture?.moved)openCommerce(site.id);});
  const p=iso(x,y),tag=new Container(),bg=new Graphics(),text=label('',9,'#fff1ce');tag.label='city-warehouse-marker';tag.warehouseId=site.id;tag.position.set(p.x,p.y-object.height-14);tag.zIndex=p.y+30;text.anchor.set(.5);tag.addChild(bg,text);tag.eventMode='static';tag.cursor='pointer';tag.hitArea=new Rectangle(-54,-12,108,28);tag.on('pointertap',()=>{if(!state.cityGesture?.moved)openCommerce(site.id);});labels.addChild(tag);return object;
}
function refreshPropertyMarkers(){
  if(state.scene!=='city')return;
  const labels=state.camera.children.at(-1);
  for(const marker of labels.children.filter(c=>c.label==='city-warehouse-marker')){const owned=state.procurement.owned.includes(marker.warehouseId);marker.children[0].clear().roundRect(-54,-9,108,18,3).fill(owned?0x426440:0x3d6471).stroke({color:0xead4a5,width:1});marker.children[1].text=owned?'DEIN LAGER':'LAGER · KAUFEN';}
  for(const marker of labels.children.filter(c=>c.label==='city-property-marker')){
    const site=PROPERTIES.find(p=>p.id===marker.propertyId),owned=state.ownedProperties.includes(site.id),size=PROPERTY_SIZES[site.size];
    marker.children[0].clear().roundRect(-43,-9,86,18,3).fill(owned?0x426440:size.color).stroke({color:0xead4a5,width:1});
    marker.children[1].text=(owned?'DEIN':'KAUFEN')+' · '+size.badge;
    if(owned){marker.y=marker.roofY;state.cityRestaurantSigns[site.id]=marker;}
  }
}

function refreshRivalryMarkers(){
  if(state.scene!=='city')return;
  const objects=state.camera.children.find(c=>c.label==='city-objects'),labels=state.camera.children.at(-1);
  for(const g of objects.children.filter(c=>c.competitorId)){const e=state.rivalry.effects[g.competitorId];g.tint=e?.until>state.gameMinutes?0xb7aba2:0xffffff;}
  for(const tag of labels.children.filter(c=>c.label==='city-competitor-sign')){const e=state.rivalry.effects[tag.competitorId];tag.children[2].text=e?.until>state.gameMinutes?'BEEINTRÄCHTIGT':state.rivalry.pending.some(j=>j.target===tag.competitorId)?'AUFTRAG LÄUFT':'KONKURRENZ';}
}

function block(objects,labels,b){
  let {bx,by,x0,x1,y0,y1}=b;const w=x1-x0,h=y1-y0;
  [bx,by]=sourceBlock(bx,by);
  const put=(object,x,y)=>place(objects,object,x0+x,y0+y);
  // The shoreline follows the generated canal on any of the four city edges.
  if(b.landUse==='waterfront'){
    for(let y=.65;y<h-.2;y+=2.2)for(let x=.65;x<w-.2;x+=2.3){
      const gx=x0+x,gy=y0+y;
      if(road(gx,gy,.5)||water(gx,gy)||water(gx-.5,gy)||water(gx+.5,gy)||water(gx,gy-.5)||water(gx,gy+.5))continue;
      put(tree(Math.floor(cityHash(gx,gy,17)*4),.7),x,y);
    }
    return;
  }
  if(b.landUse==='park'||b.landUse==='piazza'){
    const skate=state.cityContactPlan.skatepark?.blockId===b.id;if(skate)drawSkatepark(objects,state.cityContactPlan.skatepark);else put(fountain(),w/2,h/2);
    for(const [x,y]of [[.7,.8],[w-.7,.8],[.7,h-.6],[w-.7,h-.6]])put(tree(Math.floor(cityHash(x0+x,y0+y,18)*4),.8),x,y);
    if(!skate){put(bench(),Math.max(.8,w/2-1.7),h/2+.9);put(bench(),Math.min(w-.8,w/2+1.7),h/2+.9);}
    put(lamp(),w-.1,h-.1);return;
  }
  if(by===0&&(bx===0||bx===1)){landmarkPark(objects,labels,b,bx);return;}
  const size=(kind,index)=>state.cityArt[kind]?.[index]?.groundSize||foundation(kind,index);
  const item=(kind,index,extra={})=>({kind,index,...size(kind,index),...extra});
  const pool=[];
  // Retire the oversized deli and repeated chapel from ordinary street fronts.
  // The perimeter planner fills their space with the remaining residential art.
  for(let index=0;index<(state.cityArt.buildings?.length||32);index++)if(index!==28)pool.push(item('buildings',index));
  for(const index of [0,1,3,4,5,6,7])pool.push(item('buildingTypes',index));
  const rival=COMPETITORS.find(r=>r.bx===bx&&r.by===by);
  const restaurant=bx===1&&by===1?item('buildings',4,{name:'Mamma Mia',player:true}):rival?item('buildings',rival.sprite,{name:rival.name,rival}):null;
  const required=[...(restaurant?[restaurant]:[]),...WAREHOUSES.filter(p=>p.bx===bx&&p.by===by).map(warehouse=>({kind:'warehouse',index:0,width:warehouse.width,depth:warehouse.depth,warehouse})),...PROPERTIES.filter(p=>p.bx===bx&&p.by===by).map(site=>item(site.art,site.sprite,{site}))];
  const plan=closedCityBlock(pool,{...b,seed:(state.citySeed+Math.floor((x0+20)*971+(y0+20)*7919))>>>0,required});
  state.cityBlockPlans.push(plan);
  for(const p of plan.parts){
    const x=p.x1,y=p.y1;
    const object=p.warehouse?warehouseBuilding(objects,labels,x,y,p.warehouse,p.scale):p.site?propertyBuilding(objects,labels,x,y,p.site,p.scale):building(objects,labels,x,y,p.index,p.name,p.player,p.kind,p.rival,p.scale,plan.court);
    object.frontage=p.edge;object.blockKey=b.id;object.groundBounds={x0:p.x0,x1:p.x1,y0:p.y0,y1:p.y1};
  }
  const c=plan.court;put(planter(),(c.x0+c.x1)/2-x0,(c.y0+c.y1)/2-y0);
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
  const gx=Math.max(-6,Math.min(CITY_N+5,(x/(TW/2)+y/(TH/2))/2));
  const gy=Math.max(-6,Math.min(CITY_N+5,(y/(TH/2)-x/(TW/2))/2)),p=iso(gx,gy);
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
  state.cityLandmarkGardens=layout.blocks.filter(b=>b.source===0||b.source===1).map(b=>{
    const index=b.source,art=BUILDING_ART.landmarks[index];
    const size=art.uniform?{width:(art.corners[1][0]-art.corners[0][0])*Math.min(art.worldWidth/art.crop[2],72/art.facadePixels)/32,depth:(art.corners[2][0]-art.corners[1][0])*Math.min(art.worldWidth/art.crop[2],72/art.facadePixels)/32}:foundation('landmarks',index);
    return landmarkGarden(b,index,size);
  });
  state.cityContactPlan=cityContactPlan(layout,state.cityLandmarkGardens);state.citySkaters=[];
  const ground=cityGround({...layout,park,fountainCell,landmarkGardens:state.cityLandmarkGardens},state.citySeed),markings=new Container(),objects=new Container(),labels=new Container();
  ground.label='city-ground';objects.label='city-objects';objects.sortableChildren=true;labels.sortableChildren=true;
  state.camera.addChild(ground,markings,objects,labels);
  state.onRivalryChange=refreshRivalryMarkers;
  state.cityBlockPlans=[];
  bridges(objects);waterfront(objects);
  for(const b of layout.blocks)block(objects,labels,b);
  for(const site of state.cityContactPlan.sites)drawCityContact(objects,labels,site,openCityContact);
  state.onContactFocus=id=>{const site=state.cityContactPlan.sites.find(s=>s.id===id);if(!site)return;const center=viewCenter(),p=iso(site.x,site.y);const zoom=site.type==='skate'?1.05:1.6;state.camera.scale.set(zoom);state.camera.position.set(center.x-p.x*zoom,center.y+20-p.y*zoom);captureView();notify(site.name+' · antippen, um zu sprechen.');};
  for(let i=0;i<40;i++){
    const kind=i<16?'car':'person',link=layout.links[Math.floor(cityHash(i,8)*layout.links.length)];
    const from=i%2?link.a:link.b,to=i%2?link.b:link.a;
    const a=layout.nodes[from],b=layout.nodes[to],length=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
    const actor={kind,from,to,progress:cityHash(i,9)*length,offset:kind==='car'?.16:.67,variant:i,speed:kind==='car'?.43+(i%4)*.065:.095+(i%5)*.011};
    actor.taxiId=kind==='car'?TAXI_DRIVERS.find(d=>d.variant===i)?.id:null;
    advanceStreetActor(actor,layout,0,()=>cityHash(i,10));
    actor.g=kind==='car'?carSprite(i,actor.axis,actor.dir,!!actor.taxiId):personSprite(i%4,actor.axis===0?(actor.dir>0?0:2):(actor.dir>0?1:3));
    if(kind==='person')actor.g.scale.set(.33);actor.g.label=actor.taxiId?'city-taxi':kind==='car'?'city-car':'city-pedestrian';
    if(actor.taxiId){actor.g.taxiId=actor.taxiId;actor.g.eventMode='static';actor.g.cursor='pointer';actor.g.hitArea=new Rectangle(-24,-29,48,40);actor.g.on('pointertap',()=>{if(!state.cityGesture?.moved)openTaxi(actor.taxiId);});}
    objects.addChild(actor.g);state.movers.push(actor);
  }
  state.restaurantSign=state.cityRestaurantSigns[state.activeRestaurantId]||state.cityRestaurantSigns['mamma-mia'];
  state.onPropertyChange=refreshPropertyMarkers;refreshPropertyMarkers();
  refreshRivalryMarkers();resizeCity();bindGestures();tickCity(0);
}

export function randomizeCity(){
  if(state.scene!=='city'||!state.ready)return;
  const entropy=crypto.getRandomValues(new Uint32Array(1))[0];
  state.citySeed=nextCitySeed(state.citySeed,entropy);saveLayout();
  state.scene=null;showCity();notify('Neue Stadtkarte erzeugt.');
}

export function tickCity(dt){
  refreshRivalryMarkers();tickCityLife();
  for(const mover of state.movers){
    const taxiDialog=document.getElementById('taxiDialog');if(mover.taxiId&&taxiDialog?.open&&taxiDialog.dataset.driver===mover.taxiId)continue;
    const previous=mover.axis+':'+mover.dir;
    advanceStreetActor(mover,layout,mover.speed*dt*.035,()=>cityHash(mover.variant,Math.floor(state.gameMinutes*17),mover.to));
    if(previous!==mover.axis+':'+mover.dir){
      const next=mover.kind==='car'?carSprite(mover.variant,mover.axis,mover.dir,!!mover.taxiId):personSprite(mover.variant%4,mover.axis===0?(mover.dir>0?0:2):(mover.dir>0?1:3));
      mover.g.texture=next.texture;next.destroy();
    }
    const p=iso(mover.x,mover.y);
    mover.g.position.set(Math.round(p.x),Math.round(p.y));mover.g.zIndex=p.y;
  }
}
