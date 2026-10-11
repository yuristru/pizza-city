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
  const errors=[];
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1050}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>localStorage.setItem('pizza-city-layout-v1','{"studySentinel":true}'));
    await page.goto(`http://127.0.0.1:${server.address().port}/pizza-city-study.html`);
    await page.waitForFunction(()=>window.cityStudy);
    const snapshot=()=>page.evaluate(()=>window.cityStudy);
    assert.equal((await snapshot()).mode,'loose');
    await page.screenshot({path:path.join(out,'study-01-loose.png'),fullPage:true});
    await page.click('[data-mode="joined"]');
    const joined=await snapshot();assert.equal(joined.records.length,7);
    for(let i=1;i<4;i++){
      const a=joined.records[i-1],b=joined.records[i];
      assert(Math.abs(a.x+a.width-b.x)<1e-9,'Measured foundations meet exactly.');
      assert(Math.abs(a.y+a.depth-b.y-b.depth)<1e-9,'Front facades follow a common line.');
    }
    await page.screenshot({path:path.join(out,'study-02-joined.png'),fullPage:true});
    await page.locator('#setback').fill('0');await page.locator('#setback').dispatchEvent('input');
    assert(Math.abs((await snapshot()).facadeDistance-1.41)<1e-9);
    await page.locator('#roadWidth').fill('2');await page.locator('#roadWidth').dispatchEvent('input');
    assert(Math.abs((await snapshot()).facadeDistance-2.56)<1e-9);
    await page.locator('#roadWidth').fill('0.85');await page.locator('#roadWidth').dispatchEvent('input');
    await page.click('[data-mode="court"]');
    await page.locator('#probe').fill('35');await page.locator('#probe').dispatchEvent('input');
    const court=await snapshot();assert.equal(court.records.length,4);assert(court.probe.insideCourt);
    assert(court.probe.z<court.records[0].z,'Reproduce single-anchor sorting with a figure inside the U.');
    await page.screenshot({path:path.join(out,'study-03-court.png'),fullPage:true});
    await page.check('#xray');await page.screenshot({path:path.join(out,'study-04-depth.png'),fullPage:true});
    await page.uncheck('#xray');await page.uncheck('#footprints');
    await page.setViewportSize({width:393,height:852});
    await page.waitForTimeout(150);
    await page.screenshot({path:path.join(out,'study-mobile.png'),fullPage:true});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow on mobile.');
    assert.equal(await page.evaluate(()=>localStorage.getItem('pizza-city-layout-v1')),'{"studySentinel":true}','The study must not write gameplay saves.');
    assert.deepEqual(errors,[]);
    console.log('City study passed: real asset loading, measured seams, frontage spacing controls, U courtyard depth probe, mobile layout and unchanged save.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
