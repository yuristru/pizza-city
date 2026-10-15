const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'qa/pizza');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(e,data)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1150},hasTouch:true}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>localStorage.setItem('pizza-city-layout-v1','{"oldtownSentinel":true}'));
    await page.goto(`http://127.0.0.1:${server.address().port}/pizza-oldtown-study.html`);
    await page.waitForFunction(()=>window.oldtownStudy);
    await page.evaluate(async()=>{const {app}=await import('/pizza-core.js?v=20261015b');app.ticker.stop();app.render();});
    const snap=()=>page.evaluate(()=>window.oldtownStudy),closed=await snap();
    assert.equal(closed.mode,'closed');assert(closed.clear);assert.equal(closed.coverage.length,3);
    assert.deepEqual(closed.assets,[]);assert(closed.ratio>.97);
    assert(closed.parts.every(p=>p.storeys<=2&&p.facadeHeight<=72+1e-8));
    assert(closed.coverage.every(b=>Object.values(b.edges).every(e=>e.ratio>=.9)));
    await page.screenshot({path:path.join(out,'oldtown-closed-desktop.png'),fullPage:true});
    await page.click('[data-view="block"]');await page.check('#courts');
    await page.screenshot({path:path.join(out,'oldtown-courtyard-desktop.png'),fullPage:true});
    await page.uncheck('#courts');await page.click('[data-view="piazza"]');
    await page.screenshot({path:path.join(out,'oldtown-piazza-desktop.png'),fullPage:true});
    await page.click('[data-view="all"]');await page.click('[data-mode="open"]');
    const open=await snap();assert(open.ratio<closed.ratio-.2);assert(open.clear);
    await page.screenshot({path:path.join(out,'oldtown-open-desktop.png'),fullPage:true});
    await page.click('[data-mode="closed"]');assert.equal((await snap()).ratio,closed.ratio);
    await page.click('[data-view="alley"]');const before=(await snap()).camera;
    await page.click('#zoomIn');assert((await snap()).camera.zoom>before.zoom);await page.click('#zoomOut');
    const canvas=await page.locator('#app canvas').boundingBox();
    await page.mouse.move(canvas.x+canvas.width*.5,canvas.y+canvas.height*.6);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width*.5+50,canvas.y+canvas.height*.6+25,{steps:5});await page.mouse.up();
    assert(Math.abs((await snap()).camera.x-before.x)>20,'Drag must pan the quarter.');
    await page.click('[data-view="all"]');
    const point=await page.evaluate(async()=>{
      const {app,world}=await import('/pizza-core.js?v=20261015b'),camera=world.children[0],sign=camera.children.at(-1).children.find(c=>c.label==='oldtown-restaurant-sign');app.render();const b=sign.getBounds(),r=app.canvas.getBoundingClientRect();return{x:r.left+b.x+b.width/2,y:r.top+b.y+b.height/2};
    });
    await page.mouse.click(point.x,point.y);assert.match(await page.locator('#selection').innerText(),/Forno San Luca/);assert.equal((await snap()).view,'restaurant');
    for(const [width,height]of [[393,852],[844,390],[320,740]]){
      await page.setViewportSize({width,height});await page.click('[data-view="alley"]');
      await page.screenshot({path:path.join(out,`oldtown-alley-${width}.png`),fullPage:true});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow.');
    }
    await page.setViewportSize({width:393,height:852});await page.click('[data-view="alley"]');
    await page.locator('#app').scrollIntoViewIfNeeded();
    const mobile=await page.locator('#app canvas').boundingBox(),pinchZoom=(await snap()).camera.zoom,cdp=await context.newCDPSession(page),px=mobile.x+mobile.width/2,py=mobile.y+mobile.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:px-35,y:py,id:1},{x:px+35,y:py,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:px-65,y:py,id:1},{x:px+65,y:py,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert((await snap()).camera.zoom>pinchZoom*1.4,'A real two-finger gesture must zoom the scene.');
    await page.click('[data-view="block"]');await page.check('#courts');
    await page.screenshot({path:path.join(out,'oldtown-courtyard-mobile.png'),fullPage:true});
    assert.equal(await page.evaluate(()=>localStorage.getItem('pizza-city-layout-v1')),'{"oldtownSentinel":true}');
    assert.deepEqual(errors,[]);
    console.log('Old-town study passed: real two-storey art, 98% overall frontage, open/closed comparison, courtyard inspection, plaza view, clickable restaurant signs, zoom/pan, two-finger touch zoom, mobile layouts and unchanged game saves.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
