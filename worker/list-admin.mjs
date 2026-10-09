import {ApiError,readJSON} from './community.mjs';
export async function listOverview(url,env){
 const q=(url.searchParams.get('q')||'').trim(),offset=Number(url.searchParams.get('offset')||0),state=url.searchParams.get('state')||'all';
 if(q.length>100||!Number.isSafeInteger(offset)||offset<0||offset>100000||!['all','hidden'].includes(state))throw new ApiError('查詢條件無效');
 const result=await env.DB.prepare(`SELECT l.id,l.visible,l.published_at,
 COALESCE(json_extract(l.published,'$.title'),json_extract(l.draft,'$.title')) AS title,
 COALESCE(json_extract(l.published,'$.destination'),json_extract(l.draft,'$.destination')) AS destination,
 COALESCE(json_extract(l.published,'$.description'),json_extract(l.draft,'$.description'),'') AS description,
 COALESCE(json_extract(l.published,'$.url'),json_extract(l.draft,'$.url'),'') AS url,
 COALESCE(c.name,'') AS author,COALESCE(m.hidden,0) AS moderated,COALESCE(m.reason,'') AS reason,COALESCE(m.revision,0) AS revision,
 CASE WHEN l.visible=1 AND l.published IS NOT NULL AND p.visible=1 AND u.suspended=0 AND COALESCE(m.hidden,0)=0 THEN 1 ELSE 0 END AS public
 FROM pilot_lists l JOIN creator_users u ON u.id=l.user_id LEFT JOIN creator_profiles c ON c.user_id=l.user_id LEFT JOIN pilot_profiles p ON p.user_id=l.user_id LEFT JOIN list_moderation m ON m.list_id=l.id
 WHERE (?='all' OR m.hidden=1) AND (?='' OR instr(lower(COALESCE(json_extract(l.published,'$.title'),json_extract(l.draft,'$.title'),'')),lower(?))>0 OR instr(lower(COALESCE(c.name,'')),lower(?))>0)
 ORDER BY l.updated_at DESC,l.id LIMIT 51 OFFSET ?`).bind(state,q,q,q,offset).all();
 return {items:result.results.slice(0,50),nextOffset:result.results.length>50?offset+50:null};
}
export async function moderateList(request,env,actor){
 const data=await readJSON(request,4096);
 if(!/^[a-f0-9-]{36}$/.test(data.id||'')||typeof data.hidden!=='boolean'||typeof data.reason!=='string'||!data.reason.trim()||data.reason.length>500||!Number.isSafeInteger(data.revision)||data.revision<0)throw new ApiError('請填寫原因並重新讀取清單狀態');
 if(!await env.DB.prepare('SELECT id FROM pilot_lists WHERE id=?').bind(data.id).first())throw new ApiError('找不到清單',404);
 const action=crypto.randomUUID(),now=Math.floor(Date.now()/1000),hidden=Number(data.hidden),reason=data.reason.trim();
 const result=await env.DB.batch([
 env.DB.prepare(`INSERT INTO list_moderation(list_id,hidden,reason,revision,action_id,updated_at) SELECT ?,?,?,1,?,? WHERE ?=0 OR EXISTS(SELECT 1 FROM list_moderation WHERE list_id=?)
 ON CONFLICT(list_id) DO UPDATE SET hidden=excluded.hidden,reason=excluded.reason,revision=list_moderation.revision+1,action_id=excluded.action_id,updated_at=excluded.updated_at WHERE list_moderation.revision=?`).bind(data.id,hidden,reason,action,now,data.revision,data.id,data.revision),
 env.DB.prepare(`INSERT INTO list_moderation_log(action_id,list_id,hidden,reason,actor,created_at) SELECT action_id,list_id,hidden,reason,?,updated_at FROM list_moderation WHERE action_id=?`).bind(actor,action)
 ]);
 if(!result[0].meta.changes)throw new ApiError('清單狀態已變更，請重新整理後再操作',409);
 return {ok:true};
}
