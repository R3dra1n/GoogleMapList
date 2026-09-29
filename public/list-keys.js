export function listEntries(item,kind='cities'){
 const prefix=item._region?`countries/${item.country}`:`${kind}/${item.id}`,seen=new Set();
 return (kind==='themes'?['link','myMap','amap','baidu']:['food','sights','myMap','amap','baidu']).flatMap(slot=>{
  const url=item[slot];if(!url||seen.has(url))return [];seen.add(url);return [{id:prefix+'/'+slot,url,slot}];
 });
}
