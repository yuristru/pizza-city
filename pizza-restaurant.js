import {kitchenTileIssue,kitchenReadiness,KITCHEN_TYPES,KITCHEN_TILE_PRICE} from './pizza-kitchen.js?v=20261012c';
import {DEFAULT_PLAN,boundaryEdges,roomCell} from './pizza-floorplans.js?v=20261012c';
import {itemPrice,product,money,ROOM_PRODUCTS,roomProduct,roomPurchaseIssue,defaultFinishes} from './pizza-catalog.js?v=20261012c';
import {app,world,state,Container,Graphics,Rectangle,clearWorld,sceneUI,sceneViewport,rememberEdit,saveLayout,updateMoney,notify,hash,activateRestaurant,captureRestaurant,sealRestaurantEdit,activePlan} from './pizza-core.js?v=20261012c';
import {GRID,kitchenCell as isKitchenCell,passageCell as isPassageCell,project,gridCell,dimensions,occupiedCells,placementIssue as checkPlacement,copyLayout} from './pizza-layout.js?v=20261012c';
import {furnitureSprite} from './pizza-sprites.js?v=20261012c';
import {syncServiceGuests} from './pizza-service-ui.js?v=20261012c';
import {servicePlacementIssue,tableKey,serviceLayoutIssue} from './pizza-service.js?v=20261012c';

const RTW=GRID.width,RTH=GRID.height,WALL_HEIGHT=96;
const TOOL_NAMES={table:'Tisch',fridge:'Kühlschrank',oven:'Ofen',bar:'Tresen',plant:'Pflanze',jukebox:'Musikautomat',arcade:'Spielautomat'};
let plan=DEFAULT_PLAN,ROOM=DEFAULT_PLAN;
const kitchenCell=(x,y)=>isKitchenCell(x,y,plan),passageCell=(x,y)=>isPassageCell(x,y,plan);
const placementIssue=(item,items)=>checkPlacement(item,items,plan);
let roomLayer,roomMask,objects,preview,hoverCell=null,dragPointer=null;
const view={zoom:1,x:0,y:0},pointers=new Map();
let panMode=false,pinching=false,blockTap=false,movingItem=null,brushStart=null,brushCells=[];
export function toggleMove(){state.moveMode=!state.moveMode;state.deleteMode=false;cancelPlacement();state.onEditChange?.();}
function brushTo(cell){
  brushCells=[];for(let y=Math.min(brushStart.y,cell.y);y<=Math.max(brushStart.y,cell.y);y++)for(let x=Math.min(brushStart.x,cell.x);x<=Math.max(brushStart.x,cell.x);x++)if(!state.kitchenTiles.some(t=>t.x===x&&t.y===y))brushCells.push({x,y});
}
function brushIssue(){
 const cells=brushCells.length?brushCells:[state.pendingPlacement];
 for(const c of cells){const issue=kitchenTileIssue(c,state.kitchenTiles,state.restaurantState,plan)||servicePlacementIssue({type:'plant',...c,r:0},state.service);if(issue)return issue;}
 const next={...plan,kitchenKeys:new Set([...plan.kitchenKeys,...cells.map(c=>`${c.x},${c.y}`)])};
 return serviceLayoutIssue(state.restaurantState,next)||(state.balance<cells.length*KITCHEN_TILE_PRICE?'Nicht genügend Geld.':null);
}
function candidate(cell){return movingItem?{...movingItem,...cell,r:state.rotation}:chosenItem(cell);}
function otherItems(){return state.restaurantState.filter(item=>item!==movingItem);}
export function restaurantView(){return {...view,panMode};}
export function toggleRestaurantPan(){
  panMode=!panMode;cancelPlacement();updateCameraUI();updatePlacementPreview();
}
function updateCameraUI(){
  const button=document.querySelector('#roomPanBtn');button.classList.toggle('active',panMode);button.setAttribute('aria-pressed',String(panMode));
  document.querySelector('#roomZoomOutBtn').disabled=view.zoom<=1;
  document.querySelector('#roomZoomInBtn').disabled=view.zoom>=2.8;
  document.querySelector('#roomPanBtn').title=panMode?'Ansicht ziehen. Erneut drücken zum Einrichten.':'Ansicht verschieben';
}
export function centerRestaurant(){view.zoom=1;view.x=0;view.y=0;panMode=false;resizeRestaurant();updateCameraUI();updatePlacementPreview();}
export function zoomRestaurant(factor,anchor){
  if(state.scene!=='restaurant')return;
  const area=sceneViewport(true),center={x:(area.left+area.right)/2,y:(area.top+area.bottom)/2};
  anchor=anchor||center;const old=view.zoom,next=Math.max(1,Math.min(2.8,old*factor));
  view.x=(view.x+center.x-anchor.x)*next/old+anchor.x-center.x;
  view.y=(view.y+center.y-anchor.y)*next/old+anchor.y-center.y;
  view.zoom=next;resizeRestaurant();updateCameraUI();
}

function chosenItem(cell){
  const item={type:state.selectedTool,...cell,r:state.rotation,variant:state.selectedVariant};
  if(item.type==='table')item.seats=state.selectedSeats;
  return item;
}

function placed(item,interactive=true,ghost=false){
  const {w,h}=dimensions(item),point=project(item.x+(w-1)/2,item.y+(h-1)/2),group=new Container();
  group.label=interactive?'placed-furniture':'fixed-furniture';group.position.set(point.x,point.y);group.zIndex=point.y;
  // A table and all of its chairs are a single flat, cached pixel sprite.
  const sprite=furnitureSprite(item.type,item.r,item.seats,item.variant);group.addChild(sprite);
  if(ghost){group.alpha=.65;group.eventMode='none';}
  else if(interactive){
    group.eventMode=(state.deleteMode||state.moveMode)&&!panMode?'static':'none';group.cursor='pointer';
    group.on('pointertap',event=>{if((state.deleteMode||state.moveMode)&&!panMode&&!blockTap){event.stopPropagation();if(state.deleteMode)removeAt(item.x,item.y);else selectMove(item);}});
  }else group.eventMode='none';
  objects.addChild(group);return group;
}

function selectMove(item){
 if(KITCHEN_TYPES.includes(item.type)&&state.service.groups.some(g=>g.phase!=='paying')||item.type==='table'&&state.service.groups.some(g=>!['leaving','paying'].includes(g.phase)&&tableKey(g.table)===tableKey(item))){notify('Dieses Möbel wird gerade benutzt. Gäste zuerst auslaufen lassen.');return;}
 movingItem=item;state.selectedTool=item.type;state.selectedVariant=item.variant;state.selectedSeats=item.seats||4;state.rotation=item.r;state.pendingPlacement=null;state.onEditChange?.();
}
function partition(x,y,right,length,height,label='kitchen-partition'){
  const start=project(x,y),end=project(x+(right?length:0),y+(right?0:length)),g=new Graphics();
  g.label=label;g.eventMode='none';g.zIndex=Math.max(start.y,end.y)+.1;
  g.poly([start.x,start.y,end.x,end.y,end.x,end.y-height,start.x,start.y-height]).fill(0xdbcaab).stroke({color:0x8b6845,width:1});
  g.poly([start.x,start.y,end.x,end.y,end.x,end.y-24,start.x,start.y-24]).fill(0x865732);
  for(let i=0;i<length;i++){
    const p=project(x+(right?i:0),y+(right?0:i));
    g.moveTo(p.x,p.y).lineTo(p.x,p.y-24).stroke({color:0xba8851,width:1});
  }
  g.moveTo(start.x,start.y-height).lineTo(end.x,end.y-height).stroke({color:0xb77b46,width:4});objects.addChild(g);return g;
}
function kitchenWalls(){
  const k=plan.kitchen;if(k.kind==='island')return;
  for(const side of ['north','west','south','east']){
    const right=side==='north'||side==='south',length=right?k.w:k.h;
    for(let i=0;i<length;i++){
      const x=right?k.x+i:k.x+(side==='east'?k.w:0),y=right?k.y+(side==='south'?k.h:0):k.y+i;
      const neighbor={x:right?x:x+(side==='west'?-1:0),y:right?y+(side==='north'?-1:0):y};
      if(!roomCell(neighbor.x,neighbor.y,plan))continue;
      const opening=k.kind==='island'?side==='south'&&i===1:k.door?.side===side&&k.door.offset===i;
      if(!opening){partition(x-.5,y-.5,right,1,k.kind==='island'?24:48);continue;}
      if(k.kind==='island')continue;
      const a=project(x-.5,y-.5),b=project(x-.5+(right?1:0),y-.5+(right?0:1)),g=new Graphics();
      g.label='kitchen-door';g.eventMode='none';g.zIndex=Math.max(a.y,b.y)+.2;
      for(const p of [a,b])g.moveTo(p.x,p.y).lineTo(p.x,p.y-60).stroke({color:0x875a35,width:3});
      g.moveTo(a.x,a.y-60).lineTo(b.x,b.y-60).stroke({color:0xb17b46,width:4});objects.addChild(g);
    }
  }
}

function renderFurniture(){
  for(const child of objects.children.slice())if(child.label==='placed-furniture'){objects.removeChild(child);child.destroy({children:true});}
  state.restaurantState.forEach(item=>placed(item));syncServiceGuests(objects);state.onEditChange?.();
}

function finishEdit(message){
  state.pendingPlacement=null;hoverCell=null;dragPointer=null;
  sealRestaurantEdit();
  const saved=saveLayout();updateMoney();renderFurniture();updatePlacementPreview();
  if(saved)notify(message);
}

function removeAt(x,y){
  const index=state.restaurantState.findIndex(item=>occupiedCells(item).includes(`${x},${y}`));
  if(index<0||state.selectedTool==='kitchenFloor'){
    const tileIndex=state.kitchenTiles.findIndex(t=>t.x===x&&t.y===y);
    if(tileIndex<0){notify('Hier steht kein Möbelstück und liegt keine Küchenplatte.');return;}
    if(index>=0){notify('Zuerst das Gerät auf dieser Küchenplatte entfernen.');return;}
    rememberEdit();const refund=Math.floor((state.kitchenTiles[tileIndex].paid||0)/2);state.kitchenTiles=state.kitchenTiles.filter((_,i)=>i!==tileIndex);state.balance+=refund;rebuildSurfaces();finishEdit('Küchenplatte entfernt: '+money(refund)+'.');return;
  }
  const item=state.restaurantState[index];
  if(KITCHEN_TYPES.includes(item.type)&&state.service.groups.some(g=>g.phase!=='paying')){notify('Küchengeräte können entfernt werden, sobald alle Gäste gegangen sind.');return;}
  if(item.type==='table'&&state.service.groups.some(g=>!['leaving','paying'].includes(g.phase)&&tableKey(g.table)===tableKey(item))){notify('Dieser Tisch ist gerade für Gäste reserviert.');return;}
  rememberEdit();const refund=Math.floor((state.restaurantState[index].paid||0)/2);state.restaurantState.splice(index,1);state.balance+=refund;finishEdit('Möbel verkauft: '+money(refund)+'.');
}

function rebuildSurfaces(){
  if(state.scene!=='restaurant')return;
  const camera={...view},wasPan=panMode;state.scene=null;showRestaurant();Object.assign(view,camera);panMode=wasPan;updateCameraUI();resizeRestaurant();
}

function buyFinish(){
  const p=roomProduct({type:state.selectedTool,variant:state.selectedVariant}),issue=roomPurchaseIssue(p,state.finishes,state.balance);
  if(issue){notify(issue);return;}
  rememberEdit();state.balance-=p.price;
  if(p.type==='floor')state.finishes.floor=p.id;else state.finishes.renovation=p.level;
  rebuildSurfaces();finishEdit(p.name+' gekauft: '+money(p.price)+'.');
}

export function confirmPlacement(){
  if(state.scene==='restaurant'&&!state.deleteMode&&!state.moveMode&&['floor','renovation'].includes(state.selectedTool)){buyFinish();return;}
  if(state.scene!=='restaurant'||state.deleteMode||!state.pendingPlacement)return;
  if(state.selectedTool==='kitchenFloor'&&!state.moveMode){
    const issue=brushIssue();if(issue){notify(issue);return;}
    const cells=brushCells.length?brushCells:[state.pendingPlacement];rememberEdit();state.balance-=cells.length*KITCHEN_TILE_PRICE;state.kitchenTiles=[...state.kitchenTiles,...cells.map(c=>({...c,paid:KITCHEN_TILE_PRICE}))];brushCells=[];brushStart=null;rebuildSurfaces();finishEdit(cells.length+' Küchenplatten verlegt.');return;
  }
  if(state.moveMode&&!movingItem)return;
  const item=candidate(state.pendingPlacement),others=otherItems(),issue=placementIssue(item,others)||servicePlacementIssue(item,state.service)||serviceLayoutIssue([...others,item],plan);
  if(issue){notify(issue);return;}
  const price=movingItem?0:itemPrice(item);if(state.balance<price){notify('Nicht genügend Geld.');return;}
  rememberEdit();state.balance-=price;if(!movingItem)item.paid=price;state.restaurantState=[...others,item];movingItem=null;finishEdit(item.type==='table'?`${item.seats}er-Tisch mit Stühlen platziert.`:`${TOOL_NAMES[item.type]} platziert.`);
}

export function cancelPlacement(){
  state.pendingPlacement=null;hoverCell=null;dragPointer=null;movingItem=null;brushStart=null;brushCells=[];updatePlacementPreview();
}

function tile(graphics,x,y,color,alpha=1,width=1){
  const p=project(x,y);
  graphics.poly([p.x,p.y-RTH/2,p.x+RTW/2,p.y,p.x,p.y+RTH/2,p.x-RTW/2,p.y]).fill({color,alpha}).stroke({color,width});
}

function kitchenTilePlacementIssue(cell){
  const issue=kitchenTileIssue(cell,state.kitchenTiles,state.restaurantState,plan);if(issue)return issue;
  const next={...plan,kitchenKeys:new Set([...plan.kitchenKeys,`${cell.x},${cell.y}`])};
  return servicePlacementIssue({type:'plant',...cell,r:0},state.service)||serviceLayoutIssue(state.restaurantState,next)||(state.balance<KITCHEN_TILE_PRICE?'Nicht genügend Geld.':null);
}

export function updatePlacementPreview(){
  if(state.scene!=='restaurant'||!preview||preview.destroyed)return;
  for(const child of objects.children)if(child.label==='placed-furniture')child.eventMode=(state.deleteMode||state.moveMode)&&!panMode?'static':'none';
  preview.removeChildren().forEach(child=>child.destroy({children:true}));
  const finish=roomProduct({type:state.selectedTool,variant:state.selectedVariant});
  if(finish&&finish.type!=='kitchenFloor'&&!state.deleteMode&&!state.moveMode){
    const issue=roomPurchaseIssue(finish,state.finishes,state.balance);
    document.querySelector('#placementTitle').textContent=finish.type==='floor'?'Boden: '+finish.name:'Renovierung: '+finish.name;
    document.querySelector('#placementStatus').textContent=money(finish.price)+' · '+(issue||(finish.type==='floor'?'Boden im gesamten Gastraum ersetzen.':'Wände und Holzverkleidung erneuern.'));
    const button=document.querySelector('#placeBtn');button.hidden=false;button.disabled=!!issue||panMode;
    document.querySelector('#cancelBtn').hidden=true;return;
  }
  if(state.selectedTool==='kitchenFloor'&&!state.deleteMode&&!state.moveMode){
    const cell=state.pendingPlacement||hoverCell,issue=cell?brushIssue():null,check=kitchenReadiness(state.kitchenTiles,state.restaurantState,plan);
    document.querySelector('#placementTitle').textContent='Küchenboden selbst verlegen';
    document.querySelector('#placementStatus').textContent=money((brushCells.length||1)*KITCHEN_TILE_PRICE)+' · '+(brushCells.length||1)+' Platten · '+(issue||check.largest+' zusammenhängend · min. 9, min. 3 breit oder hoch');
    const button=document.querySelector('#placeBtn');button.hidden=false;button.disabled=!state.pendingPlacement||!!issue||panMode;document.querySelector('#cancelBtn').hidden=!state.pendingPlacement;
    if(cell&&!panMode){const g=new Graphics();for(const c of brushCells.length?brushCells:[cell])tile(g,c.x,c.y,issue?0xd96549:0x90bd70,.6,2);preview.addChild(g);}return;
  }
  const cell=state.pendingPlacement||hoverCell,item=cell?candidate(cell):null,issue=item?(placementIssue(item,otherItems())||servicePlacementIssue(item,state.service)||serviceLayoutIssue([...otherItems(),item],plan)||(state.balance<(movingItem?0:itemPrice(item))?'Nicht genügend Geld.':null)):null;
  const title=state.moveMode?(movingItem?'Möbel verschieben: Ziel wählen':'Verschieben: Möbel antippen'):panMode?'Ansicht verschieben':state.deleteMode?'Möbel / Küchenplatten entfernen':`${state.selectedTool==='table'?state.selectedSeats+'er-Tisch mit Stühlen':TOOL_NAMES[state.selectedTool]} · ${state.rotation*90}°`;
  document.querySelector('#placementTitle').textContent=title;
  document.querySelector('#placementStatus').textContent=panMode?'Zum Einrichten den Hand-Modus ausschalten.':state.deleteMode?'Antippen: 50 % des Kaufpreises zurück.':issue||(state.pendingPlacement?'Position gewählt. Mit Setzen bestätigen.':KITCHEN_TYPES.includes(state.selectedTool)?(kitchenReadiness(state.kitchenTiles,state.restaurantState,plan).issue||'Auf Küchenplatten platzieren.'):'Auf das Raster tippen oder ziehen.');
  const button=document.querySelector('#placeBtn');button.hidden=state.deleteMode;button.disabled=!state.pendingPlacement||!!issue;
  document.querySelector('#cancelBtn').hidden=!state.pendingPlacement;
  if(!state.deleteMode&&!panMode)document.querySelector('#placementStatus').textContent=money(movingItem?0:itemPrice(chosenItem({x:0,y:0})))+' · '+document.querySelector('#placementStatus').textContent;
  if(!cell||panMode)return;
  let target=item;
  if(state.deleteMode){target=state.restaurantState.find(value=>occupiedCells(value).includes(`${cell.x},${cell.y}`));if(!target&&kitchenCell(cell.x,cell.y))target={type:'plant',...cell,r:0};if(!target)return;}
  const invalid=state.deleteMode||!!issue,color=invalid?0xd96549:0x90bd70,g=new Graphics();
  for(const key of occupiedCells(target)){const [x,y]=key.split(',').map(Number);tile(g,x,y,color,.35,2);}
  preview.addChild(g);
  if(!state.deleteMode){const ghost=placed(target,false,true);ghost.tint=invalid?0xe49b83:0xffffff;objects.removeChild(ghost);preview.addChild(ghost);}
}

function cellAt(global){return gridCell(roomLayer.toLocal(global));}
function inRoom(cell){return roomCell(cell.x,cell.y,plan);}
function movePointer(event){
  const previous=pointers.get(event.pointerId);
  if(previous){
    if(!pointers.size)blockTap=panMode;
    pointers.set(event.pointerId,{x:event.global.x,y:event.global.y});
    if(pointers.size>=2){
      const [a,b]=[...pointers.values()],old=[...pointers.entries()].map(([id,p])=>id===event.pointerId?previous:p);
      const distance=Math.hypot(a.x-b.x,a.y-b.y),before=Math.hypot(old[0].x-old[1].x,old[0].y-old[1].y);
      const anchor={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      if(before>0)zoomRestaurant(distance/before,anchor);
      view.x+=(a.x+b.x-old[0].x-old[1].x)/2;view.y+=(a.y+b.y-old[0].y-old[1].y)/2;resizeRestaurant();return;
    }
    if(panMode){view.x+=event.global.x-previous.x;view.y+=event.global.y-previous.y;resizeRestaurant();return;}
  }
  if(pinching||panMode||['floor','renovation'].includes(state.selectedTool))return;
  const cell=cellAt(event.global);
  if(dragPointer!==null&&event.pointerId===dragPointer&&!state.deleteMode){
    if(cell.x< -1||cell.y< -1||cell.x>ROOM.w||cell.y>ROOM.h)return;
    if(state.pendingPlacement?.x===cell.x&&state.pendingPlacement?.y===cell.y)return;
    state.pendingPlacement=cell;if(brushStart&&state.selectedTool==='kitchenFloor'&&!state.moveMode)brushTo(cell);updatePlacementPreview();return;
  }
  if(state.pendingPlacement||event.pointerType==='touch')return;
  const next=inRoom(cell)?cell:null;
  if(hoverCell?.x===next?.x&&hoverCell?.y===next?.y)return;
  hoverCell=next;updatePlacementPreview();
}

function wallPanel(layer,x,y,right,width,z0,z1,color,outline=0x65452d){
  const a=project(x,y),b=project(x+(right?width:0),y+(right?0:width)),g=new Graphics();
  g.poly([a.x,a.y-z1,b.x,b.y-z1,b.x,b.y-z0,a.x,a.y-z0]).fill(color).stroke({color:outline,width:1});layer.addChild(g);return g;
}

function wallWindow(layer,x,y,right=true){
  wallPanel(layer,x-.08*(right?1:0),y-.08*(right?0:1),right,1.16,46,83,0x956637);
  wallPanel(layer,x,y,right,1,49,80,0x88a6a0,0xe8cea0);
  for(const offset of [-.28,1.04]){
    const sx=x+(right?offset:0),sy=y+(right?0:offset);
    wallPanel(layer,sx,sy,right,.23,48,81,0x456440);
    for(let z=51;z<80;z+=5)wallPanel(layer,sx,sy,right,.23,z,z+1,0x7e8d52);
  }
  wallPanel(layer,x+(right?.48:0),y+(right?0:.48),right,.045,49,80,0xe9d6af);
  wallPanel(layer,x,y,right,1,39,47,0x7b4d2e);
  const flowers=new Graphics();
  for(let i=0;i<8;i++){
    const p=project(x+(right?i/8:0),y+(right?0:i/8));
    flowers.rect(p.x-2,p.y-47,4,5).fill(0x54713a);
    flowers.rect(p.x-1,p.y-49,2,2).fill(i%2?0xd69a44:0xaf3d2c);
  }
  layer.addChild(flowers);
}

export function resizeRestaurant(){
  if(state.scene!=='restaurant'||!roomLayer||roomLayer.destroyed)return;
  const area=sceneViewport(true),minX=-ROOM.h*RTW/2,maxX=ROOM.w*RTW/2,minY=-RTH/2-WALL_HEIGHT,maxY=(ROOM.w+ROOM.h-1)*RTH/2;
  const fit=Math.min(1.45,area.width/(maxX-minX),area.height/(maxY-minY)),scale=fit*view.zoom;
  const limitX=Math.max(0,((maxX-minX)*scale-area.width)/2),limitY=Math.max(0,((maxY-minY)*scale-area.height)/2);
  view.x=Math.max(-limitX,Math.min(limitX,view.x));view.y=Math.max(-limitY,Math.min(limitY,view.y));
  roomMask.clear().rect(area.left,area.top,area.width,area.height).fill(0xffffff);
  roomLayer.scale.set(scale);
  roomLayer.position.set((area.left+area.right)/2-(minX+maxX)/2*scale+view.x,(area.top+area.bottom)/2-(minY+maxY)/2*scale+view.y);
  app.stage.hitArea=new Rectangle(0,0,app.screen.width,app.screen.height);
}

export function showRestaurant(id){
  id=typeof id==='string'?id:state.activeRestaurantId;
  if(state.scene==='restaurant'&&id===state.activeRestaurantId)return;
  if(!activateRestaurant(id)){notify('Diesen Standort musst du zuerst kaufen.');return;}
  plan=activePlan();ROOM=plan;
  document.dispatchEvent(new Event('restaurants-changed'));saveLayout(true);
  clearWorld();state.scene='restaurant';sceneUI('restaurant');
  roomLayer=new Container();state.restaurantCamera=roomLayer;roomLayer.label='restaurant-room';world.addChild(roomLayer);
  roomMask=new Graphics();roomMask.eventMode='none';world.addChild(roomMask);roomLayer.mask=roomMask;
  view.zoom=1;view.x=0;view.y=0;panMode=false;pinching=false;blockTap=false;pointers.clear();updateCameraUI();
  const wall=new Graphics(),floor=new Container();objects=new Container();preview=new Container();
  objects.label='restaurant-objects';objects.sortableChildren=true;preview.label='placement-preview';preview.eventMode='none';hoverCell=null;dragPointer=null;
  const palette=ROOM_PRODUCTS.find(p=>p.level===state.finishes.renovation)?.colors||[0xcbb28b,0xb59670,0x8a5b3d,0x774b36];
  const edges=boundaryEdges(plan);
  wall.eventMode='none';
  for(const edge of edges){
    if(!['north','west'].includes(edge.side))continue;
    const right=edge.side==='north',x=edge.x-.5,y=edge.y-.5,a=project(x,y),b=project(x+(right?1:0),y+(right?0:1));
    wall.poly([a.x,a.y,b.x,b.y,b.x,b.y-WALL_HEIGHT,a.x,a.y-WALL_HEIGHT]).fill(palette[right?0:1]).stroke({color:0x745038,width:1});
    wall.poly([a.x,a.y-32,b.x,b.y-32,b.x,b.y,a.x,a.y]).fill(palette[right?2:3]);
    wall.moveTo(a.x,a.y-WALL_HEIGHT).lineTo(b.x,b.y-WALL_HEIGHT).stroke({color:0xb16b42,width:2});
    wall.moveTo(a.x,a.y-32).lineTo(b.x,b.y-32).stroke({color:0xbd8950,width:2});
    for(let n=0;n<(state.finishes.renovation?0:10);n++){
      const t=.1+hash(edge.x,n,edge.y+41)*.8,z=37+hash(n,edge.x,91)*48,v=project(x+(right?t:0),y+(right?0:t));
      wall.rect(Math.round(v.x),Math.round(v.y-z),n%3===0?2:1,1).fill({color:n%2?0xe9d2aa:0x997954,alpha:.25});
    }
  }
  roomLayer.addChild(wall);
  for(const edge of edges){
    const right=edge.side==='north';if(!right&&edge.side!=='west')continue;
    const coordinate=right?edge.x:edge.y;
    if(coordinate%4!==2||!edges.some(e=>e.side===edge.side&&e.x===edge.x+(right?1:0)&&e.y===edge.y+(right?0:1)))continue;
    wallWindow(roomLayer,edge.x-.5,edge.y-.5,right);
  }
  roomLayer.addChild(floor,objects,preview);
  floor.label='restaurant-floor';floor.finish=state.finishes.floor;wall.label='restaurant-walls';wall.renovation=state.finishes.renovation;
  const floorColors=ROOM_PRODUCTS.find(p=>p.id===state.finishes.floor).colors;
  for(const {x,y}of plan.cells){
    const p=project(x,y),kitchen=kitchenCell(x,y),entrance=x===plan.entrance.x&&y===plan.entrance.y,g=new Graphics();
    const rug=(x===plan.entrance.x-1&&y===plan.entrance.y)||(x===plan.entrance.x&&y===plan.entrance.y-1);
    const color=rug?0x934a36:entrance?0xd1bc8a:kitchen?((x+y)%2?0x999c91:0xb6b5a5):floorColors[(x+y)%2];
    tile(g,x,y,color);
    // A light, continuous 2:1 grid stays readable underneath the preview.
    g.poly([p.x,p.y-RTH/2,p.x+RTW/2,p.y,p.x,p.y+RTH/2,p.x-RTW/2,p.y]).stroke({color:0xf2d8aa,alpha:.5,width:1});
    if(!kitchen&&state.finishes.floor==='terracotta'){
      const shade=(x*7+y*13)%3===0?0xc48a60:0xad704a;
      g.poly([p.x,p.y-12,p.x+25,p.y,p.x,p.y+12,p.x-25,p.y]).stroke({color:shade,alpha:.4,width:1});
    }
    if(!kitchen&&!rug&&!entrance&&state.finishes.floor==='parquet'){
      for(const offset of [-.25,.25]){const start=project(x-.48,y+offset),end=project(x+.48,y+offset);g.moveTo(start.x,start.y).lineTo(end.x,end.y).stroke({color:0x613e29,alpha:.6,width:1});}
    }
    if(passageCell(x,y))g.poly([p.x,p.y-9,p.x+20,p.y,p.x,p.y+9,p.x-20,p.y]).fill({color:0xd8bd86,alpha:.7});
    if(entrance)g.poly([p.x-9,p.y+1,p.x,p.y-4,p.x+9,p.y+1,p.x+3,p.y+1,p.x+3,p.y+6,p.x-3,p.y+6,p.x-3,p.y+1]).fill(0x776c42);
    if(kitchen)for(const [dx,dy,a,b]of [[-1,0,[p.x-RTW/2,p.y],[p.x,p.y-RTH/2]],[0,-1,[p.x,p.y-RTH/2],[p.x+RTW/2,p.y]],[1,0,[p.x+RTW/2,p.y],[p.x,p.y+RTH/2]],[0,1,[p.x,p.y+RTH/2],[p.x-RTW/2,p.y]]])if(!kitchenCell(x+dx,y+dy))g.moveTo(...a).lineTo(...b).stroke({color:0x4f907a,width:3});
    g.label=`floor-${x}-${y}`;g.eventMode='static';g.cursor='pointer';g.on('pointertap',()=>{if(state.deleteMode&&!panMode&&!blockTap)removeAt(x,y);});floor.addChild(g);
  }
  plan.decor.forEach(item=>placed(item,false));kitchenWalls();
  // Low cutaway edges give the building a facade while leaving the floor visible.
  for(const {x,y,side}of edges){
    if(side==='east')partition(x+.5,y-.5,false,1,9,'outer-cutaway');
    if(side==='south'&&(x!==plan.entrance.x||y!==plan.entrance.y))partition(x-.5,y+.5,true,1,9,'outer-cutaway');
  }
  roomLayer.floorPlanId=plan.id;roomLayer.area=plan.area;
  renderFurniture();resizeRestaurant();updatePlacementPreview();
  app.stage.on('globalpointermove',movePointer);
  app.stage.on('pointerdown',event=>{
    const area=sceneViewport(true);if(event.global.x<area.left||event.global.x>area.right||event.global.y<area.top||event.global.y>area.bottom)return;
    if(!pointers.size)blockTap=panMode;
    pointers.set(event.pointerId,{x:event.global.x,y:event.global.y});
    if(pointers.size>=2){pinching=true;blockTap=true;cancelPlacement();return;}
    if(panMode||['floor','renovation'].includes(state.selectedTool)&&!state.deleteMode)return;
    const cell=cellAt(event.global);if(!inRoom(cell))return;
    hoverCell=cell;
    if(!state.deleteMode){
      if(state.moveMode&&!movingItem){const item=state.restaurantState.find(i=>occupiedCells(i).includes(`${cell.x},${cell.y}`));if(item)selectMove(item);return;}
      dragPointer=event.pointerId;state.pendingPlacement=cell;if(state.selectedTool==='kitchenFloor'&&!state.moveMode){brushStart=cell;brushTo(cell);}
    }
    updatePlacementPreview();
  });
  const release=event=>{pointers.delete(event.pointerId);dragPointer=null;if(!pointers.size)pinching=false;};
  app.stage.on('pointerup',release);app.stage.on('pointerupoutside',release);app.stage.on('pointercancel',release);
  app.stage.on('pointerleave',()=>{hoverCell=null;if(!state.pendingPlacement)updatePlacementPreview();});
}

export function tickRestaurant(dt){
  if(objects&&!objects.destroyed)syncServiceGuests(objects);
}

export function undoRestaurant(){
  if(!state.history.length)return;
  const edit=state.history.at(-1),refund=edit.refundCents||0;
  if(Math.round(state.balance*100)+refund<0){notify('Für das Rückgängigmachen fehlt Geld.');return;}
  state.history.pop();state.kitchenTiles=edit.kitchenTiles||[];state.restaurantState=edit.items;state.balance=(Math.round(state.balance*100)+refund)/100;state.finishes=edit.finishes;captureRestaurant().investmentCents=edit.investmentCents||0;rebuildSurfaces();finishEdit('Letzte Änderung rückgängig gemacht.');
}

export function resetRestaurant(){
  if(state.service.groups.length){notify('Die Einrichtung kann zurückgesetzt werden, sobald alle Gäste gegangen sind.');return;}
  const initial=state.activeRestaurantId==='mamma-mia'?copyLayout():[],initialBalance=state.balance+captureRestaurant().investmentCents/100;
  if(state.kitchenTiles.length||JSON.stringify(initial)!==JSON.stringify(state.restaurantState)||state.balance!==initialBalance||JSON.stringify(state.finishes)!==JSON.stringify(defaultFinishes())){rememberEdit();state.kitchenTiles=[];state.restaurantState=initial;state.balance=initialBalance;state.finishes=defaultFinishes();rebuildSurfaces();}
  state.rotation=0;state.selectedTool='table';state.selectedSeats=4;state.selectedVariant='wood';state.deleteMode=false;
  finishEdit('Start-Einrichtung wiederhergestellt.');
}
