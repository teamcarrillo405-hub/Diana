import {describe,it,expect} from "vitest";
import {parseCompoundUnit,verifyCompoundQuantity,verifyIonicCoefficients,validateIonicSpecies} from "./science-checks";
describe("bounded compound measurements",()=>{
  it("preserves dimensions, exponents, scale and case-sensitive unit symbols",()=>{
    expect(parseCompoundUnit("g/cm^3")?.scale).toBeCloseTo(1000);
    expect(parseCompoundUnit("g/cm^3")?.dimensions).toBe("L^-3*M^1");
    expect(parseCompoundUnit("kg * m / s²")?.dimensions).toBe(parseCompoundUnit("N")?.dimensions);
    expect(parseCompoundUnit("N")?.dimensions).not.toBe(parseCompoundUnit("J")?.dimensions);
    for(const input of ["M/s","m/s/s","m/(s)","m^0","m^7","degC","foo","m//s","m/","__proto__","constructor","toString"])expect(parseCompoundUnit(input)).toBeNull();
  });
  it("distinguishes compatible units from the required output and precision",()=>{
    expect(verifyCompoundQuantity("2.50 m/s","2.50 m*s^-1",3).status).toBe("matches");
    expect(verifyCompoundQuantity("2.50 m/s","2.50 m/s^2",3).status).toBe("revise");
    expect(verifyCompoundQuantity("2.50 m/s","9.00 km/h",3).status).toBe("revise");
    expect(verifyCompoundQuantity("2.50 m/s","2.5 m/s",3).status).toBe("revise");
    expect(verifyCompoundQuantity("2.50 m/s","2.51 m/s",3).status).toBe("revise");
    expect(verifyCompoundQuantity("2.50 m/s","2.50",3).status).toBe("unsupported");
    expect(verifyCompoundQuantity("2.50 m/s","2.50 m/s",2).status).toBe("unsupported");
  });
});
describe("bounded ionic conservation",()=>{
  const reactants=[{formula:"Zn",charge:0},{formula:"Cu",charge:2}],products=[{formula:"Zn",charge:2},{formula:"Cu",charge:0}];
  it("checks atoms and charges independently and requires smallest coefficients",()=>{
    expect(verifyIonicCoefficients(reactants,products,"1,1,1,1").status).toBe("matches");
    expect(verifyIonicCoefficients(reactants,products,"2,2,2,2").guidance).toContain("smallest");
    expect(verifyIonicCoefficients(reactants,products,"1,2,1,1").status).toBe("revise");
    expect(verifyIonicCoefficients([{formula:"Fe",charge:2}],[{formula:"Fe",charge:3}],"1,1").status).toBe("revise");
    expect(verifyIonicCoefficients([{formula:"Fe",charge:2}],[{formula:"Fe",charge:3},{formula:"e",charge:-1}],"1,1,1").status).toBe("matches");
  });
  it("rejects invented elements, malformed groups, implicit charges and arbitrary equations",()=>{
    expect(validateIonicSpecies({formula:"Ca(OH)2",charge:0})).toEqual({Ca:1,H:2,O:2});
    for(const formula of ["Xx","2H2O","Na+","Ca(OH","Fe^3+","H0"])expect(validateIonicSpecies({formula,charge:0})).toBeNull();
    expect(validateIonicSpecies({formula:"e",charge:1})).toBeNull();
    for(const response of ["1,1,1","0,1,1,1","1.5,1,1,1","Zn + Cu -> Zn + Cu","10000,1,1,1"])expect(verifyIonicCoefficients(reactants,products,response).status).toBe("unsupported");
  });
});
