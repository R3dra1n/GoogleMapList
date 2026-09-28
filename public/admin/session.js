// Decap 3.16.3 restores this store through GitHub and rechecks repository access.
const key='decap-cms-user';
export function readSession(){try{const user=JSON.parse(localStorage.getItem(key)||'null');return user?.backendName==='github'&&typeof user.token==='string'?user.token:'';}catch{return '';}}
export function saveSession(token){localStorage.setItem(key,JSON.stringify({backendName:'github',token}));sessionStorage.removeItem('atlas-admin-token');}
export function clearSession(){localStorage.removeItem(key);sessionStorage.removeItem('atlas-admin-token');}
export function migrateSession(){try{const old=sessionStorage.getItem('atlas-admin-token');if(!readSession()&&old)saveSession(old);}catch{}}
export function onSessionChange(callback){window.addEventListener('storage',e=>{if(e.key===key||e.key===null)callback(readSession());});}
