import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {myMapId,validate,resolveRoute,visibleData} from '../public/model.js';
const fixture=JSON.parse(await readFile(new URL('./fixtures/initial.json',import.meta.url)));
test('My Maps accepts full Google links and constructs only trusted embeds',()=>{
 for(const path of ['viewer','edit','embed','u/0/edit'])assert.equal(myMapId(`https://www.google.com/maps/d/${path}?mid=sample_12345678&usp=sharing`),'sample_12345678');
 for(const link of ['javascript:alert(1)','https://google.com.evil/maps/d/viewer?mid=sample_12345678','https://www.google.com/maps/d/viewer?mid=%22%3E%3Cscript%3E','https://maps.app.goo.gl/example','http://www.google.com/maps/d/viewer?mid=sample_12345678'])assert.equal(myMapId(link),null);
});
test('translated content is optional but typed and city article routes respect hidden parents',()=>{
 const d=structuredClone(fixture);d.cities[0].article='A travel note';d.cities[0].descriptionEn='A description';d.cities[0].myMap='https://www.google.com/maps/d/viewer?mid=sample_12345678';validate(d);
 const city=d.cities[0],country=d.countries.find(c=>c.id===city.country);const route=`#/${country.continent}/${country.id}/${city.id}`;
 assert.equal(resolveRoute(route,d).city.id,city.id);country.published=false;assert.equal(resolveRoute(route,visibleData(d)),null);
 city.articleEn={unsafe:true};assert.throws(()=>validate(d),/文字/);city.articleEn='ok';city.myMap='https://evil.test';assert.throws(()=>validate(d),/My Maps/);
});
