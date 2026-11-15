import {mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {PDFDocument,StandardFonts} from "pdf-lib";
import {extractPdfBatch} from "../../lib/learning-engine/pdf";
import {scoreMedia,type MediaCase,type MediaObservation} from "../../lib/learning-engine/media-evaluation";

async function main(){
  const directory=path.resolve(process.argv[2]??"artifacts/learning-engine/research/native-pdf-seeds");
  await mkdir(directory,{recursive:true});
  const cases:MediaCase[]=[],observations:MediaObservation[]=[];
  const samples=[
    ["algebra",["Chapter 1 Equations","1. Solve 3x + 5 = 20.","Explain the operation used on both sides."]],
    ["geometry",["Chapter 2 Measurements","A rectangle has width 4 cm and height 7 cm.","Use the stated dimensions to find its area."]],
    ["reading",["Chapter 3 Evidence","The town planted trees beside the school.","By summer, the new shade cooled the playground.","Which detail supports a change in the playground?"]],
    ["table",["Chapter 4 Tables","Time | Distance","1 hour | 4 km","2 hours | 8 km","Describe the relationship between the two columns."]],
    ["systems",["Chapter 5 Systems","1. Solve x + y = 7 and 2x - y = 2.","Check both equations with the same ordered pair."]],
    ["domain",["Chapter 6 Domains","1. Simplify (x^2 - 1)/(x - 1).","Keep the original excluded value in your reasoning."]],
  ] as const;
  for(const [name,lines] of samples){
    const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
    const page=pdf.addPage([612,792]);
    lines.forEach((line,index)=>page.drawText(line,{font,size:12,x:48,y:730-index*30}));
    const bytes=await pdf.save(),assetHash=createHash("sha256").update(bytes).digest("hex"),assetPath=name+".pdf";
    await writeFile(path.join(directory,assetPath),bytes);
    // Gold text comes from the authored source, never from parser output.
    // Report whitespace-normalized exactness separately from raw character error.
    const expectedText=lines.join("\n");
    cases.push({id:"native-"+name,documentFamily:"authored-native-"+name,split:"test",assetPath,assetHash,mime:"application/pdf",
      provenance:"authored_synthetic",rightsReceipt:"authored-in-this-repository",humanReview:"pending",reviewerIds:[],expectedText,regions:[]});
    const extracted=await extractPdfBatch(bytes,1,1);
    observations.push({caseId:"native-"+name,assetHash,engineVersion:"pdfjs-6.3.289-native-regions-v1",observedText:extracted.pages[0].text,
      confidence:null,regions:(extracted.pages[0].regions??[]).map(region=>region.box)});
  }
  await writeFile(path.join(directory,"media-cases.jsonl"),cases.map(item=>JSON.stringify(item)).join("\n")+"\n");
  await writeFile(path.join(directory,"media-observations.jsonl"),observations.map(item=>JSON.stringify(item)).join("\n")+"\n");
  await writeFile(path.join(directory,"media-report.json"),JSON.stringify(scoreMedia(cases,observations),null,2)+"\n");
  console.log("Extracted six real PDF artifacts containing authored synthetic content. No provider calls, educator review or handwriting recognition.");
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Media seed extraction could not complete.");process.exitCode=1;});
