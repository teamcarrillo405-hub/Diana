import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const inputRoot=process.argv[2];
if(!inputRoot)throw Error('Pass the local directory containing the six verified source PNGs.');
const output='public/assets/campus';await fs.mkdir(output,{recursive:true});
const scenes=[
 {id:'entry',asset:'835f7694-cd17-4419-94df-78216d7c5b87',focal:.64},
 {id:'commons',asset:'11d2f593-899b-4c85-a0e0-bad210750150',focal:.62},
 {id:'library',asset:'559f2010-7036-402f-bad0-8c07f9530581',focal:.64},
 {id:'seminar',asset:'32221ea8-d9a2-4028-b00e-d7855b697018',focal:.64,crop:{left:600,top:360,width:3840,height:2160}},
 {id:'services',asset:'3427d018-d788-4da8-9e03-4604317ce7bf',focal:.60,crop:{left:800,top:360,width:3840,height:2160}},
 {id:'courtyard',asset:'d7e046ce-9acf-45b1-991b-e1529390b05a',focal:.58,crop:{left:1280,top:360,width:3840,height:2160}},
];
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest={version:1,provider:'Higgsfield signed-in website',model:'Seedream 4.5',generatedOn:'2026-11-17',paidCredits:0,eligibility:'Manage Account > Subscription lists Seedream 4.5 Unlimited Active; Unlimited mode checked; final control explicitly Unlimited at each submission.',references:[],fallback:'CSS neutral campus gradient remains when images are unavailable.',scenes:[]};
for(const scene of scenes){
 const source=await fs.readFile(path.join(inputRoot,scene.id+'.png'));const info=await sharp(source).metadata();
 if(info.width<3840||info.height<2160)throw Error(scene.id+' is not native 4K');
 let original=sharp(source);if(scene.crop)original=original.extract(scene.crop);
 const master=await original.resize(3840,2160).png().toBuffer();
 const mobileWidth=Math.round(2160*920/1600);const mobileLeft=Math.min(3840-mobileWidth,Math.max(0,Math.round(3840*scene.focal-mobileWidth/2)));
 const variants=[];
 for(const variant of [{name:'4k',width:3840,height:2160,budget:650000},{name:'1920',width:1920,height:1080,budget:250000},{name:'mobile',width:920,height:1600,budget:160000}]){
  let buffer,quality;
  for(quality of [80,76,72,68]){let pipe=sharp(master);if(variant.name==='mobile')pipe=pipe.extract({left:mobileLeft,top:0,width:mobileWidth,height:2160});buffer=await pipe.resize(variant.width,variant.height).webp({quality,effort:5}).toBuffer();if(buffer.length<=variant.budget)break;}
  if(buffer.length>variant.budget)throw Error(scene.id+' '+variant.name+' exceeds image budget');
  const file=`${scene.id}-${variant.name}.webp`;await fs.writeFile(path.join(output,file),buffer);
  variants.push({file,width:variant.width,height:variant.height,bytes:buffer.length,quality,sha256:hash(buffer)});
 }
 manifest.scenes.push({id:scene.id,assetId:scene.asset,source:{width:info.width,height:info.height,sha256:hash(source)},masterCrop:scene.crop??null,focalX:scene.focal,mobileCrop:{left:mobileLeft,top:0,width:mobileWidth,height:2160},textSafeRegion:'left 50 percent, behind opaque interface panels',variants});
 console.log(scene.id+': '+variants.map(v=>v.file+' '+v.bytes+'B').join(', '));
}
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
