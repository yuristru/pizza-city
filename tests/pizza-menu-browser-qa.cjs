const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'qa/pizza');fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(path.join(root,'pizza.js'),'utf8');
const modulePath=name=>source.match(new RegExp("from ['\"](.\\/"+name+"\\.js[^'\"]*)['\"]"))[1].replace('./','/');
const core=modulePath('pizza-core'),menuModule=modulePath('pizza-menu-ui'),editor=modulePath('pizza-editor');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:process.env.PIZZA_BROWSER_ARGS?JSON.parse(process.env.PIZZA_BROWSER_ARGS):['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
    const context=await browser.newContext({viewport:{width:393,height:852},hasTouch:true,deviceScaleFactor:2});
    const page=await context.newPage(),errors=[],external=[];page.setDefaultTimeout(Number(process.env.PIZZA_ACTION_TIMEOUT)||30000);page.on('pageerror',error=>{errors.push(error.message);console.error('Page error:',error.message);});page.on('console',m=>{if(m.type()==='error')console.error(m.text());});page.on('requestfailed',r=>console.error('Request failure:',r.url(),r.failure()));
    const url='http://127.0.0.1:'+server.address().port+'/pizza.html';
    await context.route('**/*',route=>route.request().url().startsWith(url.replace('/pizza.html','/'))?route.continue():(external.push(route.request().url()),route.abort()));
    await page.route('**/pizza.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('state.ready=true;','app.ticker.stop();state.ready=true;')}));
    async function loaded(){await page.goto(url);await page.waitForSelector('#loading',{state:'hidden',timeout:Number(process.env.PIZZA_LOAD_TIMEOUT)||15000});await page.evaluate(async p=>{const {app}=await import(p);app.ticker.stop();},core);}
    const menu=()=>page.evaluate(async p=>(await import(p)).menuSnapshot(),menuModule);
    const recipes=()=>page.evaluate(async p=>(await import(p)).savedRecipes(),editor);
    async function topping(id){await page.click('[data-ingredient="'+id+'"]');const b=await page.locator('#pizzaBoard').boundingBox();await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);}
    async function price(index,value){const form=page.locator('.menuPriceForm').nth(index);await form.locator('input').fill(value);await form.locator('button').click();}
    await loaded();await page.click('#restaurantBtn');await page.click('.restaurantMenuButton');assert(await page.locator('#menuEmpty').isVisible());assert(await page.locator('#menuAdd').isDisabled());
    const rotation=await page.evaluate(async p=>(await import(p)).state.rotation,core);await page.keyboard.press('r');assert.equal(await page.evaluate(async p=>(await import(p)).state.rotation,core),rotation,'Restaurant shortcuts must not edit furniture behind a dialog.');
    await page.click('#menuCreate');assert(await page.locator('#pizzaEditor').isVisible());
    await topping('mozzarella');await page.fill('#pizzaName','Margherita');await page.click('#pizzaSave');await page.click('#pizzaEditor [data-open-menu]');await page.selectOption('#menuRecipe','0');await page.click('#menuAdd');
    assert.equal((await menu())[0].price,600);assert.equal((await menu())[0].recipe.toppings.length,1);assert.equal((await menu())[0].active,true);
    await price(0,'8,50');assert.equal((await menu())[0].price,850);assert.match(await page.locator('[data-menu-contribution]').innerText(),/6,98 DM/);
    await price(0,'8,501');assert.equal((await menu())[0].price,850);assert.equal(await page.locator('[data-menu-price]').evaluate(e=>e.validity.valid),false);
    await price(0,'1,00');assert(await page.locator('[data-menu-warning]').isVisible());await price(0,'8.50');assert(await page.locator('[data-menu-warning]').isHidden());
    await page.click('[data-menu-toggle]');assert.equal((await menu())[0].active,false);
    await page.keyboard.press('Escape');assert.equal(await page.locator('#menuDialog').evaluate(e=>e.open),false);
    await topping('basil');await page.click('#pizzaSave');await page.click('#pizzaEditor [data-open-menu]');assert.equal((await menu())[0].recipe.toppings.length,2);assert.equal((await menu())[0].price,850);assert.equal((await menu())[0].active,false);assert.match(await page.locator('[data-menu-cost]').innerText(),/1,55 DM/);
    await page.click('#menuClose');await page.click('#pizzaNew');await topping('salami');await page.fill('#pizzaName','Salami');await page.click('#pizzaSave');await page.click('#pizzaEditor [data-open-menu]');await page.selectOption('#menuRecipe','1');await page.click('#menuAdd');assert.equal((await menu()).length,2);
    await page.locator('[data-menu-remove]').nth(1).click();assert.equal((await menu()).length,1);assert.equal((await recipes()).length,2);await page.selectOption('#menuRecipe','1');await page.click('#menuAdd');assert.equal((await menu()).length,2);
    const saved=await menu();await loaded();await page.click('#restaurantBtn');await page.click('.restaurantMenuButton');assert.deepEqual(await menu(),saved);
    for(const [width,height]of [[320,568],[393,852],[844,390]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(150);await page.locator('#menuDialog').evaluate(e=>e.scrollTop=0);
      const geometry=await page.evaluate(()=>{const d=document.querySelector('#menuDialog'),r=d.getBoundingClientRect();return {fits:r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1,overflow:d.scrollWidth>d.clientWidth+1,wideControls:[...d.querySelectorAll('button,input,select')].filter(e=>e.getBoundingClientRect().right>r.right).map(e=>e.id)};});
      assert(geometry.fits&&!geometry.overflow&&!geometry.wideControls.length,JSON.stringify({width,height,...geometry}));await page.screenshot({path:path.join(out,'menu-'+width+'.png')});
      await price(0,'8,50');assert.equal((await menu())[0].price,850);
      await page.click('#menuClose');await page.click('#pizzaBtn');const bounds=await page.evaluate(()=>{const p=document.querySelector('#pizzaEditor').getBoundingClientRect(),b=document.querySelector('#pizzaBoard').getBoundingClientRect(),prep=document.querySelector('.pizzaPrep').getBoundingClientRect(),tools=document.querySelector('.pizzaEditorTools').getBoundingClientRect();return {size:b.width,overlap:prep.left<tools.right&&prep.right>tools.left&&prep.top<tools.bottom&&prep.bottom>tools.top,clipped:[...document.querySelectorAll('#pizzaEditor button,#pizzaEditor input,#pizzaEditor select')].filter(e=>!e.closest('#pizzaIngredients')).some(e=>{const r=e.getBoundingClientRect();return r.left<p.left||r.right>p.right||r.top<p.top||r.bottom>p.bottom;})};});assert(!bounds.clipped&&!bounds.overlap&&bounds.size>90,JSON.stringify({width,height,...bounds}));
      await page.screenshot({path:path.join(out,'menu-editor-'+width+'.png')});await page.click('#restaurantBtn');await page.click('.restaurantMenuButton');
    }
    await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='pizza-menu-v1')throw new Error('Storage full');return original.call(this,key,value);};});
    await price(0,'7,00');assert.equal((await menu())[0].price,700);assert.match(await page.locator('#menuStatus').innerText(),/diese Sitzung/);
    await loaded();await page.click('#restaurantBtn');await page.click('.restaurantMenuButton');assert.equal((await menu())[0].price,850);
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    console.log('Menu browser passed: empty state, actual pizza creation, import, prices, loss warning, recipe synchronization, availability, removal, persistence, unavailable storage and phone/landscape views.');
  }finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
