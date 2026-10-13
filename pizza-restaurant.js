import {kitchenTileIssue,kitchenReadiness,KITCHEN_TYPES,KITCHEN_TILE_PRICE} from './pizza-kitchen.js?v=20261013b';
import {DEFAULT_PLAN,boundaryEdges,roomCell,withKitchen} from './pizza-floorplans.js?v=20261013b';
import {itemPrice,product,money,ROOM_PRODUCTS,roomProduct,roomPurchaseIssue,defaultFinishes} from './pizza-catalog.js?v=20261013b';
import {app,world,state,Container,Graphics,Rectangle,clearWorld,sceneUI,sceneViewport,rememberEdit,saveLayout,updateMoney,notify,hash,activateRestaurant,captureRestaurant,sealRestaurantEdit,activePlan} from './pizza-core.js?v=20261013b';
import {GRID,kitchenCell as isKitchenCell,passageCell as isPassageCell,project,gridCell,dimensions,occupiedCells,placementIssue as checkPlacement,copyLayout} from './pizza-layout.js?v=20261013b';
import {furnitureSprite} from './pizza-sprites.js?v=20261013b';
import {syncServiceGuests} from './pizza-service-ui.js?v=20261013b';
import {servicePlacementIssue,tableKey,serviceLayoutIssue} from './pizza-service.js?v=20261013b';
import {productionBusy,dirtyTable} from './pizza-production.js?v=20261013b';
import {counterLayoutIssue} from './pizza-business.js?v=20261013b';

const RTW=GRID.width,RTH=GRID.height,WALL_HEIGHT=96;
const TOOL_NAMES={table:'Tisch',fridge:'Kühlschrank',oven:'Ofen',bar:'Tresen',plant:'Pflanze',jukebox:'Musikautomat',arcade:'Spielautomat'};
let plan=DEFAULT_PLAN,ROOM=DEFAULT_PLAN;
const kitchenCell=(x,y)=>isKitchenCell(x,y,plan),passageCell=(x,y)=>isPassageCell(x,y,plan);
const placementIssue=(item,items)=>checkPlacement(item,items,plan);
let roomLayer,roomMask,rearPartitions,objects,preview,hoverCell=null,dragPointer=null;
const view={zoom:1,x:0,y:0},pointers=new Map();
let panMode=false,pinching=false,blockTap=false,movingItem=null,selectedItem=null,selectedTile=null,rebuilding=false,lastSelectionIssue=null,brushStart=null,brushCells=[];
export function clearSelection(){selectedItem=null;selectedTile=null;cancelPlacement();}
export function editorSelection(){return selectedItem?{...selectedItem}:selectedTile?{type:'kitchenFloor',...selectedTile,r:0}:null;}
function furnitureUseIssue(item){
  if(KITCHEN_TYPES.includes(item.type)&&(state.service.groups.some(g=>g.phase!=='paying')||productionBusy(state.service)))return 'Zuerst Gäste bedienen und Teller zum Tresen zurückbringen lassen.';
  if(item.type==='table'&&(dirtyTable(state.service,item)||state.service.groups.some(g=>!['leaving','paying'].includes(g.phase)&&tableKey(g.table)===tableKey(item))))return 'Dieser Tisch ist belegt oder muss zuerst abgeräumt werden.';
  return null;
}
function selectionIssue(){
  if(selectedItem)return furnitureUseIssue(selectedItem);
  if(selectedTile){
    if(state.restaurantState.some(item=>occupiedCells(item).includes(`${selectedTile.x},${selectedTile.y}`)))return 'Zuerst das Gerät auf dieser Küchenplatte entfernen.';
    if(state.service.groups.some(g=>g.phase!=='paying')||productionBusy(state.service))return 'Küchenboden erst nach dem Service verändern.';
    if(counterLayoutIssue(state.restaurantState,withKitchen(plan,state.kitchenTiles.filter(tile=>tile!==selectedTile))))return 'Diese Küchenplatte wird als Arbeitsplatz vor dem Tresen benötigt. Zuerst den Tresen umstellen.';
  }
  return null;
}
function selectObject(item,tile=null){
  cancelPlacement();selectedItem=item;selectedTile=tile;state.rotation=item?.r||0;state.onEditChange?.();
}
function selectAt(x,y){
  const item=state.restaurantState.find(item=>occupiedCells(item).includes(`${x},${y}`));
  selectObject(item||null,item?null:state.kitchenTiles.find(tile=>tile.x===x&&tile.y===y)||null);
}
export function toggleMove(){
  if(!state.selectMode||!editorSelection())return;
  if(state.moveMode){cancelPlacement();state.onEditChange?.();return;}
  const issue=selectionIssue();if(issue){notify(issue);return;}
  movingItem=selectedItem||editorSelection();state.moveMode=true;state.pendingPlacement=null;hoverCell=null;state.onEditChange?.();
}
export function rotateSelection(){
  if(!state.selectMode||state.moveMode){state.rotation=(state.rotation+1)%4;state.onEditChange?.();return;}
  if(!selectedItem)return;
  const busy=selectionIssue();if(busy){notify(busy);return;}
  const item={...selectedItem,r:(selectedItem.r+1)%4},others=state.restaurantState.filter(i=>i!==selectedItem);
  const issue=placementIssue(item,others)||servicePlacementIssue(item,state.service)||serviceLayoutIssue([...others,item],plan);
  if(issue){notify(issue);document.querySelector('#placementStatus').textContent=issue;return;}
  rememberEdit();state.restaurantState=[...others,item];selectedItem=item;state.rotation=item.r;finishEdit('Objekt um 90 Grad gedreht.');
}
function brushTo(cell){
  brushCells=[];for(let y=Math.min(brushStart.y,cell.y);y<=Math.max(brushStart.y,cell.y);y++)for(let x=Math.min(brushStart.x,cell.x);x<=Math.max(brushStart.x,cell.x);x++)if(!state.kitchenTiles.some(t=>t.x===x&&t.y===y))brushCells.push({x,y});
}
function brushIssue(){
 const cells=brushCells.length?brushCells:[state.pendingPlacement||hoverCell];
 for(const c of cells){const issue=kitchenTileIssue(c,state.kitchenTiles,state.restaurantState,plan)||servicePlacementIssue({type:'plant',...c,r:0},state.service);if(issue)return issue;}
 const next={...plan,kitchenKeys:new Set([...plan.kitchenKeys,...cells.map(c=>`${c.x},${c.y}`)])};
 return serviceLayoutIssue(state.restaurantState,next,plan)||(state.balance<cells.length*KITCHEN_TILE_PRICE?'Nicht genügend Geld.':null);
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
  group.label=ghost?'placement-ghost':'placed-furniture';group.position.set(point.x,point.y);group.zIndex=point.y;
  // A table and all of its chairs are a single flat, cached pixel sprite.
  const sprite=furnitureSprite(item.type,item.r,item.seats,item.variant);group.addChild(sprite);
  if(ghost){group.alpha=.65;group.eventMode='none';}
  else if(interactive){
    group.eventMode=state.selectMode&&!state.moveMode&&!panMode?'static':'none';group.cursor='pointer';
    group.on('pointertap',event=>{if(state.selectMode&&!state.moveMode&&!panMode&&!blockTap){event.stopPropagation();selectObject(item);}});
  }else group.eventMode='none';
  objects.addChild(group);return group;
}

function partition(x,y,right,length,height,label='kitchen-partition',layer=objects){
  const start=project(x,y),end=project(x+(right?length:0),y+(right?0:length)),g=new Graphics();
  g.label=label;g.eventMode='none';g.zIndex=Math.max(start.y,end.y)+.1;
  g.poly([start.x,start.y,end.x,end.y,end.x,end.y-height,start.x,start.y-height]).fill(0xdbcaab).stroke({color:0x8b6845,width:1});
  const plinth=Math.min(24,height);g.poly([start.x,start.y,end.x,end.y,end.x,end.y-plinth,start.x,start.y-plinth]).fill(0x865732);
  for(let i=0;i<length;i++){
    const p=project(x+(right?i:0),y+(right?0:i));
    g.moveTo(p.x,p.y).lineTo(p.x,p.y-plinth).stroke({color:0xba8851,width:1});
  }
  g.moveTo(start.x,start.y-height).lineTo(end.x,end.y-height).stroke({color:0xb77b46,width:4});g.wallHeight=height;layer.addChild(g);return g;
}
function kitchenWalls(){
  const k=plan.kitchen;if(k.kind==='island')return;
  for(const side of ['north','west','south','east']){
    const right=side==='north'||side==='south',length=right?k.w:k.h,front=side==='south'||side==='east',layer=front?objects:rearPartitions;
    for(let i=0;i<length;i++){
      const x=right?k.x+i:k.x+(side==='east'?k.w:0),y=right?k.y+(side==='south'?k.h:0):k.y+i;
      const neighbor={x:right?x:x+(side==='west'?-1:0),y:right?y+(side==='north'?-1:0):y};
      if(!roomCell(neighbor.x,neighbor.y,plan))continue;
      const opening=k.door?.side===side&&k.door.offset===i;
      if(!opening){const wall=partition(x-.5,y-.5,right,1,front?12:48,'kitchen-partition',layer);wall.side=side;continue;}
      const a=project(x-.5,y-.5),b=project(x-.5+(right?1:0),y-.5+(right?0:1)),g=new Graphics();
      g.label='kitchen-door';g.eventMode='none';g.zIndex=Math.max(a.y,b.y)+.2;
      const height=front?14:60;g.wallHeight=height;g.side=side;
      for(const p of [a,b])g.moveTo(p.x,p.y).lineTo(p.x,p.y-height).stroke({color:0x875a35,width:3});
      g.moveTo(a.x,a.y-height).lineTo(b.x,b.y-height).stroke({color:0xb17b46,width:4});layer.addChild(g);
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

export function sellSelection(){
  if(!state.selectMode||state.moveMode||!editorSelection())return;
  const issue=selectionIssue();if(issue){notify(issue);return;}
  rememberEdit();const refund=Math.floor((editorSelection().paid||0)/2);state.balance+=refund;
  const floor=!!selectedTile;
  if(floor)state.kitchenTiles=state.kitchenTiles.filter(tile=>tile!==selectedTile);
  else state.restaurantState=state.restaurantState.filter(item=>item!==selectedItem);
  clearSelection();if(floor)rebuildSurfaces();finishEdit((floor?'Küchenplatte':'Objekt')+' verkauft: '+money(refund)+'.');
}

function rebuildSurfaces(){
  if(state.scene!=='restaurant')return;
  const camera={...view},wasPan=panMode,rotation=state.rotation;rebuilding=true;state.scene=null;showRestaurant();rebuilding=false;Object.assign(view,camera);state.rotation=rotation;panMode=wasPan;updateCameraUI();state.onEditChange?.();
}

function buyFinish(){
  const p=roomProduct({type:state.selectedTool,variant:state.selectedVariant}),issue=roomPurchaseIssue(p,state.finishes,state.balance);
  if(issue){notify(issue);return;}
  rememberEdit();state.balance-=p.price;
  if(p.type==='floor')state.finishes.floor=p.id;else state.finishes.renovation=p.level;
  rebuildSurfaces();finishEdit(p.name+' gekauft: '+money(p.price)+'.');
}

export function confirmPlacement(){
  if(state.scene==='restaurant'&&!state.selectMode&&['floor','renovation'].includes(state.selectedTool)){buyFinish();return;}
  if(state.scene!=='restaurant'||state.selectMode&&!state.moveMode||!state.pendingPlacement)return;
  if(!state.selectMode&&state.selectedTool==='kitchenFloor'){
    const issue=brushIssue();if(issue){notify(issue);return;}
    const cells=brushCells.length?brushCells:[state.pendingPlacement];rememberEdit();state.balance-=cells.length*KITCHEN_TILE_PRICE;state.kitchenTiles=[...state.kitchenTiles,...cells.map(c=>({...c,paid:KITCHEN_TILE_PRICE}))];brushCells=[];brushStart=null;rebuildSurfaces();finishEdit(cells.length+' Küchenplatten verlegt.');return;
  }
  if(state.moveMode&&!movingItem)return;
  if(state.moveMode){const busy=selectionIssue();if(busy){notify(busy);return;}}
  if(selectedTile&&state.moveMode){
    const issue=tileMoveIssue(state.pendingPlacement);if(issue){notify(issue);return;}
    rememberEdit();const tile={...selectedTile,...state.pendingPlacement};state.kitchenTiles=state.kitchenTiles.map(t=>t===selectedTile?tile:t);selectedTile=tile;movingItem=null;state.moveMode=false;rebuildSurfaces();finishEdit('Küchenplatte kostenlos verschoben.');return;
  }
  const item=candidate(state.pendingPlacement),others=otherItems(),issue=placementIssue(item,others)||servicePlacementIssue(item,state.service)||serviceLayoutIssue([...others,item],plan);
  if(issue){notify(issue);return;}
  const price=movingItem?0:itemPrice(item);if(state.balance<price){notify('Nicht genügend Geld.');return;}
  rememberEdit();state.balance-=price;if(!movingItem)item.paid=price;else selectedItem=item;state.restaurantState=[...others,item];movingItem=null;state.moveMode=false;finishEdit(item.type==='table'?`${item.seats}er-Tisch mit Stühlen platziert.`:`${TOOL_NAMES[item.type]} platziert.`);
}

export function cancelPlacement(){
  state.pendingPlacement=null;hoverCell=null;dragPointer=null;movingItem=null;state.moveMode=false;brushStart=null;brushCells=[];state.rotation=selectedItem?.r??state.rotation;updatePlacementPreview();resizeRestaurant();
}

function tile(graphics,x,y,color,alpha=1,width=1){
  const p=project(x,y);
  graphics.poly([p.x,p.y-RTH/2,p.x+RTW/2,p.y,p.x,p.y+RTH/2,p.x-RTW/2,p.y]).fill({color,alpha}).stroke({color,width});
}

function tileMoveIssue(cell){
  const remaining=state.kitchenTiles.filter(tile=>tile!==selectedTile),issue=kitchenTileIssue(cell,remaining,state.restaurantState,plan);if(issue)return issue;
  const next=withKitchen(plan,[...remaining,cell]);
  return servicePlacementIssue({type:'plant',...cell,r:0},state.service)||serviceLayoutIssue(state.restaurantState,next);
}

export function updatePlacementPreview(){
  if(state.scene!=='restaurant'||!preview||preview.destroyed)return;
  for(const child of objects.children)if(child.label==='placed-furniture')child.eventMode=state.selectMode&&!state.moveMode&&!panMode?'static':'none';
  preview.removeChildren().forEach(child=>child.destroy({children:true}));
  const menu=document.querySelector('#placementHint'),title=document.querySelector('#placementTitle'),status=document.querySelector('#placementStatus'),buy=document.querySelector('#placeBtn'),cancel=document.querySelector('#cancelBtn'),rotate=document.querySelector('#rotateBtn'),move=document.querySelector('#moveBtn'),sell=document.querySelector('#deleteBtn');
  const selected=editorSelection(),busy=selectionIssue();lastSelectionIssue=busy;
  menu.classList.toggle('selectionMenu',!!(state.selectMode&&selected&&!state.moveMode));
  move.hidden=sell.hidden=!(state.selectMode&&selected&&!state.moveMode);
  move.disabled=sell.disabled=!!busy||panMode;
  move.setAttribute('aria-pressed',String(!!state.moveMode));
  buy.hidden=state.selectMode&&!state.moveMode;buy.textContent=state.moveMode?'Setzen':'Kaufen';
  cancel.hidden=!state.pendingPlacement&&!state.moveMode;
  rotate.textContent='Drehen';rotate.setAttribute('aria-label','Um 90 Grad drehen. Aktuell '+state.rotation*90+' Grad.');
  rotate.hidden=state.selectMode?!selected: ['floor','renovation','kitchenFloor'].includes(state.selectedTool);
  rotate.disabled=rotate.hidden||panMode||!!busy||!!selectedTile;
  if(state.selectMode&&!state.moveMode){
    title.textContent=selected?(selectedTile?'Küchenplatte':selected.type==='table'?selected.seats+'er-Tisch mit Stühlen':product(selected)?.name||TOOL_NAMES[selected.type])+(selectedTile?'':' · '+selected.r*90+'°'):'Objekte auswählen';
    status.textContent=panMode?'Zum Auswählen den Hand-Modus ausschalten.':busy||(selected?'Verkauf: '+money(Math.floor((selected.paid||0)/2))+' · Verschieben kostenlos.':'Auf ein Möbelstück oder eine Küchenplatte tippen.');
    if(selected){const g=new Graphics();for(const key of occupiedCells(selected)){const [x,y]=key.split(',').map(Number);tile(g,x,y,0xf1cc7d,.35,3);}preview.addChild(g);}
    return;
  }
  const finish=roomProduct({type:state.selectedTool,variant:state.selectedVariant});
  if(finish&&finish.type!=='kitchenFloor'&&!state.selectMode){
    const issue=roomPurchaseIssue(finish,state.finishes,state.balance);
    title.textContent=finish.type==='floor'?'Boden: '+finish.name:'Renovierung: '+finish.name;
    status.textContent=money(finish.price)+' · '+(issue||(finish.type==='floor'?'Boden im gesamten Gastraum ersetzen.':'Wände und Holzverkleidung erneuern.'));
    buy.disabled=!!issue||panMode;cancel.hidden=true;return;
  }
  if(state.selectedTool==='kitchenFloor'&&!state.selectMode){
    const cell=state.pendingPlacement||hoverCell,issue=cell?brushIssue():null,check=kitchenReadiness(state.kitchenTiles,state.restaurantState,plan);
    title.textContent='Küchenboden selbst verlegen';
    status.textContent=money((brushCells.length||1)*KITCHEN_TILE_PRICE)+' · '+(brushCells.length||1)+' Platten · '+(issue||check.largest+' zusammenhängend · min. 9, min. 3 breit oder hoch');
    buy.disabled=!state.pendingPlacement||!!issue||panMode;
    if(cell&&!panMode){const g=new Graphics();for(const c of brushCells.length?brushCells:[cell])tile(g,c.x,c.y,issue?0xd96549:0x90bd70,.6,2);preview.addChild(g);}return;
  }
  const cell=state.pendingPlacement||hoverCell,item=cell?candidate(cell):null;
  const issue=busy&&state.moveMode?busy:item?(selectedTile&&state.moveMode?tileMoveIssue(cell):placementIssue(item,otherItems())||servicePlacementIssue(item,state.service)||serviceLayoutIssue([...otherItems(),item],plan)||(state.balance<(movingItem?0:itemPrice(item))?'Nicht genügend Geld.':null)):null;
  title.textContent=state.moveMode?'Objekt verschieben: Ziel wählen':panMode?'Ansicht verschieben':(state.selectedTool==='table'?state.selectedSeats+'er-Tisch mit Stühlen':TOOL_NAMES[state.selectedTool])+' · '+state.rotation*90+'°';
  status.textContent=(state.moveMode?'Kostenlos':money(itemPrice(chosenItem({x:0,y:0}))))+' · '+(panMode?'Zum Einrichten den Hand-Modus ausschalten.':issue||(state.pendingPlacement?'Position gewählt. Oben bestätigen.':state.moveMode?'Auf die neue Position tippen oder ziehen.':KITCHEN_TYPES.includes(state.selectedTool)?(kitchenReadiness(state.kitchenTiles,state.restaurantState,plan).issue||'Auf Küchenplatten platzieren.'):'Auf das Raster tippen oder ziehen.'));
  buy.disabled=!state.pendingPlacement||!!issue||panMode;
  if(!cell||panMode)return;
  const g=new Graphics();for(const key of occupiedCells(item)){const [x,y]=key.split(',').map(Number);tile(g,x,y,issue?0xd96549:0x90bd70,.35,2);}preview.addChild(g);
  if(!selectedTile){const ghost=placed(item,false,true);ghost.tint=issue?0xe49b83:0xffffff;objects.removeChild(ghost);preview.addChild(ghost);}
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
  if(pinching||panMode||state.selectMode&&!state.moveMode||!state.selectMode&&['floor','renovation'].includes(state.selectedTool))return;
  const cell=cellAt(event.global);
  if(dragPointer!==null&&event.pointerId===dragPointer){
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
  document.querySelector('#app').style.setProperty('--editor-menu-height',document.querySelector('#placementHint').offsetHeight+'px');
  document.querySelector('#app').style.setProperty('--editor-tools-height',document.querySelector('#tools').offsetHeight+'px');
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
  if(!rebuilding){selectedItem=null;selectedTile=null;movingItem=null;brushStart=null;brushCells=[];state.selectMode=true;}
  plan=activePlan();ROOM=plan;
  document.dispatchEvent(new Event('restaurants-changed'));saveLayout(true);
  clearWorld();state.scene='restaurant';sceneUI('restaurant');
  roomLayer=new Container();state.restaurantCamera=roomLayer;roomLayer.label='restaurant-room';world.addChild(roomLayer);
  roomMask=new Graphics();roomMask.eventMode='none';world.addChild(roomMask);roomLayer.mask=roomMask;
  view.zoom=1;view.x=0;view.y=0;panMode=false;pinching=false;blockTap=false;pointers.clear();updateCameraUI();
  const wall=new Graphics(),floor=new Container();rearPartitions=new Container();rearPartitions.label='kitchen-back-walls';rearPartitions.sortableChildren=true;objects=new Container();preview=new Container();
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
  // Rear partitions sit behind the contents; front partitions are low cutaways.
  roomLayer.addChild(floor,rearPartitions,objects,preview);
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
    g.label=`floor-${x}-${y}`;g.eventMode='static';g.cursor='pointer';floor.addChild(g);
  }
  kitchenWalls();
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
    if(panMode||state.selectMode&&!state.moveMode||!state.selectMode&&['floor','renovation'].includes(state.selectedTool))return;
    const cell=cellAt(event.global);if(!inRoom(cell))return;
    hoverCell=cell;
    dragPointer=event.pointerId;state.pendingPlacement=cell;if(state.selectedTool==='kitchenFloor'&&!state.selectMode){brushStart=cell;brushTo(cell);}
    updatePlacementPreview();
  });
  app.stage.on('pointertap',event=>{
    if(!state.selectMode||state.moveMode||panMode||blockTap)return;
    const area=sceneViewport(true);if(event.global.x<area.left||event.global.x>area.right||event.global.y<area.top||event.global.y>area.bottom)return;
    const cell=cellAt(event.global);if(inRoom(cell))selectAt(cell.x,cell.y);
  });
  const release=event=>{pointers.delete(event.pointerId);dragPointer=null;if(!pointers.size)pinching=false;};
  app.stage.on('pointerup',release);app.stage.on('pointerupoutside',release);app.stage.on('pointercancel',release);
  app.stage.on('pointerleave',()=>{hoverCell=null;if(!state.pendingPlacement)updatePlacementPreview();});
}

export function tickRestaurant(dt){
  if(objects&&!objects.destroyed)syncServiceGuests(objects);
  if(state.selectMode&&editorSelection()&&selectionIssue()!==lastSelectionIssue){updatePlacementPreview();resizeRestaurant();}
}

export function undoRestaurant(){
  if(!state.history.length)return;
  const edit=state.history.at(-1),refund=edit.refundCents||0;
  if(Math.round(state.balance*100)+refund<0){notify('Für das Rückgängigmachen fehlt Geld.');return;}
  clearSelection();state.history.pop();state.kitchenTiles=edit.kitchenTiles||[];state.restaurantState=edit.items;state.balance=(Math.round(state.balance*100)+refund)/100;state.finishes=edit.finishes;captureRestaurant().investmentCents=edit.investmentCents||0;rebuildSurfaces();finishEdit('Letzte Änderung rückgängig gemacht.');
}

export function resetRestaurant(){
  if(state.service.groups.length||productionBusy(state.service)){notify('Zuerst Gäste bedienen und alle Teller abräumen lassen.');return;}
  clearSelection();
  const initial=state.activeRestaurantId==='mamma-mia'?copyLayout():[],initialBalance=state.balance+captureRestaurant().investmentCents/100;
  if(state.kitchenTiles.length||JSON.stringify(initial)!==JSON.stringify(state.restaurantState)||state.balance!==initialBalance||JSON.stringify(state.finishes)!==JSON.stringify(defaultFinishes())){rememberEdit();state.kitchenTiles=[];state.restaurantState=initial;state.balance=initialBalance;state.finishes=defaultFinishes();rebuildSurfaces();}
  state.rotation=0;state.selectedTool='table';state.selectedSeats=4;state.selectedVariant='wood';state.deleteMode=false;state.selectMode=false;
  finishEdit('Start-Einrichtung wiederhergestellt.');
}
