const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const {undoEdit,resetEdit}=require('./pizza-editor-helpers.cjs');

const root=process.cwd(),out=path.join(root,'qa/pizza');fs.mkdirSync(out,{recursive:true});
const corePath=fs.readFileSync(path.join(root,'pizza.js'),'utf8').match(/from ['"](.\/pizza-core\.js[^'"]*)['"]/)[1].replace('./','/');
const modelPath=path.join(root,'pizza-layout.js');
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
    res.end(data);
  });
});

async function snapshot(page){
  return page.evaluate(async modulePath=>{
    const {app,state,world,root}=await import(modulePath);
    return {scene:state.scene,finishes:state.finishes,balance:state.balance,items:state.restaurantState,history:state.history.length,rotation:state.rotation,deleteMode:state.deleteMode,tool:state.selectedTool,seats:state.selectedSeats,pending:state.pendingPlacement,speed:state.speed,minutes:state.gameMinutes,view:state.cityView,assets:state.assetFailures,screen:{width:app.screen.width,height:app.screen.height},size:{width:root.clientWidth,height:root.clientHeight},movers:state.movers.map(m=>({x:m.x,y:m.y,t:m.t,lane:m.lane,axis:m.axis,z:m.g.zIndex,visible:m.g.visible,kind:m.kind})),worldChildren:world.children.length};
  },corePath);
}

async function nodePoint(page,label){
  return page.evaluate(async ({modulePath,label})=>{
    const {world,root}=await import(modulePath),pending=[world];let target;
    while(pending.length){const node=pending.pop();if(node.label===label){target=node;break;}pending.push(...node.children);}
    if(!target) throw new Error('Missing scene object: '+label);
    const bounds=target.getBounds(),base=root.getBoundingClientRect();
    return {x:base.left+bounds.x+bounds.width/2,y:base.top+bounds.y+bounds.height/2};
  },{modulePath:corePath,label});
}
async function tapCell(page,x,y){await page.evaluate(async modulePath=>{const {app}=await import(modulePath);app.render();},corePath);const point=await nodePoint(page,`floor-${x}-${y}`);await page.mouse.click(point.x,point.y);}
async function placeCell(page,x,y){await tapCell(page,x,y);assert.deepEqual((await snapshot(page)).pending,{x,y});assert.equal(await page.locator('#placeBtn').isEnabled(),true,await page.locator('#placementStatus').innerText());await page.click('#placeBtn');}
async function capture(page,name){
  await page.evaluate(async modulePath=>{const {app}=await import(modulePath);app.render();},corePath);
  await page.screenshot({path:path.join(out,name),style:'#toast { visibility: hidden; }'});
}
async function selectTool(page,type,seats){
  const category=type==='table'?'table':['oven','bar','fridge'].includes(type)?'oven':'decor';
  const selector=seats?`[data-seats="${seats}"]`:`[data-tool="${type}"]`;
  if(!await page.locator(selector).first().isVisible()){
    await page.click(`[data-category="${category}"]`);
    if(type==='table')await page.click('[data-quality="wood"]');
  }
  await page.locator(selector).first().click();
}
async function loaded(page,url){await page.goto(url);await page.waitForSelector('#loading',{state:'hidden',timeout:15000});}

(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 try{
  const {restaurantPlan}=await import(path.join(root,'pizza-floorplans.js')),{legacyKitchen}=await import(path.join(root,'pizza-kitchen.js'));
  const profiles={};for(const id of ['mamma-mia','san-marco','via-roma']){const k=legacyKitchen(restaurantPlan(id));profiles[id]={items:[...k.items,{type:'table',x:id==='via-roma'?3:1,y:id==='via-roma'?4:5,seats:2,r:0}],kitchenTiles:k.tiles,kitchenVersion:1,floorPlanVersion:1,business:{cook:1,waiter:1,open:id==='san-marco'},finishes:{floor:'checker',renovation:0}};}
  // The uploaded example has a vertical counter next to the western kitchen wall.
  profiles['mamma-mia'].items=[{type:'bar',x:8,y:1,r:1,variant:'rustic',paid:650},{type:'fridge',x:9,y:1,r:0,variant:'compact',paid:800},{type:'oven',x:11,y:2,r:0,variant:'brick',paid:2400},{type:'arcade',x:6,y:1,r:0},{type:'plant',x:7,y:2,r:0},{type:'table',x:1,y:5,r:0,seats:2}];
  const page=await browser.newPage({viewport:{width:430,height:932}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const source=fs.readFileSync(path.join(root,'pizza.js'),'utf8');await page.route('**/pizza.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('state.ready=true;','app.ticker.stop();state.speed=0;state.ready=true;')}));
  await page.addInitScript(profiles=>{if(!localStorage.getItem('pizza-city-layout-v1')){localStorage.setItem('pizza-city-layout-v1',JSON.stringify({version:10,restaurants:profiles,ownedProperties:['san-marco','via-roma'],activeRestaurantId:'mamma-mia',items:profiles['mamma-mia'].items,kitchenTiles:profiles['mamma-mia'].kitchenTiles,balanceCents:10000000,gameMinutes:690}));localStorage.setItem('pizza-menu-v1',JSON.stringify({version:1,items:[{recipe:{name:'Pizza',sauce:'tomato',toppings:[]},price:850,active:true}]}));}},profiles);
  const url=`http://127.0.0.1:${server.address().port}/pizza.html`;await loaded(page,url);await page.click('#restaurantBtn');
  const data=()=>page.evaluate(async p=>{const {state,activePlan,ensureRestaurants}=await import(p),{kitchenWorkFlow}=await import('/pizza-kitchen.js'+p.slice(p.indexOf('?'))),{editorSelection}=await import('/pizza-restaurant.js'+p.slice(p.indexOf('?')));return {id:state.activeRestaurantId,profiles:structuredClone(ensureRestaurants()),items:state.restaurantState,tiles:state.kitchenTiles,balance:state.balance,minutes:state.gameMinutes,speed:state.speed,pending:state.pendingPlacement,selection:editorSelection(),workers:state.restaurantCamera.children.find(c=>c.label==='restaurant-objects').children.filter(c=>c.label==='service-worker').map(c=>c.employeeId),flow:kitchenWorkFlow(state.kitchenTiles,state.restaurantState,activePlan())};},corePath);
  async function tick(seconds){await page.evaluate(async({p,seconds})=>{const {state,app}=await import(p),{tickService}=await import('/pizza-service-runtime.js'+p.slice(p.indexOf('?'))),{syncServiceGuests,renderServiceUI}=await import('/pizza-service-ui.js'+p.slice(p.indexOf('?')));tickService(seconds);syncServiceGuests(state.restaurantCamera.children.find(c=>c.label==='restaurant-objects'));renderServiceUI();app.render();},{p:corePath,seconds});}
  async function select(x,y){await page.click('[data-category="select"]');await tapCell(page,x,y);}
  async function selectFurniture(item){
   await page.click('[data-category="select"]');
   const point=await page.evaluate(async({p,item})=>{
    const {state,root,app}=await import(p);app.render();const {dimensions,project}=await import('/pizza-layout.js'+p.slice(p.indexOf('?'))),{w,h}=dimensions(item),center=project(item.x+(w-1)/2,item.y+(h-1)/2),objects=state.restaurantCamera.children.find(c=>c.label==='restaurant-objects'),placed=objects.children.filter(c=>c.label==='placed-furniture'),target=placed.find(c=>c.x===center.x&&c.y===center.y),sprite=target.children[0],bounds=sprite.getBounds(),base=root.getBoundingClientRect();
    for(const y of [.25,.4,.6,.15])for(const x of [.5,.35,.65]){const global={x:bounds.x+bounds.width*x,y:bounds.y+bounds.height*y},local=sprite.toLocal(global);if(!sprite.hitArea.contains(local.x,local.y))continue;
     if(placed.some(other=>{if(other===target||other.zIndex<target.zIndex)return false;const s=other.children[0],q=s.toLocal(global);return s.hitArea.contains(q.x,q.y);}))continue;
     return {x:base.left+global.x,y:base.top+global.y};
    }throw new Error('No visible furniture pixel for '+item.type);
   },{p:corePath,item});await page.mouse.click(point.x,point.y);
  }
  async function assertWalls(){
   const walls=await page.evaluate(async p=>{const {state,app}=await import(p);app.render();const room=state.restaurantCamera,back=room.children.find(c=>c.label==='kitchen-back-walls'),objects=room.children.find(c=>c.label==='restaurant-objects');return {rearBeforeContents:room.children.indexOf(back)<room.children.indexOf(objects),back:back.children.map(c=>({side:c.side,height:c.wallHeight})),front:objects.children.filter(c=>c.label==='kitchen-partition'||c.label==='kitchen-door').map(c=>({side:c.side,height:c.wallHeight,boundsHeight:c.getLocalBounds().height}))};},corePath);
   assert(walls.rearBeforeContents);assert(walls.back.every(w=>['north','west'].includes(w.side)));assert(walls.front.every(w=>['south','east'].includes(w.side)&&w.height<=14&&w.boundsHeight<=34),'The wood plinth must respect the cutaway height, too.');
  }
  await assertWalls();await capture(page,'restaurant-counter-wall-fixed.png');assert.equal(await page.locator('.restaurantBadge').count(),0);assert.equal(await page.locator('#restaurantOpenBtn').getAttribute('aria-label'),'Restaurant öffnen');
  await page.selectOption('#restaurantSelect','san-marco');let before=await data();assert(before.flow);
  for(const type of ['oven','fridge'])for(const cell of [before.flow.counter,before.flow.handoff]){
   await selectTool(page,type);await tapCell(page,cell.x,cell.y);assert.equal(await page.locator('#placeBtn').isEnabled(),false);assert.match(await page.locator('#placementStatus').innerText(),/Tresenflächen/);
   await page.evaluate(async p=>(await import('/pizza-restaurant.js'+p.slice(p.indexOf('?')))).confirmPlacement(),corePath);assert.deepEqual((await data()).items,before.items);assert.equal((await data()).balance,before.balance);await page.click('#cancelBtn');
  }
  // Moving an existing appliance cannot bypass the same rule.
  const oven=before.items.find(i=>i.type==='oven');await selectFurniture(oven);assert.equal((await data()).selection.type,'oven');await page.click('#moveBtn');await tapCell(page,before.flow.handoff.x,before.flow.handoff.y);assert.equal(await page.locator('#placeBtn').isEnabled(),false);assert.match(await page.locator('#placementStatus').innerText(),/Tresenflächen/);await page.click('#cancelBtn');assert.deepEqual((await data()).items,before.items);
  const bar=before.items.find(i=>i.type==='bar');await selectFurniture(bar);await page.click('#rotateBtn');assert.deepEqual((await data()).items,before.items,'A rotation into a wall or blocked workplace must leave the counter unchanged.');
  await select(before.flow.handoff.x,before.flow.handoff.y);assert.equal((await data()).selection.type,'kitchenFloor');assert.equal(await page.locator('#deleteBtn').isEnabled(),false);assert.equal(await page.locator('#moveBtn').isEnabled(),false);assert.match(await page.locator('#placementStatus').innerText(),/Arbeitsplatz/);await page.evaluate(async p=>(await import('/pizza-restaurant.js'+p.slice(p.indexOf('?')))).sellSelection(),corePath);assert.deepEqual((await data()).tiles,before.tiles);
  // Closing affects one branch, drains existing service and leaves the clock running.
  await page.click('#restaurantOpenBtn');let s=await data();assert.equal(s.profiles['san-marco'].business.open,false);assert.equal(s.profiles['via-roma'].business.open,false);assert.equal(s.speed,before.speed);assert.equal(await page.locator('#restaurantOpenBtn').getAttribute('aria-label'),'Restaurant öffnen');
  await tick(30);s=await data();assert.equal(s.profiles['san-marco'].service.groups.length,0);assert(s.minutes>before.minutes);assert.equal(s.speed,before.speed);
  await page.click('#restaurantOpenBtn');assert.equal(await page.locator('#restaurantOpenBtn').getAttribute('aria-label'),'Restaurant schließen');
  for(let i=0;i<120;i++){await tick(.5);s=await data();if(s.profiles['san-marco'].service.groups.some(g=>g.phase==='waiting'&&g.work))break;}
  assert(s.profiles['san-marco'].service.groups.length>0);const lastId=s.profiles['san-marco'].service.nextId;await page.click('#restaurantOpenBtn');await tick(180);s=await data();assert.equal(s.profiles['san-marco'].service.nextId,lastId);assert.equal(s.profiles['san-marco'].service.groups.length,0);assert.equal(s.profiles['san-marco'].service.dirtyTables.length,0);assert(s.profiles['san-marco'].service.servedGuests>0);assert.equal(s.workers.length,2,'Closing the branch must not remove on-duty staff.');
  await page.selectOption('#restaurantSelect','via-roma');await assertWalls();await page.click('#restaurantOpenBtn');assert.equal((await data()).profiles['via-roma'].business.open,true);assert.equal((await data()).profiles['san-marco'].business.open,false);
  await page.click('#financeBtn');await page.click('[data-finance-view="lifetime"]');await page.click('#acceptGuests');assert.equal(await page.locator('#restaurantOpenBtn').getAttribute('aria-pressed'),'false');await page.click('#businessClose');
  await page.click('#staffBtn');await page.click('[data-staff-view="restaurants"]');await page.selectOption('#staffRestaurantFilter','via-roma');await page.click('#staffAcceptGuests');assert.equal(await page.locator('#restaurantOpenBtn').getAttribute('aria-pressed'),'true');await page.click('#staffClose');
  const saved=(await data()).profiles;await loaded(page,url);await page.click('#restaurantBtn');s=await data();for(const id of Object.keys(saved))assert.equal(s.profiles[id].business.open,saved[id].business.open);assert.equal(await page.locator('#restaurantOpenBtn').getAttribute('aria-pressed'),'true');
  for(const [width,height]of [[320,568],[393,852],[844,390]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(100);const bounds=await page.locator('#restaurantOpenBtn').boundingBox(),head=await page.locator('#restaurantHead').boundingBox();assert(bounds.x>=head.x&&bounds.x+bounds.width<=head.x+head.width&&bounds.y>=head.y&&bounds.y+bounds.height<=head.y+head.height);
   await capture(page,'restaurant-opening-'+width+'.png');
  }
  assert.deepEqual(errors,[]);console.log('Restaurant access browser passed: uploaded wall case, rear/front cutaways, appliance placement and move guards, atomic invalid rotation, independent opening toggle, running clock, closed arrivals, finished orders/cleanup, finance/staff synchronization, persistence and mobile header.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
