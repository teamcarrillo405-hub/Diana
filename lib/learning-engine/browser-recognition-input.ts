/** Narrow input formats avoid remote audio/image decoders and unbounded media. */
export function readPcm16Wav(bytes:ArrayBuffer):Float32Array{
  const data=new DataView(bytes),text=(offset:number,length:number)=>String.fromCharCode(...new Uint8Array(bytes,offset,length));
  if(bytes.byteLength<44||bytes.byteLength>5_000_000||text(0,4)!=="RIFF"||text(8,4)!=="WAVE")throw new Error("Choose a 16 kHz mono PCM WAV file.");
  let offset=12,validFormat=false,samples:Float32Array|undefined;
  while(offset+8<=bytes.byteLength){
    const tag=text(offset,4),size=data.getUint32(offset+4,true),start=offset+8;
    if(start+size>bytes.byteLength)throw new Error("This WAV file is incomplete.");
    if(tag==="fmt ")validFormat=size>=16&&data.getUint16(start,true)===1&&data.getUint16(start+2,true)===1&&data.getUint32(start+4,true)===16000&&data.getUint16(start+14,true)===16;
    if(tag==="data"){
      if(!validFormat||!size||size%2||size>120*16000*2)throw new Error("Use 16 kHz mono PCM16 audio up to two minutes.");
      samples=new Float32Array(size/2);for(let i=0;i<samples.length;i++)samples[i]=data.getInt16(start+i*2,true)/32768;
    }
    offset=start+size+(size%2);
  }
  if(!samples)throw new Error("This recording has no supported audio.");return samples;
}
export function imageDimensions(bytes:ArrayBuffer,mime:string){
  const data=new DataView(bytes);let width=0,height=0;
  if(mime==="image/png"&&bytes.byteLength>=24&&data.getUint32(0)===0x89504e47&&data.getUint32(4)===0x0d0a1a0a){width=data.getUint32(16);height=data.getUint32(20);}
  else if(mime==="image/jpeg"&&data.byteLength>=4&&data.getUint16(0)===0xffd8){
    let i=2;while(i+4<=data.byteLength){if(data.getUint8(i)!==0xff)break;const marker=data.getUint8(i+1);if(marker===0xda||marker===0xd9)break;const size=data.getUint16(i+2);if(size<2||i+2+size>data.byteLength)break;
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&size>=7){height=data.getUint16(i+5);width=data.getUint16(i+7);break;}i+=size+2;}
  }
  if(!width||!height||width*height>4_000_000||width>8192||height>4096)throw new Error("Choose a PNG or JPEG crop under four million pixels.");
  return {width,height};
}
