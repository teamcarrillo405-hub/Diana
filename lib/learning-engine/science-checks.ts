import { countSignificantFigures, chemicalSpeciesAtoms } from "@/lib/assignment-help/deterministic-verifiers";
type Dimensions=Record<string,number>;
type Unit={scale:number;dimensions:Dimensions};
// SI definitions: NIST SP 330, section 2. Symbols are case sensitive.
const units:Record<string,Unit>={
  kg:{scale:1,dimensions:{M:1}},g:{scale:1e-3,dimensions:{M:1}},mg:{scale:1e-6,dimensions:{M:1}},
  m:{scale:1,dimensions:{L:1}},cm:{scale:1e-2,dimensions:{L:1}},mm:{scale:1e-3,dimensions:{L:1}},km:{scale:1e3,dimensions:{L:1}},
  s:{scale:1,dimensions:{T:1}},ms:{scale:1e-3,dimensions:{T:1}},min:{scale:60,dimensions:{T:1}},h:{scale:3600,dimensions:{T:1}},
  mol:{scale:1,dimensions:{n:1}},A:{scale:1,dimensions:{I:1}},K:{scale:1,dimensions:{temperature:1}},
  L:{scale:1e-3,dimensions:{L:3}},mL:{scale:1e-6,dimensions:{L:3}},
  N:{scale:1,dimensions:{M:1,L:1,T:-2}},Pa:{scale:1,dimensions:{M:1,L:-1,T:-2}},kPa:{scale:1e3,dimensions:{M:1,L:-1,T:-2}},
  J:{scale:1,dimensions:{M:1,L:2,T:-2}},W:{scale:1,dimensions:{M:1,L:2,T:-3}},Hz:{scale:1,dimensions:{T:-1}},
};
const signature=(record:Dimensions)=>Object.entries(record).filter(([,power])=>power!==0).sort(([a],[b])=>a.localeCompare(b)).map(([key,power])=>key+"^"+power).join("*");
export function parseCompoundUnit(raw:string){
  if(raw.length>100)return null;
  const input=raw.trim().replaceAll("²","^2").replaceAll("³","^3").replace(/[·⋅]/gu,"*").replace(/\s*([*/])\s*/gu,"$1").replace(/\s+/gu,"*");
  if(!input||input.split("/").length>2)return null;
  const parts=input.split("/"),dimensions:Dimensions={},symbols:Dimensions={};let scale=1,count=0;
  for(let side=0;side<parts.length;side++)for(const term of parts[side].split("*")){
    if(term==="1"&&side===0&&parts[side]==="1")continue;
    const match=/^([A-Za-z]+)(?:\^(-?[1-6]))?$/u.exec(term);
    if(!match||!Object.hasOwn(units,match[1])||++count>8)return null;
    const unit=units[match[1]],power=Number(match[2]??1)*(side===0?1:-1);
    scale*=unit.scale**power;symbols[match[1]]=(symbols[match[1]]??0)+power;
    for(const [dimension,exponent] of Object.entries(unit.dimensions))dimensions[dimension]=(dimensions[dimension]??0)+exponent*power;
  }
  if(!count||!Number.isFinite(scale)||scale<=0)return null;
  return {scale,dimensions:signature(dimensions),symbols:signature(symbols)};
}
function quantity(raw:string){
  if(raw.length>160)return null;
  const match=/^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d{1,3})?)\s+(.+?)\s*$/u.exec(raw);
  if(!match)return null;
  const value=Number(match[1]),unit=parseCompoundUnit(match[2]),precision=countSignificantFigures(match[1]);
  if(!Number.isFinite(value)||!unit||precision===null||!Number.isFinite(value*unit.scale)||(value===0&&/[1-9]/u.test(match[1].split(/[eE]/u)[0]))||(value!==0&&value*unit.scale===0))return null;
  return {value,unit,precision};
}
export type ScienceCheck={status:"matches"|"revise"|"unsupported";guidance:string;observations:string[]};
export function verifyCompoundQuantity(expectedText:string,actualText:string,figures:number):ScienceCheck{
  const expected=quantity(expectedText),actual=quantity(actualText);
  if(!expected||!actual||!Number.isInteger(figures)||figures<1||figures>8||expected.precision!==figures)return {status:"unsupported",guidance:"Use a number and a supported unit, such as 2.50 m/s. Unit symbols are case sensitive.",observations:[]};
  if(actual.unit.dimensions!==expected.unit.dimensions)return {status:"revise",guidance:"These units describe a different physical quantity. Review the dimensions.",observations:[]};
  if(actual.unit.symbols!==expected.unit.symbols)return {status:"revise",guidance:"Convert your result to the unit requested in the question.",observations:["The dimensions are compatible; the requested unit expression still differs."]};
  const a=actual.value*actual.unit.scale,e=expected.value*expected.unit.scale;
  const valueMatches=Math.abs(a-e)<=Math.max(Math.abs(e),Math.abs(a),Number.MIN_VALUE)*1e-10;
  const matches=valueMatches&&actual.precision===figures;
  return {status:matches?"matches":"revise",guidance:matches?"The value, requested dimensions and precision match this question.":"Review the calculation and its significant figures.",observations:[`Required significant figures: ${figures}. Observed: ${actual.precision}.`]};
}

export type IonicSpecies={formula:string;charge:number};
export function validateIonicSpecies(species:IonicSpecies){
  if(!Number.isInteger(species.charge)||Math.abs(species.charge)>8)return null;
  if(species.formula==="e")return species.charge===-1?{}:null;
  return chemicalSpeciesAtoms(species.formula);
}
/** Charges are supplied by the authored specification, never inferred from prose. */
export function verifyIonicCoefficients(reactants:IonicSpecies[],products:IonicSpecies[],response:string):ScienceCheck{
  const all=[...reactants,...products],atoms=all.map(validateIonicSpecies);
  if(!reactants.length||!products.length||all.length>12||atoms.some(item=>item===null)||response.length>120)return {status:"unsupported",guidance:"This equation needs a supported species and charge specification.",observations:[]};
  const tokens=response.trim().split(/\s*,\s*/u);
  if(tokens.length!==all.length||tokens.some(token=>! /^[1-9]\d{0,3}$/u.test(token)))return {status:"unsupported",guidance:`Enter ${all.length} positive whole-number coefficients, separated by commas, in the displayed order.`,observations:[]};
  const coefficients=tokens.map(Number),counts=[{} as Record<string,number>,{} as Record<string,number>],charges=[0,0];
  all.forEach((species,index)=>{const side=index<reactants.length?0:1;charges[side]+=coefficients[index]*species.charge;for(const [element,count] of Object.entries(atoms[index]!))counts[side][element]=(counts[side][element]??0)+coefficients[index]*count;});
  const balanced=signature(counts[0])===signature(counts[1])&&charges[0]===charges[1];
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  const simplest=coefficients.reduce(gcd)===1;
  return {status:balanced&&simplest?"matches":"revise",guidance:!balanced?"Review both atom counts and total charge on each side.":!simplest?"Conservation holds. Reduce the coefficients to the smallest whole-number ratio.":"Atoms and total charge are conserved in the smallest whole-number ratio.",observations:[...new Set([...Object.keys(counts[0]),...Object.keys(counts[1])])].sort().map(element=>`${element}: ${counts[0][element]??0} on the left, ${counts[1][element]??0} on the right.`).concat(`Charge: ${charges[0]} on the left, ${charges[1]} on the right.`)};
}
