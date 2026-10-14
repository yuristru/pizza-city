export const COMPETITORS=[
 {id:'luigi',name:"Luigi’s Pizzeria",owner:'Luigi Bianchi',specialty:'Pizza aus dem Holzofen',bx:2,by:1,sprite:5},
 {id:'enzo',name:'Pizzeria Da Enzo',owner:'Enzo Moretti',specialty:'Klassische neapolitanische Pizza',bx:2,by:0,sprite:4},
 {id:'donatello',name:'Pizzeria Donatello',owner:'Sofia Donatello',specialty:'Pizza und Terrasse am Park',bx:2,by:2,sprite:6}
];
export const competitor=id=>COMPETITORS.find(c=>c.id===id)||null;
