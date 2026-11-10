// Where the public site lives. When a new domain is attached to the Worker, add its host here.
export const PUBLIC_ORIGIN = 'https://mapspot.hellohsu.com';
export const PRODUCTION_HOSTS = ['mapspot.hellohsu.com', 'pocket-atlas-auth.huayang-hsu.workers.dev'];
export const isProductionHost = (host = location.hostname) => PRODUCTION_HOSTS.includes(host);
