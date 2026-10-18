const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const root=process.cwd(),source=fs.readFileSync('pizza.js','utf8'),core=source.match(/from ['"](.\/pizza-core\.js[^'"]*)['"]/)[1].replace('./','/');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,data)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:393,height:852},hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/pizza.js?*',r=>r.fulfill({contentType:'text/javascript',body:source.replace('state.ready=true;','app.ticker.stop();state.speed=0;state.ready=true;')}));
  await page.goto('http://127.0.0.1:'+server.address().port+'/pizza.html');await page.waitForSelector('#loading',{state:'hidden'});
  await page.evaluate(async core=>{const {state,updateMoney}=await import(core);state.balance=.42;updateMoney();},core);
  const snapshot=()=>page.evaluate(async core=>{const {state}=await import(core);return {cash:Math.round(state.balance*100),net:state.service.netCents};},core);
  const before=await snapshot();
  await page.locator('#moneyCheat .cash').tap();await page.locator('#moneyCheat .money').tap();assert.deepEqual(await snapshot(),before,'Two taps do nothing.');
  await page.waitForTimeout(1300);await page.locator('#moneyCheat').tap();assert.deepEqual(await snapshot(),before,'An expired double tap cannot trigger the cheat.');
  await page.waitForTimeout(1300);
  for(let n=0;n<3;n++)await page.locator('#moneyCheat .money').tap();
  assert.deepEqual(await snapshot(),{cash:10000042,net:before.net},'A touch triple credits once and preserves fractions and profit.');
  assert.match(await page.locator('#toast').innerText(),/100\.000 DM/);
  for(let n=0;n<3;n++)await page.locator('#moneyCheat').click();
  assert.equal((await snapshot()).cash,20000042,'A new triple can be used again.');
  await page.reload();await page.waitForSelector('#loading',{state:'hidden'});assert.equal((await snapshot()).cash,20000042,'Credit survives reload.');
  await page.evaluate(async core=>{const {state,updateMoney}=await import(core);state.balance=0;updateMoney();},core);
  await page.locator('#moneyCheat').focus();for(let n=0;n<3;n++)await page.keyboard.press('Enter');assert.equal((await snapshot()).cash,10000000,'Works from zero and through keyboard activation.');
  assert.deepEqual(errors,[]);console.log('Demo cheat passed: mobile taps, click triples, timeout, exact credit, repeat, zero balance, unchanged profit and saved reload.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
