const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'qa/pizza');fs.mkdirSync(out,{recursive:true});const source=fs.readFileSync('pizza.js','utf8'),core=source.match(/from ['"](.\/pizza-core\.js[^'"]*)['"]/)[1].replace('./','/'),query=core.slice(core.indexOf('?'));
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,data)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({viewport:{width:1280,height:950}}),errors=[];page.setDefaultTimeout(Number(process.env.PIZZA_ACTION_TIMEOUT)||30000);page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});await page.route('**/pizza.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('state.ready=true;','app.ticker.stop();state.speed=0;state.ready=true;')}));
 const {freshRestaurant}=await import(path.join(root,'pizza-restaurant-profiles.js')),p=freshRestaurant('mamma-mia');const save={version:10,items:p.items,kitchenTiles:p.kitchenTiles,restaurants:{'mamma-mia':p},ownedProperties:[],balanceCents:12345678,gameMinutes:720,citySeed:94117,procurement:{owned:['deposito-centro'],costCents:1234,debtCents:0,accrued:.3}};
 await page.addInitScript(save=>{if(!localStorage.getItem('pizza-city-layout-v1'))localStorage.setItem('pizza-city-layout-v1',JSON.stringify(save));},save);await page.goto(`http://127.0.0.1:${server.address().port}/pizza.html`);await page.waitForSelector('#loading',{state:'hidden',timeout:Number(process.env.PIZZA_LOAD_TIMEOUT)||30000});
 await page.addStyleTag({content:'#app{position:fixed!important;inset:0!important;width:100%!important;max-width:none!important;height:100%!important;border-radius:0!important;transform:none!important;margin:0!important}'});await page.waitForTimeout(150);

 const inspect=async(seed)=>page.evaluate(async({core,query,seed})=>{
  const {state,app,iso}=await import(core),city=await import('/pizza-city.js'+query),{tickCityLife}=await import('/pizza-city-life.js'+query);
  if(seed!==undefined){state.citySeed=seed;state.scene=null;city.showCity();}
  const objects=state.camera.children.find(c=>c.label==='city-objects');
  const bad=[];let elevated=0;
  for(let n=0;n<80;n++){
   state.gameMinutes=720+n*2.6/80;tickCityLife();objects.sortChildren();
   for(const {g}of state.citySkaters){const pose=g.ridingPose,p=iso(pose.x,pose.y);if(Math.abs(g.y-Math.round(p.y-pose.z))>.01)bad.push('height');if(pose.z>7)elevated++;if(pose.ramp&&objects.children.some(o=>o.label==='city-skate-ramp'&&o.rampBounds.x0===pose.ramp.x0&&o.zIndex<g.zIndex)===false)bad.push('depth');}
  }
  app.render();const parts=objects.children.filter(o=>o.label==='city-bridge');
  return {bad,elevated,assets:state.assetFailures,bridgeParts:[...new Set(parts.map(o=>o.bridgePart))],lampHeight:Math.max(...objects.children.filter(o=>o.label==='city-bridge-lamp').map(o=>o.height)),contactCaptions:state.cityContactActors.map(a=>a.tag.children[1].text),ground:state.camera.children[0].getLocalBounds()};
 },{core,query,seed});
 for(const seed of [94117,0,1,42,81]){const info=await inspect(seed);assert.deepEqual(info.bad,[]);assert(info.elevated>10);assert.deepEqual(info.assets,[]);for(const part of ['deck','arches','parapet','abutment'])assert(info.bridgeParts.includes(part));assert(info.lampHeight<28);assert(info.contactCaptions.every(s=>s==='...'));}
 await inspect(94117);
 const focus=async(kind,phase=0)=>page.evaluate(async({core,query,kind,phase})=>{
  const {state,app,iso,sceneViewport}=await import(core),{tickCityLife}=await import('/pizza-city-life.js'+query);
  const area=sceneViewport(),center={x:(area.left+area.right)/2,y:(area.top+area.bottom)/2};let x,y;
  if(kind==='skate'){const s=state.cityContactPlan.skatepark;x=(s.x0+s.x1)/2;y=(s.y0+s.y1)/2;state.gameMinutes=720+phase*2.6;}
  else if(kind==='head'){const s=state.cityLayout.canal;x=s.axis===0?s.from:s.center;y=s.axis===0?s.center:s.from;}
  else{const s=state.cityLayout.crossings[1]||state.cityLayout.crossings[0];x=s.axis===0?(s.from+s.to)/2:s.center;y=s.axis===0?s.center:(s.from+s.to)/2;}
  const p=iso(x,y);state.camera.scale.set(2.2);state.camera.position.set(center.x-p.x*2.2,center.y-p.y*2.2);tickCityLife();app.render();
 },{core,query,kind,phase});
 await page.setViewportSize({width:393,height:852});await page.waitForTimeout(100);
 for(const [kind,phase]of [['skate',0],['skate',.5],['bridge',0],['head',0]]){if(kind==='head')await inspect(42);await focus(kind,phase);await page.screenshot({path:path.join(out,'public-'+kind+'-'+phase+'.png')});}
 await inspect(94117);
 // Small markers remain usable through the contact directory at mobile size.
 await page.evaluate(async core=>{const {state,app}=await import(core);state.onContactFocus('skate-crew');app.render();},core);
 await page.evaluate(async({core,query})=>{(await import('/pizza-city-life.js'+query)).tickCityLife();(await import(core)).app.render();},{core,query});
 const marker=await page.evaluate(async core=>{const {state,root}=await import(core),g=state.cityContactActors.find(a=>a.site.id==='skate-crew').tag,b=g.getBounds(),r=root.getBoundingClientRect();return {x:r.left+b.x+b.width/2,y:r.top+b.y+b.height/2,text:g.children[1].text};},core);assert.equal(marker.text,'RAMPENCREW');await page.mouse.click(marker.x,marker.y);await page.waitForSelector('#underworldDialog[open]');await page.click('#underworldClose');
 // Extreme pans remain within the landscaped surround rather than exposing the clear colour.
 for(const [width,height]of [[320,568],[844,390],[1280,900]]){await page.setViewportSize({width,height});await page.waitForTimeout(100);const inside=await page.evaluate(async({core,query})=>{const {state,app,sceneViewport}=await import(core),city=await import('/pizza-city.js'+query);state.camera.position.set(100000,100000);city.zoomCity(.01);const area=sceneViewport(),bounds=state.camera.children[0].getBounds();app.render();return [area.left,area.right].every(x=>[area.top,area.bottom].every(y=>{const px=(x-state.camera.x)/state.camera.scale.x,py=(y-state.camera.y)/state.camera.scale.y,gx=px/64+py/32,gy=py/32-px/64;return gx>=-23.5&&gx<=48.5&&gy>=-23.5&&gy<=48.5;}));},{core,query});assert(inside);}
 assert.deepEqual(errors,[]);console.log('Public space browser passed: five seeds, 800 riding poses, bridge structure, scale, compact clickable markers, canal head and mobile/landscape/desktop scenery.');
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
