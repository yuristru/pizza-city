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
async function loaded(page,url){
  // Pause before the first frame so running costs cannot alter save/reload assertions.
  const source=fs.readFileSync(path.join(root,'pizza.js'),'utf8');
  await page.route('**/pizza.js?*',route=>route.fulfill({contentType:'text/javascript',body:source.replace('state.ready=true;','state.speed=0;state.ready=true;')}));
  await page.goto(url);await page.waitForSelector('#loading',{state:'hidden',timeout:15000});
}


(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const {PROPERTIES}=await import(pathToFileURL(path.join(root,'pizza-properties.js')));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(owned=>{if(!localStorage.getItem('pizza-city-layout-v1'))localStorage.setItem('pizza-city-layout-v1',JSON.stringify({version:6,items:[],ownedProperties:owned,balanceCents:50000000,service:null,finishes:{floor:'terracotta',renovation:0},restaurants:{}}));},PROPERTIES.map(p=>p.id));
  await loaded(page,`http://127.0.0.1:${server.address().port}/pizza.html`);await page.click('[data-speed="0"]');await page.click('#restaurantBtn');
  for(const id of ['mamma-mia',...PROPERTIES.map(p=>p.id)]){
   await page.selectOption('#restaurantSelect',id);
   const geometry=await page.evaluate(async p=>{const {world,state,app,sceneViewport}=await import(p);app.render();const room=world.children[0],floor=room.children.find(c=>c.label==='restaurant-floor'),objects=room.children.find(c=>c.label==='restaurant-objects');const area=sceneViewport(true),b=room.getBounds();return {id:room.floorPlanId,area:room.area,cells:floor.children.length,doors:objects.children.filter(c=>c.label==='kitchen-door').length,b:{x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height},viewport:area};},corePath);
   assert.equal(geometry.id,id);assert.equal(geometry.cells,geometry.area);assert.equal(geometry.doors,['san-marco','palazzo-sole'].includes(id)?0:1);
   assert(geometry.b.x>=geometry.viewport.left-2&&geometry.b.right<=geometry.viewport.right+2&&geometry.b.y>=geometry.viewport.top-2&&geometry.b.bottom<=geometry.viewport.bottom+2,JSON.stringify(geometry));
   await capture(page,'floorplan-'+id+'.png');
  }
  for(const id of ['san-marco','via-roma','palazzo-sole','teatro']){
   await page.setViewportSize({width:393,height:852});await page.selectOption('#restaurantSelect',id);await selectTool(page,'table',4);
   await placeCell(page,2,4);await page.click('#undoBtn');await capture(page,'floorplan-mobile-'+id+'.png');
  }
  await page.selectOption('#restaurantSelect','teatro');await selectTool(page,'plant');await placeCell(page,13,12);const largeSaved=await snapshot(page);await page.reload();await page.waitForSelector('#loading',{state:'hidden'});await page.click('[data-speed="0"]');await page.click('#restaurantBtn');assert.deepEqual((await snapshot(page)).items,largeSaved.items);assert.equal((await snapshot(page)).balance,largeSaved.balance);
  await page.selectOption('#restaurantSelect','san-marco');await selectTool(page,'plant');await tapCell(page,5,2);assert.equal(await page.locator('#placeBtn').isEnabled(),true);await page.click('#cancelBtn');
  await page.click('#cityBtn');await page.click('#propertiesBtn');await page.click('[data-property="san-marco"]');assert((await page.locator('#propertyInfo').innerText()).includes('80 m²'));assert((await page.locator('#propertyDescription').innerText()).includes('Küchenboden'));await page.click('#propertyOpen');
  const before=await snapshot(page);await page.reload();await page.waitForSelector('#loading',{state:'hidden'});await page.click('[data-speed="0"]');await page.click('#restaurantBtn');const after=await snapshot(page);assert.equal(after.balance,before.balance);assert.equal(await page.locator('#restaurantSelect').inputValue(),'san-marco');
  const layoutModel=await import(pathToFileURL(path.join(root,'pizza-layout.js'))),catalog=await import(pathToFileURL(path.join(root,'pizza-catalog.js'))),plans=await import(pathToFileURL(path.join(root,'pizza-floorplans.js'))),profiles=await import(pathToFileURL(path.join(root,'pizza-restaurant-profiles.js')));
  const dense=[];for(const {x,y}of plans.DEFAULT_PLAN.cells){const item={type:'plant',x,y,r:0};item.paid=catalog.itemPrice(item);if(!layoutModel.placementIssue(item,dense))dense.push(item);}
  const oldProfile={items:dense,investmentCents:dense.reduce((sum,item)=>sum+item.paid*100,0)},expectedRefund=profiles.restoreRestaurants({'san-marco':oldProfile},['san-marco'],null)['san-marco'].migrationRefundCents;
  const migrationPage=await browser.newPage({viewport:{width:393,height:852}});
  await migrationPage.addInitScript(profile=>{if(!localStorage.getItem('pizza-city-layout-v1'))localStorage.setItem('pizza-city-layout-v1',JSON.stringify({version:6,items:[],balanceCents:10000000,ownedProperties:['san-marco'],restaurants:{'san-marco':profile}}));},oldProfile);
  await loaded(migrationPage,`http://127.0.0.1:${server.address().port}/pizza.html`);await migrationPage.click('[data-speed="0"]');await migrationPage.click('#restaurantBtn');assert.equal((await snapshot(migrationPage)).balance,100000+expectedRefund/100);
  await migrationPage.reload();await migrationPage.waitForSelector('#loading',{state:'hidden'});await migrationPage.click('[data-speed="0"]');assert.equal((await snapshot(migrationPage)).balance,100000+expectedRefund/100);await migrationPage.close();
  assert.deepEqual(errors,[]);console.log('Floor plan browser passed: all ten shapes, exact tile counts, kitchen doors/islands, camera fit, real mobile placement, property area and saved reload.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
