const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'qa/pizza');fs.mkdirSync(out,{recursive:true});const source=fs.readFileSync('pizza.js','utf8'),core=source.match(/from ['"](.\/pizza-core\.js[^'"]*)['"]/)[1].replace('./','/'),query=core.slice(core.indexOf('?'));
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,data)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({viewport:{width:1280,height:950}}),errors=[];page.setDefaultTimeout(Number(process.env.PIZZA_ACTION_TIMEOUT)||30000);page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});await page.route('**/pizza.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('state.ready=true;','app.ticker.stop();state.speed=0;state.ready=true;')}));
 const {freshRestaurant}=await import(path.join(root,'pizza-restaurant-profiles.js')),p=freshRestaurant('mamma-mia');const save={version:10,items:p.items,kitchenTiles:p.kitchenTiles,restaurants:{'mamma-mia':p},ownedProperties:[],balanceCents:12345678,gameMinutes:720,citySeed:94117,procurement:{owned:['deposito-centro'],costCents:1234,debtCents:0,accrued:.3}};
 await page.addInitScript(save=>{if(!localStorage.getItem('pizza-city-layout-v1'))localStorage.setItem('pizza-city-layout-v1',JSON.stringify(save));},save);await page.goto(`http://127.0.0.1:${server.address().port}/pizza.html`);await page.waitForSelector('#loading',{state:'hidden',timeout:Number(process.env.PIZZA_LOAD_TIMEOUT)||30000});
 await page.addStyleTag({content:'#app{position:fixed!important;inset:0!important;width:100%!important;max-width:none!important;height:100%!important;border-radius:0!important;transform:none!important;margin:0!important}'});await page.waitForTimeout(150);


 // Inspect actual rendered deck pixels, not only the presence of bridge parts.
 for(const axis of [0,1]){
  const result=await page.evaluate(async({core,query,axis})=>{
   const {state,app,world,Container,Graphics,Rectangle,iso}=await import(core),{drawItalianBridge}=await import('/pizza-city-decoration.js'+query);
   state.camera.visible=false;const probe=new Container(),water=new Graphics().rect(-400,-300,800,600).fill(0x397b8d);probe.addChild(water);water.zIndex=-100000;probe.sortableChildren=true;world.addChild(probe);
   const s={axis,from:0,to:3,center:0,width:1.2};drawItalianBridge(probe,s);probe.sortChildren();
   const deck=probe.children.find(c=>c.bridgePart==='deck'),rear=probe.children.find(c=>c.bridgePart==='arches'&&c.bridgeSide===-1),front=probe.children.find(c=>c.bridgePart==='arches'&&c.bridgeSide===1);
   const mid=axis===0?iso(1.5,0):iso(0,1.5);probe.scale.set(3);probe.position.set(app.screen.width/2-mid.x*3,app.screen.height/2-mid.y*3);app.render();
   const data=app.renderer.extract.pixels({target:app.stage,frame:new Rectangle(0,0,app.screen.width,app.screen.height),resolution:1}),bad=[],palette=new Set([0xc5b28e,0xd3c3a2,0xb8a784]);
   for(let t=.2;t<2.9;t+=.13)for(let v=-.51;v<.15;v+=.09){
    const p=axis===0?iso(t,v):iso(v,t),x=Math.round(probe.x+p.x*3),y=Math.round(probe.y+p.y*3),i=(y*data.width+x)*4,c=(data.pixels[i]<<16)|(data.pixels[i+1]<<8)|data.pixels[i+2];if(!palette.has(c))bad.push({t,v,c});
   }
   state.bridgeProbe=probe;return {bad:bad.slice(0,8),order:rear.zIndex<deck.zIndex&&deck.zIndex<front.zIndex};
  },{core,query,axis});
  assert(result.order,'Rear arches must render behind the deck, front arches in front.');assert.deepEqual(result.bad,[],'The riding surface contains only paving, without projected underside wedges.');
  await page.screenshot({path:path.join(out,'bridge-clear-deck-axis-'+axis+'.png')});
  await page.evaluate(async core=>{const {state}=await import(core);state.bridgeProbe.destroy({children:true});state.camera.visible=true;},core);
 }
 assert.deepEqual(errors,[]);console.log('Bridge occlusion passed: both isometric axes, rear/deck/front order and 336 rendered deck samples without masonry intrusions.');
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
