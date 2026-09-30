// Invoked only with a server-verified account; never accept identity from a form.
export class ProfileError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const fields=new Set(['name','description','links']);
export function validateProfile(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new ProfileError('Invalid profile');
 for(const key of Object.keys(input))if(!fields.has(key))throw new ProfileError('Unsupported profile field: '+key);
 if(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>60)throw new ProfileError('Name must be 1–60 characters');
 if(typeof input.description!=='string'||input.description.length>500)throw new ProfileError('Description must be at most 500 characters');
 if(!Array.isArray(input.links)||input.links.length>5)throw new ProfileError('At most five social links');
 const links=input.links.map(link=>{if(!link||typeof link.label!=='string'||!link.label.trim()||link.label.length>40||typeof link.url!=='string'||link.url.length>2048)throw new ProfileError('Invalid social link');let u;try{u=new URL(link.url)}catch{throw new ProfileError('Invalid link URL')}
 if(u.protocol!=='https:'||u.username||u.password)throw new ProfileError('Links must use HTTPS without credentials');
 return {label:link.label.trim(),url:u.href};});
 return {name:input.name.trim(),description:input.description.trim(),links};
}
export function authorizeProfile(account,record){
 if(!account?.userId||!account.creatorId||account.suspended)throw new ProfileError('Sign in required',401);
 if(!record||record.userId!==account.userId||record.creatorId!==account.creatorId)throw new ProfileError('Profile access denied',403);
}
export function editOwnProfile(account,record,input){
 authorizeProfile(account,record);
 // IDs, moderation status, role and curation permissions cannot be overwritten.
 return {...record,...validateProfile(input)};
}
