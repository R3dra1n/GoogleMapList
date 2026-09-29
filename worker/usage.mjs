import {ApiError} from './community.mjs';
export const utcDay=()=>new Date().toISOString().slice(0,10);
export async function reserve(env,metric,limit,day=utcDay()){
 const row=await env.DB.prepare('INSERT INTO usage_daily(day,metric,value) VALUES (?,?,1) ON CONFLICT(day,metric) DO UPDATE SET value=value+1 WHERE value < ? RETURNING value').bind(day,metric,limit).first();
 if(!row)throw new ApiError('今日本站操作額度已達上限，請稍後再試。',429);
 return row.value;
}
export async function record(env,metric,value=1){
 if(!Number.isSafeInteger(value)||value<0)return;
 await env.DB.prepare('INSERT INTO usage_daily(day,metric,value) VALUES (?,?,?) ON CONFLICT(day,metric) DO UPDATE SET value=value+excluded.value').bind(utcDay(),metric,value).run();
}
export async function usage(env,github){
 const day=utcDay();const {results}=await env.DB.prepare('SELECT day,metric,value FROM usage_daily WHERE day >= ? ORDER BY day DESC,metric').bind(day.slice(0,7)+'-01').all();
 let translation=null;try{const r=await github('contents/translation/usage.json?ref=main');translation=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(r.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));}catch{}
 return {day,observed:results,translation,limits:{aiRequestsPerDay:50,photoSearchesPerDay:300,statMutationsPerDay:2000,emailAttemptsPerDay:90,emailAttemptsPerMonth:2500,translationCharactersPerMonth:400000},billing:null,note:'僅本站啟用記錄後的操作；不含歷史、其他程式或供應商完整帳單。未列出項目表示尚無記錄。'};
}
