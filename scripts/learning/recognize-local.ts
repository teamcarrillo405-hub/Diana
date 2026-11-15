import {readFile,stat,writeFile} from "node:fs/promises";
import path from "node:path";
import {runLocalRecognition} from "../../lib/learning-engine/local-recognition-runner";

/** An explicit local evaluation command for private, permissioned assets. */
async function main(){
  const [manifestPath,assetPath,mime,outputPath]=process.argv.slice(2),python=process.env.DIANA_RECOGNITION_PYTHON;
  if(!manifestPath||!assetPath||!outputPath||!python||!path.isAbsolute(python)) throw new Error("Supply a manifest, asset, MIME type and new output path, with an absolute DIANA_RECOGNITION_PYTHON executable.");
  if((await stat(assetPath)).size>5_000_000)throw new Error("Recognition input exceeds the local bound.");
  const draft=await runLocalRecognition({manifestPath:path.resolve(manifestPath),asset:await readFile(assetPath),mime,python});
  await writeFile(outputPath,JSON.stringify(draft,null,2)+"\n",{flag:"wx"});
  console.log("Unconfirmed local transcription saved. Compare it with the original before use.");
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Local recognition could not complete.");process.exitCode=1;});
