import {ApiError} from './community.mjs';
export async function memberOverview(url,env){
 if(!env.DB)throw new ApiError('會員資料庫尚未設定',503);
 const offset=Number(url.searchParams.get('offset')||0),q=(url.searchParams.get('q')||'').trim();
 if(!Number.isSafeInteger(offset)||offset<0||offset>100000||q.length>100)throw new ApiError('查詢條件無效');
 const summary=await env.DB.prepare(`SELECT COUNT(*) AS total,
 SUM(CASE WHEN u.created_at>=? THEN 1 ELSE 0 END) AS recent,
 SUM(CASE WHEN u.suspended=1 THEN 1 ELSE 0 END) AS suspended,
 SUM(CASE WHEN u.suspended=0 AND EXISTS(SELECT 1 FROM pilot_profiles p WHERE p.user_id=u.id AND p.visible=1) THEN 1 ELSE 0 END) AS publicCreators
 FROM creator_users u`).bind(Math.floor(Date.now()/1000)-30*86400).first();
 const lists=await env.DB.prepare('SELECT COUNT(*) AS total FROM pilot_lists l JOIN pilot_profiles p ON p.user_id=l.user_id JOIN creator_users u ON u.id=l.user_id WHERE l.visible=1 AND l.published IS NOT NULL AND p.visible=1 AND u.suspended=0').first();
 const result=await env.DB.prepare(`SELECT u.id,u.primary_email AS email,u.created_at AS createdAt,u.suspended,
 COALESCE(c.name,'') AS name,c.creator_id AS creatorId,
 CASE WHEN p.visible=1 AND u.suspended=0 THEN 1 ELSE 0 END AS publicProfile,
 (SELECT COUNT(*) FROM pilot_lists l WHERE l.user_id=u.id) AS lists,
 (SELECT COUNT(*) FROM pilot_lists l WHERE l.user_id=u.id AND l.visible=1 AND l.published IS NOT NULL AND p.visible=1 AND u.suspended=0) AS publicLists
 FROM creator_users u LEFT JOIN creator_profiles c ON c.user_id=u.id LEFT JOIN pilot_profiles p ON p.user_id=u.id
 WHERE ?='' OR instr(lower(u.primary_email),lower(?))>0 OR instr(lower(COALESCE(c.name,'')),lower(?))>0
 ORDER BY u.created_at DESC,u.id LIMIT 51 OFFSET ?`).bind(q,q,q,offset).all();
 return {summary:{total:summary.total,recent:summary.recent||0,suspended:summary.suspended||0,publicCreators:summary.publicCreators||0,publicLists:lists.total},items:result.results.slice(0,50),nextOffset:result.results.length>50?offset+50:null};
}
