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
  const page=await browser.newPage({viewport:{width:393,height:852}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const source=fs.readFileSync(path.join(root,'pizza.js'),'utf8');await page.route('**/pizza.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('state.ready=true;','app.ticker.stop();state.speed=0;state.ready=true;')}));
  await page.addInitScript(()=>{if(!localStorage.getItem('pizza-city-layout-v1')){const profile={business:{cook:1,waiter:1},items:[],kitchenTiles:[],floorPlanVersion:1,kitchenVersion:1,investmentCents:0};localStorage.setItem('pizza-city-layout-v1',JSON.stringify({version:8,items:[],kitchenTiles:[],balanceCents:10000000,ownedProperties:['san-marco','via-roma'],activeRestaurantId:'san-marco',restaurants:{'mamma-mia':profile,'san-marco':profile,'via-roma':profile}}));localStorage.setItem('pizza-menu-v1',JSON.stringify({version:1,items:[{recipe:{name:'Testpizza',sauce:'tomato',toppings:[]},price:850,active:true}]}));}});
  const url=`http://127.0.0.1:${server.address().port}/pizza.html`;await loaded(page,url);await page.click('#restaurantBtn');await page.click('[data-speed="0"]');
  const data=()=>page.evaluate(async p=>{const {state,activePlan}=await import(p);const k=await import('./pizza-kitchen.js'+p.slice(p.indexOf('?')));return {id:state.activeRestaurantId,balance:state.balance,items:JSON.parse(JSON.stringify(state.restaurantState)),tiles:JSON.parse(JSON.stringify(state.kitchenTiles)),service:JSON.parse(JSON.stringify(state.service)),ready:k.kitchenReadiness(state.kitchenTiles,state.restaurantState,activePlan()).ready};},corePath);
  async function advance(seconds){await page.evaluate(async({p,seconds})=>{const {app}=await import(p);for(let i=0;i<Math.ceil(seconds*20);i++)app.ticker.update(app.ticker.lastTime+50);app.render();},{p:corePath,seconds});}
  async function floor(){await page.click('[data-category="finish"]');await page.click('[data-finish="kitchen-tiles"]');}
  async function device(type,x,y){if(type==='fridge'){await page.click('[data-category="oven"]');await page.click('[data-tool="fridge"][data-variant="compact"]');}else await selectTool(page,type);await placeCell(page,x,y);}
  await selectTool(page,'table',4);await placeCell(page,6,5);await page.click('[data-speed="1"]');await advance(30);assert.equal((await data()).service.groups.length,0);await page.click('[data-speed="0"]');
  await page.click('[data-category="oven"]');await page.locator('[data-kitchen-check]').click();assert(await page.locator('#kitchenDialog').isVisible());assert((await page.locator('#kitchenChecklist').innerText()).includes('Kühlschrank'));await page.click('#kitchenClose');
  await selectTool(page,'oven');await tapCell(page,8,5);assert.equal(await page.locator('#placeBtn').isEnabled(),false);assert.match(await page.locator('#placementStatus').innerText(),/Küchenplatten/);await page.click('#cancelBtn');
  await floor();for(let i=0;i<8;i++)await placeCell(page,2+i%3,2+Math.floor(i/3));assert.equal((await data()).tiles.length,8);assert(!(await data()).ready);
  await placeCell(page,4,4);assert.equal((await data()).tiles.length,9);assert(!(await data()).ready);
  await device('oven',2,2);await device('bar',3,2);assert(!(await data()).ready);await device('fridge',2,4);assert((await data()).ready);
  const operating=await page.evaluate(async p=>Object.values((await import(p)).state.restaurants).reduce((s,r)=>s+(r.service.operatingCents||0),0),corePath);assert.equal(Math.round((await data()).balance*100),10000000-60000-9*5000-90000-65000-80000-operating);
  await undoEdit(page);assert(!(await data()).ready);await device('fridge',2,4);assert((await data()).ready);
  await page.click('[data-category="select"]');const protectedFloor=await data();await tapCell(page,4,2);assert.match(await page.locator('#placementTitle').innerText(),/theke/i);assert.deepEqual((await data()).tiles,protectedFloor.tiles);assert.equal((await data()).balance,protectedFloor.balance);
  await tapCell(page,4,4);await page.click('#deleteBtn');assert.equal((await data()).tiles.length,8);assert(!(await data()).ready);assert.equal((await data()).balance,protectedFloor.balance+25);await undoEdit(page);assert((await data()).ready);assert.equal((await data()).balance,protectedFloor.balance);
  await capture(page,'kitchen-custom-san-marco.png');
  const saved=await data();await loaded(page,url);await page.click('[data-speed="0"]');await page.click('#restaurantBtn');assert.deepEqual((await data()).tiles,saved.tiles);assert.deepEqual((await data()).items,saved.items);assert.equal((await data()).balance,saved.balance);assert((await data()).ready);
  await page.selectOption('#restaurantSelect','via-roma');assert.deepEqual((await data()).tiles,[]);assert(!(await data()).ready);await floor();for(let i=0;i<9;i++)await placeCell(page,10+i%3,2+Math.floor(i/3));await device('oven',10,2);await device('bar',11,2);await device('fridge',12,4);await selectTool(page,'table',4);await placeCell(page,3,4);assert((await data()).ready);await capture(page,'kitchen-custom-via-roma.png');
  await page.selectOption('#restaurantSelect','san-marco');assert.deepEqual((await data()).tiles,saved.tiles);await page.click('[data-speed="1"]');await advance(110);assert((await data()).service.servedGuests>0);assert((await data()).service.groups.length>0);await page.click('[data-speed="0"]');
  await page.click('[data-category="select"]');const busy=await data();await tapCell(page,2,4);assert.equal(await page.locator('#deleteBtn').isEnabled(),false);assert.deepEqual((await data()).items,busy.items);assert((await data()).ready);
  await page.click('#cityBtn');await advance(.02);await page.click('#restaurantBtn');
  for(const [width,height]of [[320,568],[393,852],[844,390]]){await page.setViewportSize({width,height});await page.waitForTimeout(150);await page.click('[data-category="oven"]');await page.locator('[data-kitchen-check]').click();const r=await page.locator('#kitchenDialog').boundingBox();assert(r.x>=0&&r.x+r.width<=width+1);await page.click('#kitchenClose');}
  assert.deepEqual(errors,[]);console.log('Kitchen browser passed: manual plates/devices, complete footprints, minimum floor, closed/open operation, tile/device removal guards, undo/refunds, reload, independent side-room kitchen and responsive checklist.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
