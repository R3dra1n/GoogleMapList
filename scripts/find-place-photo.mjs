import {photoCandidate} from '../worker/photos.mjs';
const normalize=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function distance(a,b){const radians=x=>x*Math.PI/180,dlat=radians(b.lat-a.lat),dlng=radians(b.lng-a.lng),h=Math.sin(dlat/2)**2+Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(dlng/2)**2;return 6371000*2*Math.asin(Math.sqrt(Math.min(1,h)));}
export function matchingEntity(place,entities){
 const name=normalize(place.name);if(!name||!Number.isFinite(place.lat)||!Number.isFinite(place.lng))return null;
 const candidates=Object.values(entities).filter(e=>{const labels=[...Object.values(e.labels||{}).map(x=>x.value),...Object.values(e.aliases||{}).flat().map(x=>x.value)];if(!labels.some(x=>normalize(x)===name))return false;const c=e.claims?.P625?.find(x=>x.rank!=='deprecated'&&x.mainsnak?.datavalue?.value?.globe==='http://www.wikidata.org/entity/Q2')?.mainsnak.datavalue.value;return c&&distance(place,{lat:c.latitude,lng:c.longitude})<=1500&&e.claims?.P18?.some(x=>x.rank!=='deprecated'&&typeof x.mainsnak?.datavalue?.value==='string');});return candidates.length===1?candidates[0]:null;
}
async function query(host,params,fetcher){const u=new URL('https://'+host+'/w/api.php');u.search=new URLSearchParams({format:'json',formatversion:'2',...params});const r=await fetcher(u.href,{headers:{'User-Agent':'PocketMapPlacePhotos/1.0 (https://pocket-atlas-auth.huayang-hsu.workers.dev/contact.html)'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Wikimedia unavailable '+r.status);const data=await r.json();if(data.error)throw Error('Wikimedia API error');return data;}
export async function findPlacePhoto(place,fetcher=fetch){
 if(!Number.isFinite(place.lat)||!Number.isFinite(place.lng))return null;
 const language=/[\p{Script=Han}]/u.test(place.name)?'zh':'en';const search=await query('www.wikidata.org',{action:'wbsearchentities',search:place.name,language,limit:'5',type:'item'},fetcher);const ids=(search.search||[]).map(x=>x.id).filter(x=>/^Q\d+$/.test(x));if(!ids.length)return null;
 const result=await query('www.wikidata.org',{action:'wbgetentities',ids:ids.join('|'),props:'labels|aliases|claims'},fetcher);const entity=matchingEntity(place,result.entities||{});if(!entity)return null;
 const names=entity.claims.P18.filter(x=>x.rank!=='deprecated').map(x=>x.mainsnak?.datavalue?.value).filter(x=>typeof x==='string'&&!x.includes('|')).slice(0,3);
 const images=await query('commons.wikimedia.org',{action:'query',titles:names.map(n=>'File:'+n).join('|'),prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'960'},fetcher);
 return (images.query?.pages||[]).map(photoCandidate).find(Boolean)||null;
}
