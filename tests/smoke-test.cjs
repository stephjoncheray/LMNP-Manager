// Exécution : node tests/smoke-test.cjs (Node.js 18+). Aucun paquet externe.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, 'Script principal présent');
const nodes = new Map();
const listeners = new Map();
const document = {
  getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', elements: {} });
    return nodes.get(id);
  },
  addEventListener(name, callback) { listeners.set(name, callback); }
};
const storage = new Map();
const context = vm.createContext({
  document, localStorage: { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v) },
  alert: message => { throw Error('Unexpected alert: ' + message); },
  confirm: () => true,
  console, Date, Number, String, Set, Math
});
vm.runInContext(match[1], context, { filename: 'index.html' });
const check = code => vm.runInContext(code, context);
assert.equal(check("validateBackup({schema:1,owners:[],properties:[],entries:[],documents:[],years:[]})"), true, 'Ancienne sauvegarde JSON compatible');
assert.equal(check("validateBackup({schema:1,owners:[],properties:[{id:'p',ownerId:'absent'}],entries:[],documents:[],years:[]})"), false, 'Bien orphelin refusé');
assert.equal(check("assetSchedule({value:1200,duration:10,startDate:'2020-01-01'},2022)"), 120, 'Annuité pleine');
assert.ok(check("assetSchedule({value:1200,duration:10,startDate:'2020-07-01'},2020)") > 0, 'Prorata première année');
check("db.owners=[{id:'o',name:'Test'}];db.properties=[{id:'p',ownerId:'o',name:'Chanzy',address:'Nantes'}];db.entries=[{id:'e',propertyId:'p',type:'depense',date:'2026-02-01',amount:'100',label:'Assurance',taxStatus:'charge_validee'}];db.assets=[{id:'a',propertyId:'p',name:'Meubles',value:'1200',duration:'10',startDate:'2020-01-01'}];");
for (const index of [0,1,2,3,4,5,6,7,8,9,10,11]) {
  check('tab=' + index + ';render()');
  assert.ok(document.getElementById('app').innerHTML.length > 0, 'Onglet ' + index + ' rendu');
}
assert.ok(listeners.has('change'), 'Gestion des changements installée');
console.log('OK : sauvegardes, amortissements et rendu des 12 onglets.');
