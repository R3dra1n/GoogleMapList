export function reserveTranslation(previous,characters,month=new Date().toISOString().slice(0,7),limit=400000){
 if(!Number.isSafeInteger(characters)||characters<0||!Number.isSafeInteger(limit)||limit<1)throw Error('Invalid translation budget');
 const state=structuredClone(previous||{startedAt:new Date().toISOString(),months:{}});state.months??={};
 const row=state.months[month]??={reservedCharacters:0,confirmedCharacters:0};
 if(!Number.isSafeInteger(row.reservedCharacters)||row.reservedCharacters<0||!Number.isSafeInteger(row.confirmedCharacters)||row.confirmedCharacters<0)throw Error('翻譯預算記錄無效；未呼叫 Google。');
 if(row.reservedCharacters+characters>limit)throw Error(`翻譯已達本站每月 ${limit} 字符預算；未呼叫 Google。`);
 row.reservedCharacters+=characters;state.monthlyLimit=limit;return state;
}
