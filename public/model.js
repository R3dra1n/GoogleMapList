export const kinds = ['continents', 'countries', 'cities'];
export function isImagePath(value) {
  if (!value) return true;
  if (typeof value !== 'string' || !/^(assets|uploads)\//.test(value) || /[\\%?#\u0000-\u001f]/.test(value)) return false;
  return !value.split('/').some(part => !part || part === '.' || part === '..') && /\.(jpg|jpeg|png|webp|gif)$/i.test(value);
}
export function isMapsLink(value) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port && (
      (u.hostname === 'maps.app.goo.gl' && /^\/[A-Za-z0-9]+\/?$/.test(u.pathname)) ||
      (['www.google.com', 'google.com', 'www.google.com.tw', 'google.com.tw', 'maps.google.com'].includes(u.hostname) && /^\/maps(?:\/|$)/.test(u.pathname)) ||
      (u.hostname === 'goo.gl' && u.pathname.startsWith('/maps/'))
    );
  } catch { return false; }
}
export function validate(data) {
  for (const kind of kinds) {
    if (!Array.isArray(data[kind])) throw new Error(`缺少 ${kind} 資料`);
    const ids = new Set();
    const names = new Set();
    for (const entry of data[kind]) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id || '') || ids.has(entry.id)) throw new Error(`${kind} 的 ID 無效或重複：${entry.id}`);
      ids.add(entry.id);
      if (typeof entry.name !== 'string' || !entry.name.trim()) throw new Error(`${entry.id} 缺少名稱`);
      const scopedName = `${entry.country || entry.continent || ''}/${entry.name.trim()}`;
      if (names.has(scopedName)) throw new Error(`${entry.name} 在同一區域重複，請檢查既有清單`);
      names.add(scopedName);
      if (typeof entry.published !== 'boolean' || !Number.isFinite(entry.order)) throw new Error(`${entry.id} 的顯示狀態或順序無效`);
      for (const key of ['description','english','image','imageAlt','imageCredit','imageSource','imageLicense','nameEn','nameHans','descriptionEn','descriptionHans','imageAltEn','imageAltHans','article','articleEn','articleHans','nameJa','nameKo','descriptionJa','descriptionKo','imageAltJa','imageAltKo','articleJa','articleKo','myMap']) {
        if (entry[key] != null && typeof entry[key] !== 'string') throw new Error(`${entry.id} 的 ${key} 必須是文字`);
      }
      if (!isImagePath(entry.image)) throw new Error(`${entry.id} 的封面路徑無效`);
      if (entry.image && !entry.imageAlt?.trim()) throw new Error(`${entry.id} 的圖片需要替代文字`);
      for (const key of ['imageSource','imageLicense']) if (entry[key] && !/^https:\/\//.test(entry[key])) throw new Error(`${entry.id} 的圖片出處連結無效`);
    }
  }
  for (const country of data.countries) if (!data.continents.some(x => x.id === country.continent)) throw new Error(`${country.name} 找不到所屬大洲`);
  for (const city of data.cities) {
    if(city.myMap&&!myMapId(city.myMap))throw new Error(`${city.name} 的 My Maps 網址無效`);
    if (!data.countries.some(x => x.id === city.country)) throw new Error(`${city.name} 找不到所屬國家／地區`);
    for (const key of ['food', 'sights']) if (typeof city[key] !== 'string' || !isMapsLink(city[key])) throw new Error(`${city.name} 的 ${key} 不是有效的 Google Maps HTTPS 連結`);
  }
  return data;
}
export function visibleData(data) {
  const sorted = xs => xs.slice().sort((a,b) => a.order-b.order || a.name.localeCompare(b.name,'zh-Hant'));
  const countries = data.countries.filter(c => c.published && data.continents.some(a => a.id===c.continent && a.published));
  const cities = sorted(data.cities.filter(c => c.published && countries.some(p=>p.id===c.country)));
  const availableCountries=sorted(countries.filter(c=>cities.some(x=>x.country===c.id)));
  return {cities,countries:availableCountries,continents:sorted(data.continents.filter(a=>a.published&&availableCountries.some(c=>c.continent===a.id)))};
}
export function resolveRoute(hash, data) {
  let parts; try { parts=decodeURIComponent(hash.replace(/^#\/?/, '')).split('/').filter(Boolean); } catch { return null; }
  if (parts.length>3) return null;
  const continent=data.continents.find(c=>c.id===(parts[0] || (data.continents.some(c=>c.id==='asia')?'asia':data.continents[0]?.id)));
  if (!continent) return null;
  const country=parts[1]?data.countries.find(c=>c.id===parts[1]&&c.continent===continent.id):null;
  if (parts[1]&&!country) return null;
  const city=parts[2]?data.cities.find(c=>c.id===parts[2]&&c.country===country?.id):null;
  if(parts[2]&&!city)return null;
  return {continent,country,...(city?{city}:{})};
}

export function myMapId(value){
 if(!value)return null;
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!['www.google.com','google.com'].includes(u.hostname)||!/^\/maps\/d\/(?:u\/\d+\/)?(?:edit|viewer|embed)\/?$/.test(u.pathname))return null;const id=u.searchParams.get('mid');return /^[a-zA-Z0-9_-]{10,200}$/.test(id||'')?id:null;}catch{return null;}
}
