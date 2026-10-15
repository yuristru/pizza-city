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



(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:950}}),errors=[];
    page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message);});
    await page.goto(`http://127.0.0.1:${server.address().port}/pizza.html`);
    await page.waitForSelector('#loading',{state:'hidden'});
    const cityPath=fs.readFileSync(path.join(root,'pizza.js'),'utf8').match(/from ['"](.\/pizza-city\.js[^'"]*)['"]/)[1].replace('./','/');
    const courtyardStyles=new Set(),overviewSides=new Set();
    await page.addStyleTag({content:'#app{position:fixed!important;inset:0!important;width:100%!important;max-width:none!important;height:100%!important;border-radius:0!important;transform:none!important;margin:0!important}'});
    await page.evaluate(async p=>{const {app}=await import(p);app.ticker.stop();},corePath);
    const seeds=[94117,0,1,42,81,1024,0xffffffff,993377,...Array.from({length:24},(_,i)=>Math.imul(i+1,2654435761)>>>0)];
    for(const seed of seeds){
      const data=await page.evaluate(async({corePath,cityPath,seed})=>{
        const {state,app}=await import(corePath),{showCity}=await import(cityPath);state.citySeed=seed;state.scene=null;showCity();state.speed=0;app.render();
        const objects=state.camera.children.find(c=>c.label==='city-objects');
        return {canal:state.cityLayout.canal.side,streets:state.cityLayout.streets.length,blocks:state.cityLayout.blocks.length,courts:objects.children.filter(c=>c.label==='city-courtyard-building').map(c=>c.buildingVariant),houses:objects.children.filter(c=>c.groundBounds).map(c=>({label:c.label,row:c.frontage,key:c.blockKey,b:c.groundBounds,cells:c.occupiedGroundCells})),properties:objects.children.filter(c=>c.propertyId).map(c=>c.propertyId),warehouses:objects.children.filter(c=>c.warehouseId).map(c=>c.warehouseId),restaurants:objects.children.filter(c=>['city-competitor','player-restaurant'].includes(c.label)).length,clear:objects.children.filter(c=>c.groundBounds).every(c=>{const b=c.groundBounds;return [[b.x0,b.y0],[b.x1,b.y0],[b.x1,b.y1],[b.x0,b.y1]].every(([x,y])=>!state.cityLayout.road(x,y)&&!state.cityLayout.water(x,y));})};
      },{corePath,cityPath,seed});
      data.courts.forEach(v=>courtyardStyles.add(v));
      assert(data.clear,'Foundation stays out of street/water: '+seed);assert.equal(new Set(data.properties).size,9);
      assert.equal(new Set(data.warehouses).size,2);assert.equal(data.restaurants,4,'Player and all competitors remain available.');
      assert.equal(data.houses.filter(c=>c.label==='city-courtyard-building').length,3);
      let seams=0;
      for(let i=0;i<data.houses.length;i++)for(let j=i+1;j<data.houses.length;j++){
        const a=data.houses[i],b=data.houses[j];if(a.key!==b.key)continue;
        const overlap=(p,q)=>Math.min(p.x1,q.x1)-Math.max(p.x0,q.x0)>1e-7&&Math.min(p.y1,q.y1)-Math.max(p.y0,q.y0)>1e-7;
        assert(!overlap(a.b,b.b),'Separate foundations overlap: '+JSON.stringify({seed,a,b}));
        if(a.row&&a.row===b.row&&a.row!=='wing'&&(Math.abs(a.b.x1-b.b.x0)<1e-7||Math.abs(b.b.x1-a.b.x0)<1e-7))seams++;
      }
      assert(seams>=35,'City must have many joined neighbors.');
      console.log({seed,houses:data.houses.length,joinedSeams:seams,properties:new Set(data.properties).size,blocks:data.blocks,streets:data.streets,canal:data.canal});
      if(!overviewSides.has(data.canal)){
        overviewSides.add(data.canal);
        await page.evaluate(async p=>{const {state,app}=await import(p);state.camera.scale.set(.9);state.camera.position.set(app.screen.width/2,app.screen.height/2-420);app.render();},corePath);
        await page.screenshot({path:path.join(out,'city-variety-'+data.canal+'.png')});
        if(seed===94117)await page.screenshot({path:path.join(out,'city-mix-overview.png')});
      }
    }
    assert.deepEqual([...courtyardStyles].sort(),[0,1,2,3],'All four palazzo variants must appear across the sampled seeds.');
    assert.equal(overviewSides.size,4);assert.deepEqual(errors,[]);console.log('Mixed city passed: shared foundations, parcel containment, no overlaps, three courtyard groups, nine properties, two warehouses and four restaurants across 32 seeds and all four canal shores.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
