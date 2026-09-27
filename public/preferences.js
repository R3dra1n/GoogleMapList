const root=document.documentElement;
export function readPreference(key,fallback){try{return localStorage.getItem(key)||fallback}catch{return fallback}}
export function savePreference(key,value){try{localStorage.setItem(key,value)}catch{}}
const system=matchMedia('(prefers-color-scheme: dark)');
export function applyTheme(value){root.dataset.theme=value==='system'?(system.matches?'dark':'light'):value;}
applyTheme(readPreference('atlas-theme','system'));
system.addEventListener('change',()=>applyTheme(readPreference('atlas-theme','system')));
