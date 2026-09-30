import {mapEntries} from './catalog-model.js';
export function listEntries(item,kind='cities'){
 const prefix=item._region?`countries/${item.country}`:`${kind}/${item.id}`,seen=new Set();
 return mapEntries(item,kind).flatMap(entry=>{
  const slot=entry.id,url=entry.url;if(!url||seen.has(url))return [];seen.add(url);return [{id:prefix+'/'+slot,url,slot}];
 });
}
