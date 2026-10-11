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
  const category=type==='table'?'table':type==='oven'?'oven':type==='bar'?'bar':'decor';
  const selector=seats?`[data-seats="${seats}"]`:`[data-tool="${type}"]`;
  if(!await page.locator(selector).first().isVisible()){
    await page.click(`[data-category="${category}"]`);
    if(type==='table')await page.click('[data-quality="wood"]');
  }
  await page.locator(selector).first().click();
}
async function loaded(page,url){await page.goto(url);await page.waitForSelector('#loading',{state:'hidden',timeout:15000});}


(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const {copyLayout}=await import(pathToFileURL(path.join(root,'pizza-layout.js')));
 const {freshService}=await import(pathToFileURL(path.join(root,'pizza-service.js')));
 const source=fs.readFileSync(path.join(root,'pizza.js'),'utf8');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:393,height:852}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=`http://127.0.0.1:${server.address().port}`,url=base+'/pizza.html';
  await page.route('**/pizza.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('state.ready=true;','app.ticker.stop();state.speed=0;state.ready=true;')}));
  await page.addInitScript(saved=>{if(!localStorage.getItem('pizza-city-layout-v1'))localStorage.setItem('pizza-city-layout-v1',JSON.stringify(saved));},{version:5,items:copyLayout(),finishes:{floor:'stone',renovation:0},service:freshService(),ownedProperties:['san-marco','via-roma'],balanceCents:14836000,gameMinutes:690,citySeed:94117});
  await loaded(page,url);await page.click('[data-speed="0"]');await page.click('#restaurantBtn');
  const profiles=()=>page.evaluate(async p=>{const {state,ensureRestaurants}=await import(p);return {id:state.activeRestaurantId,balance:state.balance,profiles:JSON.parse(JSON.stringify(ensureRestaurants()))};},corePath);
  let s=await profiles();assert.equal(s.id,'mamma-mia');assert.equal(s.balance,148360);assert.equal(s.profiles['mamma-mia'].finishes.floor,'stone');assert.equal(s.profiles['mamma-mia'].investmentCents,320000);assert.deepEqual(s.profiles['san-marco'].items,[]);
  assert.equal(await page.locator('#restaurantSelect option').count(),3);
  await page.selectOption('#restaurantSelect','san-marco');await selectTool(page,'plant');await placeCell(page,0,3);const san=await profiles(),cost=148360-san.balance;
  await page.selectOption('#restaurantSelect','via-roma');await selectTool(page,'plant');await placeCell(page,0,3);const via=await profiles();assert.equal(via.profiles['san-marco'].items.length,1);assert.equal(via.profiles['via-roma'].items.length,1);
  await page.selectOption('#restaurantSelect','san-marco');await page.click('#undoBtn');s=await profiles();assert.equal(s.balance,via.balance+cost);assert.equal(s.profiles['san-marco'].items.length,0);assert.equal(s.profiles['via-roma'].items.length,1);
  await page.selectOption('#restaurantSelect','mamma-mia');const beforeReset=await profiles();await page.click('#resetBtn');s=await profiles();assert.equal(s.balance,beforeReset.balance+3200);assert.equal(s.profiles['via-roma'].items.length,1);await page.click('#undoBtn');assert.equal((await profiles()).balance,beforeReset.balance);
  await page.selectOption('#restaurantSelect','san-marco');await page.click('[data-category="finish"]');await page.click('[data-finish="parquet"]');await page.click('#placeBtn');
  await page.selectOption('#restaurantSelect','via-roma');await page.click('[data-category="finish"]');await page.click('[data-finish="stone"]');await page.click('#placeBtn');const floorBefore=await profiles();
  await page.selectOption('#restaurantSelect','san-marco');await selectTool(page,'plant');await placeCell(page,0,3);const otherSpent=await profiles();
  await page.selectOption('#restaurantSelect','via-roma');await page.click('#undoBtn');s=await profiles();assert.equal(s.balance,otherSpent.balance+3200);assert.equal(s.profiles['san-marco'].finishes.floor,'parquet');assert.equal(s.profiles['via-roma'].finishes.floor,'terracotta');
  const beforeReload=await profiles();await loaded(page,url);await page.click('[data-speed="0"]');await page.click('#restaurantBtn');s=await profiles();assert.equal(s.id,'via-roma');assert.equal(s.balance,beforeReload.balance);assert.deepEqual(s.profiles['san-marco'].items,beforeReload.profiles['san-marco'].items);assert.equal(s.profiles['mamma-mia'].finishes.floor,'stone');
  const beforeViaReset=await profiles();await page.click('#resetBtn');s=await profiles();assert.equal(s.balance,beforeViaReset.balance+cost);assert.equal(s.profiles['via-roma'].items.length,0);assert.equal(s.profiles['san-marco'].finishes.floor,'parquet');
  for(const id of ['san-marco','via-roma']){await page.selectOption('#restaurantSelect',id);await selectTool(page,'table',4);await placeCell(page,3,4);}
  await page.evaluate(()=>localStorage.setItem('pizza-menu-v1',JSON.stringify({version:1,items:[{recipe:{name:'Testpizza',sauce:'tomato',toppings:[]},price:850,active:true}]})));
  await loaded(page,url);await page.click('[data-speed="1"]');
  await page.evaluate(async p=>{const {app}=await import(p);for(let i=0;i<600;i++)app.ticker.update(app.ticker.lastTime+50);app.render();},corePath);
  s=await profiles();for(const id of ['mamma-mia','san-marco','via-roma']){assert(s.profiles[id].service.elapsed>=29);assert(id==='mamma-mia'?s.profiles[id].service.groups.length>0:s.profiles[id].service.groups.length===0,'New restaurants need a manually equipped kitchen.');}
  await page.click('[data-speed="0"]');const sanGuests=JSON.stringify(s.profiles['san-marco'].service.groups);
  await page.click('#restaurantBtn');await page.selectOption('#restaurantSelect','san-marco');assert.equal(JSON.stringify((await profiles()).profiles['san-marco'].service.groups),sanGuests);
  await page.screenshot({path:path.join(out,'restaurant-switch-san-marco.png')});
  await page.click('#cityBtn');await page.click('#propertiesBtn');await page.click('[data-property="san-marco"]');assert(await page.locator('#propertyOpen').isVisible());await page.click('#propertyOpen');assert.equal((await profiles()).id,'san-marco');assert.equal((await snapshot(page)).scene,'restaurant');
  await page.click('#cityBtn');
  const ownedPoint=await page.evaluate(async p=>{const {state,app,root}=await import(p),marker=state.camera.children.at(-1).children.find(c=>c.propertyId==='via-roma');state.camera.position.set(196-marker.x*state.camera.scale.x,360-marker.y*state.camera.scale.y);app.render();const b=marker.getBounds(),r=root.getBoundingClientRect();return {x:r.left+b.x+b.width/2,y:r.top+b.y+b.height/2};},corePath);
  await page.mouse.click(ownedPoint.x,ownedPoint.y);assert.equal((await profiles()).id,'via-roma');assert.equal((await snapshot(page)).scene,'restaurant');
  await page.click('#cityBtn');
  await page.evaluate(async p=>{const {state,ensureRestaurants}=await import(p);for(const [i,profile]of Object.values(ensureRestaurants()).entries())profile.service.payments=[{id:777,amount:1000+i*100,time:profile.service.elapsed,position:{x:7,y:9}}];const source=await fetch('/pizza.js').then(r=>r.text()),ui=source.match(/from ['"](.\/pizza-service-ui\.js[^'"]*)['"]/)[1];(await import(ui)).renderServiceUI();},corePath);
  assert.equal(await page.locator('[data-payment-id="777"]:not([hidden])').count(),3,'Same payment IDs in separate restaurants must have separate banners.');
  await page.click('#restaurantBtn');
  await page.evaluate(async p=>{const {app}=await import(p);app.ticker.update(app.ticker.lastTime+50);app.render();},corePath);
  assert.equal(await page.locator('[data-payment-id="777"]:not([hidden])').count(),1);assert(await page.locator('[data-restaurant-id="via-roma"][data-payment-id="777"]').isVisible());
  await page.setViewportSize({width:320,height:568});await page.waitForTimeout(150);assert(await page.locator('#restaurantSelect').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.width>50;}));
  assert.deepEqual(errors,[]);console.log('Restaurant switching passed: v5 migration, independent rooms/finishes/guests, cross-restaurant undo and reset accounting, active selection reload, background service and property open button.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
