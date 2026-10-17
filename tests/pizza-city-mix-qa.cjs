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
    page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
    page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message);});
    await page.goto(`http://127.0.0.1:${server.address().port}/pizza.html`);
    try{await page.waitForSelector('#loading',{state:'hidden'});}catch(e){console.error(await page.locator('#loading').innerText());throw e;}
    const cityPath=fs.readFileSync(path.join(root,'pizza.js'),'utf8').match(/from ['"](.\/pizza-city\.js[^'"]*)['"]/)[1].replace('./','/');
    const overviewSides=new Set(),cornerDirections=new Set(),cornerFamilies=new Set();
    await page.addStyleTag({content:'#app{position:fixed!important;inset:0!important;width:100%!important;max-width:none!important;height:100%!important;border-radius:0!important;transform:none!important;margin:0!important}'});
    await page.evaluate(async p=>{const {app}=await import(p);app.ticker.stop();},corePath);
    const seeds=[94117,0,1,42,81,1024,0xffffffff,993377,...Array.from({length:24},(_,i)=>Math.imul(i+1,2654435761)>>>0)];
    for(const seed of seeds){
      const data=await page.evaluate(async({corePath,cityPath,seed})=>{
        const {state,app}=await import(corePath),{showCity}=await import(cityPath);state.citySeed=seed;state.scene=null;showCity();state.speed=0;app.render();
        const objects=state.camera.children.find(c=>c.label==='city-objects');
        return {canal:state.cityLayout.canal.side,streets:state.cityLayout.streets.length,blocks:state.cityLayout.blocks.length,expectedPlans:state.cityLayout.blocks.filter(b=>b.landUse==='housing'&&b.source!==0&&b.source!==1).length,courts:state.cityBlockPlans.map(b=>({coverage:b.coverage,court:b.court,gate:b.gate,parts:b.parts})),houses:objects.children.filter(c=>c.groundBounds).map(c=>({label:c.label,kind:c.buildingKind,index:c.buildingVariant,row:c.frontage,corner:c.corner,direction:c.cornerDirection,family:c.buildingFamily,key:c.blockKey,b:c.groundBounds,cells:c.occupiedGroundCells})),properties:objects.children.filter(c=>c.propertyId).map(c=>c.propertyId),warehouses:objects.children.filter(c=>c.warehouseId).map(c=>c.warehouseId),restaurants:objects.children.filter(c=>['city-competitor','player-restaurant'].includes(c.label)).length,clear:objects.children.filter(c=>c.groundBounds).every(c=>{const b=c.groundBounds;return [[b.x0,b.y0],[b.x1,b.y0],[b.x1,b.y1],[b.x0,b.y1]].every(([x,y])=>!state.cityLayout.road(x,y)&&!state.cityLayout.water(x,y));})};
      },{corePath,cityPath,seed});
      assert.equal(data.courts.length,data.expectedPlans);for(const house of data.houses.filter(h=>h.kind==='cornerBuildings')){assert.equal(house.row,'corner');assert.equal(house.corner,house.direction);cornerDirections.add(house.direction);cornerFamilies.add(house.family);}
      const gardens=await page.evaluate(async p=>{
        const {state}=await import(p),objects=state.camera.children.find(c=>c.label==='city-objects');
        return {details:state.camera.children.find(c=>c.label==='city-ground').groundDetails,parks:state.cityLandmarkGardens.map(g=>({id:g.id,trees:objects.children.filter(c=>c.landmarkBlock===g.id&&c.label==='city-tree').length,benches:objects.children.filter(c=>c.landmarkBlock===g.id&&c.label==='city-park-bench').length,landmark:objects.children.filter(c=>c.landmarkBlock===g.id&&c.landmarkFoundation).length}))};
      },corePath);
      assert.equal(gardens.details.landmarkGardens,2);assert.equal(gardens.details.gardenPaths,14);
      assert(gardens.details.gardenBeds>=2&&gardens.parks.every(g=>g.trees>=2&&g.benches===4&&g.landmark===1),'Both landmarks are embedded in rendered gardens with seating.');
      const overlap=(p,q)=>Math.min(p.x1,q.x1)-Math.max(p.x0,q.x0)>1e-7&&Math.min(p.y1,q.y1)-Math.max(p.y0,q.y0)>1e-7;
      for(const b of data.courts){
        assert(Object.values(b.coverage).every(c=>c.ratio>=.9),'Every street front is closed except its narrow entrance.');
        assert(b.parts.every(p=>!overlap(p,b.court)&&!overlap(p,b.gate)),'Courtyard and entrance remain clear.');
        assert(b.parts.every(p=>p.scale>=.9&&p.scale<=1));
      }
      assert(data.clear,'Foundation stays out of street/water: '+seed);assert.equal(new Set(data.properties).size,18);
      assert.equal(new Set(data.warehouses).size,2);assert.equal(data.restaurants,4,'Player and all competitors remain available.');

      let seams=0;
      for(let i=0;i<data.houses.length;i++)for(let j=i+1;j<data.houses.length;j++){
        const a=data.houses[i],b=data.houses[j];if(a.key!==b.key)continue;
        const overlap=(p,q)=>Math.min(p.x1,q.x1)-Math.max(p.x0,q.x0)>1e-7&&Math.min(p.y1,q.y1)-Math.max(p.y0,q.y0)>1e-7;
        assert(!overlap(a.b,b.b),'Separate foundations overlap: '+JSON.stringify({seed,a,b}));
        const adjacent=((Math.abs(a.b.x1-b.b.x0)<1e-7||Math.abs(b.b.x1-a.b.x0)<1e-7)&&Math.min(a.b.y1,b.b.y1)-Math.max(a.b.y0,b.b.y0)>1e-7)||((Math.abs(a.b.y1-b.b.y0)<1e-7||Math.abs(b.b.y1-a.b.y0)<1e-7)&&Math.min(a.b.x1,b.b.x1)-Math.max(a.b.x0,b.b.x0)>1e-7);assert(!(adjacent&&a.kind===b.kind&&a.index===b.index),'Identical neighboring houses: '+JSON.stringify({seed,a,b}));
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

    assert.equal(overviewSides.size,4);assert.equal(cornerDirections.size,4);assert.equal(cornerFamilies.size,4);assert.deepEqual(errors,[]);console.log('Mixed city passed: shared foundations, parcel containment, no overlaps, closed perimeters and clear inner courtyards, eighteen properties, two warehouses and four restaurants across 32 seeds and all four canal shores.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
