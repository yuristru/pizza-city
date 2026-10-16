const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

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
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const source=fs.readFileSync(path.join(root,'pizza.js'),'utf8');await page.route('**/pizza.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('state.ready=true;','app.ticker.stop();state.speed=0;state.ready=true;')}));
 const {restaurantPlan}=await import(path.join(root,'pizza-floorplans.js')),{legacyKitchen}=await import(path.join(root,'pizza-kitchen.js'));
 const fixtures={};for(const id of ['mamma-mia','san-marco','via-roma']){const kitchen=legacyKitchen(restaurantPlan(id));fixtures[id]={business:{cook:id==='mamma-mia'?1:0,waiter:id==='mamma-mia'?1:0},items:[...kitchen.items,{type:'table',x:1,y:5,r:0,seats:2}],kitchenTiles:kitchen.tiles,kitchenVersion:1,floorPlanVersion:1,investmentCents:0};}
 await page.addInitScript(profiles=>{if(!localStorage.getItem('pizza-city-layout-v1')){const p=profiles['san-marco'];localStorage.setItem('pizza-city-layout-v1',JSON.stringify({version:8,items:p.items,kitchenTiles:p.kitchenTiles,balanceCents:10000000,ownedProperties:['san-marco','via-roma'],activeRestaurantId:'san-marco',restaurants:profiles}));localStorage.setItem('pizza-menu-v1',JSON.stringify({version:1,items:[{recipe:{name:'Pizza',sauce:'tomato',toppings:[]},price:850,active:true}]}));}},fixtures);
 const url=`http://127.0.0.1:${server.address().port}/pizza.html`;await loaded(page,url);await page.click('#restaurantBtn');
 const data=()=>page.evaluate(async p=>{const {state}=await import(p);return {staff:JSON.parse(JSON.stringify(state.staff)),profiles:JSON.parse(JSON.stringify(state.restaurants)),balance:state.balance,activeRestaurantId:state.activeRestaurantId};},corePath);
 async function tick(seconds){return page.evaluate(async({p,seconds})=>{const {state,app}=await import(p),{tickService}=await import('/pizza-service-runtime.js'+p.slice(p.indexOf('?'))),{syncServiceGuests,renderServiceUI}=await import('/pizza-service-ui.js'+p.slice(p.indexOf('?')));tickService(seconds);const objects=state.restaurantCamera.children.find(c=>c.label==='restaurant-objects');syncServiceGuests(objects);renderServiceUI();app.render();return objects.children.filter(c=>c.label==='service-worker').map(c=>({employeeId:c.employeeId,facing:c.facing,groupId:c.groupId}));},{p:corePath,seconds});}
 assert.equal((await data()).staff.employees.length,2,'Existing role counts migrate to individual people.');
 await page.click('#staffBtn');assert(await page.locator('#staffDialog').isVisible());assert.equal(await page.locator('[data-candidate]').count(),12);assert.equal(await page.locator('[role="meter"]').count(),36);
 const avatarCount=await page.locator('.staffAvatar').evaluateAll(imgs=>new Set(imgs.map(i=>i.src)).size);assert.equal(avatarCount,12);
 await page.click('[data-staff-role="cook"]');assert.equal(await page.locator('[data-candidate]').count(),6);await page.click('[data-staff-role="all"]');
 const market=(await data()).staff.market,expert=market.filter(p=>p.role==='cook').sort((a,b)=>b.salaryCents-a.salaryCents)[0],novice=market.filter(p=>p.role==='cook').sort((a,b)=>a.salaryCents-b.salaryCents)[0];assert(expert.salaryCents>novice.salaryCents);const originalAvatar=await page.locator(`[data-candidate="${expert.id}"] img`).getAttribute('src');
 await page.selectOption(`[data-hire-restaurant="${expert.id}"]`,'san-marco');await page.click(`[data-hire="${expert.id}"]`);assert.equal((await data()).profiles['san-marco'].business.cook,1);assert.equal(await page.locator('[data-candidate]').count(),12);
 const waiter=(await data()).staff.market.filter(p=>p.role==='waiter').sort((a,b)=>b.salaryCents-a.salaryCents)[0];await page.selectOption(`[data-hire-restaurant="${waiter.id}"]`,'san-marco');await page.click(`[data-hire="${waiter.id}"]`);assert.equal((await data()).staff.employees.length,4);await capture(page,'staff-market-desktop.png');
 await page.click('[data-staff-view="files"]');assert.equal(await page.locator('[data-employee]').count(),4);await page.click('[data-staff-role="cook"]');assert.equal(await page.locator('[data-employee]').count(),2);assert.equal(await page.locator(`[data-employee="${expert.id}"] [role="meter"]`).count(),3);assert.equal(await page.locator(`[data-employee="${expert.id}"] img`).getAttribute('src'),originalAvatar);
 await page.selectOption(`[data-assignment="${expert.id}"]`,'via-roma');let s=await data();assert.equal(s.profiles['san-marco'].business.cook,0);assert.equal(s.profiles['via-roma'].business.cook,1);await capture(page,'staff-files-desktop.png');
 await page.click('[data-staff-view="restaurants"]');assert.equal(await page.locator('#staffRestaurantFilter').count(),0);assert.equal(await page.locator('[data-staff-branch]').count(),3);assert.equal(await page.locator('[data-coverage-role]').count(),12);assert.equal(await page.locator('[data-staff-restaurant]:checked').count(),1);assert(await page.locator('[data-staff-restaurant="san-marco"]').isChecked());
 const coverage=(id,shift,role)=>page.locator(`[data-staff-branch="${id}"] [data-coverage-shift="${shift}"] [data-coverage-role="${role}"]`);
 assert.equal(await coverage('san-marco','lunch','cook').getAttribute('data-assigned'),'false');assert.equal(await coverage('san-marco','lunch','waiter').getAttribute('data-count'),'1');assert.match(await coverage('san-marco','lunch','waiter').getAttribute('aria-label'),/Servicekraft eingeteilt/);assert.equal(await coverage('via-roma','lunch','cook').getAttribute('data-count'),'1');assert.equal(await coverage('via-roma','evening','cook').getAttribute('data-assigned'),'false');
 const beforeSelection=await data();await page.check('[data-staff-restaurant="via-roma"]');assert(await page.locator('#staffDialog').isVisible());assert.equal((await data()).activeRestaurantId,'via-roma');assert.equal(await page.locator('#restaurantSelect').inputValue(),'via-roma');assert.equal((await data()).balance,beforeSelection.balance);assert.deepEqual((await data()).staff,beforeSelection.staff);assert.equal(await page.locator('[data-employee]').count(),1);assert.equal(await page.locator('[data-employee]').getAttribute('data-employee'),expert.id);
 await page.keyboard.press('ArrowUp');assert(await page.locator('[data-staff-restaurant="san-marco"]').isChecked());assert.equal((await data()).activeRestaurantId,'san-marco');assert.equal(await page.locator('[data-staff-restaurant]:checked').count(),1);assert.equal(await page.locator('[data-employee]').count(),1);assert.equal(await page.locator('[data-employee]').getAttribute('data-employee'),waiter.id);await page.locator('label[for="staff-restaurant-mamma-mia"]').click();assert.equal((await data()).activeRestaurantId,'mamma-mia');await page.check('[data-staff-restaurant="san-marco"]');
 await page.click('[data-staff-view="files"]');await page.selectOption(`[data-assignment="${expert.id}"]`,'san-marco');await page.click('#staffClose');
 let busy=false;for(let i=0;i<100;i++){const actors=await tick(.5);if(actors.some(a=>a.employeeId===expert.id&&a.groupId!=null)){busy=true;break;}}assert(busy,'The named employee must execute the cook job in the room.');
 await page.click('#staffBtn');await page.click('[data-staff-view="files"]');await page.selectOption(`[data-assignment="${expert.id}"]`,'via-roma');assert.equal((await data()).staff.employees.find(p=>p.id===expert.id).restaurantId,'san-marco');assert.match(await page.locator('#staffStatus').innerText(),/Bestellung/);
 await page.click('[data-staff-view="restaurants"]');await page.check('[data-staff-restaurant="san-marco"]');await page.click('#staffAcceptGuests');assert.equal((await data()).profiles['san-marco'].business.open,false);await page.click('#staffClose');await tick(120);
 await page.click('#staffBtn');await page.click('[data-staff-view="files"]');await page.selectOption(`[data-assignment="${expert.id}"]`,'');s=await data();assert.equal(s.staff.employees.find(p=>p.id===expert.id).restaurantId,null);const beforeReserve=s.staff.reserveCostCents;await tick(300);assert.equal((await data()).staff.reserveCostCents-beforeReserve,Math.floor(expert.salaryCents/720));
 await page.click('[data-staff-role="all"]');await page.selectOption(`[data-shift-assignment="${waiter.id}"]`,'evening');await page.click('[data-staff-view="restaurants"]');assert.equal(await coverage('san-marco','lunch','waiter').getAttribute('data-assigned'),'false');assert.equal(await coverage('san-marco','evening','waiter').getAttribute('data-count'),'1');await page.click('[data-staff-view="files"]');await page.selectOption(`[data-shift-assignment="${waiter.id}"]`,'lunch');
 const saved=await data();await page.click('#staffClose');await loaded(page,url);await page.click('#restaurantBtn');const reloaded=await data();assert.deepEqual(reloaded.staff,saved.staff);assert.equal(reloaded.balance,saved.balance);assert.equal(reloaded.activeRestaurantId,saved.activeRestaurantId);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pizza-city-layout-v1')).version),12);
 await page.evaluate(async p=>{const {state,ensureRestaurants}=await import(p),{FLOORPLANS}=await import('/pizza-floorplans.js'+p.slice(p.indexOf('?')));state.ownedProperties=Object.keys(FLOORPLANS).filter(id=>id!=='mamma-mia');ensureRestaurants();document.dispatchEvent(new Event('restaurants-changed'));},corePath);
 for(const [width,height]of [[320,568],[393,852],[844,390]]){await page.setViewportSize({width,height});await page.waitForTimeout(100);await page.click('#staffBtn');for(const view of ['market','files','restaurants']){await page.click(`[data-staff-view="${view}"]`);if(view==='files')await page.click('[data-staff-role="all"]');const geometry=await page.locator('#staffDialog').evaluate(e=>{const b=e.getBoundingClientRect();return {x:b.x,right:b.right,width:innerWidth,overflow:e.scrollWidth-e.clientWidth};});assert(geometry.x>=0&&geometry.right<=geometry.width+1&&geometry.overflow<=1,JSON.stringify({width,view,geometry}));assert.equal(await page.locator('[aria-selected="true"][data-staff-view]').count(),1);await capture(page,`staff-${view}-${width}.png`);}await page.click('#staffClose');}
 assert.deepEqual(errors,[]);console.log('Staff browser passed: restaurant radio list and keyboard selection, actual active branch and persistence, both-shift coverage with accessible chef/server icons, live assignment/shift updates, ten branches on mobile, migrated people, skills/avatars, hiring, busy guards, named sprites and exact wages.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
