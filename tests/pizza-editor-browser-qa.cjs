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
  await page.addInitScript(()=>{if(!localStorage.getItem('pizza-city-layout-v1')){const profile={items:[],kitchenTiles:[],kitchenVersion:1,floorPlanVersion:1,business:{cook:0,waiter:0},investmentCents:0};localStorage.setItem('pizza-city-layout-v1',JSON.stringify({version:8,items:[],kitchenTiles:[],balanceCents:10000000,ownedProperties:['san-marco','via-roma'],activeRestaurantId:'san-marco',restaurants:{'mamma-mia':profile,'san-marco':profile,'via-roma':profile}}));}});
  const url=`http://127.0.0.1:${server.address().port}/pizza.html`;await loaded(page,url);await page.click('#restaurantBtn');
  const data=()=>page.evaluate(async p=>{const {state}=await import(p),editor=await import('/pizza-restaurant.js'+p.slice(p.indexOf('?')));return {items:state.restaurantState,tiles:state.kitchenTiles,balance:state.balance,pending:state.pendingPlacement,selected:editor.editorSelection(),moving:state.moveMode,selecting:state.selectMode,history:state.history.length};},corePath);
  async function select(x,y){await page.click('[data-category="select"]');await tapCell(page,x,y);assert((await data()).selected,'The object should be selectable.');}
  assert.equal(await page.locator('.toolactions,.catalogBreadcrumb,#catalogBack,#catalogPath,#undoBtn,#resetBtn,[data-category="bar"]').count(),0);
  assert.equal(await page.locator('[data-category="select"] svg').count(),1);assert.equal(await page.locator('[data-category="select"]').innerText(),'');
  assert.equal(await page.locator('#placeBtn').isVisible(),false);assert.equal(await page.locator('#catalogOptions').isVisible(),false);
  await page.click('[data-category="oven"]');assert.equal(await page.locator('[data-tool="bar"]').count(),3);
  await page.click('[data-category="finish"]');await page.click('[data-finish="kitchen-tiles"]');
  const start=await nodePoint(page,'floor-2-2'),end=await nodePoint(page,'floor-4-4');await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:12});await page.mouse.up();await page.click('#placeBtn');
  await selectTool(page,'oven');await placeCell(page,2,2);await selectTool(page,'bar');await placeCell(page,3,2);await selectTool(page,'fridge');await placeCell(page,2,4);
  await selectTool(page,'plant');await placeCell(page,0,3);await selectTool(page,'jukebox');await placeCell(page,6,1);await selectTool(page,'arcade');await placeCell(page,7,3);
  await page.click('[data-category="table"]');await page.click('[data-quality="premium"]');await page.click('[data-seats="6"]');await placeCell(page,6,5);
  for(const [type,x,y]of [['oven',2,2],['bar',3,2],['fridge',2,4],['plant',0,3],['jukebox',6,1],['arcade',7,3],['table',6,5]]){
    await select(x,y);assert.equal((await data()).selected.type,type);assert.equal((await data()).pending,null);
    assert.equal(await page.locator('#placementHint #moveBtn').isVisible(),true);assert.equal(await page.locator('#placementHint #deleteBtn').isVisible(),true);assert.equal(await page.locator('#placeBtn').isVisible(),false);
  }
  const cdp=await page.context().newCDPSession(page);await page.click('[data-category="select"]');const touch=await nodePoint(page,'floor-0-3');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x,y:touch.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await data()).selected.type,'plant');assert.equal((await data()).pending,null);
  await select(6,5);
  const beforeTurn=await data();await page.click('#rotateBtn');let s=await data();assert.equal(s.selected.r,1);assert.equal(s.balance,beforeTurn.balance);assert.equal(s.items.length,beforeTurn.items.length);assert.equal(s.history,beforeTurn.history+1);
  await page.click('#moveBtn');await tapCell(page,7,3);assert.equal(await page.locator('#placeBtn').isEnabled(),false);assert.equal((await data()).balance,s.balance);
  await tapCell(page,6,4);assert.equal(await page.locator('#placeBtn').isEnabled(),true,await page.locator('#placementStatus').innerText());await page.click('#cancelBtn');assert.deepEqual((await data()).items,s.items);assert.equal((await data()).moving,false);
  await page.click('#moveBtn');await tapCell(page,6,4);await page.click('#placeBtn');s=await data();assert.equal(s.selected.x,6);assert.equal(s.selected.y,4);assert.equal(s.selected.paid,beforeTurn.selected.paid);assert.equal(s.balance,beforeTurn.balance);assert.equal(s.moving,false);
  await page.click('#deleteBtn');assert.equal((await data()).balance,s.balance+Math.floor(s.selected.paid/2));assert.equal((await data()).selected,null);await undoEdit(page);assert.deepEqual((await data()).items,s.items);assert.equal((await data()).balance,s.balance);
  await select(4,4);s=await data();assert.equal(s.selected.type,'kitchenFloor');assert.equal(await page.locator('#rotateBtn').isEnabled(),false);
  await page.click('#moveBtn');await tapCell(page,5,4);await page.click('#placeBtn');assert.equal((await data()).tiles.length,9);assert.equal((await data()).balance,s.balance);assert.equal((await data()).selected.paid,50);
  await page.click('#deleteBtn');assert.equal((await data()).tiles.length,8);assert.equal((await data()).balance,s.balance+25);await undoEdit(page);assert.equal((await data()).tiles.length,9);
  // A table awaiting clearing remains selectable, with protected edit actions.
  await page.evaluate(async p=>{const {state}=await import(p);state.service.dirtyTables=[{id:901,table:{...state.restaurantState.find(i=>i.type==='table')},size:2}];},corePath);
  await select(6,4);for(const id of ['rotateBtn','moveBtn','deleteBtn'])assert.equal(await page.locator('#'+id).isEnabled(),false);assert.match(await page.locator('#placementStatus').innerText(),/abgeräumt/);
  await select(2,2);assert.equal(await page.locator('#deleteBtn').isEnabled(),false);assert.match(await page.locator('#placementStatus').innerText(),/Teller/);
  await page.evaluate(async p=>{const {state}=await import(p);state.service.dirtyTables=[];state.onEditChange();},corePath);
  await select(0,3);const saved=await data();await page.reload();await page.waitForSelector('#loading',{state:'hidden'});await page.click('#restaurantBtn');assert.deepEqual((await data()).items,saved.items);assert.deepEqual((await data()).tiles,saved.tiles);assert.equal((await data()).balance,saved.balance);assert.equal((await data()).selected,null);
  await select(0,3);await page.selectOption('#restaurantSelect','via-roma');assert.equal((await data()).selected,null);assert.equal(await page.locator('#deleteBtn').isVisible(),false);await page.selectOption('#restaurantSelect','san-marco');
  for(const [width,height]of [[320,568],[393,852],[430,932],[844,390]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(120);await select(6,4);
    const geometry=await page.evaluate(()=>{
      const hint=document.querySelector('#placementHint').getBoundingClientRect(),tools=document.querySelector('#tools').getBoundingClientRect(),nav=document.querySelector('.bottomnav').getBoundingClientRect(),app=document.querySelector('#app').getBoundingClientRect();
      const clipped=[...document.querySelectorAll('#placementHint button,#catalogCategories button')].filter(b=>!b.hidden).filter(b=>{const r=b.getBoundingClientRect();return r.left<app.left||r.right>app.right||r.top<app.top||r.bottom>app.bottom||b.scrollWidth>b.clientWidth+1;}).map(b=>b.id||b.dataset.category);
      return {clipped,overlap:document.querySelector('#app').dataset.compact==='landscape'?hint.bottom>tools.top:hint.bottom>tools.top,navOverlap:tools.bottom>nav.top};
    });assert.deepEqual(geometry.clipped,[],JSON.stringify({width,geometry}));assert.equal(geometry.overlap,false);assert.equal(geometry.navOverlap,false);await capture(page,'editor-select-'+width+'.png');
    await selectTool(page,'table',8);assert.equal(await page.locator('#rotateBtn').isVisible(),true);await capture(page,'editor-buy-'+width+'.png');
  }
  const fixed=await page.evaluate(async p=>{const {state}=await import(p),plans=await import('/pizza-floorplans.js'+p.slice(p.indexOf('?')));return {plans:Object.values(plans.FLOORPLANS).flatMap(p=>p.decor),scene:state.restaurantCamera.children.find(c=>c.label==='restaurant-objects').children.filter(c=>c.label==='fixed-furniture').length};},corePath);
  assert.deepEqual(fixed,{plans:[],scene:0});assert.deepEqual(errors,[]);
  console.log('Editor browser passed: kitchen counters, icon-only selection, every furniture type and kitchen tiles, contextual actions, free rotation/movement, cancellation, refunds/undo, busy guards, persistence, restaurant switching and responsive layouts.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
