import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
export async function optimizeImages(data){
 await mkdir('dist/media',{recursive:true});const cache=new Map();let originalBytes=0,smallBytes=0;
 for(const entries of Object.values(data))for(const item of entries){
  if(!item.image)continue;
  if(!cache.has(item.image)){
   const input=await readFile('public/'+item.image),hash=createHash('sha256').update(input).digest('hex').slice(0,16),variants=[];
   const meta=await sharp(input).metadata();
   for(const size of [...new Set([Math.min(480,meta.width),Math.min(960,meta.width)])]){
    const {data:bytes,info}=await sharp(input).rotate().resize({width:size,withoutEnlargement:true}).webp({quality:76}).toBuffer({resolveWithObject:true});
    const path=`media/${hash}-${size}.webp`;await writeFile('dist/'+path,bytes);variants.push({path,width:info.width,bytes:bytes.length});
   }
   cache.set(item.image,variants);originalBytes+=input.length;smallBytes+=variants[0].bytes;
  }
  item._imageVariants=cache.get(item.image);
 }
 console.log(`Images: ${cache.size} unique; originals ${originalBytes} bytes → small WebP ${smallBytes} bytes (${Math.round(100*(1-smallBytes/originalBytes))}% smaller).`);
}
