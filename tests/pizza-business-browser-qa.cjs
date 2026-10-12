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
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:393,height:852}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const source=fs.readFileSync(path.join(root,'pizza.js'),'utf8');await page.route('**/pizza.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('state.ready=true;','app.ticker.stop();state.speed=0;state.ready=true;')}));
 await page.addInitScript(()=>{if(!localStorage.getItem('pizza-city-layout-v1')){const p={items:[],kitchenTiles:[],kitchenVersion:1,floorPlanVersion:1,business:{cook:0,waiter:0},investmentCents:0};localStorage.setItem('pizza-city-layout-v1',JSON.stringify({version:8,items:[],kitchenTiles:[],balanceCents:10000000,ownedProperties:['san-marco'],activeRestaurantId:'san-marco',restaurants:{'san-marco':p,'mamma-mia':p}}));localStorage.setItem('pizza-menu-v1',JSON.stringify({version:1,items:[{recipe:{name:'Pizza',sauce:'tomato',toppings:[]},price:850,active:true}]}));}});
 const url=`http://127.0.0.1:${server.address().port}/pizza.html`;await loaded(page,url);await page.click('#restaurantBtn');
 const data=()=>page.evaluate(async p=>{const {state}=await import(p);return {balance:state.balance,tiles:state.kitchenTiles,items:state.restaurantState,profiles:state.restaurants,history:state.history.length};},corePath);
 async function tick(seconds){await page.evaluate(async({p,seconds})=>{const core=await import(p);const module=await import('/pizza-service-runtime.js'+p.slice(p.indexOf('?')));module.tickService(seconds);const ui=await import('/pizza-service-ui.js'+p.slice(p.indexOf('?')));ui.syncServiceGuests(core.state.restaurantCamera.children.find(c=>c.label==='restaurant-objects'));ui.renderServiceUI();core.app.render();},{p:corePath,seconds});}
 await page.click('[data-category="finish"]');await page.click('[data-finish="kitchen-tiles"]');
 await page.evaluate(async p=>(await import(p)).app.render(),corePath);const start=await nodePoint(page,'floor-2-2'),end=await nodePoint(page,'floor-4-4');await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:15});await page.mouse.up();assert.match(await page.locator('#placementStatus').innerText(),/9 Platten/);await page.click('#placeBtn');let s=await data();assert.equal(s.tiles.length,9);assert.equal(s.history,1);assert.equal(s.balance,99550);await undoEdit(page);assert.equal((await data()).tiles.length,0);assert.equal((await data()).balance,100000);
 // Reapply one area, then furnish and move a paid device with no money change.
 await page.evaluate(async p=>(await import(p)).app.render(),corePath);const a=await nodePoint(page,'floor-2-2'),b=await nodePoint(page,'floor-4-4');await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:12});await page.mouse.up();await page.click('#placeBtn');
 await selectTool(page,'oven');await placeCell(page,2,2);await selectTool(page,'bar');await placeCell(page,3,2);await page.click('[data-category="oven"]');await page.click('[data-tool="fridge"][data-variant="compact"]');await placeCell(page,2,3);
 const before=await data();await page.click('[data-category="select"]');await tapCell(page,2,3);await page.click('#moveBtn');await tapCell(page,2,4);assert(await page.locator('#placeBtn').isEnabled());await page.click('#placeBtn');s=await data();assert.equal(s.balance,before.balance);assert(s.items.some(i=>i.type==='fridge'&&i.y===4));await undoEdit(page);assert((await data()).items.some(i=>i.type==='fridge'&&i.y===3));await page.click('[data-category="select"]');await tapCell(page,2,3);await page.click('#moveBtn');await tapCell(page,2,4);await page.click('#placeBtn');
 await selectTool(page,'table',2);await placeCell(page,6,5);await tick(30);assert.equal((await data()).profiles['san-marco'].service.groups.length,0);assert.match(await page.locator('#restaurantServiceStatus').innerText(),/Koch einstellen/);
 await page.click('#staffBtn');await page.locator('[data-hire][data-role="cook"]').first().click();await page.locator('[data-hire][data-role="waiter"]').first().click();assert.equal((await data()).profiles['san-marco'].business.cook,1);await page.click('#staffClose');
 let worker=false;for(let i=0;i<80;i++){await tick(2);worker=worker||await page.evaluate(async p=>(await import(p)).state.restaurantCamera.children.find(c=>c.label==='restaurant-objects').children.some(c=>c.label==='service-worker'),corePath);}s=await data();assert(worker);assert(s.profiles['san-marco'].service.servedGuests>0);assert(s.profiles['san-marco'].service.operatingCents>0);assert(s.profiles['mamma-mia'].service.propertyCents>0);
 // Check the rendered cook and waiter at turns and stops, including cached sprite reuse.
 const directions=await page.evaluate(async p=>{
  const {state}=await import(p),{syncServiceGuests}=await import('/pizza-service-ui.js'+p.slice(p.indexOf('?')));
  const objects=state.restaurantCamera.children.find(c=>c.label==='restaurant-objects'),saved=state.service.groups;
  const group={id:9000,size:1,table:state.restaurantState.find(i=>i.type==='table'),phase:'waiting',work:{stage:0,started:true,route:[{x:3,y:3},{x:4,y:3},{x:4,y:4},{x:3,y:4},{x:3,y:3}],progress:0}};
  const records=[];state.service.groups=[group];
  for(const stage of [0,3]){
   group.work.stage=stage;
   for(const progress of [.25,.95,1,1.25,2.25,3.25,4]){
    group.work.progress=progress;syncServiceGuests(objects);
    const worker=objects.children.find(c=>c.label==='service-worker'&&c.groupId===9000);
    records.push({stage,progress,facing:worker.facing,art:worker.children[0].texture.source.resource.toDataURL()});
   }
  }
  const worker=objects.children.find(c=>c.label==='service-worker'&&c.groupId===9000),previous=worker.children[0];
  group.work.route=[{x:3,y:3}];group.work.progress=0;syncServiceGuests(objects);
  const idle={facing:worker.facing,reused:worker.children[0]===previous};
  state.service.groups=saved;syncServiceGuests(objects);return {records,idle};
 },corePath);
 for(const stage of [0,3]){const samples=directions.records.filter(r=>r.stage===stage);assert.deepEqual(samples.map(r=>r.facing),[0,0,1,1,2,3,3]);assert.equal(new Set(samples.map(r=>r.art)).size,4,'All four walking directions need distinct staff art.');assert.equal(samples[0].art,samples[1].art);}
 assert.deepEqual(directions.idle,{facing:3,reused:true});
 await page.click('#financeBtn');await page.click('[data-finance-view="lifetime"]');assert.equal(await page.locator('#branchRows tr').count(),2);assert.match(await page.locator('#financeSummary').innerText(),/Ergebnis aller Filialen/);await page.click('#acceptGuests');assert.equal((await data()).profiles['san-marco'].business.open,false);await page.click('#businessClose');await tick(120);assert.equal((await data()).profiles['san-marco'].service.groups.length,0);
 const saved=await data();await loaded(page,url);await page.click('#restaurantBtn');assert.equal((await data()).balance,saved.balance);assert.deepEqual((await data()).profiles['san-marco'].business,saved.profiles['san-marco'].business);assert.equal((await data()).profiles['san-marco'].service.operatingCents,saved.profiles['san-marco'].service.operatingCents);
 for(const [width,height]of [[320,568],[393,852],[844,390]]){await page.setViewportSize({width,height});await page.waitForTimeout(100);await page.click('#financeBtn');const bounds=await page.locator('#businessDialog').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);await capture(page,'business-'+width+'.png');await page.click('#businessClose');}
 // A free legacy appliance must retain its missing purchase-price field when moved.
 await page.evaluate(async p=>{const {state,saveLayout}=await import(p);const item=state.restaurantState.find(i=>i.type==='fridge');delete item.paid;saveLayout();},corePath);
 await page.click('[data-category="select"]');await tapCell(page,2,4);await page.click('#moveBtn');await tapCell(page,3,4);await page.click('#placeBtn');assert.equal((await data()).items.find(i=>i.type==='fridge').paid,undefined);const freeItems=(await data()).items;await loaded(page,url);await page.click('#restaurantBtn');assert.deepEqual((await data()).items,freeItems);
 await page.click('#cityBtn');await page.click('#propertiesBtn');await page.click('[data-property="san-marco"]');assert(await page.locator('#propertyFloorplan').isVisible());await capture(page,'property-floorplan.png');assert.deepEqual(errors,[]);console.log('Business browser passed: area brush, one-step undo, free device moves, hiring, work sprites in all four directions with exact turns and stable stops, background bills, branch comparison, stop/drain, persistence and mobile UI.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
