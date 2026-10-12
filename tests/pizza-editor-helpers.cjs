const fs=require('node:fs'),path=require('node:path');
const query=fs.readFileSync(path.join(process.cwd(),'pizza.js'),'utf8').match(/pizza-core\.js([^'"]*)/)[1];

async function undoEdit(page){
  await page.evaluate(()=>document.activeElement?.blur());
  await page.keyboard.press('Control+z');
}

// Reset remains an accounting fixture; the player-facing reset button is gone.
async function resetEdit(page){
  await page.evaluate(async query=>{
    (await import('/pizza-catalog-ui.js'+query)).showCatalogSizes();
    (await import('/pizza-restaurant.js'+query)).resetRestaurant();
  },query);
}

module.exports={undoEdit,resetEdit};
