// Public snapshots only. Keep account identities separate from static editorial profiles.
export async function communityData(){
 if(!(location.pathname.startsWith('/preview/')||location.hostname==='pocket-atlas-auth.huayang-hsu.workers.dev'))return {community:[],creators:[]};
 async function pages(path){const items=[];for(let page=0;page<=1000;page++){const r=await fetch('/account/api/pilot/'+path+'?page='+page,{cache:'no-store'});if(!r.ok)throw Error('Community unavailable');const result=await r.json();items.push(...result.items);if(!result.hasMore)return items;}throw Error('Community page limit');}
 const [profiles,lists]=await Promise.all([pages('creators'),pages('feed')]);
 return {creators:profiles.map(c=>({...c,id:'community-'+c.id,banner:'/account/api/pilot/creators/'+encodeURIComponent(c.id)+'/banner',avatar:'/account/api/pilot/creators/'+encodeURIComponent(c.id)+'/avatar'})),community:lists.map(x=>({...x,name:x.title,image:x.coverUrl,imageAlt:x.coverAlt,owner:'community-'+x.creator.id,_kind:'community',_id:x.id,locationNames:x.destination?[x.destination]:[],originalAuthor:x.sourceName,originalAuthorSource:x.sourceUrl,mapEntries:[{id:'collection',url:x.url,label:'',purpose:'collection'}]}))};
}
