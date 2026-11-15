import {describe,expect,it} from "vitest";
import {readPcm16Wav,imageDimensions} from "./browser-recognition-input";
function wav(){const bytes=new ArrayBuffer(48),view=new DataView(bytes);for(const [offset,text] of [[0,"RIFF"],[8,"WAVE"],[12,"fmt "],[36,"data"]] as const)for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));view.setUint32(4,40,true);view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint16(34,16,true);view.setUint32(40,4,true);view.setInt16(44,16384,true);view.setInt16(46,-16384,true);return bytes;}
describe("browser recognition media bounds",()=>{
  it("decodes only PCM16 mono samples without remote decoding",()=>{expect([...readPcm16Wav(wav())]).toEqual([0.5,-0.5]);});
  it.each([[22,2],[24,48000],[34,32]])("rejects unsupported WAV format at field %i",(offset,value)=>{const bytes=wav();new DataView(bytes).setUint16(offset,value,true);expect(()=>readPcm16Wav(bytes)).toThrow();});
  it("rejects a data chunk larger than the available bytes",()=>{const bytes=wav();new DataView(bytes).setUint32(40,4000000,true);expect(()=>readPcm16Wav(bytes)).toThrow("incomplete");});
  it("rejects oversized PNG dimensions before image decoding",()=>{const bytes=new ArrayBuffer(24),v=new DataView(bytes);v.setUint32(0,0x89504e47);v.setUint32(4,0x0d0a1a0a);v.setUint32(16,50000);v.setUint32(20,50000);expect(()=>imageDimensions(bytes,"image/png")).toThrow("four million");});
  it("reads a bounded PNG header",()=>{const bytes=new ArrayBuffer(24),v=new DataView(bytes);v.setUint32(0,0x89504e47);v.setUint32(4,0x0d0a1a0a);v.setUint32(16,720);v.setUint32(20,78);expect(imageDimensions(bytes,"image/png")).toEqual({width:720,height:78});});
  it("rejects malformed JPEG before decoding",()=>{expect(()=>imageDimensions(new Uint8Array([255,216,255,192,0,1]).buffer,"image/jpeg")).toThrow();});
});
