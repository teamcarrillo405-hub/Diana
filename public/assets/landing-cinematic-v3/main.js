"use strict";(()=>{var vm=0,If=1,ym=2;var Zo=1,Sm=2,ka=3,yr=0,Yn=1,Bt=2,nr=0,Rs=1,Df=2,Lf=3,Uf=4,Mm=5;var Jr=100,bm=101,Tm=102,Em=103,wm=104,Am=200,Cm=201,Rm=202,Pm=203,pc=204,mc=205,Im=206,Dm=207,Lm=208,Um=209,Nm=210,Fm=211,Om=212,Bm=213,km=214,gc=0,_c=1,xc=2,Ps=3,vc=4,yc=5,Sc=6,Mc=7,Nf=0,zm=1,Vm=2,Vi=0,Ff=1,Of=2,Bf=3,Jo=4,kf=5,zf=6,Vf=7;var Hf=300,rs=301,Fs=302,ru=303,su=304,$o=306,bc=1e3,Ki=1001,Tc=1002,bn=1003,Hm=1004;var Ko=1005;var Ft=1006,au=1007;var ss=1008;var ri=1009,Gf=1010,Wf=1011,za=1012,ou=1013,Hi=1014,Gi=1015,gi=1016,lu=1017,cu=1018,Va=1020,Xf=35902,qf=35899,Yf=1021,Zf=1022,Ri=1023,Qi=1026,as=1027,Jf=1028,uu=1029,os=1030,hu=1031;var fu=1033,Qo=33776,jo=33777,el=33778,tl=33779,du=35840,pu=35841,mu=35842,gu=35843,_u=36196,xu=37492,vu=37496,yu=37488,Su=37489,nl=37490,Mu=37491,bu=37808,Tu=37809,Eu=37810,wu=37811,Au=37812,Cu=37813,Ru=37814,Pu=37815,Iu=37816,Du=37817,Lu=37818,Uu=37819,Nu=37820,Fu=37821,Ou=36492,Bu=36494,ku=36495,zu=36283,Vu=36284,il=36285,Hu=36286;var Co=2300,Ec=2301,fc=2302,_f=2303,xf=2400,vf=2401,yf=2402;var Gm=3200;var Gu=0,Wm=1,Er="",Vt="srgb",Ro="srgb-linear",Po="linear",Tt="srgb";var As=7680;var Sf=519,Xm=512,qm=513,Ym=514,Wu=515,Zm=516,Jm=517,Xu=518,$m=519,Mf=35044;var $f="300 es",zi=2e3,Aa=2001;function rx(r){for(let e=r.length-1;e>=0;--e)if(r[e]>=65535)return!0;return!1}function sx(r){return ArrayBuffer.isView(r)&&!(r instanceof DataView)}function Ca(r){return document.createElementNS("http://www.w3.org/1999/xhtml",r)}function Km(){let r=Ca("canvas");return r.style.display="block",r}var Gp={},Ra=null;function Kf(...r){let e="THREE."+r.shift();Ra?Ra("log",e,...r):console.log(e,...r)}function Qm(r){let e=r[0];if(typeof e=="string"&&e.startsWith("TSL:")){let t=r[1];t&&t.isStackTrace?r[0]+=" "+t.getLocation():r[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return r}function tt(...r){r=Qm(r);let e="THREE."+r.shift();if(Ra)Ra("warn",e,...r);else{let t=r[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...r)}}function nt(...r){r=Qm(r);let e="THREE."+r.shift();if(Ra)Ra("error",e,...r);else{let t=r[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...r)}}function wc(...r){let e=r.join(" ");e in Gp||(Gp[e]=!0,tt(...r))}function jm(r,e,t){return new Promise(function(n,i){function s(){switch(r.clientWaitSync(e,r.SYNC_FLUSH_COMMANDS_BIT,0)){case r.WAIT_FAILED:i();break;case r.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}}setTimeout(s,t)})}var eg={[gc]:_c,[xc]:Sc,[vc]:Mc,[Ps]:yc,[_c]:gc,[Sc]:xc,[Mc]:vc,[yc]:Ps},ji=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let i=n[e];if(i!==void 0){let s=i.indexOf(t);s!==-1&&i.splice(s,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let i=n.slice(0);for(let s=0,a=i.length;s<a;s++)i[s].call(this,e);e.target=null}}},Ln=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Wp=1234567,To=Math.PI/180,Pa=180/Math.PI;function Os(){let r=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ln[r&255]+Ln[r>>8&255]+Ln[r>>16&255]+Ln[r>>24&255]+"-"+Ln[e&255]+Ln[e>>8&255]+"-"+Ln[e>>16&15|64]+Ln[e>>24&255]+"-"+Ln[t&63|128]+Ln[t>>8&255]+"-"+Ln[t>>16&255]+Ln[t>>24&255]+Ln[n&255]+Ln[n>>8&255]+Ln[n>>16&255]+Ln[n>>24&255]).toLowerCase()}function pt(r,e,t){return Math.max(e,Math.min(t,r))}function Qf(r,e){return(r%e+e)%e}function ax(r,e,t,n,i){return n+(r-e)*(i-n)/(t-e)}function ox(r,e,t){return r!==e?(t-r)/(e-r):0}function Eo(r,e,t){return(1-t)*r+t*e}function lx(r,e,t,n){return Eo(r,e,1-Math.exp(-t*n))}function cx(r,e=1){return e-Math.abs(Qf(r,e*2)-e)}function ux(r,e,t){return r<=e?0:r>=t?1:(r=(r-e)/(t-e),r*r*(3-2*r))}function hx(r,e,t){return r<=e?0:r>=t?1:(r=(r-e)/(t-e),r*r*r*(r*(r*6-15)+10))}function fx(r,e){return r+Math.floor(Math.random()*(e-r+1))}function dx(r,e){return r+Math.random()*(e-r)}function px(r){return r*(.5-Math.random())}function mx(r){r!==void 0&&(Wp=r);let e=Wp+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function gx(r){return r*To}function _x(r){return r*Pa}function xx(r){return(r&r-1)===0&&r!==0}function vx(r){return Math.pow(2,Math.ceil(Math.log(r)/Math.LN2))}function yx(r){return Math.pow(2,Math.floor(Math.log(r)/Math.LN2))}function Sx(r,e,t,n,i){let s=Math.cos,a=Math.sin,o=s(t/2),l=a(t/2),c=s((e+n)/2),u=a((e+n)/2),d=s((e-n)/2),h=a((e-n)/2),f=s((n-e)/2),m=a((n-e)/2);switch(i){case"XYX":r.set(o*u,l*d,l*h,o*c);break;case"YZY":r.set(l*h,o*u,l*d,o*c);break;case"ZXZ":r.set(l*d,l*h,o*u,o*c);break;case"XZX":r.set(o*u,l*m,l*f,o*c);break;case"YXY":r.set(l*f,o*u,l*m,o*c);break;case"ZYZ":r.set(l*m,l*f,o*u,o*c);break;default:tt("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function Ea(r,e){switch(e.constructor){case Float32Array:return r;case Uint32Array:return r/4294967295;case Uint16Array:return r/65535;case Uint8Array:return r/255;case Int32Array:return Math.max(r/2147483647,-1);case Int16Array:return Math.max(r/32767,-1);case Int8Array:return Math.max(r/127,-1);default:throw new Error("Invalid component type.")}}function Xn(r,e){switch(e.constructor){case Float32Array:return r;case Uint32Array:return Math.round(r*4294967295);case Uint16Array:return Math.round(r*65535);case Uint8Array:return Math.round(r*255);case Int32Array:return Math.round(r*2147483647);case Int16Array:return Math.round(r*32767);case Int8Array:return Math.round(r*127);default:throw new Error("Invalid component type.")}}var rt={DEG2RAD:To,RAD2DEG:Pa,generateUUID:Os,clamp:pt,euclideanModulo:Qf,mapLinear:ax,inverseLerp:ox,lerp:Eo,damp:lx,pingpong:cx,smoothstep:ux,smootherstep:hx,randInt:fx,randFloat:dx,randFloatSpread:px,seededRandom:mx,degToRad:gx,radToDeg:_x,isPowerOfTwo:xx,ceilPowerOfTwo:vx,floorPowerOfTwo:yx,setQuaternionFromProperEuler:Sx,normalize:Xn,denormalize:Ea},we=class r{static{r.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=pt(this.x,e.x,t.x),this.y=pt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=pt(this.x,e,t),this.y=pt(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(pt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(pt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),i=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*n-a*i+e.x,this.y=s*i+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},er=class{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,s,a,o){let l=n[i+0],c=n[i+1],u=n[i+2],d=n[i+3],h=s[a+0],f=s[a+1],m=s[a+2],_=s[a+3];if(d!==_||l!==h||c!==f||u!==m){let p=l*h+c*f+u*m+d*_;p<0&&(h=-h,f=-f,m=-m,_=-_,p=-p);let g=1-o;if(p<.9995){let S=Math.acos(p),M=Math.sin(S);g=Math.sin(g*S)/M,o=Math.sin(o*S)/M,l=l*g+h*o,c=c*g+f*o,u=u*g+m*o,d=d*g+_*o}else{l=l*g+h*o,c=c*g+f*o,u=u*g+m*o,d=d*g+_*o;let S=1/Math.sqrt(l*l+c*c+u*u+d*d);l*=S,c*=S,u*=S,d*=S}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=d}static multiplyQuaternionsFlat(e,t,n,i,s,a){let o=n[i],l=n[i+1],c=n[i+2],u=n[i+3],d=s[a],h=s[a+1],f=s[a+2],m=s[a+3];return e[t]=o*m+u*d+l*f-c*h,e[t+1]=l*m+u*h+c*d-o*f,e[t+2]=c*m+u*f+o*h-l*d,e[t+3]=u*m-o*d-l*h-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,i=e._y,s=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(n/2),u=o(i/2),d=o(s/2),h=l(n/2),f=l(i/2),m=l(s/2);switch(a){case"XYZ":this._x=h*u*d+c*f*m,this._y=c*f*d-h*u*m,this._z=c*u*m+h*f*d,this._w=c*u*d-h*f*m;break;case"YXZ":this._x=h*u*d+c*f*m,this._y=c*f*d-h*u*m,this._z=c*u*m-h*f*d,this._w=c*u*d+h*f*m;break;case"ZXY":this._x=h*u*d-c*f*m,this._y=c*f*d+h*u*m,this._z=c*u*m+h*f*d,this._w=c*u*d-h*f*m;break;case"ZYX":this._x=h*u*d-c*f*m,this._y=c*f*d+h*u*m,this._z=c*u*m-h*f*d,this._w=c*u*d+h*f*m;break;case"YZX":this._x=h*u*d+c*f*m,this._y=c*f*d+h*u*m,this._z=c*u*m-h*f*d,this._w=c*u*d-h*f*m;break;case"XZY":this._x=h*u*d-c*f*m,this._y=c*f*d-h*u*m,this._z=c*u*m+h*f*d,this._w=c*u*d+h*f*m;break;default:tt("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],i=t[4],s=t[8],a=t[1],o=t[5],l=t[9],c=t[2],u=t[6],d=t[10],h=n+o+d;if(h>0){let f=.5/Math.sqrt(h+1);this._w=.25/f,this._x=(u-l)*f,this._y=(s-c)*f,this._z=(a-i)*f}else if(n>o&&n>d){let f=2*Math.sqrt(1+n-o-d);this._w=(u-l)/f,this._x=.25*f,this._y=(i+a)/f,this._z=(s+c)/f}else if(o>d){let f=2*Math.sqrt(1+o-n-d);this._w=(s-c)/f,this._x=(i+a)/f,this._y=.25*f,this._z=(l+u)/f}else{let f=2*Math.sqrt(1+d-n-o);this._w=(a-i)/f,this._x=(s+c)/f,this._y=(l+u)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(pt(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,i=e._y,s=e._z,a=e._w,o=t._x,l=t._y,c=t._z,u=t._w;return this._x=n*u+a*o+i*c-s*l,this._y=i*u+a*l+s*o-n*c,this._z=s*u+a*c+n*l-i*o,this._w=a*u-n*o-i*l-s*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,i=e._y,s=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,i=-i,s=-s,a=-a,o=-o);let l=1-t;if(o<.9995){let c=Math.acos(o),u=Math.sin(c);l=Math.sin(l*c)/u,t=Math.sin(t*c)/u,this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+s*t,this._w=this._w*l+a*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+s*t,this._w=this._w*l+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},W=class r{static{r.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Xp.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Xp.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*i,this.y=s[1]*t+s[4]*n+s[7]*i,this.z=s[2]*t+s[5]*n+s[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,i=this.z,s=e.elements,a=1/(s[3]*t+s[7]*n+s[11]*i+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*i+s[12])*a,this.y=(s[1]*t+s[5]*n+s[9]*i+s[13])*a,this.z=(s[2]*t+s[6]*n+s[10]*i+s[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,i=this.z,s=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*i-o*n),u=2*(o*t-s*i),d=2*(s*n-a*t);return this.x=t+l*c+a*d-o*u,this.y=n+l*u+o*c-s*d,this.z=i+l*d+s*u-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*i,this.y=s[1]*t+s[5]*n+s[9]*i,this.z=s[2]*t+s[6]*n+s[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=pt(this.x,e.x,t.x),this.y=pt(this.y,e.y,t.y),this.z=pt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=pt(this.x,e,t),this.y=pt(this.y,e,t),this.z=pt(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(pt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,i=e.y,s=e.z,a=t.x,o=t.y,l=t.z;return this.x=i*l-s*o,this.y=s*a-n*l,this.z=n*o-i*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Wh.copy(this).projectOnVector(e),this.sub(Wh)}reflect(e){return this.sub(Wh.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(pt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Wh=new W,Xp=new er,st=class r{static{r.prototype.isMatrix3=!0}constructor(e,t,n,i,s,a,o,l,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,s,a,o,l,c)}set(e,t,n,i,s,a,o,l,c){let u=this.elements;return u[0]=e,u[1]=i,u[2]=o,u[3]=t,u[4]=s,u[5]=l,u[6]=n,u[7]=a,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,i=t.elements,s=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],u=n[4],d=n[7],h=n[2],f=n[5],m=n[8],_=i[0],p=i[3],g=i[6],S=i[1],M=i[4],x=i[7],R=i[2],E=i[5],A=i[8];return s[0]=a*_+o*S+l*R,s[3]=a*p+o*M+l*E,s[6]=a*g+o*x+l*A,s[1]=c*_+u*S+d*R,s[4]=c*p+u*M+d*E,s[7]=c*g+u*x+d*A,s[2]=h*_+f*S+m*R,s[5]=h*p+f*M+m*E,s[8]=h*g+f*x+m*A,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8];return t*a*u-t*o*c-n*s*u+n*o*l+i*s*c-i*a*l}invert(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8],d=u*a-o*c,h=o*l-u*s,f=c*s-a*l,m=t*d+n*h+i*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let _=1/m;return e[0]=d*_,e[1]=(i*c-u*n)*_,e[2]=(o*n-i*a)*_,e[3]=h*_,e[4]=(u*t-i*l)*_,e[5]=(i*s-o*t)*_,e[6]=f*_,e[7]=(n*l-c*t)*_,e[8]=(a*t-n*s)*_,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,s,a,o){let l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*a+c*o)+a+e,-i*c,i*l,-i*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Xh.makeScale(e,t)),this}rotate(e){return this.premultiply(Xh.makeRotation(-e)),this}translate(e,t){return this.premultiply(Xh.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Xh=new st,qp=new st().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Yp=new st().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Mx(){let r={enabled:!0,workingColorSpace:Ro,spaces:{},convert:function(i,s,a){return this.enabled===!1||s===a||!s||!a||(this.spaces[s].transfer===Tt&&(i.r=vr(i.r),i.g=vr(i.g),i.b=vr(i.b)),this.spaces[s].primaries!==this.spaces[a].primaries&&(i.applyMatrix3(this.spaces[s].toXYZ),i.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===Tt&&(i.r=wa(i.r),i.g=wa(i.g),i.b=wa(i.b))),i},workingToColorSpace:function(i,s){return this.convert(i,this.workingColorSpace,s)},colorSpaceToWorking:function(i,s){return this.convert(i,s,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===Er?Po:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,s=this.workingColorSpace){return i.fromArray(this.spaces[s].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,s,a){return i.copy(this.spaces[s].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(i,s){return wc("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),r.workingToColorSpace(i,s)},toWorkingColorSpace:function(i,s){return wc("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),r.colorSpaceToWorking(i,s)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return r.define({[Ro]:{primaries:e,whitePoint:n,transfer:Po,toXYZ:qp,fromXYZ:Yp,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Vt},outputColorSpaceConfig:{drawingBufferColorSpace:Vt}},[Vt]:{primaries:e,whitePoint:n,transfer:Tt,toXYZ:qp,fromXYZ:Yp,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Vt}}}),r}var xt=Mx();function vr(r){return r<.04045?r*.0773993808:Math.pow(r*.9478672986+.0521327014,2.4)}function wa(r){return r<.0031308?r*12.92:1.055*Math.pow(r,.41666)-.055}var fa,Ac=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{fa===void 0&&(fa=Ca("canvas")),fa.width=e.width,fa.height=e.height;let i=fa.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=fa}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=Ca("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let i=n.getImageData(0,0,e.width,e.height),s=i.data;for(let a=0;a<s.length;a++)s[a]=vr(s[a]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(vr(t[n]/255)*255):t[n]=vr(t[n]);return{data:t,width:e.width,height:e.height}}else return tt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},bx=0,Ia=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:bx++}),this.uuid=Os(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let s;if(Array.isArray(i)){s=[];for(let a=0,o=i.length;a<o;a++)i[a].isDataTexture?s.push(qh(i[a].image)):s.push(qh(i[a]))}else s=qh(i);n.url=s}return t||(e.images[this.uuid]=n),n}};function qh(r){return typeof HTMLImageElement<"u"&&r instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&r instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&r instanceof ImageBitmap?Ac.getDataURL(r):r.data?{data:Array.from(r.data),width:r.width,height:r.height,type:r.data.constructor.name}:(tt("Texture: Unable to serialize Texture."),{})}var Tx=0,Yh=new W,Cn=class r extends ji{constructor(e=r.DEFAULT_IMAGE,t=r.DEFAULT_MAPPING,n=Ki,i=Ki,s=Ft,a=ss,o=Ri,l=ri,c=r.DEFAULT_ANISOTROPY,u=Er){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Tx++}),this.uuid=Os(),this.name="",this.source=new Ia(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=s,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new we(0,0),this.repeat=new we(1,1),this.center=new we(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new st,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Yh).x}get height(){return this.source.getSize(Yh).y}get depth(){return this.source.getSize(Yh).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){tt(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let i=this[t];if(i===void 0){tt(`Texture.setValues(): property '${t}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Hf)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case bc:e.x=e.x-Math.floor(e.x);break;case Ki:e.x=e.x<0?0:1;break;case Tc:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case bc:e.y=e.y-Math.floor(e.y);break;case Ki:e.y=e.y<0?0:1;break;case Tc:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Cn.DEFAULT_IMAGE=null;Cn.DEFAULT_MAPPING=Hf;Cn.DEFAULT_ANISOTROPY=1;var Gt=class r{static{r.prototype.isVector4=!0}constructor(e=0,t=0,n=0,i=1){this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,i=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*i+a[12]*s,this.y=a[1]*t+a[5]*n+a[9]*i+a[13]*s,this.z=a[2]*t+a[6]*n+a[10]*i+a[14]*s,this.w=a[3]*t+a[7]*n+a[11]*i+a[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,s,l=e.elements,c=l[0],u=l[4],d=l[8],h=l[1],f=l[5],m=l[9],_=l[2],p=l[6],g=l[10];if(Math.abs(u-h)<.01&&Math.abs(d-_)<.01&&Math.abs(m-p)<.01){if(Math.abs(u+h)<.1&&Math.abs(d+_)<.1&&Math.abs(m+p)<.1&&Math.abs(c+f+g-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let M=(c+1)/2,x=(f+1)/2,R=(g+1)/2,E=(u+h)/4,A=(d+_)/4,v=(m+p)/4;return M>x&&M>R?M<.01?(n=0,i=.707106781,s=.707106781):(n=Math.sqrt(M),i=E/n,s=A/n):x>R?x<.01?(n=.707106781,i=0,s=.707106781):(i=Math.sqrt(x),n=E/i,s=v/i):R<.01?(n=.707106781,i=.707106781,s=0):(s=Math.sqrt(R),n=A/s,i=v/s),this.set(n,i,s,t),this}let S=Math.sqrt((p-m)*(p-m)+(d-_)*(d-_)+(h-u)*(h-u));return Math.abs(S)<.001&&(S=1),this.x=(p-m)/S,this.y=(d-_)/S,this.z=(h-u)/S,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=pt(this.x,e.x,t.x),this.y=pt(this.y,e.y,t.y),this.z=pt(this.z,e.z,t.z),this.w=pt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=pt(this.x,e,t),this.y=pt(this.y,e,t),this.z=pt(this.z,e,t),this.w=pt(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(pt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Cc=class extends ji{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ft,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Gt(0,0,e,t),this.scissorTest=!1,this.viewport=new Gt(0,0,e,t),this.textures=[];let i={width:e,height:t,depth:n.depth},s=new Cn(i),a=n.count;for(let o=0;o<a;o++)this.textures[o]=s.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){let t={minFilter:Ft,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,s=this.textures.length;i<s;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0&&(this.textures[i].isArrayTexture=this.textures[i].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let i=Object.assign({},e.textures[t].image);this.textures[t].source=new Ia(i)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this}dispose(){this.dispatchEvent({type:"dispose"})}},Tn=class extends Cc{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},Io=class extends Cn{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=bn,this.minFilter=bn,this.wrapR=Ki,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var Rc=class extends Cn{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=bn,this.minFilter=bn,this.wrapR=Ki,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Ut=class r{static{r.prototype.isMatrix4=!0}constructor(e,t,n,i,s,a,o,l,c,u,d,h,f,m,_,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,s,a,o,l,c,u,d,h,f,m,_,p)}set(e,t,n,i,s,a,o,l,c,u,d,h,f,m,_,p){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=i,g[1]=s,g[5]=a,g[9]=o,g[13]=l,g[2]=c,g[6]=u,g[10]=d,g[14]=h,g[3]=f,g[7]=m,g[11]=_,g[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new r().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinant()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinant()===0)return this.identity();let t=this.elements,n=e.elements,i=1/da.setFromMatrixColumn(e,0).length(),s=1/da.setFromMatrixColumn(e,1).length(),a=1/da.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,i=e.y,s=e.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(i),c=Math.sin(i),u=Math.cos(s),d=Math.sin(s);if(e.order==="XYZ"){let h=a*u,f=a*d,m=o*u,_=o*d;t[0]=l*u,t[4]=-l*d,t[8]=c,t[1]=f+m*c,t[5]=h-_*c,t[9]=-o*l,t[2]=_-h*c,t[6]=m+f*c,t[10]=a*l}else if(e.order==="YXZ"){let h=l*u,f=l*d,m=c*u,_=c*d;t[0]=h+_*o,t[4]=m*o-f,t[8]=a*c,t[1]=a*d,t[5]=a*u,t[9]=-o,t[2]=f*o-m,t[6]=_+h*o,t[10]=a*l}else if(e.order==="ZXY"){let h=l*u,f=l*d,m=c*u,_=c*d;t[0]=h-_*o,t[4]=-a*d,t[8]=m+f*o,t[1]=f+m*o,t[5]=a*u,t[9]=_-h*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){let h=a*u,f=a*d,m=o*u,_=o*d;t[0]=l*u,t[4]=m*c-f,t[8]=h*c+_,t[1]=l*d,t[5]=_*c+h,t[9]=f*c-m,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){let h=a*l,f=a*c,m=o*l,_=o*c;t[0]=l*u,t[4]=_-h*d,t[8]=m*d+f,t[1]=d,t[5]=a*u,t[9]=-o*u,t[2]=-c*u,t[6]=f*d+m,t[10]=h-_*d}else if(e.order==="XZY"){let h=a*l,f=a*c,m=o*l,_=o*c;t[0]=l*u,t[4]=-d,t[8]=c*u,t[1]=h*d+_,t[5]=a*u,t[9]=f*d-m,t[2]=m*d-f,t[6]=o*u,t[10]=_*d+h}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Ex,e,wx)}lookAt(e,t,n){let i=this.elements;return fi.subVectors(e,t),fi.lengthSq()===0&&(fi.z=1),fi.normalize(),Hr.crossVectors(n,fi),Hr.lengthSq()===0&&(Math.abs(n.z)===1?fi.x+=1e-4:fi.z+=1e-4,fi.normalize(),Hr.crossVectors(n,fi)),Hr.normalize(),Hl.crossVectors(fi,Hr),i[0]=Hr.x,i[4]=Hl.x,i[8]=fi.x,i[1]=Hr.y,i[5]=Hl.y,i[9]=fi.y,i[2]=Hr.z,i[6]=Hl.z,i[10]=fi.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,i=t.elements,s=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],u=n[1],d=n[5],h=n[9],f=n[13],m=n[2],_=n[6],p=n[10],g=n[14],S=n[3],M=n[7],x=n[11],R=n[15],E=i[0],A=i[4],v=i[8],b=i[12],P=i[1],C=i[5],I=i[9],H=i[13],V=i[2],D=i[6],O=i[10],F=i[14],Z=i[3],ee=i[7],L=i[11],ie=i[15];return s[0]=a*E+o*P+l*V+c*Z,s[4]=a*A+o*C+l*D+c*ee,s[8]=a*v+o*I+l*O+c*L,s[12]=a*b+o*H+l*F+c*ie,s[1]=u*E+d*P+h*V+f*Z,s[5]=u*A+d*C+h*D+f*ee,s[9]=u*v+d*I+h*O+f*L,s[13]=u*b+d*H+h*F+f*ie,s[2]=m*E+_*P+p*V+g*Z,s[6]=m*A+_*C+p*D+g*ee,s[10]=m*v+_*I+p*O+g*L,s[14]=m*b+_*H+p*F+g*ie,s[3]=S*E+M*P+x*V+R*Z,s[7]=S*A+M*C+x*D+R*ee,s[11]=S*v+M*I+x*O+R*L,s[15]=S*b+M*H+x*F+R*ie,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],i=e[8],s=e[12],a=e[1],o=e[5],l=e[9],c=e[13],u=e[2],d=e[6],h=e[10],f=e[14],m=e[3],_=e[7],p=e[11],g=e[15],S=l*f-c*h,M=o*f-c*d,x=o*h-l*d,R=a*f-c*u,E=a*h-l*u,A=a*d-o*u;return t*(_*S-p*M+g*x)-n*(m*S-p*R+g*E)+i*(m*M-_*R+g*A)-s*(m*x-_*E+p*A)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8],d=e[9],h=e[10],f=e[11],m=e[12],_=e[13],p=e[14],g=e[15],S=t*o-n*a,M=t*l-i*a,x=t*c-s*a,R=n*l-i*o,E=n*c-s*o,A=i*c-s*l,v=u*_-d*m,b=u*p-h*m,P=u*g-f*m,C=d*p-h*_,I=d*g-f*_,H=h*g-f*p,V=S*H-M*I+x*C+R*P-E*b+A*v;if(V===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let D=1/V;return e[0]=(o*H-l*I+c*C)*D,e[1]=(i*I-n*H-s*C)*D,e[2]=(_*A-p*E+g*R)*D,e[3]=(h*E-d*A-f*R)*D,e[4]=(l*P-a*H-c*b)*D,e[5]=(t*H-i*P+s*b)*D,e[6]=(p*x-m*A-g*M)*D,e[7]=(u*A-h*x+f*M)*D,e[8]=(a*I-o*P+c*v)*D,e[9]=(n*P-t*I-s*v)*D,e[10]=(m*E-_*x+g*S)*D,e[11]=(d*x-u*E-f*S)*D,e[12]=(o*b-a*C-l*v)*D,e[13]=(t*C-n*b+i*v)*D,e[14]=(_*M-m*R-p*S)*D,e[15]=(u*R-d*M+h*S)*D,this}scale(e){let t=this.elements,n=e.x,i=e.y,s=e.z;return t[0]*=n,t[4]*=i,t[8]*=s,t[1]*=n,t[5]*=i,t[9]*=s,t[2]*=n,t[6]*=i,t[10]*=s,t[3]*=n,t[7]*=i,t[11]*=s,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),i=Math.sin(t),s=1-n,a=e.x,o=e.y,l=e.z,c=s*a,u=s*o;return this.set(c*a+n,c*o-i*l,c*l+i*o,0,c*o+i*l,u*o+n,u*l-i*a,0,c*l-i*o,u*l+i*a,s*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,s,a){return this.set(1,n,s,0,e,1,a,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){let i=this.elements,s=t._x,a=t._y,o=t._z,l=t._w,c=s+s,u=a+a,d=o+o,h=s*c,f=s*u,m=s*d,_=a*u,p=a*d,g=o*d,S=l*c,M=l*u,x=l*d,R=n.x,E=n.y,A=n.z;return i[0]=(1-(_+g))*R,i[1]=(f+x)*R,i[2]=(m-M)*R,i[3]=0,i[4]=(f-x)*E,i[5]=(1-(h+g))*E,i[6]=(p+S)*E,i[7]=0,i[8]=(m+M)*A,i[9]=(p-S)*A,i[10]=(1-(h+_))*A,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){let i=this.elements;e.x=i[12],e.y=i[13],e.z=i[14];let s=this.determinant();if(s===0)return n.set(1,1,1),t.identity(),this;let a=da.set(i[0],i[1],i[2]).length(),o=da.set(i[4],i[5],i[6]).length(),l=da.set(i[8],i[9],i[10]).length();s<0&&(a=-a),Oi.copy(this);let c=1/a,u=1/o,d=1/l;return Oi.elements[0]*=c,Oi.elements[1]*=c,Oi.elements[2]*=c,Oi.elements[4]*=u,Oi.elements[5]*=u,Oi.elements[6]*=u,Oi.elements[8]*=d,Oi.elements[9]*=d,Oi.elements[10]*=d,t.setFromRotationMatrix(Oi),n.x=a,n.y=o,n.z=l,this}makePerspective(e,t,n,i,s,a,o=zi,l=!1){let c=this.elements,u=2*s/(t-e),d=2*s/(n-i),h=(t+e)/(t-e),f=(n+i)/(n-i),m,_;if(l)m=s/(a-s),_=a*s/(a-s);else if(o===zi)m=-(a+s)/(a-s),_=-2*a*s/(a-s);else if(o===Aa)m=-a/(a-s),_=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=h,c[12]=0,c[1]=0,c[5]=d,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=_,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,i,s,a,o=zi,l=!1){let c=this.elements,u=2/(t-e),d=2/(n-i),h=-(t+e)/(t-e),f=-(n+i)/(n-i),m,_;if(l)m=1/(a-s),_=a/(a-s);else if(o===zi)m=-2/(a-s),_=-(a+s)/(a-s);else if(o===Aa)m=-1/(a-s),_=-s/(a-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=0,c[12]=h,c[1]=0,c[5]=d,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=m,c[14]=_,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},da=new W,Oi=new Ut,Ex=new W(0,0,0),wx=new W(1,1,1),Hr=new W,Hl=new W,fi=new W,Zp=new Ut,Jp=new er,Sr=class r{constructor(e=0,t=0,n=0,i=r.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let i=e.elements,s=i[0],a=i[4],o=i[8],l=i[1],c=i[5],u=i[9],d=i[2],h=i[6],f=i[10];switch(t){case"XYZ":this._y=Math.asin(pt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,f),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(h,c),this._z=0);break;case"YXZ":this._x=Math.asin(-pt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,s),this._z=0);break;case"ZXY":this._x=Math.asin(pt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-pt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(h,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(pt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-d,s)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-pt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(h,c),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-u,f),this._y=0);break;default:tt("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Zp.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Zp,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Jp.setFromEuler(this),this.setFromQuaternion(Jp,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Sr.DEFAULT_ORDER="XYZ";var Do=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},Ax=0,$p=new W,pa=new er,pr=new Ut,Gl=new W,xo=new W,Cx=new W,Rx=new er,Kp=new W(1,0,0),Qp=new W(0,1,0),jp=new W(0,0,1),em={type:"added"},Px={type:"removed"},ma={type:"childadded",child:null},Zh={type:"childremoved",child:null},Fn=class r extends ji{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Ax++}),this.uuid=Os(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=r.DEFAULT_UP.clone();let e=new W,t=new Sr,n=new er,i=new W(1,1,1);function s(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Ut},normalMatrix:{value:new st}}),this.matrix=new Ut,this.matrixWorld=new Ut,this.matrixAutoUpdate=r.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=r.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Do,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return pa.setFromAxisAngle(e,t),this.quaternion.multiply(pa),this}rotateOnWorldAxis(e,t){return pa.setFromAxisAngle(e,t),this.quaternion.premultiply(pa),this}rotateX(e){return this.rotateOnAxis(Kp,e)}rotateY(e){return this.rotateOnAxis(Qp,e)}rotateZ(e){return this.rotateOnAxis(jp,e)}translateOnAxis(e,t){return $p.copy(e).applyQuaternion(this.quaternion),this.position.add($p.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Kp,e)}translateY(e){return this.translateOnAxis(Qp,e)}translateZ(e){return this.translateOnAxis(jp,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(pr.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Gl.copy(e):Gl.set(e,t,n);let i=this.parent;this.updateWorldMatrix(!0,!1),xo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?pr.lookAt(xo,Gl,this.up):pr.lookAt(Gl,xo,this.up),this.quaternion.setFromRotationMatrix(pr),i&&(pr.extractRotation(i.matrixWorld),pa.setFromRotationMatrix(pr),this.quaternion.premultiply(pa.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(nt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(em),ma.child=e,this.dispatchEvent(ma),ma.child=null):nt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Px),Zh.child=e,this.dispatchEvent(Zh),Zh.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),pr.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),pr.multiply(e.parent.matrixWorld)),e.applyMatrix4(pr),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(em),ma.child=e,this.dispatchEvent(ma),ma.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){let a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let i=this.children;for(let s=0,a=i.length;s<a;s++)i[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(xo,e,Cx),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(xo,Rx,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,i=e.z,s=this.matrix.elements;s[12]+=t-s[0]*t-s[4]*n-s[8]*i,s[13]+=n-s[1]*t-s[5]*n-s[9]*i,s[14]+=i-s[2]*t-s[6]*n-s[10]*i}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){let n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){let i=this.children;for(let s=0,a=i.length;s<a;s++)i[s].updateWorldMatrix(!1,!0)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),this.static!==!1&&(i.static=this.static),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.pivot!==null&&(i.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(i.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(i.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(o=>({...o})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function s(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=s(e.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){let d=l[c];s(e.shapes,d)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(s(e.materials,this.material[l]));i.material=o}else i.material=s(e.materials,this.material);if(this.children.length>0){i.children=[];for(let o=0;o<this.children.length;o++)i.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];i.animations.push(s(e.animations,l))}}if(t){let o=a(e.geometries),l=a(e.materials),c=a(e.textures),u=a(e.images),d=a(e.shapes),h=a(e.skeletons),f=a(e.animations),m=a(e.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),u.length>0&&(n.images=u),d.length>0&&(n.shapes=d),h.length>0&&(n.skeletons=h),f.length>0&&(n.animations=f),m.length>0&&(n.nodes=m)}return n.object=i,n;function a(o){let l=[];for(let c in o){let u=o[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let i=e.children[n];this.add(i.clone())}return this}};Fn.DEFAULT_UP=new W(0,1,0);Fn.DEFAULT_MATRIX_AUTO_UPDATE=!0;Fn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Nn=class extends Fn{constructor(){super(),this.isGroup=!0,this.type="Group"}},Ix={type:"move"},Da=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Nn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Nn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new W,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new W),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Nn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new W,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new W,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,s=null,a=null,o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(let _ of e.hand.values()){let p=t.getJointPose(_,n),g=this._getHandJoint(c,_);p!==null&&(g.matrix.fromArray(p.transform.matrix),g.matrix.decompose(g.position,g.rotation,g.scale),g.matrixWorldNeedsUpdate=!0,g.jointRadius=p.radius),g.visible=p!==null}let u=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],h=u.position.distanceTo(d.position),f=.02,m=.005;c.inputState.pinching&&h>f+m?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&h<=f-m&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));o!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&s!==null&&(i=s),i!==null&&(o.matrix.fromArray(i.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,i.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(i.linearVelocity)):o.hasLinearVelocity=!1,i.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(i.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Ix)))}return o!==null&&(o.visible=i!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new Nn;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},tg={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Gr={h:0,s:0,l:0},Wl={h:0,s:0,l:0};function Jh(r,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?r+(e-r)*6*t:t<1/2?e:t<2/3?r+(e-r)*6*(2/3-t):r}var qe=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Vt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,xt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=xt.workingColorSpace){return this.r=e,this.g=t,this.b=n,xt.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=xt.workingColorSpace){if(e=Qf(e,1),t=pt(t,0,1),n=pt(n,0,1),t===0)this.r=this.g=this.b=n;else{let s=n<=.5?n*(1+t):n+t-n*t,a=2*n-s;this.r=Jh(a,s,e+1/3),this.g=Jh(a,s,e),this.b=Jh(a,s,e-1/3)}return xt.colorSpaceToWorking(this,i),this}setStyle(e,t=Vt){function n(s){s!==void 0&&parseFloat(s)<1&&tt("Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let s,a=i[1],o=i[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:tt("Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){let s=i[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(s,16),t);tt("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Vt){let n=tg[e.toLowerCase()];return n!==void 0?this.setHex(n,t):tt("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=vr(e.r),this.g=vr(e.g),this.b=vr(e.b),this}copyLinearToSRGB(e){return this.r=wa(e.r),this.g=wa(e.g),this.b=wa(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Vt){return xt.workingToColorSpace(Un.copy(this),e),Math.round(pt(Un.r*255,0,255))*65536+Math.round(pt(Un.g*255,0,255))*256+Math.round(pt(Un.b*255,0,255))}getHexString(e=Vt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=xt.workingColorSpace){xt.workingToColorSpace(Un.copy(this),t);let n=Un.r,i=Un.g,s=Un.b,a=Math.max(n,i,s),o=Math.min(n,i,s),l,c,u=(o+a)/2;if(o===a)l=0,c=0;else{let d=a-o;switch(c=u<=.5?d/(a+o):d/(2-a-o),a){case n:l=(i-s)/d+(i<s?6:0);break;case i:l=(s-n)/d+2;break;case s:l=(n-i)/d+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=xt.workingColorSpace){return xt.workingToColorSpace(Un.copy(this),t),e.r=Un.r,e.g=Un.g,e.b=Un.b,e}getStyle(e=Vt){xt.workingToColorSpace(Un.copy(this),e);let t=Un.r,n=Un.g,i=Un.b;return e!==Vt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(Gr),this.setHSL(Gr.h+e,Gr.s+t,Gr.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Gr),e.getHSL(Wl);let n=Eo(Gr.h,Wl.h,t),i=Eo(Gr.s,Wl.s,t),s=Eo(Gr.l,Wl.l,t);return this.setHSL(n,i,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,i=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*i,this.g=s[1]*t+s[4]*n+s[7]*i,this.b=s[2]*t+s[5]*n+s[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Un=new qe;qe.NAMES=tg;var qn=class extends Fn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Sr,this.environmentIntensity=1,this.environmentRotation=new Sr,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},Bi=new W,mr=new W,$h=new W,gr=new W,ga=new W,_a=new W,tm=new W,Kh=new W,Qh=new W,jh=new W,ef=new Gt,tf=new Gt,nf=new Gt,Zr=class r{constructor(e=new W,t=new W,n=new W){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),Bi.subVectors(e,t),i.cross(Bi);let s=i.lengthSq();return s>0?i.multiplyScalar(1/Math.sqrt(s)):i.set(0,0,0)}static getBarycoord(e,t,n,i,s){Bi.subVectors(i,t),mr.subVectors(n,t),$h.subVectors(e,t);let a=Bi.dot(Bi),o=Bi.dot(mr),l=Bi.dot($h),c=mr.dot(mr),u=mr.dot($h),d=a*c-o*o;if(d===0)return s.set(0,0,0),null;let h=1/d,f=(c*l-o*u)*h,m=(a*u-o*l)*h;return s.set(1-f-m,m,f)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,gr)===null?!1:gr.x>=0&&gr.y>=0&&gr.x+gr.y<=1}static getInterpolation(e,t,n,i,s,a,o,l){return this.getBarycoord(e,t,n,i,gr)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,gr.x),l.addScaledVector(a,gr.y),l.addScaledVector(o,gr.z),l)}static getInterpolatedAttribute(e,t,n,i,s,a){return ef.setScalar(0),tf.setScalar(0),nf.setScalar(0),ef.fromBufferAttribute(e,t),tf.fromBufferAttribute(e,n),nf.fromBufferAttribute(e,i),a.setScalar(0),a.addScaledVector(ef,s.x),a.addScaledVector(tf,s.y),a.addScaledVector(nf,s.z),a}static isFrontFacing(e,t,n,i){return Bi.subVectors(n,t),mr.subVectors(e,t),Bi.cross(mr).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Bi.subVectors(this.c,this.b),mr.subVectors(this.a,this.b),Bi.cross(mr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return r.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return r.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,s){return r.getInterpolation(e,this.a,this.b,this.c,t,n,i,s)}containsPoint(e){return r.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return r.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,i=this.b,s=this.c,a,o;ga.subVectors(i,n),_a.subVectors(s,n),Kh.subVectors(e,n);let l=ga.dot(Kh),c=_a.dot(Kh);if(l<=0&&c<=0)return t.copy(n);Qh.subVectors(e,i);let u=ga.dot(Qh),d=_a.dot(Qh);if(u>=0&&d<=u)return t.copy(i);let h=l*d-u*c;if(h<=0&&l>=0&&u<=0)return a=l/(l-u),t.copy(n).addScaledVector(ga,a);jh.subVectors(e,s);let f=ga.dot(jh),m=_a.dot(jh);if(m>=0&&f<=m)return t.copy(s);let _=f*c-l*m;if(_<=0&&c>=0&&m<=0)return o=c/(c-m),t.copy(n).addScaledVector(_a,o);let p=u*m-f*d;if(p<=0&&d-u>=0&&f-m>=0)return tm.subVectors(s,i),o=(d-u)/(d-u+(f-m)),t.copy(i).addScaledVector(tm,o);let g=1/(p+_+h);return a=_*g,o=h*g,t.copy(n).addScaledVector(ga,a).addScaledVector(_a,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},$r=class{constructor(e=new W(1/0,1/0,1/0),t=new W(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(ki.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(ki.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=ki.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,ki):ki.fromBufferAttribute(s,a),ki.applyMatrix4(e.matrixWorld),this.expandByPoint(ki);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Xl.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Xl.copy(n.boundingBox)),Xl.applyMatrix4(e.matrixWorld),this.union(Xl)}let i=e.children;for(let s=0,a=i.length;s<a;s++)this.expandByObject(i[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,ki),ki.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(vo),ql.subVectors(this.max,vo),xa.subVectors(e.a,vo),va.subVectors(e.b,vo),ya.subVectors(e.c,vo),Wr.subVectors(va,xa),Xr.subVectors(ya,va),bs.subVectors(xa,ya);let t=[0,-Wr.z,Wr.y,0,-Xr.z,Xr.y,0,-bs.z,bs.y,Wr.z,0,-Wr.x,Xr.z,0,-Xr.x,bs.z,0,-bs.x,-Wr.y,Wr.x,0,-Xr.y,Xr.x,0,-bs.y,bs.x,0];return!rf(t,xa,va,ya,ql)||(t=[1,0,0,0,1,0,0,0,1],!rf(t,xa,va,ya,ql))?!1:(Yl.crossVectors(Wr,Xr),t=[Yl.x,Yl.y,Yl.z],rf(t,xa,va,ya,ql))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,ki).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(ki).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(_r[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),_r[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),_r[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),_r[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),_r[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),_r[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),_r[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),_r[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(_r),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},_r=[new W,new W,new W,new W,new W,new W,new W,new W],ki=new W,Xl=new $r,xa=new W,va=new W,ya=new W,Wr=new W,Xr=new W,bs=new W,vo=new W,ql=new W,Yl=new W,Ts=new W;function rf(r,e,t,n,i){for(let s=0,a=r.length-3;s<=a;s+=3){Ts.fromArray(r,s);let o=i.x*Math.abs(Ts.x)+i.y*Math.abs(Ts.y)+i.z*Math.abs(Ts.z),l=e.dot(Ts),c=t.dot(Ts),u=n.dot(Ts);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>o)return!1}return!0}var rn=new W,Zl=new we,Dx=0,sn=class extends ji{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Dx++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Mf,this.updateRanges=[],this.gpuType=Gi,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,s=this.itemSize;i<s;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Zl.fromBufferAttribute(this,t),Zl.applyMatrix3(e),this.setXY(t,Zl.x,Zl.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)rn.fromBufferAttribute(this,t),rn.applyMatrix3(e),this.setXYZ(t,rn.x,rn.y,rn.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)rn.fromBufferAttribute(this,t),rn.applyMatrix4(e),this.setXYZ(t,rn.x,rn.y,rn.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)rn.fromBufferAttribute(this,t),rn.applyNormalMatrix(e),this.setXYZ(t,rn.x,rn.y,rn.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)rn.fromBufferAttribute(this,t),rn.transformDirection(e),this.setXYZ(t,rn.x,rn.y,rn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Ea(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Xn(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Ea(t,this.array)),t}setX(e,t){return this.normalized&&(t=Xn(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Ea(t,this.array)),t}setY(e,t){return this.normalized&&(t=Xn(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Ea(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Xn(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Ea(t,this.array)),t}setW(e,t){return this.normalized&&(t=Xn(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Xn(t,this.array),n=Xn(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=Xn(t,this.array),n=Xn(n,this.array),i=Xn(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,s){return e*=this.itemSize,this.normalized&&(t=Xn(t,this.array),n=Xn(n,this.array),i=Xn(i,this.array),s=Xn(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Mf&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}};var Lo=class extends sn{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var Uo=class extends sn{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var Mn=class extends sn{constructor(e,t,n){super(new Float32Array(e),t,n)}},Lx=new $r,yo=new W,sf=new W,Is=class{constructor(e=new W,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):Lx.setFromPoints(e).getCenter(n);let i=0;for(let s=0,a=e.length;s<a;s++)i=Math.max(i,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;yo.subVectors(e,this.center);let t=yo.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(yo,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(sf.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(yo.copy(e.center).add(sf)),this.expandByPoint(yo.copy(e.center).sub(sf))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Ux=0,Ci=new Ut,af=new Fn,Sa=new W,di=new $r,So=new $r,yn=new W,an=class r extends ji{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Ux++}),this.uuid=Os(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(rx(e)?Uo:Lo)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let s=new st().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}let i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Ci.makeRotationFromQuaternion(e),this.applyMatrix4(Ci),this}rotateX(e){return Ci.makeRotationX(e),this.applyMatrix4(Ci),this}rotateY(e){return Ci.makeRotationY(e),this.applyMatrix4(Ci),this}rotateZ(e){return Ci.makeRotationZ(e),this.applyMatrix4(Ci),this}translate(e,t,n){return Ci.makeTranslation(e,t,n),this.applyMatrix4(Ci),this}scale(e,t,n){return Ci.makeScale(e,t,n),this.applyMatrix4(Ci),this}lookAt(e){return af.lookAt(e),af.updateMatrix(),this.applyMatrix4(af.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Sa).negate(),this.translate(Sa.x,Sa.y,Sa.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let n=[];for(let i=0,s=e.length;i<s;i++){let a=e[i];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new Mn(n,3))}else{let n=Math.min(e.length,t.count);for(let i=0;i<n;i++){let s=e[i];t.setXYZ(i,s.x,s.y,s.z||0)}e.length>t.count&&tt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new $r);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){nt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new W(-1/0,-1/0,-1/0),new W(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){let s=t[n];di.setFromBufferAttribute(s),this.morphTargetsRelative?(yn.addVectors(this.boundingBox.min,di.min),this.boundingBox.expandByPoint(yn),yn.addVectors(this.boundingBox.max,di.max),this.boundingBox.expandByPoint(yn)):(this.boundingBox.expandByPoint(di.min),this.boundingBox.expandByPoint(di.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&nt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Is);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){nt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new W,1/0);return}if(e){let n=this.boundingSphere.center;if(di.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){let o=t[s];So.setFromBufferAttribute(o),this.morphTargetsRelative?(yn.addVectors(di.min,So.min),di.expandByPoint(yn),yn.addVectors(di.max,So.max),di.expandByPoint(yn)):(di.expandByPoint(So.min),di.expandByPoint(So.max))}di.getCenter(n);let i=0;for(let s=0,a=e.count;s<a;s++)yn.fromBufferAttribute(e,s),i=Math.max(i,n.distanceToSquared(yn));if(t)for(let s=0,a=t.length;s<a;s++){let o=t[s],l=this.morphTargetsRelative;for(let c=0,u=o.count;c<u;c++)yn.fromBufferAttribute(o,c),l&&(Sa.fromBufferAttribute(e,c),yn.add(Sa)),i=Math.max(i,n.distanceToSquared(yn))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&nt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){nt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,i=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new sn(new Float32Array(4*n.count),4));let a=this.getAttribute("tangent"),o=[],l=[];for(let v=0;v<n.count;v++)o[v]=new W,l[v]=new W;let c=new W,u=new W,d=new W,h=new we,f=new we,m=new we,_=new W,p=new W;function g(v,b,P){c.fromBufferAttribute(n,v),u.fromBufferAttribute(n,b),d.fromBufferAttribute(n,P),h.fromBufferAttribute(s,v),f.fromBufferAttribute(s,b),m.fromBufferAttribute(s,P),u.sub(c),d.sub(c),f.sub(h),m.sub(h);let C=1/(f.x*m.y-m.x*f.y);isFinite(C)&&(_.copy(u).multiplyScalar(m.y).addScaledVector(d,-f.y).multiplyScalar(C),p.copy(d).multiplyScalar(f.x).addScaledVector(u,-m.x).multiplyScalar(C),o[v].add(_),o[b].add(_),o[P].add(_),l[v].add(p),l[b].add(p),l[P].add(p))}let S=this.groups;S.length===0&&(S=[{start:0,count:e.count}]);for(let v=0,b=S.length;v<b;++v){let P=S[v],C=P.start,I=P.count;for(let H=C,V=C+I;H<V;H+=3)g(e.getX(H+0),e.getX(H+1),e.getX(H+2))}let M=new W,x=new W,R=new W,E=new W;function A(v){R.fromBufferAttribute(i,v),E.copy(R);let b=o[v];M.copy(b),M.sub(R.multiplyScalar(R.dot(b))).normalize(),x.crossVectors(E,b);let C=x.dot(l[v])<0?-1:1;a.setXYZW(v,M.x,M.y,M.z,C)}for(let v=0,b=S.length;v<b;++v){let P=S[v],C=P.start,I=P.count;for(let H=C,V=C+I;H<V;H+=3)A(e.getX(H+0)),A(e.getX(H+1)),A(e.getX(H+2))}}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new sn(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let h=0,f=n.count;h<f;h++)n.setXYZ(h,0,0,0);let i=new W,s=new W,a=new W,o=new W,l=new W,c=new W,u=new W,d=new W;if(e)for(let h=0,f=e.count;h<f;h+=3){let m=e.getX(h+0),_=e.getX(h+1),p=e.getX(h+2);i.fromBufferAttribute(t,m),s.fromBufferAttribute(t,_),a.fromBufferAttribute(t,p),u.subVectors(a,s),d.subVectors(i,s),u.cross(d),o.fromBufferAttribute(n,m),l.fromBufferAttribute(n,_),c.fromBufferAttribute(n,p),o.add(u),l.add(u),c.add(u),n.setXYZ(m,o.x,o.y,o.z),n.setXYZ(_,l.x,l.y,l.z),n.setXYZ(p,c.x,c.y,c.z)}else for(let h=0,f=t.count;h<f;h+=3)i.fromBufferAttribute(t,h+0),s.fromBufferAttribute(t,h+1),a.fromBufferAttribute(t,h+2),u.subVectors(a,s),d.subVectors(i,s),u.cross(d),n.setXYZ(h+0,u.x,u.y,u.z),n.setXYZ(h+1,u.x,u.y,u.z),n.setXYZ(h+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)yn.fromBufferAttribute(e,t),yn.normalize(),e.setXYZ(t,yn.x,yn.y,yn.z)}toNonIndexed(){function e(o,l){let c=o.array,u=o.itemSize,d=o.normalized,h=new c.constructor(l.length*u),f=0,m=0;for(let _=0,p=l.length;_<p;_++){o.isInterleavedBufferAttribute?f=l[_]*o.data.stride+o.offset:f=l[_]*u;for(let g=0;g<u;g++)h[m++]=c[f++]}return new sn(h,u,d)}if(this.index===null)return tt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new r,n=this.index.array,i=this.attributes;for(let o in i){let l=i[o],c=e(l,n);t.setAttribute(o,c)}let s=this.morphAttributes;for(let o in s){let l=[],c=s[o];for(let u=0,d=c.length;u<d;u++){let h=c[u],f=e(h,n);l.push(f)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,l=a.length;o<l;o++){let c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let l in n){let c=n[l];e.data.attributes[l]=c.toJSON(e.data)}let i={},s=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],u=[];for(let d=0,h=c.length;d<h;d++){let f=c[d];u.push(f.toJSON(e.data))}u.length>0&&(i[l]=u,s=!0)}s&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let i=e.attributes;for(let c in i){let u=i[c];this.setAttribute(c,u.clone(t))}let s=e.morphAttributes;for(let c in s){let u=[],d=s[c];for(let h=0,f=d.length;h<f;h++)u.push(d[h].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let c=0,u=a.length;c<u;c++){let d=a[c];this.addGroup(d.start,d.count,d.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}};var Nx=0,Mr=class extends ji{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Nx++}),this.uuid=Os(),this.name="",this.type="Material",this.blending=Rs,this.side=yr,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=pc,this.blendDst=mc,this.blendEquation=Jr,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new qe(0,0,0),this.blendAlpha=0,this.depthFunc=Ps,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Sf,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=As,this.stencilZFail=As,this.stencilZPass=As,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){tt(`Material: parameter '${t}' has value of undefined.`);continue}let i=this[t];if(i===void 0){tt(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Rs&&(n.blending=this.blending),this.side!==yr&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==pc&&(n.blendSrc=this.blendSrc),this.blendDst!==mc&&(n.blendDst=this.blendDst),this.blendEquation!==Jr&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Ps&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Sf&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==As&&(n.stencilFail=this.stencilFail),this.stencilZFail!==As&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==As&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(s){let a=[];for(let o in s){let l=s[o];delete l.metadata,a.push(l)}return a}if(t){let s=i(e.textures),a=i(e.images);s.length>0&&(n.textures=s),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let i=t.length;n=new Array(i);for(let s=0;s!==i;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}};var xr=new W,of=new W,Jl=new W,qr=new W,lf=new W,$l=new W,cf=new W,No=class{constructor(e=new W,t=new W(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,xr)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=xr.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(xr.copy(this.origin).addScaledVector(this.direction,t),xr.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){of.copy(e).add(t).multiplyScalar(.5),Jl.copy(t).sub(e).normalize(),qr.copy(this.origin).sub(of);let s=e.distanceTo(t)*.5,a=-this.direction.dot(Jl),o=qr.dot(this.direction),l=-qr.dot(Jl),c=qr.lengthSq(),u=Math.abs(1-a*a),d,h,f,m;if(u>0)if(d=a*l-o,h=a*o-l,m=s*u,d>=0)if(h>=-m)if(h<=m){let _=1/u;d*=_,h*=_,f=d*(d+a*h+2*o)+h*(a*d+h+2*l)+c}else h=s,d=Math.max(0,-(a*h+o)),f=-d*d+h*(h+2*l)+c;else h=-s,d=Math.max(0,-(a*h+o)),f=-d*d+h*(h+2*l)+c;else h<=-m?(d=Math.max(0,-(-a*s+o)),h=d>0?-s:Math.min(Math.max(-s,-l),s),f=-d*d+h*(h+2*l)+c):h<=m?(d=0,h=Math.min(Math.max(-s,-l),s),f=h*(h+2*l)+c):(d=Math.max(0,-(a*s+o)),h=d>0?s:Math.min(Math.max(-s,-l),s),f=-d*d+h*(h+2*l)+c);else h=a>0?-s:s,d=Math.max(0,-(a*h+o)),f=-d*d+h*(h+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),i&&i.copy(of).addScaledVector(Jl,h),f}intersectSphere(e,t){xr.subVectors(e.center,this.origin);let n=xr.dot(this.direction),i=xr.dot(xr)-n*n,s=e.radius*e.radius;if(i>s)return null;let a=Math.sqrt(s-i),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,s,a,o,l,c=1/this.direction.x,u=1/this.direction.y,d=1/this.direction.z,h=this.origin;return c>=0?(n=(e.min.x-h.x)*c,i=(e.max.x-h.x)*c):(n=(e.max.x-h.x)*c,i=(e.min.x-h.x)*c),u>=0?(s=(e.min.y-h.y)*u,a=(e.max.y-h.y)*u):(s=(e.max.y-h.y)*u,a=(e.min.y-h.y)*u),n>a||s>i||((s>n||isNaN(n))&&(n=s),(a<i||isNaN(i))&&(i=a),d>=0?(o=(e.min.z-h.z)*d,l=(e.max.z-h.z)*d):(o=(e.max.z-h.z)*d,l=(e.min.z-h.z)*d),n>l||o>i)||((o>n||n!==n)&&(n=o),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,xr)!==null}intersectTriangle(e,t,n,i,s){lf.subVectors(t,e),$l.subVectors(n,e),cf.crossVectors(lf,$l);let a=this.direction.dot(cf),o;if(a>0){if(i)return null;o=1}else if(a<0)o=-1,a=-a;else return null;qr.subVectors(this.origin,e);let l=o*this.direction.dot($l.crossVectors(qr,$l));if(l<0)return null;let c=o*this.direction.dot(lf.cross(qr));if(c<0||l+c>a)return null;let u=-o*qr.dot(cf);return u<0?null:this.at(u/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},on=class extends Mr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new qe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Sr,this.combine=Nf,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},nm=new Ut,Es=new No,Kl=new Is,im=new W,Ql=new W,jl=new W,ec=new W,uf=new W,tc=new W,rm=new W,nc=new W,vt=class extends Fn{constructor(e=new an,t=new on){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=i.length;s<a;s++){let o=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(e,t){let n=this.geometry,i=n.attributes.position,s=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(i,e);let o=this.morphTargetInfluences;if(s&&o){tc.set(0,0,0);for(let l=0,c=s.length;l<c;l++){let u=o[l],d=s[l];u!==0&&(uf.fromBufferAttribute(d,e),a?tc.addScaledVector(uf,u):tc.addScaledVector(uf.sub(t),u))}t.add(tc)}return t}raycast(e,t){let n=this.geometry,i=this.material,s=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Kl.copy(n.boundingSphere),Kl.applyMatrix4(s),Es.copy(e.ray).recast(e.near),!(Kl.containsPoint(Es.origin)===!1&&(Es.intersectSphere(Kl,im)===null||Es.origin.distanceToSquared(im)>(e.far-e.near)**2))&&(nm.copy(s).invert(),Es.copy(e.ray).applyMatrix4(nm),!(n.boundingBox!==null&&Es.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Es)))}_computeIntersections(e,t,n){let i,s=this.geometry,a=this.material,o=s.index,l=s.attributes.position,c=s.attributes.uv,u=s.attributes.uv1,d=s.attributes.normal,h=s.groups,f=s.drawRange;if(o!==null)if(Array.isArray(a))for(let m=0,_=h.length;m<_;m++){let p=h[m],g=a[p.materialIndex],S=Math.max(p.start,f.start),M=Math.min(o.count,Math.min(p.start+p.count,f.start+f.count));for(let x=S,R=M;x<R;x+=3){let E=o.getX(x),A=o.getX(x+1),v=o.getX(x+2);i=ic(this,g,e,n,c,u,d,E,A,v),i&&(i.faceIndex=Math.floor(x/3),i.face.materialIndex=p.materialIndex,t.push(i))}}else{let m=Math.max(0,f.start),_=Math.min(o.count,f.start+f.count);for(let p=m,g=_;p<g;p+=3){let S=o.getX(p),M=o.getX(p+1),x=o.getX(p+2);i=ic(this,a,e,n,c,u,d,S,M,x),i&&(i.faceIndex=Math.floor(p/3),t.push(i))}}else if(l!==void 0)if(Array.isArray(a))for(let m=0,_=h.length;m<_;m++){let p=h[m],g=a[p.materialIndex],S=Math.max(p.start,f.start),M=Math.min(l.count,Math.min(p.start+p.count,f.start+f.count));for(let x=S,R=M;x<R;x+=3){let E=x,A=x+1,v=x+2;i=ic(this,g,e,n,c,u,d,E,A,v),i&&(i.faceIndex=Math.floor(x/3),i.face.materialIndex=p.materialIndex,t.push(i))}}else{let m=Math.max(0,f.start),_=Math.min(l.count,f.start+f.count);for(let p=m,g=_;p<g;p+=3){let S=p,M=p+1,x=p+2;i=ic(this,a,e,n,c,u,d,S,M,x),i&&(i.faceIndex=Math.floor(p/3),t.push(i))}}}};function Fx(r,e,t,n,i,s,a,o){let l;if(e.side===Yn?l=n.intersectTriangle(a,s,i,!0,o):l=n.intersectTriangle(i,s,a,e.side===yr,o),l===null)return null;nc.copy(o),nc.applyMatrix4(r.matrixWorld);let c=t.ray.origin.distanceTo(nc);return c<t.near||c>t.far?null:{distance:c,point:nc.clone(),object:r}}function ic(r,e,t,n,i,s,a,o,l,c){r.getVertexPosition(o,Ql),r.getVertexPosition(l,jl),r.getVertexPosition(c,ec);let u=Fx(r,e,t,n,Ql,jl,ec,rm);if(u){let d=new W;Zr.getBarycoord(rm,Ql,jl,ec,d),i&&(u.uv=Zr.getInterpolatedAttribute(i,o,l,c,d,new we)),s&&(u.uv1=Zr.getInterpolatedAttribute(s,o,l,c,d,new we)),a&&(u.normal=Zr.getInterpolatedAttribute(a,o,l,c,d,new W),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));let h={a:o,b:l,c,normal:new W,materialIndex:0};Zr.getNormal(Ql,jl,ec,h.normal),u.face=h,u.barycoord=d}return u}var Pc=class extends Cn{constructor(e=null,t=1,n=1,i,s,a,o,l,c=bn,u=bn,d,h){super(null,a,o,l,c,u,i,s,d,h),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var hf=new W,Ox=new W,Bx=new st,$i=class{constructor(e=new W(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let i=hf.subVectors(n,t).cross(Ox.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let i=e.delta(hf),s=this.normal.dot(i);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/s;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(i,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||Bx.getNormalMatrix(e),i=this.coplanarPoint(hf).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},ws=new Is,kx=new we(.5,.5),rc=new W,La=class{constructor(e=new $i,t=new $i,n=new $i,i=new $i,s=new $i,a=new $i){this.planes=[e,t,n,i,s,a]}set(e,t,n,i,s,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(i),o[4].copy(s),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=zi,n=!1){let i=this.planes,s=e.elements,a=s[0],o=s[1],l=s[2],c=s[3],u=s[4],d=s[5],h=s[6],f=s[7],m=s[8],_=s[9],p=s[10],g=s[11],S=s[12],M=s[13],x=s[14],R=s[15];if(i[0].setComponents(c-a,f-u,g-m,R-S).normalize(),i[1].setComponents(c+a,f+u,g+m,R+S).normalize(),i[2].setComponents(c+o,f+d,g+_,R+M).normalize(),i[3].setComponents(c-o,f-d,g-_,R-M).normalize(),n)i[4].setComponents(l,h,p,x).normalize(),i[5].setComponents(c-l,f-h,g-p,R-x).normalize();else if(i[4].setComponents(c-l,f-h,g-p,R-x).normalize(),t===zi)i[5].setComponents(c+l,f+h,g+p,R+x).normalize();else if(t===Aa)i[5].setComponents(l,h,p,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),ws.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),ws.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(ws)}intersectsSprite(e){ws.center.set(0,0,0);let t=kx.distanceTo(e.center);return ws.radius=.7071067811865476+t,ws.applyMatrix4(e.matrixWorld),this.intersectsSphere(ws)}intersectsSphere(e){let t=this.planes,n=e.center,i=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let i=t[n];if(rc.x=i.normal.x>0?e.max.x:e.min.x,rc.y=i.normal.y>0?e.max.y:e.min.y,rc.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(rc)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Kr=class extends Mr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new qe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Ic=new W,Dc=new W,sm=new Ut,Mo=new No,sc=new Is,ff=new W,am=new W,Lc=class extends Fn{constructor(e=new an,t=new Kr){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let i=1,s=t.count;i<s;i++)Ic.fromBufferAttribute(t,i-1),Dc.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=Ic.distanceTo(Dc);e.setAttribute("lineDistance",new Mn(n,1))}else tt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){let n=this.geometry,i=this.matrixWorld,s=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),sc.copy(n.boundingSphere),sc.applyMatrix4(i),sc.radius+=s,e.ray.intersectsSphere(sc)===!1)return;sm.copy(i).invert(),Mo.copy(e.ray).applyMatrix4(sm);let o=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,u=n.index,h=n.attributes.position;if(u!==null){let f=Math.max(0,a.start),m=Math.min(u.count,a.start+a.count);for(let _=f,p=m-1;_<p;_+=c){let g=u.getX(_),S=u.getX(_+1),M=ac(this,e,Mo,l,g,S,_);M&&t.push(M)}if(this.isLineLoop){let _=u.getX(m-1),p=u.getX(f),g=ac(this,e,Mo,l,_,p,m-1);g&&t.push(g)}}else{let f=Math.max(0,a.start),m=Math.min(h.count,a.start+a.count);for(let _=f,p=m-1;_<p;_+=c){let g=ac(this,e,Mo,l,_,_+1,_);g&&t.push(g)}if(this.isLineLoop){let _=ac(this,e,Mo,l,m-1,f,m-1);_&&t.push(_)}}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=i.length;s<a;s++){let o=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}};function ac(r,e,t,n,i,s,a){let o=r.geometry.attributes.position;if(Ic.fromBufferAttribute(o,i),Dc.fromBufferAttribute(o,s),t.distanceSqToSegment(Ic,Dc,ff,am)>n)return;ff.applyMatrix4(r.matrixWorld);let c=e.ray.origin.distanceTo(ff);if(!(c<e.near||c>e.far))return{distance:c,point:am.clone().applyMatrix4(r.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:r}}var Ds=class extends Lc{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}};var Fo=class extends Cn{constructor(e,t,n,i,s=Ft,a=Ft,o,l,c){super(e,t,n,i,s,a,o,l,c),this.isVideoTexture=!0,this.generateMipmaps=!1,this._requestVideoFrameCallbackId=0;let u=this;function d(){u.needsUpdate=!0,u._requestVideoFrameCallbackId=e.requestVideoFrameCallback(d)}"requestVideoFrameCallback"in e&&(this._requestVideoFrameCallbackId=e.requestVideoFrameCallback(d))}clone(){return new this.constructor(this.image).copy(this)}update(){let e=this.image;"requestVideoFrameCallback"in e===!1&&e.readyState>=e.HAVE_CURRENT_DATA&&(this.needsUpdate=!0)}dispose(){this._requestVideoFrameCallbackId!==0&&(this.source.data.cancelVideoFrameCallback(this._requestVideoFrameCallbackId),this._requestVideoFrameCallbackId=0),super.dispose()}};var Oo=class extends Cn{constructor(e=[],t=rs,n,i,s,a,o,l,c,u){super(e,t,n,i,s,a,o,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Ls=class extends Cn{constructor(e,t,n,i,s,a,o,l,c){super(e,t,n,i,s,a,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var br=class extends Cn{constructor(e,t,n=Hi,i,s,a,o=bn,l=bn,c,u=Qi,d=1){if(u!==Qi&&u!==as)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let h={width:e,height:t,depth:d};super(h,i,s,a,o,l,u,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Ia(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},Uc=class extends br{constructor(e,t=Hi,n=rs,i,s,a=bn,o=bn,l,c=Qi){let u={width:e,height:e,depth:1},d=[u,u,u,u,u,u];super(e,e,t,n,i,s,a,o,l,c),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Bo=class extends Cn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},Ua=class r extends an{constructor(e=1,t=1,n=1,i=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:s,depthSegments:a};let o=this;i=Math.floor(i),s=Math.floor(s),a=Math.floor(a);let l=[],c=[],u=[],d=[],h=0,f=0;m("z","y","x",-1,-1,n,t,e,a,s,0),m("z","y","x",1,-1,n,t,-e,a,s,1),m("x","z","y",1,1,e,n,t,i,a,2),m("x","z","y",1,-1,e,n,-t,i,a,3),m("x","y","z",1,-1,e,t,n,i,s,4),m("x","y","z",-1,-1,e,t,-n,i,s,5),this.setIndex(l),this.setAttribute("position",new Mn(c,3)),this.setAttribute("normal",new Mn(u,3)),this.setAttribute("uv",new Mn(d,2));function m(_,p,g,S,M,x,R,E,A,v,b){let P=x/A,C=R/v,I=x/2,H=R/2,V=E/2,D=A+1,O=v+1,F=0,Z=0,ee=new W;for(let L=0;L<O;L++){let ie=L*C-H;for(let ye=0;ye<D;ye++){let Fe=ye*P-I;ee[_]=Fe*S,ee[p]=ie*M,ee[g]=V,c.push(ee.x,ee.y,ee.z),ee[_]=0,ee[p]=0,ee[g]=E>0?1:-1,u.push(ee.x,ee.y,ee.z),d.push(ye/A),d.push(1-L/v),F+=1}}for(let L=0;L<v;L++)for(let ie=0;ie<A;ie++){let ye=h+ie+D*L,Fe=h+ie+D*(L+1),ze=h+(ie+1)+D*(L+1),Oe=h+(ie+1)+D*L;l.push(ye,Fe,Oe),l.push(Fe,ze,Oe),Z+=6}o.addGroup(f,Z,b),f+=Z,h+=F}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new r(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};var pi=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){tt("Curve: .getPoint() not implemented.")}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,i=this.getPoint(0),s=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),s+=n.distanceTo(i),t.push(s),i=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),i=0,s=n.length,a;t?a=t:a=e*n[s-1];let o=0,l=s-1,c;for(;o<=l;)if(i=Math.floor(o+(l-o)/2),c=n[i]-a,c<0)o=i+1;else if(c>0)l=i-1;else{l=i;break}if(i=l,n[i]===a)return i/(s-1);let u=n[i],h=n[i+1]-u,f=(a-u)/h;return(i+f)/(s-1)}getTangent(e,t){let i=e-1e-4,s=e+1e-4;i<0&&(i=0),s>1&&(s=1);let a=this.getPoint(i),o=this.getPoint(s),l=t||(a.isVector2?new we:new W);return l.copy(o).sub(a).normalize(),l}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new W,i=[],s=[],a=[],o=new W,l=new Ut;for(let f=0;f<=e;f++){let m=f/e;i[f]=this.getTangentAt(m,new W)}s[0]=new W,a[0]=new W;let c=Number.MAX_VALUE,u=Math.abs(i[0].x),d=Math.abs(i[0].y),h=Math.abs(i[0].z);u<=c&&(c=u,n.set(1,0,0)),d<=c&&(c=d,n.set(0,1,0)),h<=c&&n.set(0,0,1),o.crossVectors(i[0],n).normalize(),s[0].crossVectors(i[0],o),a[0].crossVectors(i[0],s[0]);for(let f=1;f<=e;f++){if(s[f]=s[f-1].clone(),a[f]=a[f-1].clone(),o.crossVectors(i[f-1],i[f]),o.length()>Number.EPSILON){o.normalize();let m=Math.acos(pt(i[f-1].dot(i[f]),-1,1));s[f].applyMatrix4(l.makeRotationAxis(o,m))}a[f].crossVectors(i[f],s[f])}if(t===!0){let f=Math.acos(pt(s[0].dot(s[e]),-1,1));f/=e,i[0].dot(o.crossVectors(s[0],s[e]))>0&&(f=-f);for(let m=1;m<=e;m++)s[m].applyMatrix4(l.makeRotationAxis(i[m],f*m)),a[m].crossVectors(i[m],s[m])}return{tangents:i,normals:s,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},Na=class extends pi{constructor(e=0,t=0,n=1,i=1,s=0,a=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=i,this.aStartAngle=s,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(e,t=new we){let n=t,i=Math.PI*2,s=this.aEndAngle-this.aStartAngle,a=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=i;for(;s>i;)s-=i;s<Number.EPSILON&&(a?s=0:s=i),this.aClockwise===!0&&!a&&(s===i?s=-i:s=s-i);let o=this.aStartAngle+e*s,l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let u=Math.cos(this.aRotation),d=Math.sin(this.aRotation),h=l-this.aX,f=c-this.aY;l=h*u-f*d+this.aX,c=h*d+f*u+this.aY}return n.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},Nc=class extends Na{constructor(e,t,n,i,s,a){super(e,t,n,n,i,s,a),this.isArcCurve=!0,this.type="ArcCurve"}};function jf(){let r=0,e=0,t=0,n=0;function i(s,a,o,l){r=s,e=o,t=-3*s+3*a-2*o-l,n=2*s-2*a+o+l}return{initCatmullRom:function(s,a,o,l,c){i(a,o,c*(o-s),c*(l-a))},initNonuniformCatmullRom:function(s,a,o,l,c,u,d){let h=(a-s)/c-(o-s)/(c+u)+(o-a)/u,f=(o-a)/u-(l-a)/(u+d)+(l-o)/d;h*=u,f*=u,i(a,o,h,f)},calc:function(s){let a=s*s,o=a*s;return r+e*s+t*a+n*o}}}var om=new W,lm=new W,df=new jf,pf=new jf,mf=new jf,Fc=class extends pi{constructor(e=[],t=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=i}getPoint(e,t=new W){let n=t,i=this.points,s=i.length,a=(s-(this.closed?0:1))*e,o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/s)+1)*s:l===0&&o===s-1&&(o=s-2,l=1);let c,u;this.closed||o>0?c=i[(o-1)%s]:(lm.subVectors(i[0],i[1]).add(i[0]),c=lm);let d=i[o%s],h=i[(o+1)%s];if(this.closed||o+2<s?u=i[(o+2)%s]:(om.subVectors(i[s-1],i[s-2]).add(i[s-1]),u=om),this.curveType==="centripetal"||this.curveType==="chordal"){let f=this.curveType==="chordal"?.5:.25,m=Math.pow(c.distanceToSquared(d),f),_=Math.pow(d.distanceToSquared(h),f),p=Math.pow(h.distanceToSquared(u),f);_<1e-4&&(_=1),m<1e-4&&(m=_),p<1e-4&&(p=_),df.initNonuniformCatmullRom(c.x,d.x,h.x,u.x,m,_,p),pf.initNonuniformCatmullRom(c.y,d.y,h.y,u.y,m,_,p),mf.initNonuniformCatmullRom(c.z,d.z,h.z,u.z,m,_,p)}else this.curveType==="catmullrom"&&(df.initCatmullRom(c.x,d.x,h.x,u.x,this.tension),pf.initCatmullRom(c.y,d.y,h.y,u.y,this.tension),mf.initCatmullRom(c.z,d.z,h.z,u.z,this.tension));return n.set(df.calc(l),pf.calc(l),mf.calc(l)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(i.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let i=this.points[t];e.points.push(i.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(new W().fromArray(i))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function cm(r,e,t,n,i){let s=(n-e)*.5,a=(i-t)*.5,o=r*r,l=r*o;return(2*t-2*n+s+a)*l+(-3*t+3*n-2*s-a)*o+s*r+t}function zx(r,e){let t=1-r;return t*t*e}function Vx(r,e){return 2*(1-r)*r*e}function Hx(r,e){return r*r*e}function wo(r,e,t,n){return zx(r,e)+Vx(r,t)+Hx(r,n)}function Gx(r,e){let t=1-r;return t*t*t*e}function Wx(r,e){let t=1-r;return 3*t*t*r*e}function Xx(r,e){return 3*(1-r)*r*r*e}function qx(r,e){return r*r*r*e}function Ao(r,e,t,n,i){return Gx(r,e)+Wx(r,t)+Xx(r,n)+qx(r,i)}var ko=class extends pi{constructor(e=new we,t=new we,n=new we,i=new we){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new we){let n=t,i=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set(Ao(e,i.x,s.x,a.x,o.x),Ao(e,i.y,s.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Oc=class extends pi{constructor(e=new W,t=new W,n=new W,i=new W){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new W){let n=t,i=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set(Ao(e,i.x,s.x,a.x,o.x),Ao(e,i.y,s.y,a.y,o.y),Ao(e,i.z,s.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},zo=class extends pi{constructor(e=new we,t=new we){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new we){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new we){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Bc=class extends pi{constructor(e=new W,t=new W){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new W){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new W){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Vo=class extends pi{constructor(e=new we,t=new we,n=new we){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new we){let n=t,i=this.v0,s=this.v1,a=this.v2;return n.set(wo(e,i.x,s.x,a.x),wo(e,i.y,s.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},kc=class extends pi{constructor(e=new W,t=new W,n=new W){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new W){let n=t,i=this.v0,s=this.v1,a=this.v2;return n.set(wo(e,i.x,s.x,a.x),wo(e,i.y,s.y,a.y),wo(e,i.z,s.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ho=class extends pi{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new we){let n=t,i=this.points,s=(i.length-1)*e,a=Math.floor(s),o=s-a,l=i[a===0?a:a-1],c=i[a],u=i[a>i.length-2?i.length-1:a+1],d=i[a>i.length-3?i.length-1:a+2];return n.set(cm(o,l.x,c.x,u.x,d.x),cm(o,l.y,c.y,u.y,d.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(i.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let i=this.points[t];e.points.push(i.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(new we().fromArray(i))}return this}},bf=Object.freeze({__proto__:null,ArcCurve:Nc,CatmullRomCurve3:Fc,CubicBezierCurve:ko,CubicBezierCurve3:Oc,EllipseCurve:Na,LineCurve:zo,LineCurve3:Bc,QuadraticBezierCurve:Vo,QuadraticBezierCurve3:kc,SplineCurve:Ho}),zc=class extends pi{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new bf[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),i=this.getCurveLengths(),s=0;for(;s<i.length;){if(i[s]>=n){let a=i[s]-n,o=this.curves[s],l=o.getLength(),c=l===0?0:1-a/l;return o.getPointAt(c,t)}s++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,i=this.curves.length;n<i;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let i=0,s=this.curves;i<s.length;i++){let a=s[i],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,l=a.getPoints(o);for(let c=0;c<l.length;c++){let u=l[c];n&&n.equals(u)||(t.push(u),n=u)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let i=e.curves[t];this.curves.push(i.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let i=this.curves[t];e.curves.push(i.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let i=e.curves[t];this.curves.push(new bf[i.type]().fromJSON(i))}return this}},Us=class extends zc{constructor(e){super(),this.type="Path",this.currentPoint=new we,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new zo(this.currentPoint.clone(),new we(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,i){let s=new Vo(this.currentPoint.clone(),new we(e,t),new we(n,i));return this.curves.push(s),this.currentPoint.set(n,i),this}bezierCurveTo(e,t,n,i,s,a){let o=new ko(this.currentPoint.clone(),new we(e,t),new we(n,i),new we(s,a));return this.curves.push(o),this.currentPoint.set(s,a),this}splineThru(e){let t=[this.currentPoint.clone()].concat(e),n=new Ho(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,i,s,a){let o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(e+o,t+l,n,i,s,a),this}absarc(e,t,n,i,s,a){return this.absellipse(e,t,n,n,i,s,a),this}ellipse(e,t,n,i,s,a,o,l){let c=this.currentPoint.x,u=this.currentPoint.y;return this.absellipse(e+c,t+u,n,i,s,a,o,l),this}absellipse(e,t,n,i,s,a,o,l){let c=new Na(e,t,n,i,s,a,o,l);if(this.curves.length>0){let d=c.getPoint(0);d.equals(this.currentPoint)||this.lineTo(d.x,d.y)}this.curves.push(c);let u=c.getPoint(1);return this.currentPoint.copy(u),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},Fa=class extends Us{constructor(e){super(e),this.uuid=Os(),this.type="Shape",this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,i=this.holes.length;n<i;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let i=e.holes[t];this.holes.push(i.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let i=this.holes[t];e.holes.push(i.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let i=e.holes[t];this.holes.push(new Us().fromJSON(i))}return this}};function Yx(r,e,t=2){let n=e&&e.length,i=n?e[0]*t:r.length,s=ng(r,0,i,t,!0),a=[];if(!s||s.next===s.prev)return a;let o,l,c;if(n&&(s=Qx(r,e,s,t)),r.length>80*t){o=r[0],l=r[1];let u=o,d=l;for(let h=t;h<i;h+=t){let f=r[h],m=r[h+1];f<o&&(o=f),m<l&&(l=m),f>u&&(u=f),m>d&&(d=m)}c=Math.max(u-o,d-l),c=c!==0?32767/c:0}return Go(s,a,t,o,l,c,0),a}function ng(r,e,t,n,i){let s;if(i===cv(r,e,t,n)>0)for(let a=e;a<t;a+=n)s=um(a/n|0,r[a],r[a+1],s);else for(let a=t-n;a>=e;a-=n)s=um(a/n|0,r[a],r[a+1],s);return s&&Oa(s,s.next)&&(Xo(s),s=s.next),s}function Ns(r,e){if(!r)return r;e||(e=r);let t=r,n;do if(n=!1,!t.steiner&&(Oa(t,t.next)||Ht(t.prev,t,t.next)===0)){if(Xo(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function Go(r,e,t,n,i,s,a){if(!r)return;!a&&s&&iv(r,n,i,s);let o=r;for(;r.prev!==r.next;){let l=r.prev,c=r.next;if(s?Jx(r,n,i,s):Zx(r)){e.push(l.i,r.i,c.i),Xo(r),r=c.next,o=c.next;continue}if(r=c,r===o){a?a===1?(r=$x(Ns(r),e),Go(r,e,t,n,i,s,2)):a===2&&Kx(r,e,t,n,i,s):Go(Ns(r),e,t,n,i,s,1);break}}}function Zx(r){let e=r.prev,t=r,n=r.next;if(Ht(e,t,n)>=0)return!1;let i=e.x,s=t.x,a=n.x,o=e.y,l=t.y,c=n.y,u=Math.min(i,s,a),d=Math.min(o,l,c),h=Math.max(i,s,a),f=Math.max(o,l,c),m=n.next;for(;m!==e;){if(m.x>=u&&m.x<=h&&m.y>=d&&m.y<=f&&bo(i,o,s,l,a,c,m.x,m.y)&&Ht(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function Jx(r,e,t,n){let i=r.prev,s=r,a=r.next;if(Ht(i,s,a)>=0)return!1;let o=i.x,l=s.x,c=a.x,u=i.y,d=s.y,h=a.y,f=Math.min(o,l,c),m=Math.min(u,d,h),_=Math.max(o,l,c),p=Math.max(u,d,h),g=Tf(f,m,e,t,n),S=Tf(_,p,e,t,n),M=r.prevZ,x=r.nextZ;for(;M&&M.z>=g&&x&&x.z<=S;){if(M.x>=f&&M.x<=_&&M.y>=m&&M.y<=p&&M!==i&&M!==a&&bo(o,u,l,d,c,h,M.x,M.y)&&Ht(M.prev,M,M.next)>=0||(M=M.prevZ,x.x>=f&&x.x<=_&&x.y>=m&&x.y<=p&&x!==i&&x!==a&&bo(o,u,l,d,c,h,x.x,x.y)&&Ht(x.prev,x,x.next)>=0))return!1;x=x.nextZ}for(;M&&M.z>=g;){if(M.x>=f&&M.x<=_&&M.y>=m&&M.y<=p&&M!==i&&M!==a&&bo(o,u,l,d,c,h,M.x,M.y)&&Ht(M.prev,M,M.next)>=0)return!1;M=M.prevZ}for(;x&&x.z<=S;){if(x.x>=f&&x.x<=_&&x.y>=m&&x.y<=p&&x!==i&&x!==a&&bo(o,u,l,d,c,h,x.x,x.y)&&Ht(x.prev,x,x.next)>=0)return!1;x=x.nextZ}return!0}function $x(r,e){let t=r;do{let n=t.prev,i=t.next.next;!Oa(n,i)&&rg(n,t,t.next,i)&&Wo(n,i)&&Wo(i,n)&&(e.push(n.i,t.i,i.i),Xo(t),Xo(t.next),t=r=i),t=t.next}while(t!==r);return Ns(t)}function Kx(r,e,t,n,i,s){let a=r;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&av(a,o)){let l=sg(a,o);a=Ns(a,a.next),l=Ns(l,l.next),Go(a,e,t,n,i,s,0),Go(l,e,t,n,i,s,0);return}o=o.next}a=a.next}while(a!==r)}function Qx(r,e,t,n){let i=[];for(let s=0,a=e.length;s<a;s++){let o=e[s]*n,l=s<a-1?e[s+1]*n:r.length,c=ng(r,o,l,n,!1);c===c.next&&(c.steiner=!0),i.push(sv(c))}i.sort(jx);for(let s=0;s<i.length;s++)t=ev(i[s],t);return t}function jx(r,e){let t=r.x-e.x;if(t===0&&(t=r.y-e.y,t===0)){let n=(r.next.y-r.y)/(r.next.x-r.x),i=(e.next.y-e.y)/(e.next.x-e.x);t=n-i}return t}function ev(r,e){let t=tv(r,e);if(!t)return e;let n=sg(t,r);return Ns(n,n.next),Ns(t,t.next)}function tv(r,e){let t=e,n=r.x,i=r.y,s=-1/0,a;if(Oa(r,t))return t;do{if(Oa(r,t.next))return t.next;if(i<=t.y&&i>=t.next.y&&t.next.y!==t.y){let d=t.x+(i-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(d<=n&&d>s&&(s=d,a=t.x<t.next.x?t:t.next,d===n))return a}t=t.next}while(t!==e);if(!a)return null;let o=a,l=a.x,c=a.y,u=1/0;t=a;do{if(n>=t.x&&t.x>=l&&n!==t.x&&ig(i<c?n:s,i,l,c,i<c?s:n,i,t.x,t.y)){let d=Math.abs(i-t.y)/(n-t.x);Wo(t,r)&&(d<u||d===u&&(t.x>a.x||t.x===a.x&&nv(a,t)))&&(a=t,u=d)}t=t.next}while(t!==o);return a}function nv(r,e){return Ht(r.prev,r,e.prev)<0&&Ht(e.next,r,r.next)<0}function iv(r,e,t,n){let i=r;do i.z===0&&(i.z=Tf(i.x,i.y,e,t,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==r);i.prevZ.nextZ=null,i.prevZ=null,rv(i)}function rv(r){let e,t=1;do{let n=r,i;r=null;let s=null;for(e=0;n;){e++;let a=n,o=0;for(let c=0;c<t&&(o++,a=a.nextZ,!!a);c++);let l=t;for(;o>0||l>0&&a;)o!==0&&(l===0||!a||n.z<=a.z)?(i=n,n=n.nextZ,o--):(i=a,a=a.nextZ,l--),s?s.nextZ=i:r=i,i.prevZ=s,s=i;n=a}s.nextZ=null,t*=2}while(e>1);return r}function Tf(r,e,t,n,i){return r=(r-t)*i|0,e=(e-n)*i|0,r=(r|r<<8)&16711935,r=(r|r<<4)&252645135,r=(r|r<<2)&858993459,r=(r|r<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,r|e<<1}function sv(r){let e=r,t=r;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==r);return t}function ig(r,e,t,n,i,s,a,o){return(i-a)*(e-o)>=(r-a)*(s-o)&&(r-a)*(n-o)>=(t-a)*(e-o)&&(t-a)*(s-o)>=(i-a)*(n-o)}function bo(r,e,t,n,i,s,a,o){return!(r===a&&e===o)&&ig(r,e,t,n,i,s,a,o)}function av(r,e){return r.next.i!==e.i&&r.prev.i!==e.i&&!ov(r,e)&&(Wo(r,e)&&Wo(e,r)&&lv(r,e)&&(Ht(r.prev,r,e.prev)||Ht(r,e.prev,e))||Oa(r,e)&&Ht(r.prev,r,r.next)>0&&Ht(e.prev,e,e.next)>0)}function Ht(r,e,t){return(e.y-r.y)*(t.x-e.x)-(e.x-r.x)*(t.y-e.y)}function Oa(r,e){return r.x===e.x&&r.y===e.y}function rg(r,e,t,n){let i=lc(Ht(r,e,t)),s=lc(Ht(r,e,n)),a=lc(Ht(t,n,r)),o=lc(Ht(t,n,e));return!!(i!==s&&a!==o||i===0&&oc(r,t,e)||s===0&&oc(r,n,e)||a===0&&oc(t,r,n)||o===0&&oc(t,e,n))}function oc(r,e,t){return e.x<=Math.max(r.x,t.x)&&e.x>=Math.min(r.x,t.x)&&e.y<=Math.max(r.y,t.y)&&e.y>=Math.min(r.y,t.y)}function lc(r){return r>0?1:r<0?-1:0}function ov(r,e){let t=r;do{if(t.i!==r.i&&t.next.i!==r.i&&t.i!==e.i&&t.next.i!==e.i&&rg(t,t.next,r,e))return!0;t=t.next}while(t!==r);return!1}function Wo(r,e){return Ht(r.prev,r,r.next)<0?Ht(r,e,r.next)>=0&&Ht(r,r.prev,e)>=0:Ht(r,e,r.prev)<0||Ht(r,r.next,e)<0}function lv(r,e){let t=r,n=!1,i=(r.x+e.x)/2,s=(r.y+e.y)/2;do t.y>s!=t.next.y>s&&t.next.y!==t.y&&i<(t.next.x-t.x)*(s-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==r);return n}function sg(r,e){let t=Ef(r.i,r.x,r.y),n=Ef(e.i,e.x,e.y),i=r.next,s=e.prev;return r.next=e,e.prev=r,t.next=i,i.prev=t,n.next=t,t.prev=n,s.next=n,n.prev=s,n}function um(r,e,t,n){let i=Ef(r,e,t);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function Xo(r){r.next.prev=r.prev,r.prev.next=r.next,r.prevZ&&(r.prevZ.nextZ=r.nextZ),r.nextZ&&(r.nextZ.prevZ=r.prevZ)}function Ef(r,e,t){return{i:r,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function cv(r,e,t,n){let i=0;for(let s=e,a=t-n;s<t;s+=n)i+=(r[a]-r[s])*(r[s+1]+r[a+1]),a=s;return i}var wf=class{static triangulate(e,t,n=2){return Yx(e,t,n)}},Cs=class r{static area(e){let t=e.length,n=0;for(let i=t-1,s=0;s<t;i=s++)n+=e[i].x*e[s].y-e[s].x*e[i].y;return n*.5}static isClockWise(e){return r.area(e)<0}static triangulateShape(e,t){let n=[],i=[],s=[];hm(e),fm(n,e);let a=e.length;t.forEach(hm);for(let l=0;l<t.length;l++)i.push(a),a+=t[l].length,fm(n,t[l]);let o=wf.triangulate(n,i);for(let l=0;l<o.length;l+=3)s.push(o.slice(l,l+3));return s}};function hm(r){let e=r.length;e>2&&r[e-1].equals(r[0])&&r.pop()}function fm(r,e){for(let t=0;t<e.length;t++)r.push(e[t].x),r.push(e[t].y)}var qo=class r extends an{constructor(e=new Fa([new we(.5,.5),new we(-.5,.5),new we(-.5,-.5),new we(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let n=this,i=[],s=[];for(let o=0,l=e.length;o<l;o++){let c=e[o];a(c)}this.setAttribute("position",new Mn(i,3)),this.setAttribute("uv",new Mn(s,2)),this.computeVertexNormals();function a(o){let l=[],c=t.curveSegments!==void 0?t.curveSegments:12,u=t.steps!==void 0?t.steps:1,d=t.depth!==void 0?t.depth:1,h=t.bevelEnabled!==void 0?t.bevelEnabled:!0,f=t.bevelThickness!==void 0?t.bevelThickness:.2,m=t.bevelSize!==void 0?t.bevelSize:f-.1,_=t.bevelOffset!==void 0?t.bevelOffset:0,p=t.bevelSegments!==void 0?t.bevelSegments:3,g=t.extrudePath,S=t.UVGenerator!==void 0?t.UVGenerator:uv,M,x=!1,R,E,A,v;if(g){M=g.getSpacedPoints(u),x=!0,h=!1;let j=g.isCatmullRomCurve3?g.closed:!1;R=g.computeFrenetFrames(u,j),E=new W,A=new W,v=new W}h||(p=0,f=0,m=0,_=0);let b=o.extractPoints(c),P=b.shape,C=b.holes;if(!Cs.isClockWise(P)){P=P.reverse();for(let j=0,oe=C.length;j<oe;j++){let re=C[j];Cs.isClockWise(re)&&(C[j]=re.reverse())}}function H(j){let re=10000000000000001e-36,B=j[0];for(let me=1;me<=j.length;me++){let We=me%j.length,N=j[We],Ne=N.x-B.x,Pe=N.y-B.y,Q=Ne*Ne+Pe*Pe,z=Math.max(Math.abs(N.x),Math.abs(N.y),Math.abs(B.x),Math.abs(B.y)),Me=re*z*z;if(Q<=Me){j.splice(We,1),me--;continue}B=N}}H(P),C.forEach(H);let V=C.length,D=P;for(let j=0;j<V;j++){let oe=C[j];P=P.concat(oe)}function O(j,oe,re){return oe||nt("ExtrudeGeometry: vec does not exist"),j.clone().addScaledVector(oe,re)}let F=P.length;function Z(j,oe,re){let B,me,We,N=j.x-oe.x,Ne=j.y-oe.y,Pe=re.x-j.x,Q=re.y-j.y,z=N*N+Ne*Ne,Me=N*Q-Ne*Pe;if(Math.abs(Me)>Number.EPSILON){let w=Math.sqrt(z),y=Math.sqrt(Pe*Pe+Q*Q),G=oe.x-Ne/w,$=oe.y+N/w,se=re.x-Q/y,fe=re.y+Pe/y,ae=((se-G)*Q-(fe-$)*Pe)/(N*Q-Ne*Pe);B=G+N*ae-j.x,me=$+Ne*ae-j.y;let U=B*B+me*me;if(U<=2)return new we(B,me);We=Math.sqrt(U/2)}else{let w=!1;N>Number.EPSILON?Pe>Number.EPSILON&&(w=!0):N<-Number.EPSILON?Pe<-Number.EPSILON&&(w=!0):Math.sign(Ne)===Math.sign(Q)&&(w=!0),w?(B=-Ne,me=N,We=Math.sqrt(z)):(B=N,me=Ne,We=Math.sqrt(z/2))}return new we(B/We,me/We)}let ee=[];for(let j=0,oe=D.length,re=oe-1,B=j+1;j<oe;j++,re++,B++)re===oe&&(re=0),B===oe&&(B=0),ee[j]=Z(D[j],D[re],D[B]);let L=[],ie,ye=ee.concat();for(let j=0,oe=V;j<oe;j++){let re=C[j];ie=[];for(let B=0,me=re.length,We=me-1,N=B+1;B<me;B++,We++,N++)We===me&&(We=0),N===me&&(N=0),ie[B]=Z(re[B],re[We],re[N]);L.push(ie),ye=ye.concat(ie)}let Fe;if(p===0)Fe=Cs.triangulateShape(D,C);else{let j=[],oe=[];for(let re=0;re<p;re++){let B=re/p,me=f*Math.cos(B*Math.PI/2),We=m*Math.sin(B*Math.PI/2)+_;for(let N=0,Ne=D.length;N<Ne;N++){let Pe=O(D[N],ee[N],We);Ee(Pe.x,Pe.y,-me),B===0&&j.push(Pe)}for(let N=0,Ne=V;N<Ne;N++){let Pe=C[N];ie=L[N];let Q=[];for(let z=0,Me=Pe.length;z<Me;z++){let w=O(Pe[z],ie[z],We);Ee(w.x,w.y,-me),B===0&&Q.push(w)}B===0&&oe.push(Q)}}Fe=Cs.triangulateShape(j,oe)}let ze=Fe.length,Oe=m+_;for(let j=0;j<F;j++){let oe=h?O(P[j],ye[j],Oe):P[j];x?(A.copy(R.normals[0]).multiplyScalar(oe.x),E.copy(R.binormals[0]).multiplyScalar(oe.y),v.copy(M[0]).add(A).add(E),Ee(v.x,v.y,v.z)):Ee(oe.x,oe.y,0)}for(let j=1;j<=u;j++)for(let oe=0;oe<F;oe++){let re=h?O(P[oe],ye[oe],Oe):P[oe];x?(A.copy(R.normals[j]).multiplyScalar(re.x),E.copy(R.binormals[j]).multiplyScalar(re.y),v.copy(M[j]).add(A).add(E),Ee(v.x,v.y,v.z)):Ee(re.x,re.y,d/u*j)}for(let j=p-1;j>=0;j--){let oe=j/p,re=f*Math.cos(oe*Math.PI/2),B=m*Math.sin(oe*Math.PI/2)+_;for(let me=0,We=D.length;me<We;me++){let N=O(D[me],ee[me],B);Ee(N.x,N.y,d+re)}for(let me=0,We=C.length;me<We;me++){let N=C[me];ie=L[me];for(let Ne=0,Pe=N.length;Ne<Pe;Ne++){let Q=O(N[Ne],ie[Ne],B);x?Ee(Q.x,Q.y+M[u-1].y,M[u-1].x+re):Ee(Q.x,Q.y,d+re)}}}K(),le();function K(){let j=i.length/3;if(h){let oe=0,re=F*oe;for(let B=0;B<ze;B++){let me=Fe[B];He(me[2]+re,me[1]+re,me[0]+re)}oe=u+p*2,re=F*oe;for(let B=0;B<ze;B++){let me=Fe[B];He(me[0]+re,me[1]+re,me[2]+re)}}else{for(let oe=0;oe<ze;oe++){let re=Fe[oe];He(re[2],re[1],re[0])}for(let oe=0;oe<ze;oe++){let re=Fe[oe];He(re[0]+F*u,re[1]+F*u,re[2]+F*u)}}n.addGroup(j,i.length/3-j,0)}function le(){let j=i.length/3,oe=0;ue(D,oe),oe+=D.length;for(let re=0,B=C.length;re<B;re++){let me=C[re];ue(me,oe),oe+=me.length}n.addGroup(j,i.length/3-j,1)}function ue(j,oe){let re=j.length;for(;--re>=0;){let B=re,me=re-1;me<0&&(me=j.length-1);for(let We=0,N=u+p*2;We<N;We++){let Ne=F*We,Pe=F*(We+1),Q=oe+B+Ne,z=oe+me+Ne,Me=oe+me+Pe,w=oe+B+Pe;Ae(Q,z,Me,w)}}}function Ee(j,oe,re){l.push(j),l.push(oe),l.push(re)}function He(j,oe,re){Ye(j),Ye(oe),Ye(re);let B=i.length/3,me=S.generateTopUV(n,i,B-3,B-2,B-1);Se(me[0]),Se(me[1]),Se(me[2])}function Ae(j,oe,re,B){Ye(j),Ye(oe),Ye(B),Ye(oe),Ye(re),Ye(B);let me=i.length/3,We=S.generateSideWallUV(n,i,me-6,me-3,me-2,me-1);Se(We[0]),Se(We[1]),Se(We[3]),Se(We[1]),Se(We[2]),Se(We[3])}function Ye(j){i.push(l[j*3+0]),i.push(l[j*3+1]),i.push(l[j*3+2])}function Se(j){s.push(j.x),s.push(j.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return hv(t,n,e)}static fromJSON(e,t){let n=[];for(let s=0,a=e.shapes.length;s<a;s++){let o=t[e.shapes[s]];n.push(o)}let i=e.options.extrudePath;return i!==void 0&&(e.options.extrudePath=new bf[i.type]().fromJSON(i)),new r(n,e.options)}},uv={generateTopUV:function(r,e,t,n,i){let s=e[t*3],a=e[t*3+1],o=e[n*3],l=e[n*3+1],c=e[i*3],u=e[i*3+1];return[new we(s,a),new we(o,l),new we(c,u)]},generateSideWallUV:function(r,e,t,n,i,s){let a=e[t*3],o=e[t*3+1],l=e[t*3+2],c=e[n*3],u=e[n*3+1],d=e[n*3+2],h=e[i*3],f=e[i*3+1],m=e[i*3+2],_=e[s*3],p=e[s*3+1],g=e[s*3+2];return Math.abs(o-u)<Math.abs(a-c)?[new we(a,1-l),new we(c,1-d),new we(h,1-m),new we(_,1-g)]:[new we(o,1-l),new we(u,1-d),new we(f,1-m),new we(p,1-g)]}};function hv(r,e,t){if(t.shapes=[],Array.isArray(r))for(let n=0,i=r.length;n<i;n++){let s=r[n];t.shapes.push(s.uuid)}else t.shapes.push(r.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}var ln=class r extends an{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};let s=e/2,a=t/2,o=Math.floor(n),l=Math.floor(i),c=o+1,u=l+1,d=e/o,h=t/l,f=[],m=[],_=[],p=[];for(let g=0;g<u;g++){let S=g*h-a;for(let M=0;M<c;M++){let x=M*d-s;m.push(x,-S,0),_.push(0,0,1),p.push(M/o),p.push(1-g/l)}}for(let g=0;g<l;g++)for(let S=0;S<o;S++){let M=S+c*g,x=S+c*(g+1),R=S+1+c*(g+1),E=S+1+c*g;f.push(M,x,E),f.push(x,R,E)}this.setIndex(f),this.setAttribute("position",new Mn(m,3)),this.setAttribute("normal",new Mn(_,3)),this.setAttribute("uv",new Mn(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new r(e.width,e.height,e.widthSegments,e.heightSegments)}};function Bs(r){let e={};for(let t in r){e[t]={};for(let n in r[t]){let i=r[t][n];if(dm(i))i.isRenderTargetTexture?(tt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone();else if(Array.isArray(i))if(dm(i[0])){let s=[];for(let a=0,o=i.length;a<o;a++)s[a]=i[a].clone();e[t][n]=s}else e[t][n]=i.slice();else e[t][n]=i}}return e}function On(r){let e={};for(let t=0;t<r.length;t++){let n=Bs(r[t]);for(let i in n)e[i]=n[i]}return e}function dm(r){return r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)}function fv(r){let e=[];for(let t=0;t<r.length;t++)e.push(r[t].clone());return e}function ed(r){let e=r.getRenderTarget();return e===null?r.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:xt.workingColorSpace}var ag={clone:Bs,merge:On},dv=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,pv=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,en=class extends Mr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=dv,this.fragmentShader=pv,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Bs(e.uniforms),this.uniformsGroups=fv(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let i in this.uniforms){let a=this.uniforms[i].value;a&&a.isTexture?t.uniforms[i]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[i]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[i]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[i]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[i]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[i]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[i]={type:"m4",value:a.toArray()}:t.uniforms[i]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}},Vc=class extends en{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Hc=class extends Mr{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new qe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new qe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Gu,this.normalScale=new we(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Sr,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},tr=class extends Hc{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new we(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return pt(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new qe(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new qe(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new qe(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};var Gc=class extends Mr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Gm,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Wc=class extends Mr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function cc(r,e){return!r||r.constructor===e?r:typeof e.BYTES_PER_ELEMENT=="number"?new e(r):Array.prototype.slice.call(r)}var Qr=class{constructor(e,t,n,i){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,i=t[n],s=t[n-1];n:{e:{let a;t:{i:if(!(e<i)){for(let o=n+2;;){if(i===void 0){if(e<s)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(s=i,i=t[++n],e<i)break e}a=t.length;break t}if(!(e>=s)){let o=t[1];e<o&&(n=2,s=o);for(let l=n-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(i=s,s=t[--n-1],e>=s)break e}a=n,n=0;break t}break n}for(;n<a;){let o=n+a>>>1;e<t[o]?a=o:n=o+1}if(i=t[n],s=t[n-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,s,i)}return this.interpolate_(n,s,e,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,s=e*i;for(let a=0;a!==i;++a)t[a]=n[s+a];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},Xc=class extends Qr{constructor(e,t,n,i){super(e,t,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:xf,endingEnd:xf}}intervalChanged_(e,t,n){let i=this.parameterPositions,s=e-2,a=e+1,o=i[s],l=i[a];if(o===void 0)switch(this.getSettings_().endingStart){case vf:s=e,o=2*t-n;break;case yf:s=i.length-2,o=t+i[s]-i[s+1];break;default:s=e,o=n}if(l===void 0)switch(this.getSettings_().endingEnd){case vf:a=e,l=2*n-t;break;case yf:a=1,l=n+i[1]-i[0];break;default:a=e-1,l=t}let c=(n-t)*.5,u=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(l-n),this._offsetPrev=s*u,this._offsetNext=a*u}interpolate_(e,t,n,i){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,u=this._offsetPrev,d=this._offsetNext,h=this._weightPrev,f=this._weightNext,m=(n-t)/(i-t),_=m*m,p=_*m,g=-h*p+2*h*_-h*m,S=(1+h)*p+(-1.5-2*h)*_+(-.5+h)*m+1,M=(-1-f)*p+(1.5+f)*_+.5*m,x=f*p-f*_;for(let R=0;R!==o;++R)s[R]=g*a[u+R]+S*a[c+R]+M*a[l+R]+x*a[d+R];return s}},qc=class extends Qr{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,u=(n-t)/(i-t),d=1-u;for(let h=0;h!==o;++h)s[h]=a[c+h]*d+a[l+h]*u;return s}},Yc=class extends Qr{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e){return this.copySampleValue_(e-1)}},Zc=class extends Qr{interpolate_(e,t,n,i){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,u=this.settings||this.DefaultSettings_,d=u.inTangents,h=u.outTangents;if(!d||!h){let _=(n-t)/(i-t),p=1-_;for(let g=0;g!==o;++g)s[g]=a[c+g]*p+a[l+g]*_;return s}let f=o*2,m=e-1;for(let _=0;_!==o;++_){let p=a[c+_],g=a[l+_],S=m*f+_*2,M=h[S],x=h[S+1],R=e*f+_*2,E=d[R],A=d[R+1],v=(n-t)/(i-t),b,P,C,I,H;for(let V=0;V<8;V++){b=v*v,P=b*v,C=1-v,I=C*C,H=I*C;let O=H*t+3*I*v*M+3*C*b*E+P*i-n;if(Math.abs(O)<1e-10)break;let F=3*I*(M-t)+6*C*v*(E-M)+3*b*(i-E);if(Math.abs(F)<1e-10)break;v=v-O/F,v=Math.max(0,Math.min(1,v))}s[_]=H*p+3*I*v*x+3*C*b*A+P*g}return s}},mi=class{constructor(e,t,n,i){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=cc(t,this.TimeBufferType),this.values=cc(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:cc(e.times,Array),values:cc(e.values,Array)};let i=e.getInterpolation();i!==e.DefaultInterpolation&&(n.interpolation=i)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Yc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new qc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Xc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new Zc(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.settings=this.settings),t}setInterpolation(e){let t;switch(e){case Co:t=this.InterpolantFactoryMethodDiscrete;break;case Ec:t=this.InterpolantFactoryMethodLinear;break;case fc:t=this.InterpolantFactoryMethodSmooth;break;case _f:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return tt("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Co;case this.InterpolantFactoryMethodLinear:return Ec;case this.InterpolantFactoryMethodSmooth:return fc;case this.InterpolantFactoryMethodBezier:return _f}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]*=e}return this}trim(e,t){let n=this.times,i=n.length,s=0,a=i-1;for(;s!==i&&n[s]<e;)++s;for(;a!==-1&&n[a]>t;)--a;if(++a,s!==0||a!==i){s>=a&&(a=Math.max(a,1),s=a-1);let o=this.getValueSize();this.times=n.slice(s,a),this.values=this.values.slice(s*o,a*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(nt("KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,i=this.values,s=n.length;s===0&&(nt("KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==s;o++){let l=n[o];if(typeof l=="number"&&isNaN(l)){nt("KeyframeTrack: Time is not a valid number.",this,o,l),e=!1;break}if(a!==null&&a>l){nt("KeyframeTrack: Out of order keys.",this,o,l,a),e=!1;break}a=l}if(i!==void 0&&sx(i))for(let o=0,l=i.length;o!==l;++o){let c=i[o];if(isNaN(c)){nt("KeyframeTrack: Value is not a valid number.",this,o,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),i=this.getInterpolation()===fc,s=e.length-1,a=1;for(let o=1;o<s;++o){let l=!1,c=e[o],u=e[o+1];if(c!==u&&(o!==1||c!==e[0]))if(i)l=!0;else{let d=o*n,h=d-n,f=d+n;for(let m=0;m!==n;++m){let _=t[d+m];if(_!==t[h+m]||_!==t[f+m]){l=!0;break}}}if(l){if(o!==a){e[a]=e[o];let d=o*n,h=a*n;for(let f=0;f!==n;++f)t[h+f]=t[d+f]}++a}}if(s>0){e[a]=e[s];for(let o=s*n,l=a*n,c=0;c!==n;++c)t[l+c]=t[o+c];++a}return a!==e.length?(this.times=e.slice(0,a),this.values=t.slice(0,a*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,i=new n(this.name,e,t);return i.createInterpolant=this.createInterpolant,i}};mi.prototype.ValueTypeName="";mi.prototype.TimeBufferType=Float32Array;mi.prototype.ValueBufferType=Float32Array;mi.prototype.DefaultInterpolation=Ec;var jr=class extends mi{constructor(e,t,n){super(e,t,n)}};jr.prototype.ValueTypeName="bool";jr.prototype.ValueBufferType=Array;jr.prototype.DefaultInterpolation=Co;jr.prototype.InterpolantFactoryMethodLinear=void 0;jr.prototype.InterpolantFactoryMethodSmooth=void 0;var Jc=class extends mi{constructor(e,t,n,i){super(e,t,n,i)}};Jc.prototype.ValueTypeName="color";var $c=class extends mi{constructor(e,t,n,i){super(e,t,n,i)}};$c.prototype.ValueTypeName="number";var Kc=class extends Qr{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(n-t)/(i-t),c=e*o;for(let u=c+o;c!==u;c+=4)er.slerpFlat(s,0,a,c-o,a,c,l);return s}},Yo=class extends mi{constructor(e,t,n,i){super(e,t,n,i)}InterpolantFactoryMethodLinear(e){return new Kc(this.times,this.values,this.getValueSize(),e)}};Yo.prototype.ValueTypeName="quaternion";Yo.prototype.InterpolantFactoryMethodSmooth=void 0;var es=class extends mi{constructor(e,t,n){super(e,t,n)}};es.prototype.ValueTypeName="string";es.prototype.ValueBufferType=Array;es.prototype.DefaultInterpolation=Co;es.prototype.InterpolantFactoryMethodLinear=void 0;es.prototype.InterpolantFactoryMethodSmooth=void 0;var Qc=class extends mi{constructor(e,t,n,i){super(e,t,n,i)}};Qc.prototype.ValueTypeName="vector";var dc={enabled:!1,files:{},add:function(r,e){this.enabled!==!1&&(pm(r)||(this.files[r]=e))},get:function(r){if(this.enabled!==!1&&!pm(r))return this.files[r]},remove:function(r){delete this.files[r]},clear:function(){this.files={}}};function pm(r){try{let e=r.slice(r.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}var jc=class{constructor(e,t,n){let i=this,s=!1,a=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(u){o++,s===!1&&i.onStart!==void 0&&i.onStart(u,a,o),s=!0},this.itemEnd=function(u){a++,i.onProgress!==void 0&&i.onProgress(u,a,o),a===o&&(s=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(u){i.onError!==void 0&&i.onError(u)},this.resolveURL=function(u){return l?l(u):u},this.setURLModifier=function(u){return l=u,this},this.addHandler=function(u,d){return c.push(u,d),this},this.removeHandler=function(u){let d=c.indexOf(u);return d!==-1&&c.splice(d,2),this},this.getHandler=function(u){for(let d=0,h=c.length;d<h;d+=2){let f=c[d],m=c[d+1];if(f.global&&(f.lastIndex=0),f.test(u))return m}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},og=new jc,Ba=class{constructor(e){this.manager=e!==void 0?e:og,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(i,s){n.load(e,i,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};Ba.DEFAULT_MATERIAL_NAME="__DEFAULT";var Ma=new WeakMap,eu=class extends Ba{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let s=this,a=dc.get(`image:${e}`);if(a!==void 0){if(a.complete===!0)s.manager.itemStart(e),setTimeout(function(){t&&t(a),s.manager.itemEnd(e)},0);else{let d=Ma.get(a);d===void 0&&(d=[],Ma.set(a,d)),d.push({onLoad:t,onError:i})}return a}let o=Ca("img");function l(){u(),t&&t(this);let d=Ma.get(this)||[];for(let h=0;h<d.length;h++){let f=d[h];f.onLoad&&f.onLoad(this)}Ma.delete(this),s.manager.itemEnd(e)}function c(d){u(),i&&i(d),dc.remove(`image:${e}`);let h=Ma.get(this)||[];for(let f=0;f<h.length;f++){let m=h[f];m.onError&&m.onError(d)}Ma.delete(this),s.manager.itemError(e),s.manager.itemEnd(e)}function u(){o.removeEventListener("load",l,!1),o.removeEventListener("error",c,!1)}return o.addEventListener("load",l,!1),o.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),dc.add(`image:${e}`,o),s.manager.itemStart(e),o.src=e,o}};var ts=class extends Ba{constructor(e){super(e)}load(e,t,n,i){let s=new Cn,a=new eu(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){s.image=o,s.needsUpdate=!0,t!==void 0&&t(s)},n,i),s}},tu=class extends Fn{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new qe(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}};var gf=new Ut,mm=new W,gm=new W,Af=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new we(512,512),this.mapType=ri,this.map=null,this.mapPass=null,this.matrix=new Ut,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new La,this._frameExtents=new we(1,1),this._viewportCount=1,this._viewports=[new Gt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;mm.setFromMatrixPosition(e.matrixWorld),t.position.copy(mm),gm.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(gm),t.updateMatrixWorld(),gf.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(gf,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===Aa||t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(gf)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},uc=new W,hc=new er,Ji=new W,Tr=class extends Fn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Ut,this.projectionMatrix=new Ut,this.projectionMatrixInverse=new Ut,this.coordinateSystem=zi,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(uc,hc,Ji),Ji.x===1&&Ji.y===1&&Ji.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(uc,hc,Ji.set(1,1,1)).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorld.decompose(uc,hc,Ji),Ji.x===1&&Ji.y===1&&Ji.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(uc,hc,Ji.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Yr=new W,_m=new we,xm=new we,Sn=class extends Tr{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Pa*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(To*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Pa*2*Math.atan(Math.tan(To*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Yr.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Yr.x,Yr.y).multiplyScalar(-e/Yr.z),Yr.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Yr.x,Yr.y).multiplyScalar(-e/Yr.z)}getViewSize(e,t){return this.getViewBounds(e,_m,xm),t.subVectors(xm,_m)}setViewOffset(e,t,n,i,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(To*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,s=-.5*i,a=this.view;if(this.view!==null&&this.view.enabled){let l=a.fullWidth,c=a.fullHeight;s+=a.offsetX*i/l,t-=a.offsetY*n/c,i*=a.width/l,n*=a.height/c}let o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}};var ns=class extends Tr{constructor(e=-1,t=1,n=1,i=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2,s=n-e,a=n+e,o=i+t,l=i-t;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,a=s+c*this.view.width,o-=u*this.view.offsetY,l=o-u*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},Cf=class extends Af{constructor(){super(new ns(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},is=class extends tu{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Fn.DEFAULT_UP),this.updateMatrix(),this.target=new Fn,this.shadow=new Cf}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}};var ba=-90,Ta=1,nu=class extends Fn{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let i=new Sn(ba,Ta,e,t);i.layers=this.layers,this.add(i);let s=new Sn(ba,Ta,e,t);s.layers=this.layers,this.add(s);let a=new Sn(ba,Ta,e,t);a.layers=this.layers,this.add(a);let o=new Sn(ba,Ta,e,t);o.layers=this.layers,this.add(o);let l=new Sn(ba,Ta,e,t);l.layers=this.layers,this.add(l);let c=new Sn(ba,Ta,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,i,s,a,o,l]=t;for(let c of t)this.remove(c);if(e===zi)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Aa)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[s,a,o,l,c,u]=this.children,d=e.getRenderTarget(),h=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;let _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let p=!1;e.isWebGLRenderer===!0?p=e.state.buffers.depth.getReversed():p=e.reversedDepthBuffer,e.setRenderTarget(n,0,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,1,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(n,4,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=_,e.setRenderTarget(n,5,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,u),e.setRenderTarget(d,h,f),e.xr.enabled=m,n.texture.needsPMREMUpdate=!0}},iu=class extends Sn{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}};var td="\\[\\]\\.:\\/",mv=new RegExp("["+td+"]","g"),nd="[^"+td+"]",gv="[^"+td.replace("\\.","")+"]",_v=/((?:WC+[\/:])*)/.source.replace("WC",nd),xv=/(WCOD+)?/.source.replace("WCOD",gv),vv=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",nd),yv=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",nd),Sv=new RegExp("^"+_v+xv+vv+yv+"$"),Mv=["material","materials","bones","map"],Rf=class{constructor(e,t,n){let i=n||Nt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,i)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,s=n.length;i!==s;++i)n[i].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},Nt=class r{constructor(e,t,n){this.path=t,this.parsedPath=n||r.parseTrackName(t),this.node=r.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new r.Composite(e,t,n):new r(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(mv,"")}static parseTrackName(e){let t=Sv.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){let s=n.nodeName.substring(i+1);Mv.indexOf(s)!==-1&&(n.nodeName=n.nodeName.substring(0,i),n.objectName=s)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(s){for(let a=0;a<s.length;a++){let o=s[a];if(o.name===t||o.uuid===t)return o;let l=n(o.children);if(l)return l}return null},i=n(e.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)e[t++]=n[i]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,i=t.propertyName,s=t.propertyIndex;if(e||(e=r.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){tt("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){nt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){nt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){nt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===c){c=u;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){nt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){nt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){nt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){nt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let a=e[i];if(a===void 0){let c=t.nodeName;nt("PropertyBinding: Trying to update property for track: "+c+"."+i+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?o=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(s!==void 0){if(i==="morphTargetInfluences"){if(!e.geometry){nt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){nt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=s}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=i;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Nt.Composite=Rf;Nt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Nt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Nt.prototype.GetterByBindingType=[Nt.prototype._getValue_direct,Nt.prototype._getValue_array,Nt.prototype._getValue_arrayElement,Nt.prototype._getValue_toArray];Nt.prototype.SetterByBindingTypeAndVersioning=[[Nt.prototype._setValue_direct,Nt.prototype._setValue_direct_setNeedsUpdate,Nt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Nt.prototype._setValue_array,Nt.prototype._setValue_array_setNeedsUpdate,Nt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Nt.prototype._setValue_arrayElement,Nt.prototype._setValue_arrayElement_setNeedsUpdate,Nt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Nt.prototype._setValue_fromArray,Nt.prototype._setValue_fromArray_setNeedsUpdate,Nt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var EE=new Float32Array(1);var Pf=class r{static{r.prototype.isMatrix2=!0}constructor(e,t,n,i){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,i)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,i){let s=this.elements;return s[0]=e,s[2]=t,s[1]=n,s[3]=i,this}};function id(r,e,t,n){let i=bv(n);switch(t){case Yf:return r*e;case Jf:return r*e/i.components*i.byteLength;case uu:return r*e/i.components*i.byteLength;case os:return r*e*2/i.components*i.byteLength;case hu:return r*e*2/i.components*i.byteLength;case Zf:return r*e*3/i.components*i.byteLength;case Ri:return r*e*4/i.components*i.byteLength;case fu:return r*e*4/i.components*i.byteLength;case Qo:case jo:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*8;case el:case tl:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case pu:case gu:return Math.max(r,16)*Math.max(e,8)/4;case du:case mu:return Math.max(r,8)*Math.max(e,8)/2;case _u:case xu:case yu:case Su:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*8;case vu:case nl:case Mu:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case bu:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case Tu:return Math.floor((r+4)/5)*Math.floor((e+3)/4)*16;case Eu:return Math.floor((r+4)/5)*Math.floor((e+4)/5)*16;case wu:return Math.floor((r+5)/6)*Math.floor((e+4)/5)*16;case Au:return Math.floor((r+5)/6)*Math.floor((e+5)/6)*16;case Cu:return Math.floor((r+7)/8)*Math.floor((e+4)/5)*16;case Ru:return Math.floor((r+7)/8)*Math.floor((e+5)/6)*16;case Pu:return Math.floor((r+7)/8)*Math.floor((e+7)/8)*16;case Iu:return Math.floor((r+9)/10)*Math.floor((e+4)/5)*16;case Du:return Math.floor((r+9)/10)*Math.floor((e+5)/6)*16;case Lu:return Math.floor((r+9)/10)*Math.floor((e+7)/8)*16;case Uu:return Math.floor((r+9)/10)*Math.floor((e+9)/10)*16;case Nu:return Math.floor((r+11)/12)*Math.floor((e+9)/10)*16;case Fu:return Math.floor((r+11)/12)*Math.floor((e+11)/12)*16;case Ou:case Bu:case ku:return Math.ceil(r/4)*Math.ceil(e/4)*16;case zu:case Vu:return Math.ceil(r/4)*Math.ceil(e/4)*8;case il:case Hu:return Math.ceil(r/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function bv(r){switch(r){case ri:case Gf:return{byteLength:1,components:1};case za:case Wf:case gi:return{byteLength:2,components:1};case lu:case cu:return{byteLength:2,components:4};case Hi:case ou:case Gi:return{byteLength:4,components:1};case Xf:case qf:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${r}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"184"}}));typeof window<"u"&&(window.__THREE__?tt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="184");function Pg(){let r=null,e=!1,t=null,n=null;function i(s,a){t(s,a),n=r.requestAnimationFrame(i)}return{start:function(){e!==!0&&t!==null&&r!==null&&(n=r.requestAnimationFrame(i),e=!0)},stop:function(){r!==null&&r.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){r=s}}}function Ev(r){let e=new WeakMap;function t(o,l){let c=o.array,u=o.usage,d=c.byteLength,h=r.createBuffer();r.bindBuffer(l,h),r.bufferData(l,c,u),o.onUploadCallback();let f;if(c instanceof Float32Array)f=r.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=r.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?f=r.HALF_FLOAT:f=r.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=r.SHORT;else if(c instanceof Uint32Array)f=r.UNSIGNED_INT;else if(c instanceof Int32Array)f=r.INT;else if(c instanceof Int8Array)f=r.BYTE;else if(c instanceof Uint8Array)f=r.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=r.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:h,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:d}}function n(o,l,c){let u=l.array,d=l.updateRanges;if(r.bindBuffer(c,o),d.length===0)r.bufferSubData(c,0,u);else{d.sort((f,m)=>f.start-m.start);let h=0;for(let f=1;f<d.length;f++){let m=d[h],_=d[f];_.start<=m.start+m.count+1?m.count=Math.max(m.count,_.start+_.count-m.start):(++h,d[h]=_)}d.length=h+1;for(let f=0,m=d.length;f<m;f++){let _=d[f];r.bufferSubData(c,_.start*u.BYTES_PER_ELEMENT,u,_.start,_.count)}l.clearUpdateRanges()}l.onUploadCallback()}function i(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function s(o){o.isInterleavedBufferAttribute&&(o=o.data);let l=e.get(o);l&&(r.deleteBuffer(l.buffer),e.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let u=e.get(o);(!u||u.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:i,remove:s,update:a}}var wv=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Av=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Cv=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Rv=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Pv=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Iv=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Dv=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Lv=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Uv=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,Nv=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Fv=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Ov=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Bv=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,kv=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,zv=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Vv=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Hv=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Gv=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Wv=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Xv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,qv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Yv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Zv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Jv=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,$v=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Kv=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Qv=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,jv=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,ey=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,ty=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,ny="gl_FragColor = linearToOutputTexel( gl_FragColor );",iy=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,ry=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,sy=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,ay=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,oy=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,ly=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,cy=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,uy=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,hy=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fy=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,dy=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,py=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,my=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,gy=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,_y=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,xy=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,vy=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,yy=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Sy=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,My=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,by=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Ty=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Ey=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = inverseTransformDirection( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,wy=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Ay=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Cy=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,Ry=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Py=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Iy=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Dy=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Ly=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Uy=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Ny=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Fy=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Oy=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,By=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,ky=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,zy=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Vy=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Hy=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Gy=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Wy=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Xy=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,qy=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Yy=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Zy=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Jy=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,$y=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Ky=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Qy=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,jy=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,eS=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,tS=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,nS=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,iS=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,rS=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,sS=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,aS=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,oS=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,lS=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,cS=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,uS=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,hS=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,fS=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,dS=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,pS=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,mS=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,gS=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,_S=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,xS=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,vS=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,yS=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,SS=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,MS=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,bS=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,TS=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,ES=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,wS=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,AS=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,CS=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,RS=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,PS=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,IS=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,DS=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,LS=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,US=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,NS=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,FS=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,OS=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,BS=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,kS=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,zS=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,VS=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,HS=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,GS=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,WS=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,XS=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,qS=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,YS=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,ZS=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,JS=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,$S=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,KS=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,QS=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,jS=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,eM=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,tM=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,nM=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,iM=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,rM=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sM=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,ft={alphahash_fragment:wv,alphahash_pars_fragment:Av,alphamap_fragment:Cv,alphamap_pars_fragment:Rv,alphatest_fragment:Pv,alphatest_pars_fragment:Iv,aomap_fragment:Dv,aomap_pars_fragment:Lv,batching_pars_vertex:Uv,batching_vertex:Nv,begin_vertex:Fv,beginnormal_vertex:Ov,bsdfs:Bv,iridescence_fragment:kv,bumpmap_pars_fragment:zv,clipping_planes_fragment:Vv,clipping_planes_pars_fragment:Hv,clipping_planes_pars_vertex:Gv,clipping_planes_vertex:Wv,color_fragment:Xv,color_pars_fragment:qv,color_pars_vertex:Yv,color_vertex:Zv,common:Jv,cube_uv_reflection_fragment:$v,defaultnormal_vertex:Kv,displacementmap_pars_vertex:Qv,displacementmap_vertex:jv,emissivemap_fragment:ey,emissivemap_pars_fragment:ty,colorspace_fragment:ny,colorspace_pars_fragment:iy,envmap_fragment:ry,envmap_common_pars_fragment:sy,envmap_pars_fragment:ay,envmap_pars_vertex:oy,envmap_physical_pars_fragment:xy,envmap_vertex:ly,fog_vertex:cy,fog_pars_vertex:uy,fog_fragment:hy,fog_pars_fragment:fy,gradientmap_pars_fragment:dy,lightmap_pars_fragment:py,lights_lambert_fragment:my,lights_lambert_pars_fragment:gy,lights_pars_begin:_y,lights_toon_fragment:vy,lights_toon_pars_fragment:yy,lights_phong_fragment:Sy,lights_phong_pars_fragment:My,lights_physical_fragment:by,lights_physical_pars_fragment:Ty,lights_fragment_begin:Ey,lights_fragment_maps:wy,lights_fragment_end:Ay,lightprobes_pars_fragment:Cy,logdepthbuf_fragment:Ry,logdepthbuf_pars_fragment:Py,logdepthbuf_pars_vertex:Iy,logdepthbuf_vertex:Dy,map_fragment:Ly,map_pars_fragment:Uy,map_particle_fragment:Ny,map_particle_pars_fragment:Fy,metalnessmap_fragment:Oy,metalnessmap_pars_fragment:By,morphinstance_vertex:ky,morphcolor_vertex:zy,morphnormal_vertex:Vy,morphtarget_pars_vertex:Hy,morphtarget_vertex:Gy,normal_fragment_begin:Wy,normal_fragment_maps:Xy,normal_pars_fragment:qy,normal_pars_vertex:Yy,normal_vertex:Zy,normalmap_pars_fragment:Jy,clearcoat_normal_fragment_begin:$y,clearcoat_normal_fragment_maps:Ky,clearcoat_pars_fragment:Qy,iridescence_pars_fragment:jy,opaque_fragment:eS,packing:tS,premultiplied_alpha_fragment:nS,project_vertex:iS,dithering_fragment:rS,dithering_pars_fragment:sS,roughnessmap_fragment:aS,roughnessmap_pars_fragment:oS,shadowmap_pars_fragment:lS,shadowmap_pars_vertex:cS,shadowmap_vertex:uS,shadowmask_pars_fragment:hS,skinbase_vertex:fS,skinning_pars_vertex:dS,skinning_vertex:pS,skinnormal_vertex:mS,specularmap_fragment:gS,specularmap_pars_fragment:_S,tonemapping_fragment:xS,tonemapping_pars_fragment:vS,transmission_fragment:yS,transmission_pars_fragment:SS,uv_pars_fragment:MS,uv_pars_vertex:bS,uv_vertex:TS,worldpos_vertex:ES,background_vert:wS,background_frag:AS,backgroundCube_vert:CS,backgroundCube_frag:RS,cube_vert:PS,cube_frag:IS,depth_vert:DS,depth_frag:LS,distance_vert:US,distance_frag:NS,equirect_vert:FS,equirect_frag:OS,linedashed_vert:BS,linedashed_frag:kS,meshbasic_vert:zS,meshbasic_frag:VS,meshlambert_vert:HS,meshlambert_frag:GS,meshmatcap_vert:WS,meshmatcap_frag:XS,meshnormal_vert:qS,meshnormal_frag:YS,meshphong_vert:ZS,meshphong_frag:JS,meshphysical_vert:$S,meshphysical_frag:KS,meshtoon_vert:QS,meshtoon_frag:jS,points_vert:eM,points_frag:tM,shadow_vert:nM,shadow_frag:iM,sprite_vert:rM,sprite_frag:sM},Le={common:{diffuse:{value:new qe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new st},alphaMap:{value:null},alphaMapTransform:{value:new st},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new st}},envmap:{envMap:{value:null},envMapRotation:{value:new st},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new st}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new st}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new st},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new st},normalScale:{value:new we(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new st},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new st}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new st}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new st}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new qe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new W},probesMax:{value:new W},probesResolution:{value:new W}},points:{diffuse:{value:new qe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new st},alphaTest:{value:0},uvTransform:{value:new st}},sprite:{diffuse:{value:new qe(16777215)},opacity:{value:1},center:{value:new we(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new st},alphaMap:{value:null},alphaMapTransform:{value:new st},alphaTest:{value:0}}},rr={basic:{uniforms:On([Le.common,Le.specularmap,Le.envmap,Le.aomap,Le.lightmap,Le.fog]),vertexShader:ft.meshbasic_vert,fragmentShader:ft.meshbasic_frag},lambert:{uniforms:On([Le.common,Le.specularmap,Le.envmap,Le.aomap,Le.lightmap,Le.emissivemap,Le.bumpmap,Le.normalmap,Le.displacementmap,Le.fog,Le.lights,{emissive:{value:new qe(0)},envMapIntensity:{value:1}}]),vertexShader:ft.meshlambert_vert,fragmentShader:ft.meshlambert_frag},phong:{uniforms:On([Le.common,Le.specularmap,Le.envmap,Le.aomap,Le.lightmap,Le.emissivemap,Le.bumpmap,Le.normalmap,Le.displacementmap,Le.fog,Le.lights,{emissive:{value:new qe(0)},specular:{value:new qe(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:ft.meshphong_vert,fragmentShader:ft.meshphong_frag},standard:{uniforms:On([Le.common,Le.envmap,Le.aomap,Le.lightmap,Le.emissivemap,Le.bumpmap,Le.normalmap,Le.displacementmap,Le.roughnessmap,Le.metalnessmap,Le.fog,Le.lights,{emissive:{value:new qe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ft.meshphysical_vert,fragmentShader:ft.meshphysical_frag},toon:{uniforms:On([Le.common,Le.aomap,Le.lightmap,Le.emissivemap,Le.bumpmap,Le.normalmap,Le.displacementmap,Le.gradientmap,Le.fog,Le.lights,{emissive:{value:new qe(0)}}]),vertexShader:ft.meshtoon_vert,fragmentShader:ft.meshtoon_frag},matcap:{uniforms:On([Le.common,Le.bumpmap,Le.normalmap,Le.displacementmap,Le.fog,{matcap:{value:null}}]),vertexShader:ft.meshmatcap_vert,fragmentShader:ft.meshmatcap_frag},points:{uniforms:On([Le.points,Le.fog]),vertexShader:ft.points_vert,fragmentShader:ft.points_frag},dashed:{uniforms:On([Le.common,Le.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ft.linedashed_vert,fragmentShader:ft.linedashed_frag},depth:{uniforms:On([Le.common,Le.displacementmap]),vertexShader:ft.depth_vert,fragmentShader:ft.depth_frag},normal:{uniforms:On([Le.common,Le.bumpmap,Le.normalmap,Le.displacementmap,{opacity:{value:1}}]),vertexShader:ft.meshnormal_vert,fragmentShader:ft.meshnormal_frag},sprite:{uniforms:On([Le.sprite,Le.fog]),vertexShader:ft.sprite_vert,fragmentShader:ft.sprite_frag},background:{uniforms:{uvTransform:{value:new st},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ft.background_vert,fragmentShader:ft.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new st}},vertexShader:ft.backgroundCube_vert,fragmentShader:ft.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ft.cube_vert,fragmentShader:ft.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ft.equirect_vert,fragmentShader:ft.equirect_frag},distance:{uniforms:On([Le.common,Le.displacementmap,{referencePosition:{value:new W},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ft.distance_vert,fragmentShader:ft.distance_frag},shadow:{uniforms:On([Le.lights,Le.fog,{color:{value:new qe(0)},opacity:{value:1}}]),vertexShader:ft.shadow_vert,fragmentShader:ft.shadow_frag}};rr.physical={uniforms:On([rr.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new st},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new st},clearcoatNormalScale:{value:new we(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new st},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new st},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new st},sheen:{value:0},sheenColor:{value:new qe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new st},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new st},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new st},transmissionSamplerSize:{value:new we},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new st},attenuationDistance:{value:0},attenuationColor:{value:new qe(0)},specularColor:{value:new qe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new st},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new st},anisotropyVector:{value:new we},anisotropyMap:{value:null},anisotropyMapTransform:{value:new st}}]),vertexShader:ft.meshphysical_vert,fragmentShader:ft.meshphysical_frag};var qu={r:0,b:0,g:0},aM=new Ut,Ig=new st;Ig.set(-1,0,0,0,1,0,0,0,1);function oM(r,e,t,n,i,s){let a=new qe(0),o=i===!0?0:1,l,c,u=null,d=0,h=null;function f(S){let M=S.isScene===!0?S.background:null;if(M&&M.isTexture){let x=S.backgroundBlurriness>0;M=e.get(M,x)}return M}function m(S){let M=!1,x=f(S);x===null?p(a,o):x&&x.isColor&&(p(x,1),M=!0);let R=r.xr.getEnvironmentBlendMode();R==="additive"?t.buffers.color.setClear(0,0,0,1,s):R==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,s),(r.autoClear||M)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),r.clear(r.autoClearColor,r.autoClearDepth,r.autoClearStencil))}function _(S,M){let x=f(M);x&&(x.isCubeTexture||x.mapping===$o)?(c===void 0&&(c=new vt(new Ua(1,1,1),new en({name:"BackgroundCubeMaterial",uniforms:Bs(rr.backgroundCube.uniforms),vertexShader:rr.backgroundCube.vertexShader,fragmentShader:rr.backgroundCube.fragmentShader,side:Yn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(R,E,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=x,c.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(aM.makeRotationFromEuler(M.backgroundRotation)).transpose(),x.isCubeTexture&&x.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(Ig),c.material.toneMapped=xt.getTransfer(x.colorSpace)!==Tt,(u!==x||d!==x.version||h!==r.toneMapping)&&(c.material.needsUpdate=!0,u=x,d=x.version,h=r.toneMapping),c.layers.enableAll(),S.unshift(c,c.geometry,c.material,0,0,null)):x&&x.isTexture&&(l===void 0&&(l=new vt(new ln(2,2),new en({name:"BackgroundMaterial",uniforms:Bs(rr.background.uniforms),vertexShader:rr.background.vertexShader,fragmentShader:rr.background.fragmentShader,side:yr,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=x,l.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,l.material.toneMapped=xt.getTransfer(x.colorSpace)!==Tt,x.matrixAutoUpdate===!0&&x.updateMatrix(),l.material.uniforms.uvTransform.value.copy(x.matrix),(u!==x||d!==x.version||h!==r.toneMapping)&&(l.material.needsUpdate=!0,u=x,d=x.version,h=r.toneMapping),l.layers.enableAll(),S.unshift(l,l.geometry,l.material,0,0,null))}function p(S,M){S.getRGB(qu,ed(r)),t.buffers.color.setClear(qu.r,qu.g,qu.b,M,s)}function g(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(S,M=1){a.set(S),o=M,p(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(S){o=S,p(a,o)},render:m,addToRenderList:_,dispose:g}}function lM(r,e){let t=r.getParameter(r.MAX_VERTEX_ATTRIBS),n={},i=h(null),s=i,a=!1;function o(C,I,H,V,D){let O=!1,F=d(C,V,H,I);s!==F&&(s=F,c(s.object)),O=f(C,V,H,D),O&&m(C,V,H,D),D!==null&&e.update(D,r.ELEMENT_ARRAY_BUFFER),(O||a)&&(a=!1,x(C,I,H,V),D!==null&&r.bindBuffer(r.ELEMENT_ARRAY_BUFFER,e.get(D).buffer))}function l(){return r.createVertexArray()}function c(C){return r.bindVertexArray(C)}function u(C){return r.deleteVertexArray(C)}function d(C,I,H,V){let D=V.wireframe===!0,O=n[I.id];O===void 0&&(O={},n[I.id]=O);let F=C.isInstancedMesh===!0?C.id:0,Z=O[F];Z===void 0&&(Z={},O[F]=Z);let ee=Z[H.id];ee===void 0&&(ee={},Z[H.id]=ee);let L=ee[D];return L===void 0&&(L=h(l()),ee[D]=L),L}function h(C){let I=[],H=[],V=[];for(let D=0;D<t;D++)I[D]=0,H[D]=0,V[D]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:I,enabledAttributes:H,attributeDivisors:V,object:C,attributes:{},index:null}}function f(C,I,H,V){let D=s.attributes,O=I.attributes,F=0,Z=H.getAttributes();for(let ee in Z)if(Z[ee].location>=0){let ie=D[ee],ye=O[ee];if(ye===void 0&&(ee==="instanceMatrix"&&C.instanceMatrix&&(ye=C.instanceMatrix),ee==="instanceColor"&&C.instanceColor&&(ye=C.instanceColor)),ie===void 0||ie.attribute!==ye||ye&&ie.data!==ye.data)return!0;F++}return s.attributesNum!==F||s.index!==V}function m(C,I,H,V){let D={},O=I.attributes,F=0,Z=H.getAttributes();for(let ee in Z)if(Z[ee].location>=0){let ie=O[ee];ie===void 0&&(ee==="instanceMatrix"&&C.instanceMatrix&&(ie=C.instanceMatrix),ee==="instanceColor"&&C.instanceColor&&(ie=C.instanceColor));let ye={};ye.attribute=ie,ie&&ie.data&&(ye.data=ie.data),D[ee]=ye,F++}s.attributes=D,s.attributesNum=F,s.index=V}function _(){let C=s.newAttributes;for(let I=0,H=C.length;I<H;I++)C[I]=0}function p(C){g(C,0)}function g(C,I){let H=s.newAttributes,V=s.enabledAttributes,D=s.attributeDivisors;H[C]=1,V[C]===0&&(r.enableVertexAttribArray(C),V[C]=1),D[C]!==I&&(r.vertexAttribDivisor(C,I),D[C]=I)}function S(){let C=s.newAttributes,I=s.enabledAttributes;for(let H=0,V=I.length;H<V;H++)I[H]!==C[H]&&(r.disableVertexAttribArray(H),I[H]=0)}function M(C,I,H,V,D,O,F){F===!0?r.vertexAttribIPointer(C,I,H,D,O):r.vertexAttribPointer(C,I,H,V,D,O)}function x(C,I,H,V){_();let D=V.attributes,O=H.getAttributes(),F=I.defaultAttributeValues;for(let Z in O){let ee=O[Z];if(ee.location>=0){let L=D[Z];if(L===void 0&&(Z==="instanceMatrix"&&C.instanceMatrix&&(L=C.instanceMatrix),Z==="instanceColor"&&C.instanceColor&&(L=C.instanceColor)),L!==void 0){let ie=L.normalized,ye=L.itemSize,Fe=e.get(L);if(Fe===void 0)continue;let ze=Fe.buffer,Oe=Fe.type,K=Fe.bytesPerElement,le=Oe===r.INT||Oe===r.UNSIGNED_INT||L.gpuType===ou;if(L.isInterleavedBufferAttribute){let ue=L.data,Ee=ue.stride,He=L.offset;if(ue.isInstancedInterleavedBuffer){for(let Ae=0;Ae<ee.locationSize;Ae++)g(ee.location+Ae,ue.meshPerAttribute);C.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=ue.meshPerAttribute*ue.count)}else for(let Ae=0;Ae<ee.locationSize;Ae++)p(ee.location+Ae);r.bindBuffer(r.ARRAY_BUFFER,ze);for(let Ae=0;Ae<ee.locationSize;Ae++)M(ee.location+Ae,ye/ee.locationSize,Oe,ie,Ee*K,(He+ye/ee.locationSize*Ae)*K,le)}else{if(L.isInstancedBufferAttribute){for(let ue=0;ue<ee.locationSize;ue++)g(ee.location+ue,L.meshPerAttribute);C.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=L.meshPerAttribute*L.count)}else for(let ue=0;ue<ee.locationSize;ue++)p(ee.location+ue);r.bindBuffer(r.ARRAY_BUFFER,ze);for(let ue=0;ue<ee.locationSize;ue++)M(ee.location+ue,ye/ee.locationSize,Oe,ie,ye*K,ye/ee.locationSize*ue*K,le)}}else if(F!==void 0){let ie=F[Z];if(ie!==void 0)switch(ie.length){case 2:r.vertexAttrib2fv(ee.location,ie);break;case 3:r.vertexAttrib3fv(ee.location,ie);break;case 4:r.vertexAttrib4fv(ee.location,ie);break;default:r.vertexAttrib1fv(ee.location,ie)}}}}S()}function R(){b();for(let C in n){let I=n[C];for(let H in I){let V=I[H];for(let D in V){let O=V[D];for(let F in O)u(O[F].object),delete O[F];delete V[D]}}delete n[C]}}function E(C){if(n[C.id]===void 0)return;let I=n[C.id];for(let H in I){let V=I[H];for(let D in V){let O=V[D];for(let F in O)u(O[F].object),delete O[F];delete V[D]}}delete n[C.id]}function A(C){for(let I in n){let H=n[I];for(let V in H){let D=H[V];if(D[C.id]===void 0)continue;let O=D[C.id];for(let F in O)u(O[F].object),delete O[F];delete D[C.id]}}}function v(C){for(let I in n){let H=n[I],V=C.isInstancedMesh===!0?C.id:0,D=H[V];if(D!==void 0){for(let O in D){let F=D[O];for(let Z in F)u(F[Z].object),delete F[Z];delete D[O]}delete H[V],Object.keys(H).length===0&&delete n[I]}}}function b(){P(),a=!0,s!==i&&(s=i,c(s.object))}function P(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:o,reset:b,resetDefaultState:P,dispose:R,releaseStatesOfGeometry:E,releaseStatesOfObject:v,releaseStatesOfProgram:A,initAttributes:_,enableAttribute:p,disableUnusedAttributes:S}}function cM(r,e,t){let n;function i(l){n=l}function s(l,c){r.drawArrays(n,l,c),t.update(c,n,1)}function a(l,c,u){u!==0&&(r.drawArraysInstanced(n,l,c,u),t.update(c,n,u))}function o(l,c,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,u);let h=0;for(let f=0;f<u;f++)h+=c[f];t.update(h,n,1)}this.setMode=i,this.render=s,this.renderInstances=a,this.renderMultiDraw=o}function uM(r,e,t,n){let i;function s(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){let A=e.get("EXT_texture_filter_anisotropic");i=r.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function a(A){return!(A!==Ri&&n.convert(A)!==r.getParameter(r.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(A){let v=A===gi&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(A!==ri&&n.convert(A)!==r.getParameter(r.IMPLEMENTATION_COLOR_READ_TYPE)&&A!==Gi&&!v)}function l(A){if(A==="highp"){if(r.getShaderPrecisionFormat(r.VERTEX_SHADER,r.HIGH_FLOAT).precision>0&&r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&r.getShaderPrecisionFormat(r.VERTEX_SHADER,r.MEDIUM_FLOAT).precision>0&&r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp",u=l(c);u!==c&&(tt("WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);let d=t.logarithmicDepthBuffer===!0,h=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&h===!1&&tt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=r.getParameter(r.MAX_TEXTURE_IMAGE_UNITS),m=r.getParameter(r.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=r.getParameter(r.MAX_TEXTURE_SIZE),p=r.getParameter(r.MAX_CUBE_MAP_TEXTURE_SIZE),g=r.getParameter(r.MAX_VERTEX_ATTRIBS),S=r.getParameter(r.MAX_VERTEX_UNIFORM_VECTORS),M=r.getParameter(r.MAX_VARYING_VECTORS),x=r.getParameter(r.MAX_FRAGMENT_UNIFORM_VECTORS),R=r.getParameter(r.MAX_SAMPLES),E=r.getParameter(r.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:h,maxTextures:f,maxVertexTextures:m,maxTextureSize:_,maxCubemapSize:p,maxAttributes:g,maxVertexUniforms:S,maxVaryings:M,maxFragmentUniforms:x,maxSamples:R,samples:E}}function hM(r){let e=this,t=null,n=0,i=!1,s=!1,a=new $i,o=new st,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,h){let f=d.length!==0||h||n!==0||i;return i=h,n=d.length,f},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(d,h){t=u(d,h,0)},this.setState=function(d,h,f){let m=d.clippingPlanes,_=d.clipIntersection,p=d.clipShadows,g=r.get(d);if(!i||m===null||m.length===0||s&&!p)s?u(null):c();else{let S=s?0:n,M=S*4,x=g.clippingState||null;l.value=x,x=u(m,h,M,f);for(let R=0;R!==M;++R)x[R]=t[R];g.clippingState=x,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=S}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function u(d,h,f,m){let _=d!==null?d.length:0,p=null;if(_!==0){if(p=l.value,m!==!0||p===null){let g=f+_*4,S=h.matrixWorldInverse;o.getNormalMatrix(S),(p===null||p.length<g)&&(p=new Float32Array(g));for(let M=0,x=f;M!==_;++M,x+=4)a.copy(d[M]).applyMatrix4(S,o),a.normal.toArray(p,x),p[x+3]=a.constant}l.value=p,l.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,p}}var ls=4,lg=[.125,.215,.35,.446,.526,.582],ks=20,fM=256,rl=new ns,cg=new qe,rd=null,sd=0,ad=0,od=!1,dM=new W,Wa=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,i=100,s={}){let{size:a=256,position:o=dM}=s;rd=this._renderer.getRenderTarget(),sd=this._renderer.getActiveCubeFace(),ad=this._renderer.getActiveMipmapLevel(),od=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,i,l,o),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=fg(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=hg(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(rd,sd,ad),this._renderer.xr.enabled=od,e.scissorTest=!1,Ha(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===rs||e.mapping===Fs?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),rd=this._renderer.getRenderTarget(),sd=this._renderer.getActiveCubeFace(),ad=this._renderer.getActiveMipmapLevel(),od=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Ft,minFilter:Ft,generateMipmaps:!1,type:gi,format:Ri,colorSpace:Ro,depthBuffer:!1},i=ug(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ug(e,t,n);let{_lodMax:s}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=pM(s)),this._blurMaterial=gM(s,e,t),this._ggxMaterial=mM(s,e,t)}return i}_compileMaterial(e){let t=new vt(new an,e);this._renderer.compile(t,rl)}_sceneToCubeUV(e,t,n,i,s){let l=new Sn(90,1,t,n),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],d=this._renderer,h=d.autoClear,f=d.toneMapping;d.getClearColor(cg),d.toneMapping=Vi,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(i),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new vt(new Ua,new on({name:"PMREM.Background",side:Yn,depthWrite:!1,depthTest:!1})));let _=this._backgroundBox,p=_.material,g=!1,S=e.background;S?S.isColor&&(p.color.copy(S),e.background=null,g=!0):(p.color.copy(cg),g=!0);for(let M=0;M<6;M++){let x=M%3;x===0?(l.up.set(0,c[M],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x+u[M],s.y,s.z)):x===1?(l.up.set(0,0,c[M]),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y+u[M],s.z)):(l.up.set(0,c[M],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y,s.z+u[M]));let R=this._cubeSize;Ha(i,x*R,M>2?R:0,R,R),d.setRenderTarget(i),g&&d.render(_,l),d.render(e,l)}d.toneMapping=f,d.autoClear=h,e.background=S}_textureToCubeUV(e,t){let n=this._renderer,i=e.mapping===rs||e.mapping===Fs;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=fg()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=hg());let s=i?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=s;let o=s.uniforms;o.envMap.value=e;let l=this._cubeSize;Ha(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(a,rl)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let i=this._lodMeshes.length;for(let s=1;s<i;s++)this._applyGGXFilter(e,s-1,s);t.autoClear=n}_applyGGXFilter(e,t,n){let i=this._renderer,s=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let l=a.uniforms,c=n/(this._lodMeshes.length-1),u=t/(this._lodMeshes.length-1),d=Math.sqrt(c*c-u*u),h=0+c*1.25,f=d*h,{_lodMax:m}=this,_=this._sizeLods[n],p=3*_*(n>m-ls?n-m+ls:0),g=4*(this._cubeSize-_);l.envMap.value=e.texture,l.roughness.value=f,l.mipInt.value=m-t,Ha(s,p,g,3*_,2*_),i.setRenderTarget(s),i.render(o,rl),l.envMap.value=s.texture,l.roughness.value=0,l.mipInt.value=m-n,Ha(e,p,g,3*_,2*_),i.setRenderTarget(e),i.render(o,rl)}_blur(e,t,n,i,s){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,i,"latitudinal",s),this._halfBlur(a,e,n,n,i,"longitudinal",s)}_halfBlur(e,t,n,i,s,a,o){let l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&nt("blur direction must be either latitudinal or longitudinal!");let u=3,d=this._lodMeshes[i];d.material=c;let h=c.uniforms,f=this._sizeLods[n]-1,m=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*ks-1),_=s/m,p=isFinite(s)?1+Math.floor(u*_):ks;p>ks&&tt(`sigmaRadians, ${s}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${ks}`);let g=[],S=0;for(let A=0;A<ks;++A){let v=A/_,b=Math.exp(-v*v/2);g.push(b),A===0?S+=b:A<p&&(S+=2*b)}for(let A=0;A<g.length;A++)g[A]=g[A]/S;h.envMap.value=e.texture,h.samples.value=p,h.weights.value=g,h.latitudinal.value=a==="latitudinal",o&&(h.poleAxis.value=o);let{_lodMax:M}=this;h.dTheta.value=m,h.mipInt.value=M-n;let x=this._sizeLods[i],R=3*x*(i>M-ls?i-M+ls:0),E=4*(this._cubeSize-x);Ha(t,R,E,3*x,2*x),l.setRenderTarget(t),l.render(d,rl)}};function pM(r){let e=[],t=[],n=[],i=r,s=r-ls+1+lg.length;for(let a=0;a<s;a++){let o=Math.pow(2,i);e.push(o);let l=1/o;a>r-ls?l=lg[a-r+ls-1]:a===0&&(l=0),t.push(l);let c=1/(o-2),u=-c,d=1+c,h=[u,u,d,u,d,d,u,u,d,d,u,d],f=6,m=6,_=3,p=2,g=1,S=new Float32Array(_*m*f),M=new Float32Array(p*m*f),x=new Float32Array(g*m*f);for(let E=0;E<f;E++){let A=E%3*2/3-1,v=E>2?0:-1,b=[A,v,0,A+2/3,v,0,A+2/3,v+1,0,A,v,0,A+2/3,v+1,0,A,v+1,0];S.set(b,_*m*E),M.set(h,p*m*E);let P=[E,E,E,E,E,E];x.set(P,g*m*E)}let R=new an;R.setAttribute("position",new sn(S,_)),R.setAttribute("uv",new sn(M,p)),R.setAttribute("faceIndex",new sn(x,g)),n.push(new vt(R,null)),i>ls&&i--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function ug(r,e,t){let n=new Tn(r,e,t);return n.texture.mapping=$o,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Ha(r,e,t,n,i){r.viewport.set(e,t,n,i),r.scissor.set(e,t,n,i)}function mM(r,e,t){return new en({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:fM,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${r}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:$u(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:nr,depthTest:!1,depthWrite:!1})}function gM(r,e,t){let n=new Float32Array(ks),i=new W(0,1,0);return new en({name:"SphericalGaussianBlur",defines:{n:ks,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${r}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:$u(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:nr,depthTest:!1,depthWrite:!1})}function hg(){return new en({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:$u(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:nr,depthTest:!1,depthWrite:!1})}function fg(){return new en({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:$u(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:nr,depthTest:!1,depthWrite:!1})}function $u(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}var Zu=class extends Tn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new Oo(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new Ua(5,5,5),s=new en({name:"CubemapFromEquirect",uniforms:Bs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Yn,blending:nr});s.uniforms.tEquirect.value=t;let a=new vt(i,s),o=t.minFilter;return t.minFilter===ss&&(t.minFilter=Ft),new nu(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){let s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,i);e.setRenderTarget(s)}};function _M(r){let e=new WeakMap,t=new WeakMap,n=null;function i(h,f=!1){return h==null?null:f?a(h):s(h)}function s(h){if(h&&h.isTexture){let f=h.mapping;if(f===ru||f===su)if(e.has(h)){let m=e.get(h).texture;return o(m,h.mapping)}else{let m=h.image;if(m&&m.height>0){let _=new Zu(m.height);return _.fromEquirectangularTexture(r,h),e.set(h,_),h.addEventListener("dispose",c),o(_.texture,h.mapping)}else return null}}return h}function a(h){if(h&&h.isTexture){let f=h.mapping,m=f===ru||f===su,_=f===rs||f===Fs;if(m||_){let p=t.get(h),g=p!==void 0?p.texture.pmremVersion:0;if(h.isRenderTargetTexture&&h.pmremVersion!==g)return n===null&&(n=new Wa(r)),p=m?n.fromEquirectangular(h,p):n.fromCubemap(h,p),p.texture.pmremVersion=h.pmremVersion,t.set(h,p),p.texture;if(p!==void 0)return p.texture;{let S=h.image;return m&&S&&S.height>0||_&&S&&l(S)?(n===null&&(n=new Wa(r)),p=m?n.fromEquirectangular(h):n.fromCubemap(h),p.texture.pmremVersion=h.pmremVersion,t.set(h,p),h.addEventListener("dispose",u),p.texture):null}}}return h}function o(h,f){return f===ru?h.mapping=rs:f===su&&(h.mapping=Fs),h}function l(h){let f=0,m=6;for(let _=0;_<m;_++)h[_]!==void 0&&f++;return f===m}function c(h){let f=h.target;f.removeEventListener("dispose",c);let m=e.get(f);m!==void 0&&(e.delete(f),m.dispose())}function u(h){let f=h.target;f.removeEventListener("dispose",u);let m=t.get(f);m!==void 0&&(t.delete(f),m.dispose())}function d(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:d}}function xM(r){let e={};function t(n){if(e[n]!==void 0)return e[n];let i=r.getExtension(n);return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){let i=t(n);return i===null&&wc("WebGLRenderer: "+n+" extension not supported."),i}}}function vM(r,e,t,n){let i={},s=new WeakMap;function a(d){let h=d.target;h.index!==null&&e.remove(h.index);for(let m in h.attributes)e.remove(h.attributes[m]);h.removeEventListener("dispose",a),delete i[h.id];let f=s.get(h);f&&(e.remove(f),s.delete(h)),n.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,t.memory.geometries--}function o(d,h){return i[h.id]===!0||(h.addEventListener("dispose",a),i[h.id]=!0,t.memory.geometries++),h}function l(d){let h=d.attributes;for(let f in h)e.update(h[f],r.ARRAY_BUFFER)}function c(d){let h=[],f=d.index,m=d.attributes.position,_=0;if(m===void 0)return;if(f!==null){let S=f.array;_=f.version;for(let M=0,x=S.length;M<x;M+=3){let R=S[M+0],E=S[M+1],A=S[M+2];h.push(R,E,E,A,A,R)}}else{let S=m.array;_=m.version;for(let M=0,x=S.length/3-1;M<x;M+=3){let R=M+0,E=M+1,A=M+2;h.push(R,E,E,A,A,R)}}let p=new(m.count>=65535?Uo:Lo)(h,1);p.version=_;let g=s.get(d);g&&e.remove(g),s.set(d,p)}function u(d){let h=s.get(d);if(h){let f=d.index;f!==null&&h.version<f.version&&c(d)}else c(d);return s.get(d)}return{get:o,update:l,getWireframeAttribute:u}}function yM(r,e,t){let n;function i(d){n=d}let s,a;function o(d){s=d.type,a=d.bytesPerElement}function l(d,h){r.drawElements(n,h,s,d*a),t.update(h,n,1)}function c(d,h,f){f!==0&&(r.drawElementsInstanced(n,h,s,d*a,f),t.update(h,n,f))}function u(d,h,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,h,0,s,d,0,f);let _=0;for(let p=0;p<f;p++)_+=h[p];t.update(_,n,1)}this.setMode=i,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=u}function SM(r){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,a,o){switch(t.calls++,a){case r.TRIANGLES:t.triangles+=o*(s/3);break;case r.LINES:t.lines+=o*(s/2);break;case r.LINE_STRIP:t.lines+=o*(s-1);break;case r.LINE_LOOP:t.lines+=o*s;break;case r.POINTS:t.points+=o*s;break;default:nt("WebGLInfo: Unknown draw mode:",a);break}}function i(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function MM(r,e,t){let n=new WeakMap,i=new Gt;function s(a,o,l){let c=a.morphTargetInfluences,u=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=u!==void 0?u.length:0,h=n.get(o);if(h===void 0||h.count!==d){let b=function(){A.dispose(),n.delete(o),o.removeEventListener("dispose",b)};h!==void 0&&h.texture.dispose();let f=o.morphAttributes.position!==void 0,m=o.morphAttributes.normal!==void 0,_=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],g=o.morphAttributes.normal||[],S=o.morphAttributes.color||[],M=0;f===!0&&(M=1),m===!0&&(M=2),_===!0&&(M=3);let x=o.attributes.position.count*M,R=1;x>e.maxTextureSize&&(R=Math.ceil(x/e.maxTextureSize),x=e.maxTextureSize);let E=new Float32Array(x*R*4*d),A=new Io(E,x,R,d);A.type=Gi,A.needsUpdate=!0;let v=M*4;for(let P=0;P<d;P++){let C=p[P],I=g[P],H=S[P],V=x*R*4*P;for(let D=0;D<C.count;D++){let O=D*v;f===!0&&(i.fromBufferAttribute(C,D),E[V+O+0]=i.x,E[V+O+1]=i.y,E[V+O+2]=i.z,E[V+O+3]=0),m===!0&&(i.fromBufferAttribute(I,D),E[V+O+4]=i.x,E[V+O+5]=i.y,E[V+O+6]=i.z,E[V+O+7]=0),_===!0&&(i.fromBufferAttribute(H,D),E[V+O+8]=i.x,E[V+O+9]=i.y,E[V+O+10]=i.z,E[V+O+11]=H.itemSize===4?i.w:1)}}h={count:d,texture:A,size:new we(x,R)},n.set(o,h),o.addEventListener("dispose",b)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(r,"morphTexture",a.morphTexture,t);else{let f=0;for(let _=0;_<c.length;_++)f+=c[_];let m=o.morphTargetsRelative?1:1-f;l.getUniforms().setValue(r,"morphTargetBaseInfluence",m),l.getUniforms().setValue(r,"morphTargetInfluences",c)}l.getUniforms().setValue(r,"morphTargetsTexture",h.texture,t),l.getUniforms().setValue(r,"morphTargetsTextureSize",h.size)}return{update:s}}function bM(r,e,t,n,i){let s=new WeakMap;function a(c){let u=i.render.frame,d=c.geometry,h=e.get(c,d);if(s.get(h)!==u&&(e.update(h),s.set(h,u)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),s.get(c)!==u&&(t.update(c.instanceMatrix,r.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,r.ARRAY_BUFFER),s.set(c,u))),c.isSkinnedMesh){let f=c.skeleton;s.get(f)!==u&&(f.update(),s.set(f,u))}return h}function o(){s=new WeakMap}function l(c){let u=c.target;u.removeEventListener("dispose",l),n.releaseStatesOfObject(u),t.remove(u.instanceMatrix),u.instanceColor!==null&&t.remove(u.instanceColor)}return{update:a,dispose:o}}var TM={[Ff]:"LINEAR_TONE_MAPPING",[Of]:"REINHARD_TONE_MAPPING",[Bf]:"CINEON_TONE_MAPPING",[Jo]:"ACES_FILMIC_TONE_MAPPING",[zf]:"AGX_TONE_MAPPING",[Vf]:"NEUTRAL_TONE_MAPPING",[kf]:"CUSTOM_TONE_MAPPING"};function EM(r,e,t,n,i){let s=new Tn(e,t,{type:r,depthBuffer:n,stencilBuffer:i,depthTexture:n?new br(e,t):void 0}),a=new Tn(e,t,{type:gi,depthBuffer:!1,stencilBuffer:!1}),o=new an;o.setAttribute("position",new Mn([-1,3,0,-1,-1,0,3,-1,0],3)),o.setAttribute("uv",new Mn([0,2,0,0,2,0],2));let l=new Vc({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),c=new vt(o,l),u=new ns(-1,1,1,-1,0,1),d=null,h=null,f=!1,m,_=null,p=[],g=!1;this.setSize=function(S,M){s.setSize(S,M),a.setSize(S,M);for(let x=0;x<p.length;x++){let R=p[x];R.setSize&&R.setSize(S,M)}},this.setEffects=function(S){p=S,g=p.length>0&&p[0].isRenderPass===!0;let M=s.width,x=s.height;for(let R=0;R<p.length;R++){let E=p[R];E.setSize&&E.setSize(M,x)}},this.begin=function(S,M){if(f||S.toneMapping===Vi&&p.length===0)return!1;if(_=M,M!==null){let x=M.width,R=M.height;(s.width!==x||s.height!==R)&&this.setSize(x,R)}return g===!1&&S.setRenderTarget(s),m=S.toneMapping,S.toneMapping=Vi,!0},this.hasRenderPass=function(){return g},this.end=function(S,M){S.toneMapping=m,f=!0;let x=s,R=a;for(let E=0;E<p.length;E++){let A=p[E];if(A.enabled!==!1&&(A.render(S,R,x,M),A.needsSwap!==!1)){let v=x;x=R,R=v}}if(d!==S.outputColorSpace||h!==S.toneMapping){d=S.outputColorSpace,h=S.toneMapping,l.defines={},xt.getTransfer(d)===Tt&&(l.defines.SRGB_TRANSFER="");let E=TM[h];E&&(l.defines[E]=""),l.needsUpdate=!0}l.uniforms.tDiffuse.value=x.texture,S.setRenderTarget(_),S.render(c,u),_=null,f=!1},this.isCompositing=function(){return f},this.dispose=function(){s.depthTexture&&s.depthTexture.dispose(),s.dispose(),a.dispose(),o.dispose(),l.dispose()}}var Dg=new Cn,ud=new br(1,1),Lg=new Io,Ug=new Rc,Ng=new Oo,dg=[],pg=[],mg=new Float32Array(16),gg=new Float32Array(9),_g=new Float32Array(4);function Xa(r,e,t){let n=r[0];if(n<=0||n>0)return r;let i=e*t,s=dg[i];if(s===void 0&&(s=new Float32Array(i),dg[i]=s),e!==0){n.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,r[a].toArray(s,o)}return s}function fn(r,e){if(r.length!==e.length)return!1;for(let t=0,n=r.length;t<n;t++)if(r[t]!==e[t])return!1;return!0}function dn(r,e){for(let t=0,n=e.length;t<n;t++)r[t]=e[t]}function Ku(r,e){let t=pg[e];t===void 0&&(t=new Int32Array(e),pg[e]=t);for(let n=0;n!==e;++n)t[n]=r.allocateTextureUnit();return t}function wM(r,e){let t=this.cache;t[0]!==e&&(r.uniform1f(this.addr,e),t[0]=e)}function AM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(fn(t,e))return;r.uniform2fv(this.addr,e),dn(t,e)}}function CM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(r.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(fn(t,e))return;r.uniform3fv(this.addr,e),dn(t,e)}}function RM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(fn(t,e))return;r.uniform4fv(this.addr,e),dn(t,e)}}function PM(r,e){let t=this.cache,n=e.elements;if(n===void 0){if(fn(t,e))return;r.uniformMatrix2fv(this.addr,!1,e),dn(t,e)}else{if(fn(t,n))return;_g.set(n),r.uniformMatrix2fv(this.addr,!1,_g),dn(t,n)}}function IM(r,e){let t=this.cache,n=e.elements;if(n===void 0){if(fn(t,e))return;r.uniformMatrix3fv(this.addr,!1,e),dn(t,e)}else{if(fn(t,n))return;gg.set(n),r.uniformMatrix3fv(this.addr,!1,gg),dn(t,n)}}function DM(r,e){let t=this.cache,n=e.elements;if(n===void 0){if(fn(t,e))return;r.uniformMatrix4fv(this.addr,!1,e),dn(t,e)}else{if(fn(t,n))return;mg.set(n),r.uniformMatrix4fv(this.addr,!1,mg),dn(t,n)}}function LM(r,e){let t=this.cache;t[0]!==e&&(r.uniform1i(this.addr,e),t[0]=e)}function UM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(fn(t,e))return;r.uniform2iv(this.addr,e),dn(t,e)}}function NM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(fn(t,e))return;r.uniform3iv(this.addr,e),dn(t,e)}}function FM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(fn(t,e))return;r.uniform4iv(this.addr,e),dn(t,e)}}function OM(r,e){let t=this.cache;t[0]!==e&&(r.uniform1ui(this.addr,e),t[0]=e)}function BM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(fn(t,e))return;r.uniform2uiv(this.addr,e),dn(t,e)}}function kM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(fn(t,e))return;r.uniform3uiv(this.addr,e),dn(t,e)}}function zM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(fn(t,e))return;r.uniform4uiv(this.addr,e),dn(t,e)}}function VM(r,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i);let s;this.type===r.SAMPLER_2D_SHADOW?(ud.compareFunction=t.isReversedDepthBuffer()?Xu:Wu,s=ud):s=Dg,t.setTexture2D(e||s,i)}function HM(r,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||Ug,i)}function GM(r,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTextureCube(e||Ng,i)}function WM(r,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||Lg,i)}function XM(r){switch(r){case 5126:return wM;case 35664:return AM;case 35665:return CM;case 35666:return RM;case 35674:return PM;case 35675:return IM;case 35676:return DM;case 5124:case 35670:return LM;case 35667:case 35671:return UM;case 35668:case 35672:return NM;case 35669:case 35673:return FM;case 5125:return OM;case 36294:return BM;case 36295:return kM;case 36296:return zM;case 35678:case 36198:case 36298:case 36306:case 35682:return VM;case 35679:case 36299:case 36307:return HM;case 35680:case 36300:case 36308:case 36293:return GM;case 36289:case 36303:case 36311:case 36292:return WM}}function qM(r,e){r.uniform1fv(this.addr,e)}function YM(r,e){let t=Xa(e,this.size,2);r.uniform2fv(this.addr,t)}function ZM(r,e){let t=Xa(e,this.size,3);r.uniform3fv(this.addr,t)}function JM(r,e){let t=Xa(e,this.size,4);r.uniform4fv(this.addr,t)}function $M(r,e){let t=Xa(e,this.size,4);r.uniformMatrix2fv(this.addr,!1,t)}function KM(r,e){let t=Xa(e,this.size,9);r.uniformMatrix3fv(this.addr,!1,t)}function QM(r,e){let t=Xa(e,this.size,16);r.uniformMatrix4fv(this.addr,!1,t)}function jM(r,e){r.uniform1iv(this.addr,e)}function eb(r,e){r.uniform2iv(this.addr,e)}function tb(r,e){r.uniform3iv(this.addr,e)}function nb(r,e){r.uniform4iv(this.addr,e)}function ib(r,e){r.uniform1uiv(this.addr,e)}function rb(r,e){r.uniform2uiv(this.addr,e)}function sb(r,e){r.uniform3uiv(this.addr,e)}function ab(r,e){r.uniform4uiv(this.addr,e)}function ob(r,e,t){let n=this.cache,i=e.length,s=Ku(t,i);fn(n,s)||(r.uniform1iv(this.addr,s),dn(n,s));let a;this.type===r.SAMPLER_2D_SHADOW?a=ud:a=Dg;for(let o=0;o!==i;++o)t.setTexture2D(e[o]||a,s[o])}function lb(r,e,t){let n=this.cache,i=e.length,s=Ku(t,i);fn(n,s)||(r.uniform1iv(this.addr,s),dn(n,s));for(let a=0;a!==i;++a)t.setTexture3D(e[a]||Ug,s[a])}function cb(r,e,t){let n=this.cache,i=e.length,s=Ku(t,i);fn(n,s)||(r.uniform1iv(this.addr,s),dn(n,s));for(let a=0;a!==i;++a)t.setTextureCube(e[a]||Ng,s[a])}function ub(r,e,t){let n=this.cache,i=e.length,s=Ku(t,i);fn(n,s)||(r.uniform1iv(this.addr,s),dn(n,s));for(let a=0;a!==i;++a)t.setTexture2DArray(e[a]||Lg,s[a])}function hb(r){switch(r){case 5126:return qM;case 35664:return YM;case 35665:return ZM;case 35666:return JM;case 35674:return $M;case 35675:return KM;case 35676:return QM;case 5124:case 35670:return jM;case 35667:case 35671:return eb;case 35668:case 35672:return tb;case 35669:case 35673:return nb;case 5125:return ib;case 36294:return rb;case 36295:return sb;case 36296:return ab;case 35678:case 36198:case 36298:case 36306:case 35682:return ob;case 35679:case 36299:case 36307:return lb;case 35680:case 36300:case 36308:case 36293:return cb;case 36289:case 36303:case 36311:case 36292:return ub}}var hd=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=XM(t.type)}},fd=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=hb(t.type)}},dd=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let i=this.seq;for(let s=0,a=i.length;s!==a;++s){let o=i[s];o.setValue(e,t[o.id],n)}}},ld=/(\w+)(\])?(\[|\.)?/g;function xg(r,e){r.seq.push(e),r.map[e.id]=e}function fb(r,e,t){let n=r.name,i=n.length;for(ld.lastIndex=0;;){let s=ld.exec(n),a=ld.lastIndex,o=s[1],l=s[2]==="]",c=s[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===i){xg(t,c===void 0?new hd(o,r,e):new fd(o,r,e));break}else{let d=t.map[o];d===void 0&&(d=new dd(o),xg(t,d)),t=d}}}var Ga=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){let o=e.getActiveUniform(t,a),l=e.getUniformLocation(t,o.name);fb(o,l,this)}let i=[],s=[];for(let a of this.seq)a.type===e.SAMPLER_2D_SHADOW||a.type===e.SAMPLER_CUBE_SHADOW||a.type===e.SAMPLER_2D_ARRAY_SHADOW?i.push(a):s.push(a);i.length>0&&(this.seq=i.concat(s))}setValue(e,t,n,i){let s=this.map[t];s!==void 0&&s.setValue(e,n,i)}setOptional(e,t,n){let i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let s=0,a=t.length;s!==a;++s){let o=t[s],l=n[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,i)}}static seqWithValue(e,t){let n=[];for(let i=0,s=e.length;i!==s;++i){let a=e[i];a.id in t&&n.push(a)}return n}};function vg(r,e,t){let n=r.createShader(e);return r.shaderSource(n,t),r.compileShader(n),n}var db=37297,pb=0;function mb(r,e){let t=r.split(`
`),n=[],i=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let a=i;a<s;a++){let o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}var yg=new st;function gb(r){xt._getMatrix(yg,xt.workingColorSpace,r);let e=`mat3( ${yg.elements.map(t=>t.toFixed(4))} )`;switch(xt.getTransfer(r)){case Po:return[e,"LinearTransferOETF"];case Tt:return[e,"sRGBTransferOETF"];default:return tt("WebGLProgram: Unsupported color space: ",r),[e,"LinearTransferOETF"]}}function Sg(r,e,t){let n=r.getShaderParameter(e,r.COMPILE_STATUS),s=(r.getShaderInfoLog(e)||"").trim();if(n&&s==="")return"";let a=/ERROR: 0:(\d+)/.exec(s);if(a){let o=parseInt(a[1]);return t.toUpperCase()+`

`+s+`

`+mb(r.getShaderSource(e),o)}else return s}function _b(r,e){let t=gb(e);return[`vec4 ${r}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}var xb={[Ff]:"Linear",[Of]:"Reinhard",[Bf]:"Cineon",[Jo]:"ACESFilmic",[zf]:"AgX",[Vf]:"Neutral",[kf]:"Custom"};function vb(r,e){let t=xb[e];return t===void 0?(tt("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+r+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+r+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var Yu=new W;function yb(){xt.getLuminanceCoefficients(Yu);let r=Yu.x.toFixed(4),e=Yu.y.toFixed(4),t=Yu.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${r}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Sb(r){return[r.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",r.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(al).join(`
`)}function Mb(r){let e=[];for(let t in r){let n=r[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function bb(r,e){let t={},n=r.getProgramParameter(e,r.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){let s=r.getActiveAttrib(e,i),a=s.name,o=1;s.type===r.FLOAT_MAT2&&(o=2),s.type===r.FLOAT_MAT3&&(o=3),s.type===r.FLOAT_MAT4&&(o=4),t[a]={type:s.type,location:r.getAttribLocation(e,a),locationSize:o}}return t}function al(r){return r!==""}function Mg(r,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return r.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function bg(r,e){return r.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var Tb=/^[ \t]*#include +<([\w\d./]+)>/gm;function pd(r){return r.replace(Tb,wb)}var Eb=new Map;function wb(r,e){let t=ft[e];if(t===void 0){let n=Eb.get(e);if(n!==void 0)t=ft[n],tt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return pd(t)}var Ab=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Tg(r){return r.replace(Ab,Cb)}function Cb(r,e,t,n){let i="";for(let s=parseInt(e);s<parseInt(t);s++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return i}function Eg(r){let e=`precision ${r.precision} float;
	precision ${r.precision} int;
	precision ${r.precision} sampler2D;
	precision ${r.precision} samplerCube;
	precision ${r.precision} sampler3D;
	precision ${r.precision} sampler2DArray;
	precision ${r.precision} sampler2DShadow;
	precision ${r.precision} samplerCubeShadow;
	precision ${r.precision} sampler2DArrayShadow;
	precision ${r.precision} isampler2D;
	precision ${r.precision} isampler3D;
	precision ${r.precision} isamplerCube;
	precision ${r.precision} isampler2DArray;
	precision ${r.precision} usampler2D;
	precision ${r.precision} usampler3D;
	precision ${r.precision} usamplerCube;
	precision ${r.precision} usampler2DArray;
	`;return r.precision==="highp"?e+=`
#define HIGH_PRECISION`:r.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:r.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}var Rb={[Zo]:"SHADOWMAP_TYPE_PCF",[ka]:"SHADOWMAP_TYPE_VSM"};function Pb(r){return Rb[r.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var Ib={[rs]:"ENVMAP_TYPE_CUBE",[Fs]:"ENVMAP_TYPE_CUBE",[$o]:"ENVMAP_TYPE_CUBE_UV"};function Db(r){return r.envMap===!1?"ENVMAP_TYPE_CUBE":Ib[r.envMapMode]||"ENVMAP_TYPE_CUBE"}var Lb={[Fs]:"ENVMAP_MODE_REFRACTION"};function Ub(r){return r.envMap===!1?"ENVMAP_MODE_REFLECTION":Lb[r.envMapMode]||"ENVMAP_MODE_REFLECTION"}var Nb={[Nf]:"ENVMAP_BLENDING_MULTIPLY",[zm]:"ENVMAP_BLENDING_MIX",[Vm]:"ENVMAP_BLENDING_ADD"};function Fb(r){return r.envMap===!1?"ENVMAP_BLENDING_NONE":Nb[r.combine]||"ENVMAP_BLENDING_NONE"}function Ob(r){let e=r.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function Bb(r,e,t,n){let i=r.getContext(),s=t.defines,a=t.vertexShader,o=t.fragmentShader,l=Pb(t),c=Db(t),u=Ub(t),d=Fb(t),h=Ob(t),f=Sb(t),m=Mb(s),_=i.createProgram(),p,g,S=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(al).join(`
`),p.length>0&&(p+=`
`),g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(al).join(`
`),g.length>0&&(g+=`
`)):(p=[Eg(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(al).join(`
`),g=[Eg(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+d:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Vi?"#define TONE_MAPPING":"",t.toneMapping!==Vi?ft.tonemapping_pars_fragment:"",t.toneMapping!==Vi?vb("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",ft.colorspace_pars_fragment,_b("linearToOutputTexel",t.outputColorSpace),yb(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(al).join(`
`)),a=pd(a),a=Mg(a,t),a=bg(a,t),o=pd(o),o=Mg(o,t),o=bg(o,t),a=Tg(a),o=Tg(o),t.isRawShaderMaterial!==!0&&(S=`#version 300 es
`,p=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,g=["#define varying in",t.glslVersion===$f?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===$f?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+g);let M=S+p+a,x=S+g+o,R=vg(i,i.VERTEX_SHADER,M),E=vg(i,i.FRAGMENT_SHADER,x);i.attachShader(_,R),i.attachShader(_,E),t.index0AttributeName!==void 0?i.bindAttribLocation(_,0,t.index0AttributeName):t.morphTargets===!0&&i.bindAttribLocation(_,0,"position"),i.linkProgram(_);function A(C){if(r.debug.checkShaderErrors){let I=i.getProgramInfoLog(_)||"",H=i.getShaderInfoLog(R)||"",V=i.getShaderInfoLog(E)||"",D=I.trim(),O=H.trim(),F=V.trim(),Z=!0,ee=!0;if(i.getProgramParameter(_,i.LINK_STATUS)===!1)if(Z=!1,typeof r.debug.onShaderError=="function")r.debug.onShaderError(i,_,R,E);else{let L=Sg(i,R,"vertex"),ie=Sg(i,E,"fragment");nt("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(_,i.VALIDATE_STATUS)+`

Material Name: `+C.name+`
Material Type: `+C.type+`

Program Info Log: `+D+`
`+L+`
`+ie)}else D!==""?tt("WebGLProgram: Program Info Log:",D):(O===""||F==="")&&(ee=!1);ee&&(C.diagnostics={runnable:Z,programLog:D,vertexShader:{log:O,prefix:p},fragmentShader:{log:F,prefix:g}})}i.deleteShader(R),i.deleteShader(E),v=new Ga(i,_),b=bb(i,_)}let v;this.getUniforms=function(){return v===void 0&&A(this),v};let b;this.getAttributes=function(){return b===void 0&&A(this),b};let P=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return P===!1&&(P=i.getProgramParameter(_,db)),P},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=pb++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=R,this.fragmentShader=E,this}var kb=0,md=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let t=e.vertexShader,n=e.fragmentShader,i=this._getShaderStage(t),s=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(i)===!1&&(a.add(i),i.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new gd(e),t.set(e,n)),n}},gd=class{constructor(e){this.id=kb++,this.code=e,this.usedTimes=0}};function zb(r){return r===os||r===nl||r===il}function Vb(r,e,t,n,i,s){let a=new Do,o=new md,l=new Set,c=[],u=new Map,d=n.logarithmicDepthBuffer,h=n.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(v){return l.add(v),v===0?"uv":`uv${v}`}function _(v,b,P,C,I,H){let V=C.fog,D=I.geometry,O=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?C.environment:null,F=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,Z=e.get(v.envMap||O,F),ee=Z&&Z.mapping===$o?Z.image.height:null,L=f[v.type];v.precision!==null&&(h=n.getMaxPrecision(v.precision),h!==v.precision&&tt("WebGLProgram.getParameters:",v.precision,"not supported, using",h,"instead."));let ie=D.morphAttributes.position||D.morphAttributes.normal||D.morphAttributes.color,ye=ie!==void 0?ie.length:0,Fe=0;D.morphAttributes.position!==void 0&&(Fe=1),D.morphAttributes.normal!==void 0&&(Fe=2),D.morphAttributes.color!==void 0&&(Fe=3);let ze,Oe,K,le;if(L){let _e=rr[L];ze=_e.vertexShader,Oe=_e.fragmentShader}else ze=v.vertexShader,Oe=v.fragmentShader,o.update(v),K=o.getVertexShaderID(v),le=o.getFragmentShaderID(v);let ue=r.getRenderTarget(),Ee=r.state.buffers.depth.getReversed(),He=I.isInstancedMesh===!0,Ae=I.isBatchedMesh===!0,Ye=!!v.map,Se=!!v.matcap,j=!!Z,oe=!!v.aoMap,re=!!v.lightMap,B=!!v.bumpMap,me=!!v.normalMap,We=!!v.displacementMap,N=!!v.emissiveMap,Ne=!!v.metalnessMap,Pe=!!v.roughnessMap,Q=v.anisotropy>0,z=v.clearcoat>0,Me=v.dispersion>0,w=v.iridescence>0,y=v.sheen>0,G=v.transmission>0,$=Q&&!!v.anisotropyMap,se=z&&!!v.clearcoatMap,fe=z&&!!v.clearcoatNormalMap,ae=z&&!!v.clearcoatRoughnessMap,U=w&&!!v.iridescenceMap,te=w&&!!v.iridescenceThicknessMap,Te=y&&!!v.sheenColorMap,Ce=y&&!!v.sheenRoughnessMap,ve=!!v.specularMap,ge=!!v.specularColorMap,be=!!v.specularIntensityMap,Qe=G&&!!v.transmissionMap,it=G&&!!v.thicknessMap,k=!!v.gradientMap,pe=!!v.alphaMap,ne=v.alphaTest>0,Ie=!!v.alphaHash,xe=!!v.extensions,ce=Vi;v.toneMapped&&(ue===null||ue.isXRRenderTarget===!0)&&(ce=r.toneMapping);let de={shaderID:L,shaderType:v.type,shaderName:v.name,vertexShader:ze,fragmentShader:Oe,defines:v.defines,customVertexShaderID:K,customFragmentShaderID:le,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:h,batching:Ae,batchingColor:Ae&&I._colorsTexture!==null,instancing:He,instancingColor:He&&I.instanceColor!==null,instancingMorph:He&&I.morphTexture!==null,outputColorSpace:ue===null?r.outputColorSpace:ue.isXRRenderTarget===!0?ue.texture.colorSpace:xt.workingColorSpace,alphaToCoverage:!!v.alphaToCoverage,map:Ye,matcap:Se,envMap:j,envMapMode:j&&Z.mapping,envMapCubeUVHeight:ee,aoMap:oe,lightMap:re,bumpMap:B,normalMap:me,displacementMap:We,emissiveMap:N,normalMapObjectSpace:me&&v.normalMapType===Wm,normalMapTangentSpace:me&&v.normalMapType===Gu,packedNormalMap:me&&v.normalMapType===Gu&&zb(v.normalMap.format),metalnessMap:Ne,roughnessMap:Pe,anisotropy:Q,anisotropyMap:$,clearcoat:z,clearcoatMap:se,clearcoatNormalMap:fe,clearcoatRoughnessMap:ae,dispersion:Me,iridescence:w,iridescenceMap:U,iridescenceThicknessMap:te,sheen:y,sheenColorMap:Te,sheenRoughnessMap:Ce,specularMap:ve,specularColorMap:ge,specularIntensityMap:be,transmission:G,transmissionMap:Qe,thicknessMap:it,gradientMap:k,opaque:v.transparent===!1&&v.blending===Rs&&v.alphaToCoverage===!1,alphaMap:pe,alphaTest:ne,alphaHash:Ie,combine:v.combine,mapUv:Ye&&m(v.map.channel),aoMapUv:oe&&m(v.aoMap.channel),lightMapUv:re&&m(v.lightMap.channel),bumpMapUv:B&&m(v.bumpMap.channel),normalMapUv:me&&m(v.normalMap.channel),displacementMapUv:We&&m(v.displacementMap.channel),emissiveMapUv:N&&m(v.emissiveMap.channel),metalnessMapUv:Ne&&m(v.metalnessMap.channel),roughnessMapUv:Pe&&m(v.roughnessMap.channel),anisotropyMapUv:$&&m(v.anisotropyMap.channel),clearcoatMapUv:se&&m(v.clearcoatMap.channel),clearcoatNormalMapUv:fe&&m(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ae&&m(v.clearcoatRoughnessMap.channel),iridescenceMapUv:U&&m(v.iridescenceMap.channel),iridescenceThicknessMapUv:te&&m(v.iridescenceThicknessMap.channel),sheenColorMapUv:Te&&m(v.sheenColorMap.channel),sheenRoughnessMapUv:Ce&&m(v.sheenRoughnessMap.channel),specularMapUv:ve&&m(v.specularMap.channel),specularColorMapUv:ge&&m(v.specularColorMap.channel),specularIntensityMapUv:be&&m(v.specularIntensityMap.channel),transmissionMapUv:Qe&&m(v.transmissionMap.channel),thicknessMapUv:it&&m(v.thicknessMap.channel),alphaMapUv:pe&&m(v.alphaMap.channel),vertexTangents:!!D.attributes.tangent&&(me||Q),vertexNormals:!!D.attributes.normal,vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!D.attributes.color&&D.attributes.color.itemSize===4,pointsUvs:I.isPoints===!0&&!!D.attributes.uv&&(Ye||pe),fog:!!V,useFog:v.fog===!0,fogExp2:!!V&&V.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||D.attributes.normal===void 0&&me===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:Ee,skinning:I.isSkinnedMesh===!0,morphTargets:D.morphAttributes.position!==void 0,morphNormals:D.morphAttributes.normal!==void 0,morphColors:D.morphAttributes.color!==void 0,morphTargetsCount:ye,morphTextureStride:Fe,numDirLights:b.directional.length,numPointLights:b.point.length,numSpotLights:b.spot.length,numSpotLightMaps:b.spotLightMap.length,numRectAreaLights:b.rectArea.length,numHemiLights:b.hemi.length,numDirLightShadows:b.directionalShadowMap.length,numPointLightShadows:b.pointShadowMap.length,numSpotLightShadows:b.spotShadowMap.length,numSpotLightShadowsWithMaps:b.numSpotLightShadowsWithMaps,numLightProbes:b.numLightProbes,numLightProbeGrids:H.length,numClippingPlanes:s.numPlanes,numClipIntersection:s.numIntersection,dithering:v.dithering,shadowMapEnabled:r.shadowMap.enabled&&P.length>0,shadowMapType:r.shadowMap.type,toneMapping:ce,decodeVideoTexture:Ye&&v.map.isVideoTexture===!0&&xt.getTransfer(v.map.colorSpace)===Tt,decodeVideoTextureEmissive:N&&v.emissiveMap.isVideoTexture===!0&&xt.getTransfer(v.emissiveMap.colorSpace)===Tt,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===Bt,flipSided:v.side===Yn,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:xe&&v.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(xe&&v.extensions.multiDraw===!0||Ae)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return de.vertexUv1s=l.has(1),de.vertexUv2s=l.has(2),de.vertexUv3s=l.has(3),l.clear(),de}function p(v){let b=[];if(v.shaderID?b.push(v.shaderID):(b.push(v.customVertexShaderID),b.push(v.customFragmentShaderID)),v.defines!==void 0)for(let P in v.defines)b.push(P),b.push(v.defines[P]);return v.isRawShaderMaterial===!1&&(g(b,v),S(b,v),b.push(r.outputColorSpace)),b.push(v.customProgramCacheKey),b.join()}function g(v,b){v.push(b.precision),v.push(b.outputColorSpace),v.push(b.envMapMode),v.push(b.envMapCubeUVHeight),v.push(b.mapUv),v.push(b.alphaMapUv),v.push(b.lightMapUv),v.push(b.aoMapUv),v.push(b.bumpMapUv),v.push(b.normalMapUv),v.push(b.displacementMapUv),v.push(b.emissiveMapUv),v.push(b.metalnessMapUv),v.push(b.roughnessMapUv),v.push(b.anisotropyMapUv),v.push(b.clearcoatMapUv),v.push(b.clearcoatNormalMapUv),v.push(b.clearcoatRoughnessMapUv),v.push(b.iridescenceMapUv),v.push(b.iridescenceThicknessMapUv),v.push(b.sheenColorMapUv),v.push(b.sheenRoughnessMapUv),v.push(b.specularMapUv),v.push(b.specularColorMapUv),v.push(b.specularIntensityMapUv),v.push(b.transmissionMapUv),v.push(b.thicknessMapUv),v.push(b.combine),v.push(b.fogExp2),v.push(b.sizeAttenuation),v.push(b.morphTargetsCount),v.push(b.morphAttributeCount),v.push(b.numDirLights),v.push(b.numPointLights),v.push(b.numSpotLights),v.push(b.numSpotLightMaps),v.push(b.numHemiLights),v.push(b.numRectAreaLights),v.push(b.numDirLightShadows),v.push(b.numPointLightShadows),v.push(b.numSpotLightShadows),v.push(b.numSpotLightShadowsWithMaps),v.push(b.numLightProbes),v.push(b.shadowMapType),v.push(b.toneMapping),v.push(b.numClippingPlanes),v.push(b.numClipIntersection),v.push(b.depthPacking)}function S(v,b){a.disableAll(),b.instancing&&a.enable(0),b.instancingColor&&a.enable(1),b.instancingMorph&&a.enable(2),b.matcap&&a.enable(3),b.envMap&&a.enable(4),b.normalMapObjectSpace&&a.enable(5),b.normalMapTangentSpace&&a.enable(6),b.clearcoat&&a.enable(7),b.iridescence&&a.enable(8),b.alphaTest&&a.enable(9),b.vertexColors&&a.enable(10),b.vertexAlphas&&a.enable(11),b.vertexUv1s&&a.enable(12),b.vertexUv2s&&a.enable(13),b.vertexUv3s&&a.enable(14),b.vertexTangents&&a.enable(15),b.anisotropy&&a.enable(16),b.alphaHash&&a.enable(17),b.batching&&a.enable(18),b.dispersion&&a.enable(19),b.batchingColor&&a.enable(20),b.gradientMap&&a.enable(21),b.packedNormalMap&&a.enable(22),b.vertexNormals&&a.enable(23),v.push(a.mask),a.disableAll(),b.fog&&a.enable(0),b.useFog&&a.enable(1),b.flatShading&&a.enable(2),b.logarithmicDepthBuffer&&a.enable(3),b.reversedDepthBuffer&&a.enable(4),b.skinning&&a.enable(5),b.morphTargets&&a.enable(6),b.morphNormals&&a.enable(7),b.morphColors&&a.enable(8),b.premultipliedAlpha&&a.enable(9),b.shadowMapEnabled&&a.enable(10),b.doubleSided&&a.enable(11),b.flipSided&&a.enable(12),b.useDepthPacking&&a.enable(13),b.dithering&&a.enable(14),b.transmission&&a.enable(15),b.sheen&&a.enable(16),b.opaque&&a.enable(17),b.pointsUvs&&a.enable(18),b.decodeVideoTexture&&a.enable(19),b.decodeVideoTextureEmissive&&a.enable(20),b.alphaToCoverage&&a.enable(21),b.numLightProbeGrids>0&&a.enable(22),v.push(a.mask)}function M(v){let b=f[v.type],P;if(b){let C=rr[b];P=ag.clone(C.uniforms)}else P=v.uniforms;return P}function x(v,b){let P=u.get(b);return P!==void 0?++P.usedTimes:(P=new Bb(r,b,v,i),c.push(P),u.set(b,P)),P}function R(v){if(--v.usedTimes===0){let b=c.indexOf(v);c[b]=c[c.length-1],c.pop(),u.delete(v.cacheKey),v.destroy()}}function E(v){o.remove(v)}function A(){o.dispose()}return{getParameters:_,getProgramCacheKey:p,getUniforms:M,acquireProgram:x,releaseProgram:R,releaseShaderCache:E,programs:c,dispose:A}}function Hb(){let r=new WeakMap;function e(a){return r.has(a)}function t(a){let o=r.get(a);return o===void 0&&(o={},r.set(a,o)),o}function n(a){r.delete(a)}function i(a,o,l){r.get(a)[o]=l}function s(){r=new WeakMap}return{has:e,get:t,remove:n,update:i,dispose:s}}function Gb(r,e){return r.groupOrder!==e.groupOrder?r.groupOrder-e.groupOrder:r.renderOrder!==e.renderOrder?r.renderOrder-e.renderOrder:r.material.id!==e.material.id?r.material.id-e.material.id:r.materialVariant!==e.materialVariant?r.materialVariant-e.materialVariant:r.z!==e.z?r.z-e.z:r.id-e.id}function wg(r,e){return r.groupOrder!==e.groupOrder?r.groupOrder-e.groupOrder:r.renderOrder!==e.renderOrder?r.renderOrder-e.renderOrder:r.z!==e.z?e.z-r.z:r.id-e.id}function Ag(){let r=[],e=0,t=[],n=[],i=[];function s(){e=0,t.length=0,n.length=0,i.length=0}function a(h){let f=0;return h.isInstancedMesh&&(f+=2),h.isSkinnedMesh&&(f+=1),f}function o(h,f,m,_,p,g){let S=r[e];return S===void 0?(S={id:h.id,object:h,geometry:f,material:m,materialVariant:a(h),groupOrder:_,renderOrder:h.renderOrder,z:p,group:g},r[e]=S):(S.id=h.id,S.object=h,S.geometry=f,S.material=m,S.materialVariant=a(h),S.groupOrder=_,S.renderOrder=h.renderOrder,S.z=p,S.group=g),e++,S}function l(h,f,m,_,p,g){let S=o(h,f,m,_,p,g);m.transmission>0?n.push(S):m.transparent===!0?i.push(S):t.push(S)}function c(h,f,m,_,p,g){let S=o(h,f,m,_,p,g);m.transmission>0?n.unshift(S):m.transparent===!0?i.unshift(S):t.unshift(S)}function u(h,f){t.length>1&&t.sort(h||Gb),n.length>1&&n.sort(f||wg),i.length>1&&i.sort(f||wg)}function d(){for(let h=e,f=r.length;h<f;h++){let m=r[h];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:n,transparent:i,init:s,push:l,unshift:c,finish:d,sort:u}}function Wb(){let r=new WeakMap;function e(n,i){let s=r.get(n),a;return s===void 0?(a=new Ag,r.set(n,[a])):i>=s.length?(a=new Ag,s.push(a)):a=s[i],a}function t(){r=new WeakMap}return{get:e,dispose:t}}function Xb(){let r={};return{get:function(e){if(r[e.id]!==void 0)return r[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new W,color:new qe};break;case"SpotLight":t={position:new W,direction:new W,color:new qe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new W,color:new qe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new W,skyColor:new qe,groundColor:new qe};break;case"RectAreaLight":t={color:new qe,position:new W,halfWidth:new W,halfHeight:new W};break}return r[e.id]=t,t}}}function qb(){let r={};return{get:function(e){if(r[e.id]!==void 0)return r[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we,shadowCameraNear:1,shadowCameraFar:1e3};break}return r[e.id]=t,t}}}var Yb=0;function Zb(r,e){return(e.castShadow?2:0)-(r.castShadow?2:0)+(e.map?1:0)-(r.map?1:0)}function Jb(r){let e=new Xb,t=qb(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new W);let i=new W,s=new Ut,a=new Ut;function o(c){let u=0,d=0,h=0;for(let b=0;b<9;b++)n.probe[b].set(0,0,0);let f=0,m=0,_=0,p=0,g=0,S=0,M=0,x=0,R=0,E=0,A=0;c.sort(Zb);for(let b=0,P=c.length;b<P;b++){let C=c[b],I=C.color,H=C.intensity,V=C.distance,D=null;if(C.shadow&&C.shadow.map&&(C.shadow.map.texture.format===os?D=C.shadow.map.texture:D=C.shadow.map.depthTexture||C.shadow.map.texture),C.isAmbientLight)u+=I.r*H,d+=I.g*H,h+=I.b*H;else if(C.isLightProbe){for(let O=0;O<9;O++)n.probe[O].addScaledVector(C.sh.coefficients[O],H);A++}else if(C.isDirectionalLight){let O=e.get(C);if(O.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){let F=C.shadow,Z=t.get(C);Z.shadowIntensity=F.intensity,Z.shadowBias=F.bias,Z.shadowNormalBias=F.normalBias,Z.shadowRadius=F.radius,Z.shadowMapSize=F.mapSize,n.directionalShadow[f]=Z,n.directionalShadowMap[f]=D,n.directionalShadowMatrix[f]=C.shadow.matrix,S++}n.directional[f]=O,f++}else if(C.isSpotLight){let O=e.get(C);O.position.setFromMatrixPosition(C.matrixWorld),O.color.copy(I).multiplyScalar(H),O.distance=V,O.coneCos=Math.cos(C.angle),O.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),O.decay=C.decay,n.spot[_]=O;let F=C.shadow;if(C.map&&(n.spotLightMap[R]=C.map,R++,F.updateMatrices(C),C.castShadow&&E++),n.spotLightMatrix[_]=F.matrix,C.castShadow){let Z=t.get(C);Z.shadowIntensity=F.intensity,Z.shadowBias=F.bias,Z.shadowNormalBias=F.normalBias,Z.shadowRadius=F.radius,Z.shadowMapSize=F.mapSize,n.spotShadow[_]=Z,n.spotShadowMap[_]=D,x++}_++}else if(C.isRectAreaLight){let O=e.get(C);O.color.copy(I).multiplyScalar(H),O.halfWidth.set(C.width*.5,0,0),O.halfHeight.set(0,C.height*.5,0),n.rectArea[p]=O,p++}else if(C.isPointLight){let O=e.get(C);if(O.color.copy(C.color).multiplyScalar(C.intensity),O.distance=C.distance,O.decay=C.decay,C.castShadow){let F=C.shadow,Z=t.get(C);Z.shadowIntensity=F.intensity,Z.shadowBias=F.bias,Z.shadowNormalBias=F.normalBias,Z.shadowRadius=F.radius,Z.shadowMapSize=F.mapSize,Z.shadowCameraNear=F.camera.near,Z.shadowCameraFar=F.camera.far,n.pointShadow[m]=Z,n.pointShadowMap[m]=D,n.pointShadowMatrix[m]=C.shadow.matrix,M++}n.point[m]=O,m++}else if(C.isHemisphereLight){let O=e.get(C);O.skyColor.copy(C.color).multiplyScalar(H),O.groundColor.copy(C.groundColor).multiplyScalar(H),n.hemi[g]=O,g++}}p>0&&(r.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Le.LTC_FLOAT_1,n.rectAreaLTC2=Le.LTC_FLOAT_2):(n.rectAreaLTC1=Le.LTC_HALF_1,n.rectAreaLTC2=Le.LTC_HALF_2)),n.ambient[0]=u,n.ambient[1]=d,n.ambient[2]=h;let v=n.hash;(v.directionalLength!==f||v.pointLength!==m||v.spotLength!==_||v.rectAreaLength!==p||v.hemiLength!==g||v.numDirectionalShadows!==S||v.numPointShadows!==M||v.numSpotShadows!==x||v.numSpotMaps!==R||v.numLightProbes!==A)&&(n.directional.length=f,n.spot.length=_,n.rectArea.length=p,n.point.length=m,n.hemi.length=g,n.directionalShadow.length=S,n.directionalShadowMap.length=S,n.pointShadow.length=M,n.pointShadowMap.length=M,n.spotShadow.length=x,n.spotShadowMap.length=x,n.directionalShadowMatrix.length=S,n.pointShadowMatrix.length=M,n.spotLightMatrix.length=x+R-E,n.spotLightMap.length=R,n.numSpotLightShadowsWithMaps=E,n.numLightProbes=A,v.directionalLength=f,v.pointLength=m,v.spotLength=_,v.rectAreaLength=p,v.hemiLength=g,v.numDirectionalShadows=S,v.numPointShadows=M,v.numSpotShadows=x,v.numSpotMaps=R,v.numLightProbes=A,n.version=Yb++)}function l(c,u){let d=0,h=0,f=0,m=0,_=0,p=u.matrixWorldInverse;for(let g=0,S=c.length;g<S;g++){let M=c[g];if(M.isDirectionalLight){let x=n.directional[d];x.direction.setFromMatrixPosition(M.matrixWorld),i.setFromMatrixPosition(M.target.matrixWorld),x.direction.sub(i),x.direction.transformDirection(p),d++}else if(M.isSpotLight){let x=n.spot[f];x.position.setFromMatrixPosition(M.matrixWorld),x.position.applyMatrix4(p),x.direction.setFromMatrixPosition(M.matrixWorld),i.setFromMatrixPosition(M.target.matrixWorld),x.direction.sub(i),x.direction.transformDirection(p),f++}else if(M.isRectAreaLight){let x=n.rectArea[m];x.position.setFromMatrixPosition(M.matrixWorld),x.position.applyMatrix4(p),a.identity(),s.copy(M.matrixWorld),s.premultiply(p),a.extractRotation(s),x.halfWidth.set(M.width*.5,0,0),x.halfHeight.set(0,M.height*.5,0),x.halfWidth.applyMatrix4(a),x.halfHeight.applyMatrix4(a),m++}else if(M.isPointLight){let x=n.point[h];x.position.setFromMatrixPosition(M.matrixWorld),x.position.applyMatrix4(p),h++}else if(M.isHemisphereLight){let x=n.hemi[_];x.direction.setFromMatrixPosition(M.matrixWorld),x.direction.transformDirection(p),_++}}}return{setup:o,setupView:l,state:n}}function Cg(r){let e=new Jb(r),t=[],n=[],i=[];function s(h){d.camera=h,t.length=0,n.length=0,i.length=0}function a(h){t.push(h)}function o(h){n.push(h)}function l(h){i.push(h)}function c(){e.setup(t)}function u(h){e.setupView(t,h)}let d={lightsArray:t,shadowsArray:n,lightProbeGridArray:i,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:s,state:d,setupLights:c,setupLightsView:u,pushLight:a,pushShadow:o,pushLightProbeGrid:l}}function $b(r){let e=new WeakMap;function t(i,s=0){let a=e.get(i),o;return a===void 0?(o=new Cg(r),e.set(i,[o])):s>=a.length?(o=new Cg(r),a.push(o)):o=a[s],o}function n(){e=new WeakMap}return{get:t,dispose:n}}var Kb=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Qb=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,jb=[new W(1,0,0),new W(-1,0,0),new W(0,1,0),new W(0,-1,0),new W(0,0,1),new W(0,0,-1)],e1=[new W(0,-1,0),new W(0,-1,0),new W(0,0,1),new W(0,0,-1),new W(0,-1,0),new W(0,-1,0)],Rg=new Ut,sl=new W,cd=new W;function t1(r,e,t){let n=new La,i=new we,s=new we,a=new Gt,o=new Gc,l=new Wc,c={},u=t.maxTextureSize,d={[yr]:Yn,[Yn]:yr,[Bt]:Bt},h=new en({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new we},radius:{value:4}},vertexShader:Kb,fragmentShader:Qb}),f=h.clone();f.defines.HORIZONTAL_PASS=1;let m=new an;m.setAttribute("position",new sn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new vt(m,h),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Zo;let g=this.type;this.render=function(E,A,v){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||E.length===0)return;this.type===Sm&&(tt("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Zo);let b=r.getRenderTarget(),P=r.getActiveCubeFace(),C=r.getActiveMipmapLevel(),I=r.state;I.setBlending(nr),I.buffers.depth.getReversed()===!0?I.buffers.color.setClear(0,0,0,0):I.buffers.color.setClear(1,1,1,1),I.buffers.depth.setTest(!0),I.setScissorTest(!1);let H=g!==this.type;H&&A.traverse(function(V){V.material&&(Array.isArray(V.material)?V.material.forEach(D=>D.needsUpdate=!0):V.material.needsUpdate=!0)});for(let V=0,D=E.length;V<D;V++){let O=E[V],F=O.shadow;if(F===void 0){tt("WebGLShadowMap:",O,"has no shadow.");continue}if(F.autoUpdate===!1&&F.needsUpdate===!1)continue;i.copy(F.mapSize);let Z=F.getFrameExtents();i.multiply(Z),s.copy(F.mapSize),(i.x>u||i.y>u)&&(i.x>u&&(s.x=Math.floor(u/Z.x),i.x=s.x*Z.x,F.mapSize.x=s.x),i.y>u&&(s.y=Math.floor(u/Z.y),i.y=s.y*Z.y,F.mapSize.y=s.y));let ee=r.state.buffers.depth.getReversed();if(F.camera._reversedDepth=ee,F.map===null||H===!0){if(F.map!==null&&(F.map.depthTexture!==null&&(F.map.depthTexture.dispose(),F.map.depthTexture=null),F.map.dispose()),this.type===ka){if(O.isPointLight){tt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}F.map=new Tn(i.x,i.y,{format:os,type:gi,minFilter:Ft,magFilter:Ft,generateMipmaps:!1}),F.map.texture.name=O.name+".shadowMap",F.map.depthTexture=new br(i.x,i.y,Gi),F.map.depthTexture.name=O.name+".shadowMapDepth",F.map.depthTexture.format=Qi,F.map.depthTexture.compareFunction=null,F.map.depthTexture.minFilter=bn,F.map.depthTexture.magFilter=bn}else O.isPointLight?(F.map=new Zu(i.x),F.map.depthTexture=new Uc(i.x,Hi)):(F.map=new Tn(i.x,i.y),F.map.depthTexture=new br(i.x,i.y,Hi)),F.map.depthTexture.name=O.name+".shadowMap",F.map.depthTexture.format=Qi,this.type===Zo?(F.map.depthTexture.compareFunction=ee?Xu:Wu,F.map.depthTexture.minFilter=Ft,F.map.depthTexture.magFilter=Ft):(F.map.depthTexture.compareFunction=null,F.map.depthTexture.minFilter=bn,F.map.depthTexture.magFilter=bn);F.camera.updateProjectionMatrix()}let L=F.map.isWebGLCubeRenderTarget?6:1;for(let ie=0;ie<L;ie++){if(F.map.isWebGLCubeRenderTarget)r.setRenderTarget(F.map,ie),r.clear();else{ie===0&&(r.setRenderTarget(F.map),r.clear());let ye=F.getViewport(ie);a.set(s.x*ye.x,s.y*ye.y,s.x*ye.z,s.y*ye.w),I.viewport(a)}if(O.isPointLight){let ye=F.camera,Fe=F.matrix,ze=O.distance||ye.far;ze!==ye.far&&(ye.far=ze,ye.updateProjectionMatrix()),sl.setFromMatrixPosition(O.matrixWorld),ye.position.copy(sl),cd.copy(ye.position),cd.add(jb[ie]),ye.up.copy(e1[ie]),ye.lookAt(cd),ye.updateMatrixWorld(),Fe.makeTranslation(-sl.x,-sl.y,-sl.z),Rg.multiplyMatrices(ye.projectionMatrix,ye.matrixWorldInverse),F._frustum.setFromProjectionMatrix(Rg,ye.coordinateSystem,ye.reversedDepth)}else F.updateMatrices(O);n=F.getFrustum(),x(A,v,F.camera,O,this.type)}F.isPointLightShadow!==!0&&this.type===ka&&S(F,v),F.needsUpdate=!1}g=this.type,p.needsUpdate=!1,r.setRenderTarget(b,P,C)};function S(E,A){let v=e.update(_);h.defines.VSM_SAMPLES!==E.blurSamples&&(h.defines.VSM_SAMPLES=E.blurSamples,f.defines.VSM_SAMPLES=E.blurSamples,h.needsUpdate=!0,f.needsUpdate=!0),E.mapPass===null&&(E.mapPass=new Tn(i.x,i.y,{format:os,type:gi})),h.uniforms.shadow_pass.value=E.map.depthTexture,h.uniforms.resolution.value=E.mapSize,h.uniforms.radius.value=E.radius,r.setRenderTarget(E.mapPass),r.clear(),r.renderBufferDirect(A,null,v,h,_,null),f.uniforms.shadow_pass.value=E.mapPass.texture,f.uniforms.resolution.value=E.mapSize,f.uniforms.radius.value=E.radius,r.setRenderTarget(E.map),r.clear(),r.renderBufferDirect(A,null,v,f,_,null)}function M(E,A,v,b){let P=null,C=v.isPointLight===!0?E.customDistanceMaterial:E.customDepthMaterial;if(C!==void 0)P=C;else if(P=v.isPointLight===!0?l:o,r.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0||A.alphaToCoverage===!0){let I=P.uuid,H=A.uuid,V=c[I];V===void 0&&(V={},c[I]=V);let D=V[H];D===void 0&&(D=P.clone(),V[H]=D,A.addEventListener("dispose",R)),P=D}if(P.visible=A.visible,P.wireframe=A.wireframe,b===ka?P.side=A.shadowSide!==null?A.shadowSide:A.side:P.side=A.shadowSide!==null?A.shadowSide:d[A.side],P.alphaMap=A.alphaMap,P.alphaTest=A.alphaToCoverage===!0?.5:A.alphaTest,P.map=A.map,P.clipShadows=A.clipShadows,P.clippingPlanes=A.clippingPlanes,P.clipIntersection=A.clipIntersection,P.displacementMap=A.displacementMap,P.displacementScale=A.displacementScale,P.displacementBias=A.displacementBias,P.wireframeLinewidth=A.wireframeLinewidth,P.linewidth=A.linewidth,v.isPointLight===!0&&P.isMeshDistanceMaterial===!0){let I=r.properties.get(P);I.light=v}return P}function x(E,A,v,b,P){if(E.visible===!1)return;if(E.layers.test(A.layers)&&(E.isMesh||E.isLine||E.isPoints)&&(E.castShadow||E.receiveShadow&&P===ka)&&(!E.frustumCulled||n.intersectsObject(E))){E.modelViewMatrix.multiplyMatrices(v.matrixWorldInverse,E.matrixWorld);let H=e.update(E),V=E.material;if(Array.isArray(V)){let D=H.groups;for(let O=0,F=D.length;O<F;O++){let Z=D[O],ee=V[Z.materialIndex];if(ee&&ee.visible){let L=M(E,ee,b,P);E.onBeforeShadow(r,E,A,v,H,L,Z),r.renderBufferDirect(v,null,H,L,E,Z),E.onAfterShadow(r,E,A,v,H,L,Z)}}}else if(V.visible){let D=M(E,V,b,P);E.onBeforeShadow(r,E,A,v,H,D,null),r.renderBufferDirect(v,null,H,D,E,null),E.onAfterShadow(r,E,A,v,H,D,null)}}let I=E.children;for(let H=0,V=I.length;H<V;H++)x(I[H],A,v,b,P)}function R(E){E.target.removeEventListener("dispose",R);for(let v in c){let b=c[v],P=E.target.uuid;P in b&&(b[P].dispose(),delete b[P])}}}function n1(r,e){function t(){let k=!1,pe=new Gt,ne=null,Ie=new Gt(0,0,0,0);return{setMask:function(xe){ne!==xe&&!k&&(r.colorMask(xe,xe,xe,xe),ne=xe)},setLocked:function(xe){k=xe},setClear:function(xe,ce,de,_e,Je){Je===!0&&(xe*=_e,ce*=_e,de*=_e),pe.set(xe,ce,de,_e),Ie.equals(pe)===!1&&(r.clearColor(xe,ce,de,_e),Ie.copy(pe))},reset:function(){k=!1,ne=null,Ie.set(-1,0,0,0)}}}function n(){let k=!1,pe=!1,ne=null,Ie=null,xe=null;return{setReversed:function(ce){if(pe!==ce){let de=e.get("EXT_clip_control");ce?de.clipControlEXT(de.LOWER_LEFT_EXT,de.ZERO_TO_ONE_EXT):de.clipControlEXT(de.LOWER_LEFT_EXT,de.NEGATIVE_ONE_TO_ONE_EXT),pe=ce;let _e=xe;xe=null,this.setClear(_e)}},getReversed:function(){return pe},setTest:function(ce){ce?ue(r.DEPTH_TEST):Ee(r.DEPTH_TEST)},setMask:function(ce){ne!==ce&&!k&&(r.depthMask(ce),ne=ce)},setFunc:function(ce){if(pe&&(ce=eg[ce]),Ie!==ce){switch(ce){case gc:r.depthFunc(r.NEVER);break;case _c:r.depthFunc(r.ALWAYS);break;case xc:r.depthFunc(r.LESS);break;case Ps:r.depthFunc(r.LEQUAL);break;case vc:r.depthFunc(r.EQUAL);break;case yc:r.depthFunc(r.GEQUAL);break;case Sc:r.depthFunc(r.GREATER);break;case Mc:r.depthFunc(r.NOTEQUAL);break;default:r.depthFunc(r.LEQUAL)}Ie=ce}},setLocked:function(ce){k=ce},setClear:function(ce){xe!==ce&&(xe=ce,pe&&(ce=1-ce),r.clearDepth(ce))},reset:function(){k=!1,ne=null,Ie=null,xe=null,pe=!1}}}function i(){let k=!1,pe=null,ne=null,Ie=null,xe=null,ce=null,de=null,_e=null,Je=null;return{setTest:function(he){k||(he?ue(r.STENCIL_TEST):Ee(r.STENCIL_TEST))},setMask:function(he){pe!==he&&!k&&(r.stencilMask(he),pe=he)},setFunc:function(he,Ke,Ve){(ne!==he||Ie!==Ke||xe!==Ve)&&(r.stencilFunc(he,Ke,Ve),ne=he,Ie=Ke,xe=Ve)},setOp:function(he,Ke,Ve){(ce!==he||de!==Ke||_e!==Ve)&&(r.stencilOp(he,Ke,Ve),ce=he,de=Ke,_e=Ve)},setLocked:function(he){k=he},setClear:function(he){Je!==he&&(r.clearStencil(he),Je=he)},reset:function(){k=!1,pe=null,ne=null,Ie=null,xe=null,ce=null,de=null,_e=null,Je=null}}}let s=new t,a=new n,o=new i,l=new WeakMap,c=new WeakMap,u={},d={},h={},f=new WeakMap,m=[],_=null,p=!1,g=null,S=null,M=null,x=null,R=null,E=null,A=null,v=new qe(0,0,0),b=0,P=!1,C=null,I=null,H=null,V=null,D=null,O=r.getParameter(r.MAX_COMBINED_TEXTURE_IMAGE_UNITS),F=!1,Z=0,ee=r.getParameter(r.VERSION);ee.indexOf("WebGL")!==-1?(Z=parseFloat(/^WebGL (\d)/.exec(ee)[1]),F=Z>=1):ee.indexOf("OpenGL ES")!==-1&&(Z=parseFloat(/^OpenGL ES (\d)/.exec(ee)[1]),F=Z>=2);let L=null,ie={},ye=r.getParameter(r.SCISSOR_BOX),Fe=r.getParameter(r.VIEWPORT),ze=new Gt().fromArray(ye),Oe=new Gt().fromArray(Fe);function K(k,pe,ne,Ie){let xe=new Uint8Array(4),ce=r.createTexture();r.bindTexture(k,ce),r.texParameteri(k,r.TEXTURE_MIN_FILTER,r.NEAREST),r.texParameteri(k,r.TEXTURE_MAG_FILTER,r.NEAREST);for(let de=0;de<ne;de++)k===r.TEXTURE_3D||k===r.TEXTURE_2D_ARRAY?r.texImage3D(pe,0,r.RGBA,1,1,Ie,0,r.RGBA,r.UNSIGNED_BYTE,xe):r.texImage2D(pe+de,0,r.RGBA,1,1,0,r.RGBA,r.UNSIGNED_BYTE,xe);return ce}let le={};le[r.TEXTURE_2D]=K(r.TEXTURE_2D,r.TEXTURE_2D,1),le[r.TEXTURE_CUBE_MAP]=K(r.TEXTURE_CUBE_MAP,r.TEXTURE_CUBE_MAP_POSITIVE_X,6),le[r.TEXTURE_2D_ARRAY]=K(r.TEXTURE_2D_ARRAY,r.TEXTURE_2D_ARRAY,1,1),le[r.TEXTURE_3D]=K(r.TEXTURE_3D,r.TEXTURE_3D,1,1),s.setClear(0,0,0,1),a.setClear(1),o.setClear(0),ue(r.DEPTH_TEST),a.setFunc(Ps),B(!1),me(If),ue(r.CULL_FACE),oe(nr);function ue(k){u[k]!==!0&&(r.enable(k),u[k]=!0)}function Ee(k){u[k]!==!1&&(r.disable(k),u[k]=!1)}function He(k,pe){return h[k]!==pe?(r.bindFramebuffer(k,pe),h[k]=pe,k===r.DRAW_FRAMEBUFFER&&(h[r.FRAMEBUFFER]=pe),k===r.FRAMEBUFFER&&(h[r.DRAW_FRAMEBUFFER]=pe),!0):!1}function Ae(k,pe){let ne=m,Ie=!1;if(k){ne=f.get(pe),ne===void 0&&(ne=[],f.set(pe,ne));let xe=k.textures;if(ne.length!==xe.length||ne[0]!==r.COLOR_ATTACHMENT0){for(let ce=0,de=xe.length;ce<de;ce++)ne[ce]=r.COLOR_ATTACHMENT0+ce;ne.length=xe.length,Ie=!0}}else ne[0]!==r.BACK&&(ne[0]=r.BACK,Ie=!0);Ie&&r.drawBuffers(ne)}function Ye(k){return _!==k?(r.useProgram(k),_=k,!0):!1}let Se={[Jr]:r.FUNC_ADD,[bm]:r.FUNC_SUBTRACT,[Tm]:r.FUNC_REVERSE_SUBTRACT};Se[Em]=r.MIN,Se[wm]=r.MAX;let j={[Am]:r.ZERO,[Cm]:r.ONE,[Rm]:r.SRC_COLOR,[pc]:r.SRC_ALPHA,[Nm]:r.SRC_ALPHA_SATURATE,[Lm]:r.DST_COLOR,[Im]:r.DST_ALPHA,[Pm]:r.ONE_MINUS_SRC_COLOR,[mc]:r.ONE_MINUS_SRC_ALPHA,[Um]:r.ONE_MINUS_DST_COLOR,[Dm]:r.ONE_MINUS_DST_ALPHA,[Fm]:r.CONSTANT_COLOR,[Om]:r.ONE_MINUS_CONSTANT_COLOR,[Bm]:r.CONSTANT_ALPHA,[km]:r.ONE_MINUS_CONSTANT_ALPHA};function oe(k,pe,ne,Ie,xe,ce,de,_e,Je,he){if(k===nr){p===!0&&(Ee(r.BLEND),p=!1);return}if(p===!1&&(ue(r.BLEND),p=!0),k!==Mm){if(k!==g||he!==P){if((S!==Jr||R!==Jr)&&(r.blendEquation(r.FUNC_ADD),S=Jr,R=Jr),he)switch(k){case Rs:r.blendFuncSeparate(r.ONE,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA);break;case Df:r.blendFunc(r.ONE,r.ONE);break;case Lf:r.blendFuncSeparate(r.ZERO,r.ONE_MINUS_SRC_COLOR,r.ZERO,r.ONE);break;case Uf:r.blendFuncSeparate(r.DST_COLOR,r.ONE_MINUS_SRC_ALPHA,r.ZERO,r.ONE);break;default:nt("WebGLState: Invalid blending: ",k);break}else switch(k){case Rs:r.blendFuncSeparate(r.SRC_ALPHA,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA);break;case Df:r.blendFuncSeparate(r.SRC_ALPHA,r.ONE,r.ONE,r.ONE);break;case Lf:nt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Uf:nt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:nt("WebGLState: Invalid blending: ",k);break}M=null,x=null,E=null,A=null,v.set(0,0,0),b=0,g=k,P=he}return}xe=xe||pe,ce=ce||ne,de=de||Ie,(pe!==S||xe!==R)&&(r.blendEquationSeparate(Se[pe],Se[xe]),S=pe,R=xe),(ne!==M||Ie!==x||ce!==E||de!==A)&&(r.blendFuncSeparate(j[ne],j[Ie],j[ce],j[de]),M=ne,x=Ie,E=ce,A=de),(_e.equals(v)===!1||Je!==b)&&(r.blendColor(_e.r,_e.g,_e.b,Je),v.copy(_e),b=Je),g=k,P=!1}function re(k,pe){k.side===Bt?Ee(r.CULL_FACE):ue(r.CULL_FACE);let ne=k.side===Yn;pe&&(ne=!ne),B(ne),k.blending===Rs&&k.transparent===!1?oe(nr):oe(k.blending,k.blendEquation,k.blendSrc,k.blendDst,k.blendEquationAlpha,k.blendSrcAlpha,k.blendDstAlpha,k.blendColor,k.blendAlpha,k.premultipliedAlpha),a.setFunc(k.depthFunc),a.setTest(k.depthTest),a.setMask(k.depthWrite),s.setMask(k.colorWrite);let Ie=k.stencilWrite;o.setTest(Ie),Ie&&(o.setMask(k.stencilWriteMask),o.setFunc(k.stencilFunc,k.stencilRef,k.stencilFuncMask),o.setOp(k.stencilFail,k.stencilZFail,k.stencilZPass)),N(k.polygonOffset,k.polygonOffsetFactor,k.polygonOffsetUnits),k.alphaToCoverage===!0?ue(r.SAMPLE_ALPHA_TO_COVERAGE):Ee(r.SAMPLE_ALPHA_TO_COVERAGE)}function B(k){C!==k&&(k?r.frontFace(r.CW):r.frontFace(r.CCW),C=k)}function me(k){k!==vm?(ue(r.CULL_FACE),k!==I&&(k===If?r.cullFace(r.BACK):k===ym?r.cullFace(r.FRONT):r.cullFace(r.FRONT_AND_BACK))):Ee(r.CULL_FACE),I=k}function We(k){k!==H&&(F&&r.lineWidth(k),H=k)}function N(k,pe,ne){k?(ue(r.POLYGON_OFFSET_FILL),(V!==pe||D!==ne)&&(V=pe,D=ne,a.getReversed()&&(pe=-pe),r.polygonOffset(pe,ne))):Ee(r.POLYGON_OFFSET_FILL)}function Ne(k){k?ue(r.SCISSOR_TEST):Ee(r.SCISSOR_TEST)}function Pe(k){k===void 0&&(k=r.TEXTURE0+O-1),L!==k&&(r.activeTexture(k),L=k)}function Q(k,pe,ne){ne===void 0&&(L===null?ne=r.TEXTURE0+O-1:ne=L);let Ie=ie[ne];Ie===void 0&&(Ie={type:void 0,texture:void 0},ie[ne]=Ie),(Ie.type!==k||Ie.texture!==pe)&&(L!==ne&&(r.activeTexture(ne),L=ne),r.bindTexture(k,pe||le[k]),Ie.type=k,Ie.texture=pe)}function z(){let k=ie[L];k!==void 0&&k.type!==void 0&&(r.bindTexture(k.type,null),k.type=void 0,k.texture=void 0)}function Me(){try{r.compressedTexImage2D(...arguments)}catch(k){nt("WebGLState:",k)}}function w(){try{r.compressedTexImage3D(...arguments)}catch(k){nt("WebGLState:",k)}}function y(){try{r.texSubImage2D(...arguments)}catch(k){nt("WebGLState:",k)}}function G(){try{r.texSubImage3D(...arguments)}catch(k){nt("WebGLState:",k)}}function $(){try{r.compressedTexSubImage2D(...arguments)}catch(k){nt("WebGLState:",k)}}function se(){try{r.compressedTexSubImage3D(...arguments)}catch(k){nt("WebGLState:",k)}}function fe(){try{r.texStorage2D(...arguments)}catch(k){nt("WebGLState:",k)}}function ae(){try{r.texStorage3D(...arguments)}catch(k){nt("WebGLState:",k)}}function U(){try{r.texImage2D(...arguments)}catch(k){nt("WebGLState:",k)}}function te(){try{r.texImage3D(...arguments)}catch(k){nt("WebGLState:",k)}}function Te(k){return d[k]!==void 0?d[k]:r.getParameter(k)}function Ce(k,pe){d[k]!==pe&&(r.pixelStorei(k,pe),d[k]=pe)}function ve(k){ze.equals(k)===!1&&(r.scissor(k.x,k.y,k.z,k.w),ze.copy(k))}function ge(k){Oe.equals(k)===!1&&(r.viewport(k.x,k.y,k.z,k.w),Oe.copy(k))}function be(k,pe){let ne=c.get(pe);ne===void 0&&(ne=new WeakMap,c.set(pe,ne));let Ie=ne.get(k);Ie===void 0&&(Ie=r.getUniformBlockIndex(pe,k.name),ne.set(k,Ie))}function Qe(k,pe){let Ie=c.get(pe).get(k);l.get(pe)!==Ie&&(r.uniformBlockBinding(pe,Ie,k.__bindingPointIndex),l.set(pe,Ie))}function it(){r.disable(r.BLEND),r.disable(r.CULL_FACE),r.disable(r.DEPTH_TEST),r.disable(r.POLYGON_OFFSET_FILL),r.disable(r.SCISSOR_TEST),r.disable(r.STENCIL_TEST),r.disable(r.SAMPLE_ALPHA_TO_COVERAGE),r.blendEquation(r.FUNC_ADD),r.blendFunc(r.ONE,r.ZERO),r.blendFuncSeparate(r.ONE,r.ZERO,r.ONE,r.ZERO),r.blendColor(0,0,0,0),r.colorMask(!0,!0,!0,!0),r.clearColor(0,0,0,0),r.depthMask(!0),r.depthFunc(r.LESS),a.setReversed(!1),r.clearDepth(1),r.stencilMask(4294967295),r.stencilFunc(r.ALWAYS,0,4294967295),r.stencilOp(r.KEEP,r.KEEP,r.KEEP),r.clearStencil(0),r.cullFace(r.BACK),r.frontFace(r.CCW),r.polygonOffset(0,0),r.activeTexture(r.TEXTURE0),r.bindFramebuffer(r.FRAMEBUFFER,null),r.bindFramebuffer(r.DRAW_FRAMEBUFFER,null),r.bindFramebuffer(r.READ_FRAMEBUFFER,null),r.useProgram(null),r.lineWidth(1),r.scissor(0,0,r.canvas.width,r.canvas.height),r.viewport(0,0,r.canvas.width,r.canvas.height),r.pixelStorei(r.PACK_ALIGNMENT,4),r.pixelStorei(r.UNPACK_ALIGNMENT,4),r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,!1),r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),r.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,r.BROWSER_DEFAULT_WEBGL),r.pixelStorei(r.PACK_ROW_LENGTH,0),r.pixelStorei(r.PACK_SKIP_PIXELS,0),r.pixelStorei(r.PACK_SKIP_ROWS,0),r.pixelStorei(r.UNPACK_ROW_LENGTH,0),r.pixelStorei(r.UNPACK_IMAGE_HEIGHT,0),r.pixelStorei(r.UNPACK_SKIP_PIXELS,0),r.pixelStorei(r.UNPACK_SKIP_ROWS,0),r.pixelStorei(r.UNPACK_SKIP_IMAGES,0),u={},d={},L=null,ie={},h={},f=new WeakMap,m=[],_=null,p=!1,g=null,S=null,M=null,x=null,R=null,E=null,A=null,v=new qe(0,0,0),b=0,P=!1,C=null,I=null,H=null,V=null,D=null,ze.set(0,0,r.canvas.width,r.canvas.height),Oe.set(0,0,r.canvas.width,r.canvas.height),s.reset(),a.reset(),o.reset()}return{buffers:{color:s,depth:a,stencil:o},enable:ue,disable:Ee,bindFramebuffer:He,drawBuffers:Ae,useProgram:Ye,setBlending:oe,setMaterial:re,setFlipSided:B,setCullFace:me,setLineWidth:We,setPolygonOffset:N,setScissorTest:Ne,activeTexture:Pe,bindTexture:Q,unbindTexture:z,compressedTexImage2D:Me,compressedTexImage3D:w,texImage2D:U,texImage3D:te,pixelStorei:Ce,getParameter:Te,updateUBOMapping:be,uniformBlockBinding:Qe,texStorage2D:fe,texStorage3D:ae,texSubImage2D:y,texSubImage3D:G,compressedTexSubImage2D:$,compressedTexSubImage3D:se,scissor:ve,viewport:ge,reset:it}}function i1(r,e,t,n,i,s,a){let o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new we,u=new WeakMap,d=new Set,h,f=new WeakMap,m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(w,y){return m?new OffscreenCanvas(w,y):Ca("canvas")}function p(w,y,G){let $=1,se=Me(w);if((se.width>G||se.height>G)&&($=G/Math.max(se.width,se.height)),$<1)if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&w instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&w instanceof ImageBitmap||typeof VideoFrame<"u"&&w instanceof VideoFrame){let fe=Math.floor($*se.width),ae=Math.floor($*se.height);h===void 0&&(h=_(fe,ae));let U=y?_(fe,ae):h;return U.width=fe,U.height=ae,U.getContext("2d").drawImage(w,0,0,fe,ae),tt("WebGLRenderer: Texture has been resized from ("+se.width+"x"+se.height+") to ("+fe+"x"+ae+")."),U}else return"data"in w&&tt("WebGLRenderer: Image in DataTexture is too big ("+se.width+"x"+se.height+")."),w;return w}function g(w){return w.generateMipmaps}function S(w){r.generateMipmap(w)}function M(w){return w.isWebGLCubeRenderTarget?r.TEXTURE_CUBE_MAP:w.isWebGL3DRenderTarget?r.TEXTURE_3D:w.isWebGLArrayRenderTarget||w.isCompressedArrayTexture?r.TEXTURE_2D_ARRAY:r.TEXTURE_2D}function x(w,y,G,$,se,fe=!1){if(w!==null){if(r[w]!==void 0)return r[w];tt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+w+"'")}let ae;$&&(ae=e.get("EXT_texture_norm16"),ae||tt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let U=y;if(y===r.RED&&(G===r.FLOAT&&(U=r.R32F),G===r.HALF_FLOAT&&(U=r.R16F),G===r.UNSIGNED_BYTE&&(U=r.R8),G===r.UNSIGNED_SHORT&&ae&&(U=ae.R16_EXT),G===r.SHORT&&ae&&(U=ae.R16_SNORM_EXT)),y===r.RED_INTEGER&&(G===r.UNSIGNED_BYTE&&(U=r.R8UI),G===r.UNSIGNED_SHORT&&(U=r.R16UI),G===r.UNSIGNED_INT&&(U=r.R32UI),G===r.BYTE&&(U=r.R8I),G===r.SHORT&&(U=r.R16I),G===r.INT&&(U=r.R32I)),y===r.RG&&(G===r.FLOAT&&(U=r.RG32F),G===r.HALF_FLOAT&&(U=r.RG16F),G===r.UNSIGNED_BYTE&&(U=r.RG8),G===r.UNSIGNED_SHORT&&ae&&(U=ae.RG16_EXT),G===r.SHORT&&ae&&(U=ae.RG16_SNORM_EXT)),y===r.RG_INTEGER&&(G===r.UNSIGNED_BYTE&&(U=r.RG8UI),G===r.UNSIGNED_SHORT&&(U=r.RG16UI),G===r.UNSIGNED_INT&&(U=r.RG32UI),G===r.BYTE&&(U=r.RG8I),G===r.SHORT&&(U=r.RG16I),G===r.INT&&(U=r.RG32I)),y===r.RGB_INTEGER&&(G===r.UNSIGNED_BYTE&&(U=r.RGB8UI),G===r.UNSIGNED_SHORT&&(U=r.RGB16UI),G===r.UNSIGNED_INT&&(U=r.RGB32UI),G===r.BYTE&&(U=r.RGB8I),G===r.SHORT&&(U=r.RGB16I),G===r.INT&&(U=r.RGB32I)),y===r.RGBA_INTEGER&&(G===r.UNSIGNED_BYTE&&(U=r.RGBA8UI),G===r.UNSIGNED_SHORT&&(U=r.RGBA16UI),G===r.UNSIGNED_INT&&(U=r.RGBA32UI),G===r.BYTE&&(U=r.RGBA8I),G===r.SHORT&&(U=r.RGBA16I),G===r.INT&&(U=r.RGBA32I)),y===r.RGB&&(G===r.UNSIGNED_SHORT&&ae&&(U=ae.RGB16_EXT),G===r.SHORT&&ae&&(U=ae.RGB16_SNORM_EXT),G===r.UNSIGNED_INT_5_9_9_9_REV&&(U=r.RGB9_E5),G===r.UNSIGNED_INT_10F_11F_11F_REV&&(U=r.R11F_G11F_B10F)),y===r.RGBA){let te=fe?Po:xt.getTransfer(se);G===r.FLOAT&&(U=r.RGBA32F),G===r.HALF_FLOAT&&(U=r.RGBA16F),G===r.UNSIGNED_BYTE&&(U=te===Tt?r.SRGB8_ALPHA8:r.RGBA8),G===r.UNSIGNED_SHORT&&ae&&(U=ae.RGBA16_EXT),G===r.SHORT&&ae&&(U=ae.RGBA16_SNORM_EXT),G===r.UNSIGNED_SHORT_4_4_4_4&&(U=r.RGBA4),G===r.UNSIGNED_SHORT_5_5_5_1&&(U=r.RGB5_A1)}return(U===r.R16F||U===r.R32F||U===r.RG16F||U===r.RG32F||U===r.RGBA16F||U===r.RGBA32F)&&e.get("EXT_color_buffer_float"),U}function R(w,y){let G;return w?y===null||y===Hi||y===Va?G=r.DEPTH24_STENCIL8:y===Gi?G=r.DEPTH32F_STENCIL8:y===za&&(G=r.DEPTH24_STENCIL8,tt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):y===null||y===Hi||y===Va?G=r.DEPTH_COMPONENT24:y===Gi?G=r.DEPTH_COMPONENT32F:y===za&&(G=r.DEPTH_COMPONENT16),G}function E(w,y){return g(w)===!0||w.isFramebufferTexture&&w.minFilter!==bn&&w.minFilter!==Ft?Math.log2(Math.max(y.width,y.height))+1:w.mipmaps!==void 0&&w.mipmaps.length>0?w.mipmaps.length:w.isCompressedTexture&&Array.isArray(w.image)?y.mipmaps.length:1}function A(w){let y=w.target;y.removeEventListener("dispose",A),b(y),y.isVideoTexture&&u.delete(y),y.isHTMLTexture&&d.delete(y)}function v(w){let y=w.target;y.removeEventListener("dispose",v),C(y)}function b(w){let y=n.get(w);if(y.__webglInit===void 0)return;let G=w.source,$=f.get(G);if($){let se=$[y.__cacheKey];se.usedTimes--,se.usedTimes===0&&P(w),Object.keys($).length===0&&f.delete(G)}n.remove(w)}function P(w){let y=n.get(w);r.deleteTexture(y.__webglTexture);let G=w.source,$=f.get(G);delete $[y.__cacheKey],a.memory.textures--}function C(w){let y=n.get(w);if(w.depthTexture&&(w.depthTexture.dispose(),n.remove(w.depthTexture)),w.isWebGLCubeRenderTarget)for(let $=0;$<6;$++){if(Array.isArray(y.__webglFramebuffer[$]))for(let se=0;se<y.__webglFramebuffer[$].length;se++)r.deleteFramebuffer(y.__webglFramebuffer[$][se]);else r.deleteFramebuffer(y.__webglFramebuffer[$]);y.__webglDepthbuffer&&r.deleteRenderbuffer(y.__webglDepthbuffer[$])}else{if(Array.isArray(y.__webglFramebuffer))for(let $=0;$<y.__webglFramebuffer.length;$++)r.deleteFramebuffer(y.__webglFramebuffer[$]);else r.deleteFramebuffer(y.__webglFramebuffer);if(y.__webglDepthbuffer&&r.deleteRenderbuffer(y.__webglDepthbuffer),y.__webglMultisampledFramebuffer&&r.deleteFramebuffer(y.__webglMultisampledFramebuffer),y.__webglColorRenderbuffer)for(let $=0;$<y.__webglColorRenderbuffer.length;$++)y.__webglColorRenderbuffer[$]&&r.deleteRenderbuffer(y.__webglColorRenderbuffer[$]);y.__webglDepthRenderbuffer&&r.deleteRenderbuffer(y.__webglDepthRenderbuffer)}let G=w.textures;for(let $=0,se=G.length;$<se;$++){let fe=n.get(G[$]);fe.__webglTexture&&(r.deleteTexture(fe.__webglTexture),a.memory.textures--),n.remove(G[$])}n.remove(w)}let I=0;function H(){I=0}function V(){return I}function D(w){I=w}function O(){let w=I;return w>=i.maxTextures&&tt("WebGLTextures: Trying to use "+w+" texture units while this GPU supports only "+i.maxTextures),I+=1,w}function F(w){let y=[];return y.push(w.wrapS),y.push(w.wrapT),y.push(w.wrapR||0),y.push(w.magFilter),y.push(w.minFilter),y.push(w.anisotropy),y.push(w.internalFormat),y.push(w.format),y.push(w.type),y.push(w.generateMipmaps),y.push(w.premultiplyAlpha),y.push(w.flipY),y.push(w.unpackAlignment),y.push(w.colorSpace),y.join()}function Z(w,y){let G=n.get(w);if(w.isVideoTexture&&Q(w),w.isRenderTargetTexture===!1&&w.isExternalTexture!==!0&&w.version>0&&G.__version!==w.version){let $=w.image;if($===null)tt("WebGLRenderer: Texture marked for update but no image data found.");else if($.complete===!1)tt("WebGLRenderer: Texture marked for update but image is incomplete");else{Ee(G,w,y);return}}else w.isExternalTexture&&(G.__webglTexture=w.sourceTexture?w.sourceTexture:null);t.bindTexture(r.TEXTURE_2D,G.__webglTexture,r.TEXTURE0+y)}function ee(w,y){let G=n.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&G.__version!==w.version){Ee(G,w,y);return}else w.isExternalTexture&&(G.__webglTexture=w.sourceTexture?w.sourceTexture:null);t.bindTexture(r.TEXTURE_2D_ARRAY,G.__webglTexture,r.TEXTURE0+y)}function L(w,y){let G=n.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&G.__version!==w.version){Ee(G,w,y);return}t.bindTexture(r.TEXTURE_3D,G.__webglTexture,r.TEXTURE0+y)}function ie(w,y){let G=n.get(w);if(w.isCubeDepthTexture!==!0&&w.version>0&&G.__version!==w.version){He(G,w,y);return}t.bindTexture(r.TEXTURE_CUBE_MAP,G.__webglTexture,r.TEXTURE0+y)}let ye={[bc]:r.REPEAT,[Ki]:r.CLAMP_TO_EDGE,[Tc]:r.MIRRORED_REPEAT},Fe={[bn]:r.NEAREST,[Hm]:r.NEAREST_MIPMAP_NEAREST,[Ko]:r.NEAREST_MIPMAP_LINEAR,[Ft]:r.LINEAR,[au]:r.LINEAR_MIPMAP_NEAREST,[ss]:r.LINEAR_MIPMAP_LINEAR},ze={[Xm]:r.NEVER,[$m]:r.ALWAYS,[qm]:r.LESS,[Wu]:r.LEQUAL,[Ym]:r.EQUAL,[Xu]:r.GEQUAL,[Zm]:r.GREATER,[Jm]:r.NOTEQUAL};function Oe(w,y){if(y.type===Gi&&e.has("OES_texture_float_linear")===!1&&(y.magFilter===Ft||y.magFilter===au||y.magFilter===Ko||y.magFilter===ss||y.minFilter===Ft||y.minFilter===au||y.minFilter===Ko||y.minFilter===ss)&&tt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),r.texParameteri(w,r.TEXTURE_WRAP_S,ye[y.wrapS]),r.texParameteri(w,r.TEXTURE_WRAP_T,ye[y.wrapT]),(w===r.TEXTURE_3D||w===r.TEXTURE_2D_ARRAY)&&r.texParameteri(w,r.TEXTURE_WRAP_R,ye[y.wrapR]),r.texParameteri(w,r.TEXTURE_MAG_FILTER,Fe[y.magFilter]),r.texParameteri(w,r.TEXTURE_MIN_FILTER,Fe[y.minFilter]),y.compareFunction&&(r.texParameteri(w,r.TEXTURE_COMPARE_MODE,r.COMPARE_REF_TO_TEXTURE),r.texParameteri(w,r.TEXTURE_COMPARE_FUNC,ze[y.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(y.magFilter===bn||y.minFilter!==Ko&&y.minFilter!==ss||y.type===Gi&&e.has("OES_texture_float_linear")===!1)return;if(y.anisotropy>1||n.get(y).__currentAnisotropy){let G=e.get("EXT_texture_filter_anisotropic");r.texParameterf(w,G.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(y.anisotropy,i.getMaxAnisotropy())),n.get(y).__currentAnisotropy=y.anisotropy}}}function K(w,y){let G=!1;w.__webglInit===void 0&&(w.__webglInit=!0,y.addEventListener("dispose",A));let $=y.source,se=f.get($);se===void 0&&(se={},f.set($,se));let fe=F(y);if(fe!==w.__cacheKey){se[fe]===void 0&&(se[fe]={texture:r.createTexture(),usedTimes:0},a.memory.textures++,G=!0),se[fe].usedTimes++;let ae=se[w.__cacheKey];ae!==void 0&&(se[w.__cacheKey].usedTimes--,ae.usedTimes===0&&P(y)),w.__cacheKey=fe,w.__webglTexture=se[fe].texture}return G}function le(w,y,G){return Math.floor(Math.floor(w/G)/y)}function ue(w,y,G,$){let fe=w.updateRanges;if(fe.length===0)t.texSubImage2D(r.TEXTURE_2D,0,0,0,y.width,y.height,G,$,y.data);else{fe.sort((Ce,ve)=>Ce.start-ve.start);let ae=0;for(let Ce=1;Ce<fe.length;Ce++){let ve=fe[ae],ge=fe[Ce],be=ve.start+ve.count,Qe=le(ge.start,y.width,4),it=le(ve.start,y.width,4);ge.start<=be+1&&Qe===it&&le(ge.start+ge.count-1,y.width,4)===Qe?ve.count=Math.max(ve.count,ge.start+ge.count-ve.start):(++ae,fe[ae]=ge)}fe.length=ae+1;let U=t.getParameter(r.UNPACK_ROW_LENGTH),te=t.getParameter(r.UNPACK_SKIP_PIXELS),Te=t.getParameter(r.UNPACK_SKIP_ROWS);t.pixelStorei(r.UNPACK_ROW_LENGTH,y.width);for(let Ce=0,ve=fe.length;Ce<ve;Ce++){let ge=fe[Ce],be=Math.floor(ge.start/4),Qe=Math.ceil(ge.count/4),it=be%y.width,k=Math.floor(be/y.width),pe=Qe,ne=1;t.pixelStorei(r.UNPACK_SKIP_PIXELS,it),t.pixelStorei(r.UNPACK_SKIP_ROWS,k),t.texSubImage2D(r.TEXTURE_2D,0,it,k,pe,ne,G,$,y.data)}w.clearUpdateRanges(),t.pixelStorei(r.UNPACK_ROW_LENGTH,U),t.pixelStorei(r.UNPACK_SKIP_PIXELS,te),t.pixelStorei(r.UNPACK_SKIP_ROWS,Te)}}function Ee(w,y,G){let $=r.TEXTURE_2D;(y.isDataArrayTexture||y.isCompressedArrayTexture)&&($=r.TEXTURE_2D_ARRAY),y.isData3DTexture&&($=r.TEXTURE_3D);let se=K(w,y),fe=y.source;t.bindTexture($,w.__webglTexture,r.TEXTURE0+G);let ae=n.get(fe);if(fe.version!==ae.__version||se===!0){if(t.activeTexture(r.TEXTURE0+G),(typeof ImageBitmap<"u"&&y.image instanceof ImageBitmap)===!1){let ne=xt.getPrimaries(xt.workingColorSpace),Ie=y.colorSpace===Er?null:xt.getPrimaries(y.colorSpace),xe=y.colorSpace===Er||ne===Ie?r.NONE:r.BROWSER_DEFAULT_WEBGL;t.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,y.flipY),t.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),t.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,xe)}t.pixelStorei(r.UNPACK_ALIGNMENT,y.unpackAlignment);let te=p(y.image,!1,i.maxTextureSize);te=z(y,te);let Te=s.convert(y.format,y.colorSpace),Ce=s.convert(y.type),ve=x(y.internalFormat,Te,Ce,y.normalized,y.colorSpace,y.isVideoTexture);Oe($,y);let ge,be=y.mipmaps,Qe=y.isVideoTexture!==!0,it=ae.__version===void 0||se===!0,k=fe.dataReady,pe=E(y,te);if(y.isDepthTexture)ve=R(y.format===as,y.type),it&&(Qe?t.texStorage2D(r.TEXTURE_2D,1,ve,te.width,te.height):t.texImage2D(r.TEXTURE_2D,0,ve,te.width,te.height,0,Te,Ce,null));else if(y.isDataTexture)if(be.length>0){Qe&&it&&t.texStorage2D(r.TEXTURE_2D,pe,ve,be[0].width,be[0].height);for(let ne=0,Ie=be.length;ne<Ie;ne++)ge=be[ne],Qe?k&&t.texSubImage2D(r.TEXTURE_2D,ne,0,0,ge.width,ge.height,Te,Ce,ge.data):t.texImage2D(r.TEXTURE_2D,ne,ve,ge.width,ge.height,0,Te,Ce,ge.data);y.generateMipmaps=!1}else Qe?(it&&t.texStorage2D(r.TEXTURE_2D,pe,ve,te.width,te.height),k&&ue(y,te,Te,Ce)):t.texImage2D(r.TEXTURE_2D,0,ve,te.width,te.height,0,Te,Ce,te.data);else if(y.isCompressedTexture)if(y.isCompressedArrayTexture){Qe&&it&&t.texStorage3D(r.TEXTURE_2D_ARRAY,pe,ve,be[0].width,be[0].height,te.depth);for(let ne=0,Ie=be.length;ne<Ie;ne++)if(ge=be[ne],y.format!==Ri)if(Te!==null)if(Qe){if(k)if(y.layerUpdates.size>0){let xe=id(ge.width,ge.height,y.format,y.type);for(let ce of y.layerUpdates){let de=ge.data.subarray(ce*xe/ge.data.BYTES_PER_ELEMENT,(ce+1)*xe/ge.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(r.TEXTURE_2D_ARRAY,ne,0,0,ce,ge.width,ge.height,1,Te,de)}y.clearLayerUpdates()}else t.compressedTexSubImage3D(r.TEXTURE_2D_ARRAY,ne,0,0,0,ge.width,ge.height,te.depth,Te,ge.data)}else t.compressedTexImage3D(r.TEXTURE_2D_ARRAY,ne,ve,ge.width,ge.height,te.depth,0,ge.data,0,0);else tt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Qe?k&&t.texSubImage3D(r.TEXTURE_2D_ARRAY,ne,0,0,0,ge.width,ge.height,te.depth,Te,Ce,ge.data):t.texImage3D(r.TEXTURE_2D_ARRAY,ne,ve,ge.width,ge.height,te.depth,0,Te,Ce,ge.data)}else{Qe&&it&&t.texStorage2D(r.TEXTURE_2D,pe,ve,be[0].width,be[0].height);for(let ne=0,Ie=be.length;ne<Ie;ne++)ge=be[ne],y.format!==Ri?Te!==null?Qe?k&&t.compressedTexSubImage2D(r.TEXTURE_2D,ne,0,0,ge.width,ge.height,Te,ge.data):t.compressedTexImage2D(r.TEXTURE_2D,ne,ve,ge.width,ge.height,0,ge.data):tt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Qe?k&&t.texSubImage2D(r.TEXTURE_2D,ne,0,0,ge.width,ge.height,Te,Ce,ge.data):t.texImage2D(r.TEXTURE_2D,ne,ve,ge.width,ge.height,0,Te,Ce,ge.data)}else if(y.isDataArrayTexture)if(Qe){if(it&&t.texStorage3D(r.TEXTURE_2D_ARRAY,pe,ve,te.width,te.height,te.depth),k)if(y.layerUpdates.size>0){let ne=id(te.width,te.height,y.format,y.type);for(let Ie of y.layerUpdates){let xe=te.data.subarray(Ie*ne/te.data.BYTES_PER_ELEMENT,(Ie+1)*ne/te.data.BYTES_PER_ELEMENT);t.texSubImage3D(r.TEXTURE_2D_ARRAY,0,0,0,Ie,te.width,te.height,1,Te,Ce,xe)}y.clearLayerUpdates()}else t.texSubImage3D(r.TEXTURE_2D_ARRAY,0,0,0,0,te.width,te.height,te.depth,Te,Ce,te.data)}else t.texImage3D(r.TEXTURE_2D_ARRAY,0,ve,te.width,te.height,te.depth,0,Te,Ce,te.data);else if(y.isData3DTexture)Qe?(it&&t.texStorage3D(r.TEXTURE_3D,pe,ve,te.width,te.height,te.depth),k&&t.texSubImage3D(r.TEXTURE_3D,0,0,0,0,te.width,te.height,te.depth,Te,Ce,te.data)):t.texImage3D(r.TEXTURE_3D,0,ve,te.width,te.height,te.depth,0,Te,Ce,te.data);else if(y.isFramebufferTexture){if(it)if(Qe)t.texStorage2D(r.TEXTURE_2D,pe,ve,te.width,te.height);else{let ne=te.width,Ie=te.height;for(let xe=0;xe<pe;xe++)t.texImage2D(r.TEXTURE_2D,xe,ve,ne,Ie,0,Te,Ce,null),ne>>=1,Ie>>=1}}else if(y.isHTMLTexture){if("texElementImage2D"in r){let ne=r.canvas;if(ne.hasAttribute("layoutsubtree")||ne.setAttribute("layoutsubtree","true"),te.parentNode!==ne){ne.appendChild(te),d.add(y),ne.onpaint=_e=>{let Je=_e.changedElements;for(let he of d)Je.includes(he.image)&&(he.needsUpdate=!0)},ne.requestPaint();return}let Ie=0,xe=r.RGBA,ce=r.RGBA,de=r.UNSIGNED_BYTE;r.texElementImage2D(r.TEXTURE_2D,Ie,xe,ce,de,te),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE)}}else if(be.length>0){if(Qe&&it){let ne=Me(be[0]);t.texStorage2D(r.TEXTURE_2D,pe,ve,ne.width,ne.height)}for(let ne=0,Ie=be.length;ne<Ie;ne++)ge=be[ne],Qe?k&&t.texSubImage2D(r.TEXTURE_2D,ne,0,0,Te,Ce,ge):t.texImage2D(r.TEXTURE_2D,ne,ve,Te,Ce,ge);y.generateMipmaps=!1}else if(Qe){if(it){let ne=Me(te);t.texStorage2D(r.TEXTURE_2D,pe,ve,ne.width,ne.height)}k&&t.texSubImage2D(r.TEXTURE_2D,0,0,0,Te,Ce,te)}else t.texImage2D(r.TEXTURE_2D,0,ve,Te,Ce,te);g(y)&&S($),ae.__version=fe.version,y.onUpdate&&y.onUpdate(y)}w.__version=y.version}function He(w,y,G){if(y.image.length!==6)return;let $=K(w,y),se=y.source;t.bindTexture(r.TEXTURE_CUBE_MAP,w.__webglTexture,r.TEXTURE0+G);let fe=n.get(se);if(se.version!==fe.__version||$===!0){t.activeTexture(r.TEXTURE0+G);let ae=xt.getPrimaries(xt.workingColorSpace),U=y.colorSpace===Er?null:xt.getPrimaries(y.colorSpace),te=y.colorSpace===Er||ae===U?r.NONE:r.BROWSER_DEFAULT_WEBGL;t.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,y.flipY),t.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),t.pixelStorei(r.UNPACK_ALIGNMENT,y.unpackAlignment),t.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,te);let Te=y.isCompressedTexture||y.image[0].isCompressedTexture,Ce=y.image[0]&&y.image[0].isDataTexture,ve=[];for(let ce=0;ce<6;ce++)!Te&&!Ce?ve[ce]=p(y.image[ce],!0,i.maxCubemapSize):ve[ce]=Ce?y.image[ce].image:y.image[ce],ve[ce]=z(y,ve[ce]);let ge=ve[0],be=s.convert(y.format,y.colorSpace),Qe=s.convert(y.type),it=x(y.internalFormat,be,Qe,y.normalized,y.colorSpace),k=y.isVideoTexture!==!0,pe=fe.__version===void 0||$===!0,ne=se.dataReady,Ie=E(y,ge);Oe(r.TEXTURE_CUBE_MAP,y);let xe;if(Te){k&&pe&&t.texStorage2D(r.TEXTURE_CUBE_MAP,Ie,it,ge.width,ge.height);for(let ce=0;ce<6;ce++){xe=ve[ce].mipmaps;for(let de=0;de<xe.length;de++){let _e=xe[de];y.format!==Ri?be!==null?k?ne&&t.compressedTexSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ce,de,0,0,_e.width,_e.height,be,_e.data):t.compressedTexImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ce,de,it,_e.width,_e.height,0,_e.data):tt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):k?ne&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ce,de,0,0,_e.width,_e.height,be,Qe,_e.data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ce,de,it,_e.width,_e.height,0,be,Qe,_e.data)}}}else{if(xe=y.mipmaps,k&&pe){xe.length>0&&Ie++;let ce=Me(ve[0]);t.texStorage2D(r.TEXTURE_CUBE_MAP,Ie,it,ce.width,ce.height)}for(let ce=0;ce<6;ce++)if(Ce){k?ne&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ce,0,0,0,ve[ce].width,ve[ce].height,be,Qe,ve[ce].data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ce,0,it,ve[ce].width,ve[ce].height,0,be,Qe,ve[ce].data);for(let de=0;de<xe.length;de++){let Je=xe[de].image[ce].image;k?ne&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ce,de+1,0,0,Je.width,Je.height,be,Qe,Je.data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ce,de+1,it,Je.width,Je.height,0,be,Qe,Je.data)}}else{k?ne&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ce,0,0,0,be,Qe,ve[ce]):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ce,0,it,be,Qe,ve[ce]);for(let de=0;de<xe.length;de++){let _e=xe[de];k?ne&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ce,de+1,0,0,be,Qe,_e.image[ce]):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ce,de+1,it,be,Qe,_e.image[ce])}}}g(y)&&S(r.TEXTURE_CUBE_MAP),fe.__version=se.version,y.onUpdate&&y.onUpdate(y)}w.__version=y.version}function Ae(w,y,G,$,se,fe){let ae=s.convert(G.format,G.colorSpace),U=s.convert(G.type),te=x(G.internalFormat,ae,U,G.normalized,G.colorSpace),Te=n.get(y),Ce=n.get(G);if(Ce.__renderTarget=y,!Te.__hasExternalTextures){let ve=Math.max(1,y.width>>fe),ge=Math.max(1,y.height>>fe);se===r.TEXTURE_3D||se===r.TEXTURE_2D_ARRAY?t.texImage3D(se,fe,te,ve,ge,y.depth,0,ae,U,null):t.texImage2D(se,fe,te,ve,ge,0,ae,U,null)}t.bindFramebuffer(r.FRAMEBUFFER,w),Pe(y)?o.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,$,se,Ce.__webglTexture,0,Ne(y)):(se===r.TEXTURE_2D||se>=r.TEXTURE_CUBE_MAP_POSITIVE_X&&se<=r.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&r.framebufferTexture2D(r.FRAMEBUFFER,$,se,Ce.__webglTexture,fe),t.bindFramebuffer(r.FRAMEBUFFER,null)}function Ye(w,y,G){if(r.bindRenderbuffer(r.RENDERBUFFER,w),y.depthBuffer){let $=y.depthTexture,se=$&&$.isDepthTexture?$.type:null,fe=R(y.stencilBuffer,se),ae=y.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT;Pe(y)?o.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,Ne(y),fe,y.width,y.height):G?r.renderbufferStorageMultisample(r.RENDERBUFFER,Ne(y),fe,y.width,y.height):r.renderbufferStorage(r.RENDERBUFFER,fe,y.width,y.height),r.framebufferRenderbuffer(r.FRAMEBUFFER,ae,r.RENDERBUFFER,w)}else{let $=y.textures;for(let se=0;se<$.length;se++){let fe=$[se],ae=s.convert(fe.format,fe.colorSpace),U=s.convert(fe.type),te=x(fe.internalFormat,ae,U,fe.normalized,fe.colorSpace);Pe(y)?o.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,Ne(y),te,y.width,y.height):G?r.renderbufferStorageMultisample(r.RENDERBUFFER,Ne(y),te,y.width,y.height):r.renderbufferStorage(r.RENDERBUFFER,te,y.width,y.height)}}r.bindRenderbuffer(r.RENDERBUFFER,null)}function Se(w,y,G){let $=y.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(r.FRAMEBUFFER,w),!(y.depthTexture&&y.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let se=n.get(y.depthTexture);if(se.__renderTarget=y,(!se.__webglTexture||y.depthTexture.image.width!==y.width||y.depthTexture.image.height!==y.height)&&(y.depthTexture.image.width=y.width,y.depthTexture.image.height=y.height,y.depthTexture.needsUpdate=!0),$){if(se.__webglInit===void 0&&(se.__webglInit=!0,y.depthTexture.addEventListener("dispose",A)),se.__webglTexture===void 0){se.__webglTexture=r.createTexture(),t.bindTexture(r.TEXTURE_CUBE_MAP,se.__webglTexture),Oe(r.TEXTURE_CUBE_MAP,y.depthTexture);let Te=s.convert(y.depthTexture.format),Ce=s.convert(y.depthTexture.type),ve;y.depthTexture.format===Qi?ve=r.DEPTH_COMPONENT24:y.depthTexture.format===as&&(ve=r.DEPTH24_STENCIL8);for(let ge=0;ge<6;ge++)r.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ge,0,ve,y.width,y.height,0,Te,Ce,null)}}else Z(y.depthTexture,0);let fe=se.__webglTexture,ae=Ne(y),U=$?r.TEXTURE_CUBE_MAP_POSITIVE_X+G:r.TEXTURE_2D,te=y.depthTexture.format===as?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT;if(y.depthTexture.format===Qi)Pe(y)?o.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,te,U,fe,0,ae):r.framebufferTexture2D(r.FRAMEBUFFER,te,U,fe,0);else if(y.depthTexture.format===as)Pe(y)?o.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,te,U,fe,0,ae):r.framebufferTexture2D(r.FRAMEBUFFER,te,U,fe,0);else throw new Error("Unknown depthTexture format")}function j(w){let y=n.get(w),G=w.isWebGLCubeRenderTarget===!0;if(y.__boundDepthTexture!==w.depthTexture){let $=w.depthTexture;if(y.__depthDisposeCallback&&y.__depthDisposeCallback(),$){let se=()=>{delete y.__boundDepthTexture,delete y.__depthDisposeCallback,$.removeEventListener("dispose",se)};$.addEventListener("dispose",se),y.__depthDisposeCallback=se}y.__boundDepthTexture=$}if(w.depthTexture&&!y.__autoAllocateDepthBuffer)if(G)for(let $=0;$<6;$++)Se(y.__webglFramebuffer[$],w,$);else{let $=w.texture.mipmaps;$&&$.length>0?Se(y.__webglFramebuffer[0],w,0):Se(y.__webglFramebuffer,w,0)}else if(G){y.__webglDepthbuffer=[];for(let $=0;$<6;$++)if(t.bindFramebuffer(r.FRAMEBUFFER,y.__webglFramebuffer[$]),y.__webglDepthbuffer[$]===void 0)y.__webglDepthbuffer[$]=r.createRenderbuffer(),Ye(y.__webglDepthbuffer[$],w,!1);else{let se=w.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,fe=y.__webglDepthbuffer[$];r.bindRenderbuffer(r.RENDERBUFFER,fe),r.framebufferRenderbuffer(r.FRAMEBUFFER,se,r.RENDERBUFFER,fe)}}else{let $=w.texture.mipmaps;if($&&$.length>0?t.bindFramebuffer(r.FRAMEBUFFER,y.__webglFramebuffer[0]):t.bindFramebuffer(r.FRAMEBUFFER,y.__webglFramebuffer),y.__webglDepthbuffer===void 0)y.__webglDepthbuffer=r.createRenderbuffer(),Ye(y.__webglDepthbuffer,w,!1);else{let se=w.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,fe=y.__webglDepthbuffer;r.bindRenderbuffer(r.RENDERBUFFER,fe),r.framebufferRenderbuffer(r.FRAMEBUFFER,se,r.RENDERBUFFER,fe)}}t.bindFramebuffer(r.FRAMEBUFFER,null)}function oe(w,y,G){let $=n.get(w);y!==void 0&&Ae($.__webglFramebuffer,w,w.texture,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,0),G!==void 0&&j(w)}function re(w){let y=w.texture,G=n.get(w),$=n.get(y);w.addEventListener("dispose",v);let se=w.textures,fe=w.isWebGLCubeRenderTarget===!0,ae=se.length>1;if(ae||($.__webglTexture===void 0&&($.__webglTexture=r.createTexture()),$.__version=y.version,a.memory.textures++),fe){G.__webglFramebuffer=[];for(let U=0;U<6;U++)if(y.mipmaps&&y.mipmaps.length>0){G.__webglFramebuffer[U]=[];for(let te=0;te<y.mipmaps.length;te++)G.__webglFramebuffer[U][te]=r.createFramebuffer()}else G.__webglFramebuffer[U]=r.createFramebuffer()}else{if(y.mipmaps&&y.mipmaps.length>0){G.__webglFramebuffer=[];for(let U=0;U<y.mipmaps.length;U++)G.__webglFramebuffer[U]=r.createFramebuffer()}else G.__webglFramebuffer=r.createFramebuffer();if(ae)for(let U=0,te=se.length;U<te;U++){let Te=n.get(se[U]);Te.__webglTexture===void 0&&(Te.__webglTexture=r.createTexture(),a.memory.textures++)}if(w.samples>0&&Pe(w)===!1){G.__webglMultisampledFramebuffer=r.createFramebuffer(),G.__webglColorRenderbuffer=[],t.bindFramebuffer(r.FRAMEBUFFER,G.__webglMultisampledFramebuffer);for(let U=0;U<se.length;U++){let te=se[U];G.__webglColorRenderbuffer[U]=r.createRenderbuffer(),r.bindRenderbuffer(r.RENDERBUFFER,G.__webglColorRenderbuffer[U]);let Te=s.convert(te.format,te.colorSpace),Ce=s.convert(te.type),ve=x(te.internalFormat,Te,Ce,te.normalized,te.colorSpace,w.isXRRenderTarget===!0),ge=Ne(w);r.renderbufferStorageMultisample(r.RENDERBUFFER,ge,ve,w.width,w.height),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+U,r.RENDERBUFFER,G.__webglColorRenderbuffer[U])}r.bindRenderbuffer(r.RENDERBUFFER,null),w.depthBuffer&&(G.__webglDepthRenderbuffer=r.createRenderbuffer(),Ye(G.__webglDepthRenderbuffer,w,!0)),t.bindFramebuffer(r.FRAMEBUFFER,null)}}if(fe){t.bindTexture(r.TEXTURE_CUBE_MAP,$.__webglTexture),Oe(r.TEXTURE_CUBE_MAP,y);for(let U=0;U<6;U++)if(y.mipmaps&&y.mipmaps.length>0)for(let te=0;te<y.mipmaps.length;te++)Ae(G.__webglFramebuffer[U][te],w,y,r.COLOR_ATTACHMENT0,r.TEXTURE_CUBE_MAP_POSITIVE_X+U,te);else Ae(G.__webglFramebuffer[U],w,y,r.COLOR_ATTACHMENT0,r.TEXTURE_CUBE_MAP_POSITIVE_X+U,0);g(y)&&S(r.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(ae){for(let U=0,te=se.length;U<te;U++){let Te=se[U],Ce=n.get(Te),ve=r.TEXTURE_2D;(w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(ve=w.isWebGL3DRenderTarget?r.TEXTURE_3D:r.TEXTURE_2D_ARRAY),t.bindTexture(ve,Ce.__webglTexture),Oe(ve,Te),Ae(G.__webglFramebuffer,w,Te,r.COLOR_ATTACHMENT0+U,ve,0),g(Te)&&S(ve)}t.unbindTexture()}else{let U=r.TEXTURE_2D;if((w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(U=w.isWebGL3DRenderTarget?r.TEXTURE_3D:r.TEXTURE_2D_ARRAY),t.bindTexture(U,$.__webglTexture),Oe(U,y),y.mipmaps&&y.mipmaps.length>0)for(let te=0;te<y.mipmaps.length;te++)Ae(G.__webglFramebuffer[te],w,y,r.COLOR_ATTACHMENT0,U,te);else Ae(G.__webglFramebuffer,w,y,r.COLOR_ATTACHMENT0,U,0);g(y)&&S(U),t.unbindTexture()}w.depthBuffer&&j(w)}function B(w){let y=w.textures;for(let G=0,$=y.length;G<$;G++){let se=y[G];if(g(se)){let fe=M(w),ae=n.get(se).__webglTexture;t.bindTexture(fe,ae),S(fe),t.unbindTexture()}}}let me=[],We=[];function N(w){if(w.samples>0){if(Pe(w)===!1){let y=w.textures,G=w.width,$=w.height,se=r.COLOR_BUFFER_BIT,fe=w.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,ae=n.get(w),U=y.length>1;if(U)for(let Te=0;Te<y.length;Te++)t.bindFramebuffer(r.FRAMEBUFFER,ae.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+Te,r.RENDERBUFFER,null),t.bindFramebuffer(r.FRAMEBUFFER,ae.__webglFramebuffer),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0+Te,r.TEXTURE_2D,null,0);t.bindFramebuffer(r.READ_FRAMEBUFFER,ae.__webglMultisampledFramebuffer);let te=w.texture.mipmaps;te&&te.length>0?t.bindFramebuffer(r.DRAW_FRAMEBUFFER,ae.__webglFramebuffer[0]):t.bindFramebuffer(r.DRAW_FRAMEBUFFER,ae.__webglFramebuffer);for(let Te=0;Te<y.length;Te++){if(w.resolveDepthBuffer&&(w.depthBuffer&&(se|=r.DEPTH_BUFFER_BIT),w.stencilBuffer&&w.resolveStencilBuffer&&(se|=r.STENCIL_BUFFER_BIT)),U){r.framebufferRenderbuffer(r.READ_FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.RENDERBUFFER,ae.__webglColorRenderbuffer[Te]);let Ce=n.get(y[Te]).__webglTexture;r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,Ce,0)}r.blitFramebuffer(0,0,G,$,0,0,G,$,se,r.NEAREST),l===!0&&(me.length=0,We.length=0,me.push(r.COLOR_ATTACHMENT0+Te),w.depthBuffer&&w.resolveDepthBuffer===!1&&(me.push(fe),We.push(fe),r.invalidateFramebuffer(r.DRAW_FRAMEBUFFER,We)),r.invalidateFramebuffer(r.READ_FRAMEBUFFER,me))}if(t.bindFramebuffer(r.READ_FRAMEBUFFER,null),t.bindFramebuffer(r.DRAW_FRAMEBUFFER,null),U)for(let Te=0;Te<y.length;Te++){t.bindFramebuffer(r.FRAMEBUFFER,ae.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+Te,r.RENDERBUFFER,ae.__webglColorRenderbuffer[Te]);let Ce=n.get(y[Te]).__webglTexture;t.bindFramebuffer(r.FRAMEBUFFER,ae.__webglFramebuffer),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0+Te,r.TEXTURE_2D,Ce,0)}t.bindFramebuffer(r.DRAW_FRAMEBUFFER,ae.__webglMultisampledFramebuffer)}else if(w.depthBuffer&&w.resolveDepthBuffer===!1&&l){let y=w.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT;r.invalidateFramebuffer(r.DRAW_FRAMEBUFFER,[y])}}}function Ne(w){return Math.min(i.maxSamples,w.samples)}function Pe(w){let y=n.get(w);return w.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&y.__useRenderToTexture!==!1}function Q(w){let y=a.render.frame;u.get(w)!==y&&(u.set(w,y),w.update())}function z(w,y){let G=w.colorSpace,$=w.format,se=w.type;return w.isCompressedTexture===!0||w.isVideoTexture===!0||G!==Ro&&G!==Er&&(xt.getTransfer(G)===Tt?($!==Ri||se!==ri)&&tt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):nt("WebGLTextures: Unsupported texture color space:",G)),y}function Me(w){return typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement?(c.width=w.naturalWidth||w.width,c.height=w.naturalHeight||w.height):typeof VideoFrame<"u"&&w instanceof VideoFrame?(c.width=w.displayWidth,c.height=w.displayHeight):(c.width=w.width,c.height=w.height),c}this.allocateTextureUnit=O,this.resetTextureUnits=H,this.getTextureUnits=V,this.setTextureUnits=D,this.setTexture2D=Z,this.setTexture2DArray=ee,this.setTexture3D=L,this.setTextureCube=ie,this.rebindTextures=oe,this.setupRenderTarget=re,this.updateRenderTargetMipmap=B,this.updateMultisampleRenderTarget=N,this.setupDepthRenderbuffer=j,this.setupFrameBufferTexture=Ae,this.useMultisampledRTT=Pe,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function r1(r,e){function t(n,i=Er){let s,a=xt.getTransfer(i);if(n===ri)return r.UNSIGNED_BYTE;if(n===lu)return r.UNSIGNED_SHORT_4_4_4_4;if(n===cu)return r.UNSIGNED_SHORT_5_5_5_1;if(n===Xf)return r.UNSIGNED_INT_5_9_9_9_REV;if(n===qf)return r.UNSIGNED_INT_10F_11F_11F_REV;if(n===Gf)return r.BYTE;if(n===Wf)return r.SHORT;if(n===za)return r.UNSIGNED_SHORT;if(n===ou)return r.INT;if(n===Hi)return r.UNSIGNED_INT;if(n===Gi)return r.FLOAT;if(n===gi)return r.HALF_FLOAT;if(n===Yf)return r.ALPHA;if(n===Zf)return r.RGB;if(n===Ri)return r.RGBA;if(n===Qi)return r.DEPTH_COMPONENT;if(n===as)return r.DEPTH_STENCIL;if(n===Jf)return r.RED;if(n===uu)return r.RED_INTEGER;if(n===os)return r.RG;if(n===hu)return r.RG_INTEGER;if(n===fu)return r.RGBA_INTEGER;if(n===Qo||n===jo||n===el||n===tl)if(a===Tt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===Qo)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===jo)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===el)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===tl)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===Qo)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===jo)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===el)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===tl)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===du||n===pu||n===mu||n===gu)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===du)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===pu)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===mu)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===gu)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===_u||n===xu||n===vu||n===yu||n===Su||n===nl||n===Mu)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(n===_u||n===xu)return a===Tt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===vu)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC;if(n===yu)return s.COMPRESSED_R11_EAC;if(n===Su)return s.COMPRESSED_SIGNED_R11_EAC;if(n===nl)return s.COMPRESSED_RG11_EAC;if(n===Mu)return s.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===bu||n===Tu||n===Eu||n===wu||n===Au||n===Cu||n===Ru||n===Pu||n===Iu||n===Du||n===Lu||n===Uu||n===Nu||n===Fu)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(n===bu)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Tu)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Eu)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===wu)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Au)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Cu)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Ru)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Pu)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Iu)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Du)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Lu)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Uu)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Nu)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Fu)return a===Tt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Ou||n===Bu||n===ku)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(n===Ou)return a===Tt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Bu)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===ku)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===zu||n===Vu||n===il||n===Hu)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(n===zu)return s.COMPRESSED_RED_RGTC1_EXT;if(n===Vu)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===il)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Hu)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Va?r.UNSIGNED_INT_24_8:r[n]!==void 0?r[n]:null}return{convert:t}}var s1=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,a1=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,_d=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Bo(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new en({vertexShader:s1,fragmentShader:a1,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new vt(new ln(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},xd=class extends ji{constructor(e,t){super();let n=this,i=null,s=1,a=null,o="local-floor",l=1,c=null,u=null,d=null,h=null,f=null,m=null,_=typeof XRWebGLBinding<"u",p=new _d,g={},S=t.getContextAttributes(),M=null,x=null,R=[],E=[],A=new we,v=null,b=new Sn;b.viewport=new Gt;let P=new Sn;P.viewport=new Gt;let C=[b,P],I=new iu,H=null,V=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let le=R[K];return le===void 0&&(le=new Da,R[K]=le),le.getTargetRaySpace()},this.getControllerGrip=function(K){let le=R[K];return le===void 0&&(le=new Da,R[K]=le),le.getGripSpace()},this.getHand=function(K){let le=R[K];return le===void 0&&(le=new Da,R[K]=le),le.getHandSpace()};function D(K){let le=E.indexOf(K.inputSource);if(le===-1)return;let ue=R[le];ue!==void 0&&(ue.update(K.inputSource,K.frame,c||a),ue.dispatchEvent({type:K.type,data:K.inputSource}))}function O(){i.removeEventListener("select",D),i.removeEventListener("selectstart",D),i.removeEventListener("selectend",D),i.removeEventListener("squeeze",D),i.removeEventListener("squeezestart",D),i.removeEventListener("squeezeend",D),i.removeEventListener("end",O),i.removeEventListener("inputsourceschange",F);for(let K=0;K<R.length;K++){let le=E[K];le!==null&&(E[K]=null,R[K].disconnect(le))}H=null,V=null,p.reset();for(let K in g)delete g[K];e.setRenderTarget(M),f=null,h=null,d=null,i=null,x=null,Oe.stop(),n.isPresenting=!1,e.setPixelRatio(v),e.setSize(A.width,A.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){s=K,n.isPresenting===!0&&tt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){o=K,n.isPresenting===!0&&tt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(K){c=K},this.getBaseLayer=function(){return h!==null?h:f},this.getBinding=function(){return d===null&&_&&(d=new XRWebGLBinding(i,t)),d},this.getFrame=function(){return m},this.getSession=function(){return i},this.setSession=async function(K){if(i=K,i!==null){if(M=e.getRenderTarget(),i.addEventListener("select",D),i.addEventListener("selectstart",D),i.addEventListener("selectend",D),i.addEventListener("squeeze",D),i.addEventListener("squeezestart",D),i.addEventListener("squeezeend",D),i.addEventListener("end",O),i.addEventListener("inputsourceschange",F),S.xrCompatible!==!0&&await t.makeXRCompatible(),v=e.getPixelRatio(),e.getSize(A),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let ue=null,Ee=null,He=null;S.depth&&(He=S.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ue=S.stencil?as:Qi,Ee=S.stencil?Va:Hi);let Ae={colorFormat:t.RGBA8,depthFormat:He,scaleFactor:s};d=this.getBinding(),h=d.createProjectionLayer(Ae),i.updateRenderState({layers:[h]}),e.setPixelRatio(1),e.setSize(h.textureWidth,h.textureHeight,!1),x=new Tn(h.textureWidth,h.textureHeight,{format:Ri,type:ri,depthTexture:new br(h.textureWidth,h.textureHeight,Ee,void 0,void 0,void 0,void 0,void 0,void 0,ue),stencilBuffer:S.stencil,colorSpace:e.outputColorSpace,samples:S.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}else{let ue={antialias:S.antialias,alpha:!0,depth:S.depth,stencil:S.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(i,t,ue),i.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),x=new Tn(f.framebufferWidth,f.framebufferHeight,{format:Ri,type:ri,colorSpace:e.outputColorSpace,stencilBuffer:S.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}x.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await i.requestReferenceSpace(o),Oe.setContext(i),Oe.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function F(K){for(let le=0;le<K.removed.length;le++){let ue=K.removed[le],Ee=E.indexOf(ue);Ee>=0&&(E[Ee]=null,R[Ee].disconnect(ue))}for(let le=0;le<K.added.length;le++){let ue=K.added[le],Ee=E.indexOf(ue);if(Ee===-1){for(let Ae=0;Ae<R.length;Ae++)if(Ae>=E.length){E.push(ue),Ee=Ae;break}else if(E[Ae]===null){E[Ae]=ue,Ee=Ae;break}if(Ee===-1)break}let He=R[Ee];He&&He.connect(ue)}}let Z=new W,ee=new W;function L(K,le,ue){Z.setFromMatrixPosition(le.matrixWorld),ee.setFromMatrixPosition(ue.matrixWorld);let Ee=Z.distanceTo(ee),He=le.projectionMatrix.elements,Ae=ue.projectionMatrix.elements,Ye=He[14]/(He[10]-1),Se=He[14]/(He[10]+1),j=(He[9]+1)/He[5],oe=(He[9]-1)/He[5],re=(He[8]-1)/He[0],B=(Ae[8]+1)/Ae[0],me=Ye*re,We=Ye*B,N=Ee/(-re+B),Ne=N*-re;if(le.matrixWorld.decompose(K.position,K.quaternion,K.scale),K.translateX(Ne),K.translateZ(N),K.matrixWorld.compose(K.position,K.quaternion,K.scale),K.matrixWorldInverse.copy(K.matrixWorld).invert(),He[10]===-1)K.projectionMatrix.copy(le.projectionMatrix),K.projectionMatrixInverse.copy(le.projectionMatrixInverse);else{let Pe=Ye+N,Q=Se+N,z=me-Ne,Me=We+(Ee-Ne),w=j*Se/Q*Pe,y=oe*Se/Q*Pe;K.projectionMatrix.makePerspective(z,Me,w,y,Pe,Q),K.projectionMatrixInverse.copy(K.projectionMatrix).invert()}}function ie(K,le){le===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(le.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(i===null)return;let le=K.near,ue=K.far;p.texture!==null&&(p.depthNear>0&&(le=p.depthNear),p.depthFar>0&&(ue=p.depthFar)),I.near=P.near=b.near=le,I.far=P.far=b.far=ue,(H!==I.near||V!==I.far)&&(i.updateRenderState({depthNear:I.near,depthFar:I.far}),H=I.near,V=I.far),I.layers.mask=K.layers.mask|6,b.layers.mask=I.layers.mask&-5,P.layers.mask=I.layers.mask&-3;let Ee=K.parent,He=I.cameras;ie(I,Ee);for(let Ae=0;Ae<He.length;Ae++)ie(He[Ae],Ee);He.length===2?L(I,b,P):I.projectionMatrix.copy(b.projectionMatrix),ye(K,I,Ee)};function ye(K,le,ue){ue===null?K.matrix.copy(le.matrixWorld):(K.matrix.copy(ue.matrixWorld),K.matrix.invert(),K.matrix.multiply(le.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(le.projectionMatrix),K.projectionMatrixInverse.copy(le.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=Pa*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return I},this.getFoveation=function(){if(!(h===null&&f===null))return l},this.setFoveation=function(K){l=K,h!==null&&(h.fixedFoveation=K),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=K)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(I)},this.getCameraTexture=function(K){return g[K]};let Fe=null;function ze(K,le){if(u=le.getViewerPose(c||a),m=le,u!==null){let ue=u.views;f!==null&&(e.setRenderTargetFramebuffer(x,f.framebuffer),e.setRenderTarget(x));let Ee=!1;ue.length!==I.cameras.length&&(I.cameras.length=0,Ee=!0);for(let Se=0;Se<ue.length;Se++){let j=ue[Se],oe=null;if(f!==null)oe=f.getViewport(j);else{let B=d.getViewSubImage(h,j);oe=B.viewport,Se===0&&(e.setRenderTargetTextures(x,B.colorTexture,B.depthStencilTexture),e.setRenderTarget(x))}let re=C[Se];re===void 0&&(re=new Sn,re.layers.enable(Se),re.viewport=new Gt,C[Se]=re),re.matrix.fromArray(j.transform.matrix),re.matrix.decompose(re.position,re.quaternion,re.scale),re.projectionMatrix.fromArray(j.projectionMatrix),re.projectionMatrixInverse.copy(re.projectionMatrix).invert(),re.viewport.set(oe.x,oe.y,oe.width,oe.height),Se===0&&(I.matrix.copy(re.matrix),I.matrix.decompose(I.position,I.quaternion,I.scale)),Ee===!0&&I.cameras.push(re)}let He=i.enabledFeatures;if(He&&He.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&_){d=n.getBinding();let Se=d.getDepthInformation(ue[0]);Se&&Se.isValid&&Se.texture&&p.init(Se,i.renderState)}if(He&&He.includes("camera-access")&&_){e.state.unbindTexture(),d=n.getBinding();for(let Se=0;Se<ue.length;Se++){let j=ue[Se].camera;if(j){let oe=g[j];oe||(oe=new Bo,g[j]=oe);let re=d.getCameraImage(j);oe.sourceTexture=re}}}}for(let ue=0;ue<R.length;ue++){let Ee=E[ue],He=R[ue];Ee!==null&&He!==void 0&&He.update(Ee,le,c||a)}Fe&&Fe(K,le),le.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:le}),m=null}let Oe=new Pg;Oe.setAnimationLoop(ze),this.setAnimationLoop=function(K){Fe=K},this.dispose=function(){}}},o1=new Ut,Fg=new st;Fg.set(-1,0,0,0,1,0,0,0,1);function l1(r,e){function t(p,g){p.matrixAutoUpdate===!0&&p.updateMatrix(),g.value.copy(p.matrix)}function n(p,g){g.color.getRGB(p.fogColor.value,ed(r)),g.isFog?(p.fogNear.value=g.near,p.fogFar.value=g.far):g.isFogExp2&&(p.fogDensity.value=g.density)}function i(p,g,S,M,x){g.isNodeMaterial?g.uniformsNeedUpdate=!1:g.isMeshBasicMaterial?s(p,g):g.isMeshLambertMaterial?(s(p,g),g.envMap&&(p.envMapIntensity.value=g.envMapIntensity)):g.isMeshToonMaterial?(s(p,g),d(p,g)):g.isMeshPhongMaterial?(s(p,g),u(p,g),g.envMap&&(p.envMapIntensity.value=g.envMapIntensity)):g.isMeshStandardMaterial?(s(p,g),h(p,g),g.isMeshPhysicalMaterial&&f(p,g,x)):g.isMeshMatcapMaterial?(s(p,g),m(p,g)):g.isMeshDepthMaterial?s(p,g):g.isMeshDistanceMaterial?(s(p,g),_(p,g)):g.isMeshNormalMaterial?s(p,g):g.isLineBasicMaterial?(a(p,g),g.isLineDashedMaterial&&o(p,g)):g.isPointsMaterial?l(p,g,S,M):g.isSpriteMaterial?c(p,g):g.isShadowMaterial?(p.color.value.copy(g.color),p.opacity.value=g.opacity):g.isShaderMaterial&&(g.uniformsNeedUpdate=!1)}function s(p,g){p.opacity.value=g.opacity,g.color&&p.diffuse.value.copy(g.color),g.emissive&&p.emissive.value.copy(g.emissive).multiplyScalar(g.emissiveIntensity),g.map&&(p.map.value=g.map,t(g.map,p.mapTransform)),g.alphaMap&&(p.alphaMap.value=g.alphaMap,t(g.alphaMap,p.alphaMapTransform)),g.bumpMap&&(p.bumpMap.value=g.bumpMap,t(g.bumpMap,p.bumpMapTransform),p.bumpScale.value=g.bumpScale,g.side===Yn&&(p.bumpScale.value*=-1)),g.normalMap&&(p.normalMap.value=g.normalMap,t(g.normalMap,p.normalMapTransform),p.normalScale.value.copy(g.normalScale),g.side===Yn&&p.normalScale.value.negate()),g.displacementMap&&(p.displacementMap.value=g.displacementMap,t(g.displacementMap,p.displacementMapTransform),p.displacementScale.value=g.displacementScale,p.displacementBias.value=g.displacementBias),g.emissiveMap&&(p.emissiveMap.value=g.emissiveMap,t(g.emissiveMap,p.emissiveMapTransform)),g.specularMap&&(p.specularMap.value=g.specularMap,t(g.specularMap,p.specularMapTransform)),g.alphaTest>0&&(p.alphaTest.value=g.alphaTest);let S=e.get(g),M=S.envMap,x=S.envMapRotation;M&&(p.envMap.value=M,p.envMapRotation.value.setFromMatrix4(o1.makeRotationFromEuler(x)).transpose(),M.isCubeTexture&&M.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(Fg),p.reflectivity.value=g.reflectivity,p.ior.value=g.ior,p.refractionRatio.value=g.refractionRatio),g.lightMap&&(p.lightMap.value=g.lightMap,p.lightMapIntensity.value=g.lightMapIntensity,t(g.lightMap,p.lightMapTransform)),g.aoMap&&(p.aoMap.value=g.aoMap,p.aoMapIntensity.value=g.aoMapIntensity,t(g.aoMap,p.aoMapTransform))}function a(p,g){p.diffuse.value.copy(g.color),p.opacity.value=g.opacity,g.map&&(p.map.value=g.map,t(g.map,p.mapTransform))}function o(p,g){p.dashSize.value=g.dashSize,p.totalSize.value=g.dashSize+g.gapSize,p.scale.value=g.scale}function l(p,g,S,M){p.diffuse.value.copy(g.color),p.opacity.value=g.opacity,p.size.value=g.size*S,p.scale.value=M*.5,g.map&&(p.map.value=g.map,t(g.map,p.uvTransform)),g.alphaMap&&(p.alphaMap.value=g.alphaMap,t(g.alphaMap,p.alphaMapTransform)),g.alphaTest>0&&(p.alphaTest.value=g.alphaTest)}function c(p,g){p.diffuse.value.copy(g.color),p.opacity.value=g.opacity,p.rotation.value=g.rotation,g.map&&(p.map.value=g.map,t(g.map,p.mapTransform)),g.alphaMap&&(p.alphaMap.value=g.alphaMap,t(g.alphaMap,p.alphaMapTransform)),g.alphaTest>0&&(p.alphaTest.value=g.alphaTest)}function u(p,g){p.specular.value.copy(g.specular),p.shininess.value=Math.max(g.shininess,1e-4)}function d(p,g){g.gradientMap&&(p.gradientMap.value=g.gradientMap)}function h(p,g){p.metalness.value=g.metalness,g.metalnessMap&&(p.metalnessMap.value=g.metalnessMap,t(g.metalnessMap,p.metalnessMapTransform)),p.roughness.value=g.roughness,g.roughnessMap&&(p.roughnessMap.value=g.roughnessMap,t(g.roughnessMap,p.roughnessMapTransform)),g.envMap&&(p.envMapIntensity.value=g.envMapIntensity)}function f(p,g,S){p.ior.value=g.ior,g.sheen>0&&(p.sheenColor.value.copy(g.sheenColor).multiplyScalar(g.sheen),p.sheenRoughness.value=g.sheenRoughness,g.sheenColorMap&&(p.sheenColorMap.value=g.sheenColorMap,t(g.sheenColorMap,p.sheenColorMapTransform)),g.sheenRoughnessMap&&(p.sheenRoughnessMap.value=g.sheenRoughnessMap,t(g.sheenRoughnessMap,p.sheenRoughnessMapTransform))),g.clearcoat>0&&(p.clearcoat.value=g.clearcoat,p.clearcoatRoughness.value=g.clearcoatRoughness,g.clearcoatMap&&(p.clearcoatMap.value=g.clearcoatMap,t(g.clearcoatMap,p.clearcoatMapTransform)),g.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=g.clearcoatRoughnessMap,t(g.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),g.clearcoatNormalMap&&(p.clearcoatNormalMap.value=g.clearcoatNormalMap,t(g.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(g.clearcoatNormalScale),g.side===Yn&&p.clearcoatNormalScale.value.negate())),g.dispersion>0&&(p.dispersion.value=g.dispersion),g.iridescence>0&&(p.iridescence.value=g.iridescence,p.iridescenceIOR.value=g.iridescenceIOR,p.iridescenceThicknessMinimum.value=g.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=g.iridescenceThicknessRange[1],g.iridescenceMap&&(p.iridescenceMap.value=g.iridescenceMap,t(g.iridescenceMap,p.iridescenceMapTransform)),g.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=g.iridescenceThicknessMap,t(g.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),g.transmission>0&&(p.transmission.value=g.transmission,p.transmissionSamplerMap.value=S.texture,p.transmissionSamplerSize.value.set(S.width,S.height),g.transmissionMap&&(p.transmissionMap.value=g.transmissionMap,t(g.transmissionMap,p.transmissionMapTransform)),p.thickness.value=g.thickness,g.thicknessMap&&(p.thicknessMap.value=g.thicknessMap,t(g.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=g.attenuationDistance,p.attenuationColor.value.copy(g.attenuationColor)),g.anisotropy>0&&(p.anisotropyVector.value.set(g.anisotropy*Math.cos(g.anisotropyRotation),g.anisotropy*Math.sin(g.anisotropyRotation)),g.anisotropyMap&&(p.anisotropyMap.value=g.anisotropyMap,t(g.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=g.specularIntensity,p.specularColor.value.copy(g.specularColor),g.specularColorMap&&(p.specularColorMap.value=g.specularColorMap,t(g.specularColorMap,p.specularColorMapTransform)),g.specularIntensityMap&&(p.specularIntensityMap.value=g.specularIntensityMap,t(g.specularIntensityMap,p.specularIntensityMapTransform))}function m(p,g){g.matcap&&(p.matcap.value=g.matcap)}function _(p,g){let S=e.get(g).light;p.referencePosition.value.setFromMatrixPosition(S.matrixWorld),p.nearDistance.value=S.shadow.camera.near,p.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function c1(r,e,t,n){let i={},s={},a=[],o=r.getParameter(r.MAX_UNIFORM_BUFFER_BINDINGS);function l(S,M){let x=M.program;n.uniformBlockBinding(S,x)}function c(S,M){let x=i[S.id];x===void 0&&(m(S),x=u(S),i[S.id]=x,S.addEventListener("dispose",p));let R=M.program;n.updateUBOMapping(S,R);let E=e.render.frame;s[S.id]!==E&&(h(S),s[S.id]=E)}function u(S){let M=d();S.__bindingPointIndex=M;let x=r.createBuffer(),R=S.__size,E=S.usage;return r.bindBuffer(r.UNIFORM_BUFFER,x),r.bufferData(r.UNIFORM_BUFFER,R,E),r.bindBuffer(r.UNIFORM_BUFFER,null),r.bindBufferBase(r.UNIFORM_BUFFER,M,x),x}function d(){for(let S=0;S<o;S++)if(a.indexOf(S)===-1)return a.push(S),S;return nt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(S){let M=i[S.id],x=S.uniforms,R=S.__cache;r.bindBuffer(r.UNIFORM_BUFFER,M);for(let E=0,A=x.length;E<A;E++){let v=Array.isArray(x[E])?x[E]:[x[E]];for(let b=0,P=v.length;b<P;b++){let C=v[b];if(f(C,E,b,R)===!0){let I=C.__offset,H=Array.isArray(C.value)?C.value:[C.value],V=0;for(let D=0;D<H.length;D++){let O=H[D],F=_(O);typeof O=="number"||typeof O=="boolean"?(C.__data[0]=O,r.bufferSubData(r.UNIFORM_BUFFER,I+V,C.__data)):O.isMatrix3?(C.__data[0]=O.elements[0],C.__data[1]=O.elements[1],C.__data[2]=O.elements[2],C.__data[3]=0,C.__data[4]=O.elements[3],C.__data[5]=O.elements[4],C.__data[6]=O.elements[5],C.__data[7]=0,C.__data[8]=O.elements[6],C.__data[9]=O.elements[7],C.__data[10]=O.elements[8],C.__data[11]=0):ArrayBuffer.isView(O)?C.__data.set(new O.constructor(O.buffer,O.byteOffset,C.__data.length)):(O.toArray(C.__data,V),V+=F.storage/Float32Array.BYTES_PER_ELEMENT)}r.bufferSubData(r.UNIFORM_BUFFER,I,C.__data)}}}r.bindBuffer(r.UNIFORM_BUFFER,null)}function f(S,M,x,R){let E=S.value,A=M+"_"+x;if(R[A]===void 0)return typeof E=="number"||typeof E=="boolean"?R[A]=E:ArrayBuffer.isView(E)?R[A]=E.slice():R[A]=E.clone(),!0;{let v=R[A];if(typeof E=="number"||typeof E=="boolean"){if(v!==E)return R[A]=E,!0}else{if(ArrayBuffer.isView(E))return!0;if(v.equals(E)===!1)return v.copy(E),!0}}return!1}function m(S){let M=S.uniforms,x=0,R=16;for(let A=0,v=M.length;A<v;A++){let b=Array.isArray(M[A])?M[A]:[M[A]];for(let P=0,C=b.length;P<C;P++){let I=b[P],H=Array.isArray(I.value)?I.value:[I.value];for(let V=0,D=H.length;V<D;V++){let O=H[V],F=_(O),Z=x%R,ee=Z%F.boundary,L=Z+ee;x+=ee,L!==0&&R-L<F.storage&&(x+=R-L),I.__data=new Float32Array(F.storage/Float32Array.BYTES_PER_ELEMENT),I.__offset=x,x+=F.storage}}}let E=x%R;return E>0&&(x+=R-E),S.__size=x,S.__cache={},this}function _(S){let M={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(M.boundary=4,M.storage=4):S.isVector2?(M.boundary=8,M.storage=8):S.isVector3||S.isColor?(M.boundary=16,M.storage=12):S.isVector4?(M.boundary=16,M.storage=16):S.isMatrix3?(M.boundary=48,M.storage=48):S.isMatrix4?(M.boundary=64,M.storage=64):S.isTexture?tt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(S)?(M.boundary=16,M.storage=S.byteLength):tt("WebGLRenderer: Unsupported uniform value type.",S),M}function p(S){let M=S.target;M.removeEventListener("dispose",p);let x=a.indexOf(M.__bindingPointIndex);a.splice(x,1),r.deleteBuffer(i[M.id]),delete i[M.id],delete s[M.id]}function g(){for(let S in i)r.deleteBuffer(i[S]);a=[],i={},s={}}return{bind:l,update:c,dispose:g}}var u1=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),ir=null;function h1(){return ir===null&&(ir=new Pc(u1,16,16,os,gi),ir.name="DFG_LUT",ir.minFilter=Ft,ir.magFilter=Ft,ir.wrapS=Ki,ir.wrapT=Ki,ir.generateMipmaps=!1,ir.needsUpdate=!0),ir}var Ju=class{constructor(e={}){let{canvas:t=Km(),context:n=null,depth:i=!0,stencil:s=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:h=!1,outputBufferType:f=ri}=e;this.isWebGLRenderer=!0;let m;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=n.getContextAttributes().alpha}else m=a;let _=f,p=new Set([fu,hu,uu]),g=new Set([ri,Hi,za,Va,lu,cu]),S=new Uint32Array(4),M=new Int32Array(4),x=new W,R=null,E=null,A=[],v=[],b=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Vi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let P=this,C=!1,I=null;this._outputColorSpace=Vt;let H=0,V=0,D=null,O=-1,F=null,Z=new Gt,ee=new Gt,L=null,ie=new qe(0),ye=0,Fe=t.width,ze=t.height,Oe=1,K=null,le=null,ue=new Gt(0,0,Fe,ze),Ee=new Gt(0,0,Fe,ze),He=!1,Ae=new La,Ye=!1,Se=!1,j=new Ut,oe=new W,re=new Gt,B={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},me=!1;function We(){return D===null?Oe:1}let N=n;function Ne(T,X){return t.getContext(T,X)}try{let T={alpha:!0,depth:i,stencil:s,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${"184"}`),t.addEventListener("webglcontextlost",ce,!1),t.addEventListener("webglcontextrestored",de,!1),t.addEventListener("webglcontextcreationerror",_e,!1),N===null){let X="webgl2";if(N=Ne(X,T),N===null)throw Ne(X)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(T){throw nt("WebGLRenderer: "+T.message),T}let Pe,Q,z,Me,w,y,G,$,se,fe,ae,U,te,Te,Ce,ve,ge,be,Qe,it,k,pe,ne;function Ie(){Pe=new xM(N),Pe.init(),k=new r1(N,Pe),Q=new uM(N,Pe,e,k),z=new n1(N,Pe),Q.reversedDepthBuffer&&h&&z.buffers.depth.setReversed(!0),Me=new SM(N),w=new Hb,y=new i1(N,Pe,z,w,Q,k,Me),G=new _M(P),$=new Ev(N),pe=new lM(N,$),se=new vM(N,$,Me,pe),fe=new bM(N,se,$,pe,Me),be=new MM(N,Q,y),Ce=new hM(w),ae=new Vb(P,G,Pe,Q,pe,Ce),U=new l1(P,w),te=new Wb,Te=new $b(Pe),ge=new oM(P,G,z,fe,m,l),ve=new t1(P,fe,Q),ne=new c1(N,Me,Q,z),Qe=new cM(N,Pe,Me),it=new yM(N,Pe,Me),Me.programs=ae.programs,P.capabilities=Q,P.extensions=Pe,P.properties=w,P.renderLists=te,P.shadowMap=ve,P.state=z,P.info=Me}Ie(),_!==ri&&(b=new EM(_,t.width,t.height,i,s));let xe=new xd(P,N);this.xr=xe,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){let T=Pe.get("WEBGL_lose_context");T&&T.loseContext()},this.forceContextRestore=function(){let T=Pe.get("WEBGL_lose_context");T&&T.restoreContext()},this.getPixelRatio=function(){return Oe},this.setPixelRatio=function(T){T!==void 0&&(Oe=T,this.setSize(Fe,ze,!1))},this.getSize=function(T){return T.set(Fe,ze)},this.setSize=function(T,X,J=!0){if(xe.isPresenting){tt("WebGLRenderer: Can't change size while VR device is presenting.");return}Fe=T,ze=X,t.width=Math.floor(T*Oe),t.height=Math.floor(X*Oe),J===!0&&(t.style.width=T+"px",t.style.height=X+"px"),b!==null&&b.setSize(t.width,t.height),this.setViewport(0,0,T,X)},this.getDrawingBufferSize=function(T){return T.set(Fe*Oe,ze*Oe).floor()},this.setDrawingBufferSize=function(T,X,J){Fe=T,ze=X,Oe=J,t.width=Math.floor(T*J),t.height=Math.floor(X*J),this.setViewport(0,0,T,X)},this.setEffects=function(T){if(_===ri){nt("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(T){for(let X=0;X<T.length;X++)if(T[X].isOutputPass===!0){tt("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}b.setEffects(T||[])},this.getCurrentViewport=function(T){return T.copy(Z)},this.getViewport=function(T){return T.copy(ue)},this.setViewport=function(T,X,J,q){T.isVector4?ue.set(T.x,T.y,T.z,T.w):ue.set(T,X,J,q),z.viewport(Z.copy(ue).multiplyScalar(Oe).round())},this.getScissor=function(T){return T.copy(Ee)},this.setScissor=function(T,X,J,q){T.isVector4?Ee.set(T.x,T.y,T.z,T.w):Ee.set(T,X,J,q),z.scissor(ee.copy(Ee).multiplyScalar(Oe).round())},this.getScissorTest=function(){return He},this.setScissorTest=function(T){z.setScissorTest(He=T)},this.setOpaqueSort=function(T){K=T},this.setTransparentSort=function(T){le=T},this.getClearColor=function(T){return T.copy(ge.getClearColor())},this.setClearColor=function(){ge.setClearColor(...arguments)},this.getClearAlpha=function(){return ge.getClearAlpha()},this.setClearAlpha=function(){ge.setClearAlpha(...arguments)},this.clear=function(T=!0,X=!0,J=!0){let q=0;if(T){let Y=!1;if(D!==null){let Re=D.texture.format;Y=p.has(Re)}if(Y){let Re=D.texture.type,De=g.has(Re),Ue=ge.getClearColor(),Xe=ge.getClearAlpha(),Ze=Ue.r,lt=Ue.g,dt=Ue.b;De?(S[0]=Ze,S[1]=lt,S[2]=dt,S[3]=Xe,N.clearBufferuiv(N.COLOR,0,S)):(M[0]=Ze,M[1]=lt,M[2]=dt,M[3]=Xe,N.clearBufferiv(N.COLOR,0,M))}else q|=N.COLOR_BUFFER_BIT}X&&(q|=N.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),J&&(q|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),q!==0&&N.clear(q)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(T){T.setRenderer(this),I=T},this.dispose=function(){t.removeEventListener("webglcontextlost",ce,!1),t.removeEventListener("webglcontextrestored",de,!1),t.removeEventListener("webglcontextcreationerror",_e,!1),ge.dispose(),te.dispose(),Te.dispose(),w.dispose(),G.dispose(),fe.dispose(),pe.dispose(),ne.dispose(),ae.dispose(),xe.dispose(),xe.removeEventListener("sessionstart",ut),xe.removeEventListener("sessionend",St),et.stop()};function ce(T){T.preventDefault(),Kf("WebGLRenderer: Context Lost."),C=!0}function de(){Kf("WebGLRenderer: Context Restored."),C=!1;let T=Me.autoReset,X=ve.enabled,J=ve.autoUpdate,q=ve.needsUpdate,Y=ve.type;Ie(),Me.autoReset=T,ve.enabled=X,ve.autoUpdate=J,ve.needsUpdate=q,ve.type=Y}function _e(T){nt("WebGLRenderer: A WebGL context could not be created. Reason: ",T.statusMessage)}function Je(T){let X=T.target;X.removeEventListener("dispose",Je),he(X)}function he(T){Ke(T),w.remove(T)}function Ke(T){let X=w.get(T).programs;X!==void 0&&(X.forEach(function(J){ae.releaseProgram(J)}),T.isShaderMaterial&&ae.releaseShaderCache(T))}this.renderBufferDirect=function(T,X,J,q,Y,Re){X===null&&(X=B);let De=Y.isMesh&&Y.matrixWorld.determinant()<0,Ue=xn(T,X,J,q,Y);z.setMaterial(q,De);let Xe=J.index,Ze=1;if(q.wireframe===!0){if(Xe=se.getWireframeAttribute(J),Xe===void 0)return;Ze=2}let lt=J.drawRange,dt=J.attributes.position,$e=lt.start*Ze,At=(lt.start+lt.count)*Ze;Re!==null&&($e=Math.max($e,Re.start*Ze),At=Math.min(At,(Re.start+Re.count)*Ze)),Xe!==null?($e=Math.max($e,0),At=Math.min(At,Xe.count)):dt!=null&&($e=Math.max($e,0),At=Math.min(At,dt.count));let Qt=At-$e;if(Qt<0||Qt===1/0)return;pe.setup(Y,q,Ue,J,Xe);let Yt,Ct=Qe;if(Xe!==null&&(Yt=$.get(Xe),Ct=it,Ct.setIndex(Yt)),Y.isMesh)q.wireframe===!0?(z.setLineWidth(q.wireframeLinewidth*We()),Ct.setMode(N.LINES)):Ct.setMode(N.TRIANGLES);else if(Y.isLine){let Dn=q.linewidth;Dn===void 0&&(Dn=1),z.setLineWidth(Dn*We()),Y.isLineSegments?Ct.setMode(N.LINES):Y.isLineLoop?Ct.setMode(N.LINE_LOOP):Ct.setMode(N.LINE_STRIP)}else Y.isPoints?Ct.setMode(N.POINTS):Y.isSprite&&Ct.setMode(N.TRIANGLES);if(Y.isBatchedMesh)if(Pe.get("WEBGL_multi_draw"))Ct.renderMultiDraw(Y._multiDrawStarts,Y._multiDrawCounts,Y._multiDrawCount);else{let Dn=Y._multiDrawStarts,ke=Y._multiDrawCounts,hi=Y._multiDrawCount,Mt=Xe?$.get(Xe).bytesPerElement:1,Ai=w.get(q).currentProgram.getUniforms();for(let Zi=0;Zi<hi;Zi++)Ai.setValue(N,"_gl_DrawID",Zi),Ct.render(Dn[Zi]/Mt,ke[Zi])}else if(Y.isInstancedMesh)Ct.renderInstances($e,Qt,Y.count);else if(J.isInstancedBufferGeometry){let Dn=J._maxInstanceCount!==void 0?J._maxInstanceCount:1/0,ke=Math.min(J.instanceCount,Dn);Ct.renderInstances($e,Qt,ke)}else Ct.render($e,Qt)};function Ve(T,X,J){T.transparent===!0&&T.side===Bt&&T.forceSinglePass===!1?(T.side=Yn,T.needsUpdate=!0,_n(T,X,J),T.side=yr,T.needsUpdate=!0,_n(T,X,J),T.side=Bt):_n(T,X,J)}this.compile=function(T,X,J=null){J===null&&(J=T),E=Te.get(J),E.init(X),v.push(E),J.traverseVisible(function(Y){Y.isLight&&Y.layers.test(X.layers)&&(E.pushLight(Y),Y.castShadow&&E.pushShadow(Y))}),T!==J&&T.traverseVisible(function(Y){Y.isLight&&Y.layers.test(X.layers)&&(E.pushLight(Y),Y.castShadow&&E.pushShadow(Y))}),E.setupLights();let q=new Set;return T.traverse(function(Y){if(!(Y.isMesh||Y.isPoints||Y.isLine||Y.isSprite))return;let Re=Y.material;if(Re)if(Array.isArray(Re))for(let De=0;De<Re.length;De++){let Ue=Re[De];Ve(Ue,J,Y),q.add(Ue)}else Ve(Re,J,Y),q.add(Re)}),E=v.pop(),q},this.compileAsync=function(T,X,J=null){let q=this.compile(T,X,J);return new Promise(Y=>{function Re(){if(q.forEach(function(De){w.get(De).currentProgram.isReady()&&q.delete(De)}),q.size===0){Y(T);return}setTimeout(Re,10)}Pe.get("KHR_parallel_shader_compile")!==null?Re():setTimeout(Re,10)})};let je=null;function Ot(T){je&&je(T)}function ut(){et.stop()}function St(){et.start()}let et=new Pg;et.setAnimationLoop(Ot),typeof self<"u"&&et.setContext(self),this.setAnimationLoop=function(T){je=T,xe.setAnimationLoop(T),T===null?et.stop():et.start()},xe.addEventListener("sessionstart",ut),xe.addEventListener("sessionend",St),this.render=function(T,X){if(X!==void 0&&X.isCamera!==!0){nt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(C===!0)return;I!==null&&I.renderStart(T,X);let J=xe.enabled===!0&&xe.isPresenting===!0,q=b!==null&&(D===null||J)&&b.begin(P,D);if(T.matrixWorldAutoUpdate===!0&&T.updateMatrixWorld(),X.parent===null&&X.matrixWorldAutoUpdate===!0&&X.updateMatrixWorld(),xe.enabled===!0&&xe.isPresenting===!0&&(b===null||b.isCompositing()===!1)&&(xe.cameraAutoUpdate===!0&&xe.updateCamera(X),X=xe.getCamera()),T.isScene===!0&&T.onBeforeRender(P,T,X,D),E=Te.get(T,v.length),E.init(X),E.state.textureUnits=y.getTextureUnits(),v.push(E),j.multiplyMatrices(X.projectionMatrix,X.matrixWorldInverse),Ae.setFromProjectionMatrix(j,zi,X.reversedDepth),Se=this.localClippingEnabled,Ye=Ce.init(this.clippingPlanes,Se),R=te.get(T,A.length),R.init(),A.push(R),xe.enabled===!0&&xe.isPresenting===!0){let De=P.xr.getDepthSensingMesh();De!==null&&ht(De,X,-1/0,P.sortObjects)}ht(T,X,0,P.sortObjects),R.finish(),P.sortObjects===!0&&R.sort(K,le),me=xe.enabled===!1||xe.isPresenting===!1||xe.hasDepthSensing()===!1,me&&ge.addToRenderList(R,T),this.info.render.frame++,Ye===!0&&Ce.beginShadows();let Y=E.state.shadowsArray;if(ve.render(Y,T,X),Ye===!0&&Ce.endShadows(),this.info.autoReset===!0&&this.info.reset(),(q&&b.hasRenderPass())===!1){let De=R.opaque,Ue=R.transmissive;if(E.setupLights(),X.isArrayCamera){let Xe=X.cameras;if(Ue.length>0)for(let Ze=0,lt=Xe.length;Ze<lt;Ze++){let dt=Xe[Ze];at(De,Ue,T,dt)}me&&ge.render(T);for(let Ze=0,lt=Xe.length;Ze<lt;Ze++){let dt=Xe[Ze];ot(R,T,dt,dt.viewport)}}else Ue.length>0&&at(De,Ue,T,X),me&&ge.render(T),ot(R,T,X)}D!==null&&V===0&&(y.updateMultisampleRenderTarget(D),y.updateRenderTargetMipmap(D)),q&&b.end(P),T.isScene===!0&&T.onAfterRender(P,T,X),pe.resetDefaultState(),O=-1,F=null,v.pop(),v.length>0?(E=v[v.length-1],y.setTextureUnits(E.state.textureUnits),Ye===!0&&Ce.setGlobalState(P.clippingPlanes,E.state.camera)):E=null,A.pop(),A.length>0?R=A[A.length-1]:R=null,I!==null&&I.renderEnd()};function ht(T,X,J,q){if(T.visible===!1)return;if(T.layers.test(X.layers)){if(T.isGroup)J=T.renderOrder;else if(T.isLOD)T.autoUpdate===!0&&T.update(X);else if(T.isLightProbeGrid)E.pushLightProbeGrid(T);else if(T.isLight)E.pushLight(T),T.castShadow&&E.pushShadow(T);else if(T.isSprite){if(!T.frustumCulled||Ae.intersectsSprite(T)){q&&re.setFromMatrixPosition(T.matrixWorld).applyMatrix4(j);let De=fe.update(T),Ue=T.material;Ue.visible&&R.push(T,De,Ue,J,re.z,null)}}else if((T.isMesh||T.isLine||T.isPoints)&&(!T.frustumCulled||Ae.intersectsObject(T))){let De=fe.update(T),Ue=T.material;if(q&&(T.boundingSphere!==void 0?(T.boundingSphere===null&&T.computeBoundingSphere(),re.copy(T.boundingSphere.center)):(De.boundingSphere===null&&De.computeBoundingSphere(),re.copy(De.boundingSphere.center)),re.applyMatrix4(T.matrixWorld).applyMatrix4(j)),Array.isArray(Ue)){let Xe=De.groups;for(let Ze=0,lt=Xe.length;Ze<lt;Ze++){let dt=Xe[Ze],$e=Ue[dt.materialIndex];$e&&$e.visible&&R.push(T,De,$e,J,re.z,dt)}}else Ue.visible&&R.push(T,De,Ue,J,re.z,null)}}let Re=T.children;for(let De=0,Ue=Re.length;De<Ue;De++)ht(Re[De],X,J,q)}function ot(T,X,J,q){let{opaque:Y,transmissive:Re,transparent:De}=T;E.setupLightsView(J),Ye===!0&&Ce.setGlobalState(P.clippingPlanes,J),q&&z.viewport(Z.copy(q)),Y.length>0&&gn(Y,X,J),Re.length>0&&gn(Re,X,J),De.length>0&&gn(De,X,J),z.buffers.depth.setTest(!0),z.buffers.depth.setMask(!0),z.buffers.color.setMask(!0),z.setPolygonOffset(!1)}function at(T,X,J,q){if((J.isScene===!0?J.overrideMaterial:null)!==null)return;if(E.state.transmissionRenderTarget[q.id]===void 0){let $e=Pe.has("EXT_color_buffer_half_float")||Pe.has("EXT_color_buffer_float");E.state.transmissionRenderTarget[q.id]=new Tn(1,1,{generateMipmaps:!0,type:$e?gi:ri,minFilter:ss,samples:Math.max(4,Q.samples),stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:xt.workingColorSpace})}let Re=E.state.transmissionRenderTarget[q.id],De=q.viewport||Z;Re.setSize(De.z*P.transmissionResolutionScale,De.w*P.transmissionResolutionScale);let Ue=P.getRenderTarget(),Xe=P.getActiveCubeFace(),Ze=P.getActiveMipmapLevel();P.setRenderTarget(Re),P.getClearColor(ie),ye=P.getClearAlpha(),ye<1&&P.setClearColor(16777215,.5),P.clear(),me&&ge.render(J);let lt=P.toneMapping;P.toneMapping=Vi;let dt=q.viewport;if(q.viewport!==void 0&&(q.viewport=void 0),E.setupLightsView(q),Ye===!0&&Ce.setGlobalState(P.clippingPlanes,q),gn(T,J,q),y.updateMultisampleRenderTarget(Re),y.updateRenderTargetMipmap(Re),Pe.has("WEBGL_multisampled_render_to_texture")===!1){let $e=!1;for(let At=0,Qt=X.length;At<Qt;At++){let Yt=X[At],{object:Ct,geometry:Dn,material:ke,group:hi}=Yt;if(ke.side===Bt&&Ct.layers.test(q.layers)){let Mt=ke.side;ke.side=Yn,ke.needsUpdate=!0,Dt(Ct,J,q,Dn,ke,hi),ke.side=Mt,ke.needsUpdate=!0,$e=!0}}$e===!0&&(y.updateMultisampleRenderTarget(Re),y.updateRenderTargetMipmap(Re))}P.setRenderTarget(Ue,Xe,Ze),P.setClearColor(ie,ye),dt!==void 0&&(q.viewport=dt),P.toneMapping=lt}function gn(T,X,J){let q=X.isScene===!0?X.overrideMaterial:null;for(let Y=0,Re=T.length;Y<Re;Y++){let De=T[Y],{object:Ue,geometry:Xe,group:Ze}=De,lt=De.material;lt.allowOverride===!0&&q!==null&&(lt=q),Ue.layers.test(J.layers)&&Dt(Ue,X,J,Xe,lt,Ze)}}function Dt(T,X,J,q,Y,Re){T.onBeforeRender(P,X,J,q,Y,Re),T.modelViewMatrix.multiplyMatrices(J.matrixWorldInverse,T.matrixWorld),T.normalMatrix.getNormalMatrix(T.modelViewMatrix),Y.onBeforeRender(P,X,J,q,T,Re),Y.transparent===!0&&Y.side===Bt&&Y.forceSinglePass===!1?(Y.side=Yn,Y.needsUpdate=!0,P.renderBufferDirect(J,X,q,Y,T,Re),Y.side=yr,Y.needsUpdate=!0,P.renderBufferDirect(J,X,q,Y,T,Re),Y.side=Bt):P.renderBufferDirect(J,X,q,Y,T,Re),T.onAfterRender(P,X,J,q,Y,Re)}function _n(T,X,J){X.isScene!==!0&&(X=B);let q=w.get(T),Y=E.state.lights,Re=E.state.shadowsArray,De=Y.state.version,Ue=ae.getParameters(T,Y.state,Re,X,J,E.state.lightProbeGridArray),Xe=ae.getProgramCacheKey(Ue),Ze=q.programs;q.environment=T.isMeshStandardMaterial||T.isMeshLambertMaterial||T.isMeshPhongMaterial?X.environment:null,q.fog=X.fog;let lt=T.isMeshStandardMaterial||T.isMeshLambertMaterial&&!T.envMap||T.isMeshPhongMaterial&&!T.envMap;q.envMap=G.get(T.envMap||q.environment,lt),q.envMapRotation=q.environment!==null&&T.envMap===null?X.environmentRotation:T.envMapRotation,Ze===void 0&&(T.addEventListener("dispose",Je),Ze=new Map,q.programs=Ze);let dt=Ze.get(Xe);if(dt!==void 0){if(q.currentProgram===dt&&q.lightsStateVersion===De)return nn(T,Ue),dt}else Ue.uniforms=ae.getUniforms(T),I!==null&&T.isNodeMaterial&&I.build(T,J,Ue),T.onBeforeCompile(Ue,P),dt=ae.acquireProgram(Ue,Xe),Ze.set(Xe,dt),q.uniforms=Ue.uniforms;let $e=q.uniforms;return(!T.isShaderMaterial&&!T.isRawShaderMaterial||T.clipping===!0)&&($e.clippingPlanes=Ce.uniform),nn(T,Ue),q.needsLights=ca(T),q.lightsStateVersion=De,q.needsLights&&($e.ambientLightColor.value=Y.state.ambient,$e.lightProbe.value=Y.state.probe,$e.directionalLights.value=Y.state.directional,$e.directionalLightShadows.value=Y.state.directionalShadow,$e.spotLights.value=Y.state.spot,$e.spotLightShadows.value=Y.state.spotShadow,$e.rectAreaLights.value=Y.state.rectArea,$e.ltc_1.value=Y.state.rectAreaLTC1,$e.ltc_2.value=Y.state.rectAreaLTC2,$e.pointLights.value=Y.state.point,$e.pointLightShadows.value=Y.state.pointShadow,$e.hemisphereLights.value=Y.state.hemi,$e.directionalShadowMatrix.value=Y.state.directionalShadowMatrix,$e.spotLightMatrix.value=Y.state.spotLightMatrix,$e.spotLightMap.value=Y.state.spotLightMap,$e.pointShadowMatrix.value=Y.state.pointShadowMatrix),q.lightProbeGrid=E.state.lightProbeGridArray.length>0,q.currentProgram=dt,q.uniformsList=null,dt}function ui(T){if(T.uniformsList===null){let X=T.currentProgram.getUniforms();T.uniformsList=Ga.seqWithValue(X.seq,T.uniforms)}return T.uniformsList}function nn(T,X){let J=w.get(T);J.outputColorSpace=X.outputColorSpace,J.batching=X.batching,J.batchingColor=X.batchingColor,J.instancing=X.instancing,J.instancingColor=X.instancingColor,J.instancingMorph=X.instancingMorph,J.skinning=X.skinning,J.morphTargets=X.morphTargets,J.morphNormals=X.morphNormals,J.morphColors=X.morphColors,J.morphTargetsCount=X.morphTargetsCount,J.numClippingPlanes=X.numClippingPlanes,J.numIntersection=X.numClipIntersection,J.vertexAlphas=X.vertexAlphas,J.vertexTangents=X.vertexTangents,J.toneMapping=X.toneMapping}function hn(T,X){if(T.length===0)return null;if(T.length===1)return T[0].texture!==null?T[0]:null;x.setFromMatrixPosition(X.matrixWorld);for(let J=0,q=T.length;J<q;J++){let Y=T[J];if(Y.texture!==null&&Y.boundingBox.containsPoint(x))return Y}return null}function xn(T,X,J,q,Y){X.isScene!==!0&&(X=B),y.resetTextureUnits();let Re=X.fog,De=q.isMeshStandardMaterial||q.isMeshLambertMaterial||q.isMeshPhongMaterial?X.environment:null,Ue=D===null?P.outputColorSpace:D.isXRRenderTarget===!0?D.texture.colorSpace:xt.workingColorSpace,Xe=q.isMeshStandardMaterial||q.isMeshLambertMaterial&&!q.envMap||q.isMeshPhongMaterial&&!q.envMap,Ze=G.get(q.envMap||De,Xe),lt=q.vertexColors===!0&&!!J.attributes.color&&J.attributes.color.itemSize===4,dt=!!J.attributes.tangent&&(!!q.normalMap||q.anisotropy>0),$e=!!J.morphAttributes.position,At=!!J.morphAttributes.normal,Qt=!!J.morphAttributes.color,Yt=Vi;q.toneMapped&&(D===null||D.isXRRenderTarget===!0)&&(Yt=P.toneMapping);let Ct=J.morphAttributes.position||J.morphAttributes.normal||J.morphAttributes.color,Dn=Ct!==void 0?Ct.length:0,ke=w.get(q),hi=E.state.lights;if(Ye===!0&&(Se===!0||T!==F)){let Lt=T===F&&q.id===O;Ce.setState(q,T,Lt)}let Mt=!1;q.version===ke.__version?(ke.needsLights&&ke.lightsStateVersion!==hi.state.version||ke.outputColorSpace!==Ue||Y.isBatchedMesh&&ke.batching===!1||!Y.isBatchedMesh&&ke.batching===!0||Y.isBatchedMesh&&ke.batchingColor===!0&&Y.colorTexture===null||Y.isBatchedMesh&&ke.batchingColor===!1&&Y.colorTexture!==null||Y.isInstancedMesh&&ke.instancing===!1||!Y.isInstancedMesh&&ke.instancing===!0||Y.isSkinnedMesh&&ke.skinning===!1||!Y.isSkinnedMesh&&ke.skinning===!0||Y.isInstancedMesh&&ke.instancingColor===!0&&Y.instanceColor===null||Y.isInstancedMesh&&ke.instancingColor===!1&&Y.instanceColor!==null||Y.isInstancedMesh&&ke.instancingMorph===!0&&Y.morphTexture===null||Y.isInstancedMesh&&ke.instancingMorph===!1&&Y.morphTexture!==null||ke.envMap!==Ze||q.fog===!0&&ke.fog!==Re||ke.numClippingPlanes!==void 0&&(ke.numClippingPlanes!==Ce.numPlanes||ke.numIntersection!==Ce.numIntersection)||ke.vertexAlphas!==lt||ke.vertexTangents!==dt||ke.morphTargets!==$e||ke.morphNormals!==At||ke.morphColors!==Qt||ke.toneMapping!==Yt||ke.morphTargetsCount!==Dn||!!ke.lightProbeGrid!=E.state.lightProbeGridArray.length>0)&&(Mt=!0):(Mt=!0,ke.__version=q.version);let Ai=ke.currentProgram;Mt===!0&&(Ai=_n(q,X,Y),I&&q.isNodeMaterial&&I.onUpdateProgram(q,Ai,ke));let Zi=!1,kr=!1,ua=!1,Rt=Ai.getUniforms(),jt=ke.uniforms;if(z.useProgram(Ai.program)&&(Zi=!0,kr=!0,ua=!0),q.id!==O&&(O=q.id,kr=!0),ke.needsLights){let Lt=hn(E.state.lightProbeGridArray,Y);ke.lightProbeGrid!==Lt&&(ke.lightProbeGrid=Lt,kr=!0)}if(Zi||F!==T){z.buffers.depth.getReversed()&&T.reversedDepth!==!0&&(T._reversedDepth=!0,T.updateProjectionMatrix()),Rt.setValue(N,"projectionMatrix",T.projectionMatrix),Rt.setValue(N,"viewMatrix",T.matrixWorldInverse);let Vr=Rt.map.cameraPosition;Vr!==void 0&&Vr.setValue(N,oe.setFromMatrixPosition(T.matrixWorld)),Q.logarithmicDepthBuffer&&Rt.setValue(N,"logDepthBufFC",2/(Math.log(T.far+1)/Math.LN2)),(q.isMeshPhongMaterial||q.isMeshToonMaterial||q.isMeshLambertMaterial||q.isMeshBasicMaterial||q.isMeshStandardMaterial||q.isShaderMaterial)&&Rt.setValue(N,"isOrthographic",T.isOrthographicCamera===!0),F!==T&&(F=T,kr=!0,ua=!0)}if(ke.needsLights&&(hi.state.directionalShadowMap.length>0&&Rt.setValue(N,"directionalShadowMap",hi.state.directionalShadowMap,y),hi.state.spotShadowMap.length>0&&Rt.setValue(N,"spotShadowMap",hi.state.spotShadowMap,y),hi.state.pointShadowMap.length>0&&Rt.setValue(N,"pointShadowMap",hi.state.pointShadowMap,y)),Y.isSkinnedMesh){Rt.setOptional(N,Y,"bindMatrix"),Rt.setOptional(N,Y,"bindMatrixInverse");let Lt=Y.skeleton;Lt&&(Lt.boneTexture===null&&Lt.computeBoneTexture(),Rt.setValue(N,"boneTexture",Lt.boneTexture,y))}Y.isBatchedMesh&&(Rt.setOptional(N,Y,"batchingTexture"),Rt.setValue(N,"batchingTexture",Y._matricesTexture,y),Rt.setOptional(N,Y,"batchingIdTexture"),Rt.setValue(N,"batchingIdTexture",Y._indirectTexture,y),Rt.setOptional(N,Y,"batchingColorTexture"),Y._colorsTexture!==null&&Rt.setValue(N,"batchingColorTexture",Y._colorsTexture,y));let zr=J.morphAttributes;if((zr.position!==void 0||zr.normal!==void 0||zr.color!==void 0)&&be.update(Y,J,Ai),(kr||ke.receiveShadow!==Y.receiveShadow)&&(ke.receiveShadow=Y.receiveShadow,Rt.setValue(N,"receiveShadow",Y.receiveShadow)),(q.isMeshStandardMaterial||q.isMeshLambertMaterial||q.isMeshPhongMaterial)&&q.envMap===null&&X.environment!==null&&(jt.envMapIntensity.value=X.environmentIntensity),jt.dfgLUT!==void 0&&(jt.dfgLUT.value=h1()),kr){if(Rt.setValue(N,"toneMappingExposure",P.toneMappingExposure),ke.needsLights&&dr(jt,ua),Re&&q.fog===!0&&U.refreshFogUniforms(jt,Re),U.refreshMaterialUniforms(jt,q,Oe,ze,E.state.transmissionRenderTarget[T.id]),ke.needsLights&&ke.lightProbeGrid){let Lt=ke.lightProbeGrid;jt.probesSH.value=Lt.texture,jt.probesMin.value.copy(Lt.boundingBox.min),jt.probesMax.value.copy(Lt.boundingBox.max),jt.probesResolution.value.copy(Lt.resolution)}Ga.upload(N,ui(ke),jt,y)}if(q.isShaderMaterial&&q.uniformsNeedUpdate===!0&&(Ga.upload(N,ui(ke),jt,y),q.uniformsNeedUpdate=!1),q.isSpriteMaterial&&Rt.setValue(N,"center",Y.center),Rt.setValue(N,"modelViewMatrix",Y.modelViewMatrix),Rt.setValue(N,"normalMatrix",Y.normalMatrix),Rt.setValue(N,"modelMatrix",Y.matrixWorld),q.uniformsGroups!==void 0){let Lt=q.uniformsGroups;for(let Vr=0,ha=Lt.length;Vr<ha;Vr++){let Hp=Lt[Vr];ne.update(Hp,Ai),ne.bind(Hp,Ai)}}return Ai}function dr(T,X){T.ambientLightColor.needsUpdate=X,T.lightProbe.needsUpdate=X,T.directionalLights.needsUpdate=X,T.directionalLightShadows.needsUpdate=X,T.pointLights.needsUpdate=X,T.pointLightShadows.needsUpdate=X,T.spotLights.needsUpdate=X,T.spotLightShadows.needsUpdate=X,T.rectAreaLights.needsUpdate=X,T.hemisphereLights.needsUpdate=X}function ca(T){return T.isMeshLambertMaterial||T.isMeshToonMaterial||T.isMeshPhongMaterial||T.isMeshStandardMaterial||T.isShadowMaterial||T.isShaderMaterial&&T.lights===!0}this.getActiveCubeFace=function(){return H},this.getActiveMipmapLevel=function(){return V},this.getRenderTarget=function(){return D},this.setRenderTargetTextures=function(T,X,J){let q=w.get(T);q.__autoAllocateDepthBuffer=T.resolveDepthBuffer===!1,q.__autoAllocateDepthBuffer===!1&&(q.__useRenderToTexture=!1),w.get(T.texture).__webglTexture=X,w.get(T.depthTexture).__webglTexture=q.__autoAllocateDepthBuffer?void 0:J,q.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(T,X){let J=w.get(T);J.__webglFramebuffer=X,J.__useDefaultFramebuffer=X===void 0};let vn=N.createFramebuffer();this.setRenderTarget=function(T,X=0,J=0){D=T,H=X,V=J;let q=null,Y=!1,Re=!1;if(T){let Ue=w.get(T);if(Ue.__useDefaultFramebuffer!==void 0){z.bindFramebuffer(N.FRAMEBUFFER,Ue.__webglFramebuffer),Z.copy(T.viewport),ee.copy(T.scissor),L=T.scissorTest,z.viewport(Z),z.scissor(ee),z.setScissorTest(L),O=-1;return}else if(Ue.__webglFramebuffer===void 0)y.setupRenderTarget(T);else if(Ue.__hasExternalTextures)y.rebindTextures(T,w.get(T.texture).__webglTexture,w.get(T.depthTexture).__webglTexture);else if(T.depthBuffer){let lt=T.depthTexture;if(Ue.__boundDepthTexture!==lt){if(lt!==null&&w.has(lt)&&(T.width!==lt.image.width||T.height!==lt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");y.setupDepthRenderbuffer(T)}}let Xe=T.texture;(Xe.isData3DTexture||Xe.isDataArrayTexture||Xe.isCompressedArrayTexture)&&(Re=!0);let Ze=w.get(T).__webglFramebuffer;T.isWebGLCubeRenderTarget?(Array.isArray(Ze[X])?q=Ze[X][J]:q=Ze[X],Y=!0):T.samples>0&&y.useMultisampledRTT(T)===!1?q=w.get(T).__webglMultisampledFramebuffer:Array.isArray(Ze)?q=Ze[J]:q=Ze,Z.copy(T.viewport),ee.copy(T.scissor),L=T.scissorTest}else Z.copy(ue).multiplyScalar(Oe).floor(),ee.copy(Ee).multiplyScalar(Oe).floor(),L=He;if(J!==0&&(q=vn),z.bindFramebuffer(N.FRAMEBUFFER,q)&&z.drawBuffers(T,q),z.viewport(Z),z.scissor(ee),z.setScissorTest(L),Y){let Ue=w.get(T.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+X,Ue.__webglTexture,J)}else if(Re){let Ue=X;for(let Xe=0;Xe<T.textures.length;Xe++){let Ze=w.get(T.textures[Xe]);N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0+Xe,Ze.__webglTexture,J,Ue)}}else if(T!==null&&J!==0){let Ue=w.get(T.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,Ue.__webglTexture,J)}O=-1},this.readRenderTargetPixels=function(T,X,J,q,Y,Re,De,Ue=0){if(!(T&&T.isWebGLRenderTarget)){nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Xe=w.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&De!==void 0&&(Xe=Xe[De]),Xe){z.bindFramebuffer(N.FRAMEBUFFER,Xe);try{let Ze=T.textures[Ue],lt=Ze.format,dt=Ze.type;if(T.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+Ue),!Q.textureFormatReadable(lt)){nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Q.textureTypeReadable(dt)){nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}X>=0&&X<=T.width-q&&J>=0&&J<=T.height-Y&&N.readPixels(X,J,q,Y,k.convert(lt),k.convert(dt),Re)}finally{let Ze=D!==null?w.get(D).__webglFramebuffer:null;z.bindFramebuffer(N.FRAMEBUFFER,Ze)}}},this.readRenderTargetPixelsAsync=async function(T,X,J,q,Y,Re,De,Ue=0){if(!(T&&T.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Xe=w.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&De!==void 0&&(Xe=Xe[De]),Xe)if(X>=0&&X<=T.width-q&&J>=0&&J<=T.height-Y){z.bindFramebuffer(N.FRAMEBUFFER,Xe);let Ze=T.textures[Ue],lt=Ze.format,dt=Ze.type;if(T.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+Ue),!Q.textureFormatReadable(lt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Q.textureTypeReadable(dt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let $e=N.createBuffer();N.bindBuffer(N.PIXEL_PACK_BUFFER,$e),N.bufferData(N.PIXEL_PACK_BUFFER,Re.byteLength,N.STREAM_READ),N.readPixels(X,J,q,Y,k.convert(lt),k.convert(dt),0);let At=D!==null?w.get(D).__webglFramebuffer:null;z.bindFramebuffer(N.FRAMEBUFFER,At);let Qt=N.fenceSync(N.SYNC_GPU_COMMANDS_COMPLETE,0);return N.flush(),await jm(N,Qt,4),N.bindBuffer(N.PIXEL_PACK_BUFFER,$e),N.getBufferSubData(N.PIXEL_PACK_BUFFER,0,Re),N.deleteBuffer($e),N.deleteSync(Qt),Re}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(T,X=null,J=0){let q=Math.pow(2,-J),Y=Math.floor(T.image.width*q),Re=Math.floor(T.image.height*q),De=X!==null?X.x:0,Ue=X!==null?X.y:0;y.setTexture2D(T,0),N.copyTexSubImage2D(N.TEXTURE_2D,J,0,0,De,Ue,Y,Re),z.unbindTexture()};let Kt=N.createFramebuffer(),wi=N.createFramebuffer();this.copyTextureToTexture=function(T,X,J=null,q=null,Y=0,Re=0){let De,Ue,Xe,Ze,lt,dt,$e,At,Qt,Yt=T.isCompressedTexture?T.mipmaps[Re]:T.image;if(J!==null)De=J.max.x-J.min.x,Ue=J.max.y-J.min.y,Xe=J.isBox3?J.max.z-J.min.z:1,Ze=J.min.x,lt=J.min.y,dt=J.isBox3?J.min.z:0;else{let jt=Math.pow(2,-Y);De=Math.floor(Yt.width*jt),Ue=Math.floor(Yt.height*jt),T.isDataArrayTexture?Xe=Yt.depth:T.isData3DTexture?Xe=Math.floor(Yt.depth*jt):Xe=1,Ze=0,lt=0,dt=0}q!==null?($e=q.x,At=q.y,Qt=q.z):($e=0,At=0,Qt=0);let Ct=k.convert(X.format),Dn=k.convert(X.type),ke;X.isData3DTexture?(y.setTexture3D(X,0),ke=N.TEXTURE_3D):X.isDataArrayTexture||X.isCompressedArrayTexture?(y.setTexture2DArray(X,0),ke=N.TEXTURE_2D_ARRAY):(y.setTexture2D(X,0),ke=N.TEXTURE_2D),z.activeTexture(N.TEXTURE0),z.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,X.flipY),z.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,X.premultiplyAlpha),z.pixelStorei(N.UNPACK_ALIGNMENT,X.unpackAlignment);let hi=z.getParameter(N.UNPACK_ROW_LENGTH),Mt=z.getParameter(N.UNPACK_IMAGE_HEIGHT),Ai=z.getParameter(N.UNPACK_SKIP_PIXELS),Zi=z.getParameter(N.UNPACK_SKIP_ROWS),kr=z.getParameter(N.UNPACK_SKIP_IMAGES);z.pixelStorei(N.UNPACK_ROW_LENGTH,Yt.width),z.pixelStorei(N.UNPACK_IMAGE_HEIGHT,Yt.height),z.pixelStorei(N.UNPACK_SKIP_PIXELS,Ze),z.pixelStorei(N.UNPACK_SKIP_ROWS,lt),z.pixelStorei(N.UNPACK_SKIP_IMAGES,dt);let ua=T.isDataArrayTexture||T.isData3DTexture,Rt=X.isDataArrayTexture||X.isData3DTexture;if(T.isDepthTexture){let jt=w.get(T),zr=w.get(X),Lt=w.get(jt.__renderTarget),Vr=w.get(zr.__renderTarget);z.bindFramebuffer(N.READ_FRAMEBUFFER,Lt.__webglFramebuffer),z.bindFramebuffer(N.DRAW_FRAMEBUFFER,Vr.__webglFramebuffer);for(let ha=0;ha<Xe;ha++)ua&&(N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,w.get(T).__webglTexture,Y,dt+ha),N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,w.get(X).__webglTexture,Re,Qt+ha)),N.blitFramebuffer(Ze,lt,De,Ue,$e,At,De,Ue,N.DEPTH_BUFFER_BIT,N.NEAREST);z.bindFramebuffer(N.READ_FRAMEBUFFER,null),z.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else if(Y!==0||T.isRenderTargetTexture||w.has(T)){let jt=w.get(T),zr=w.get(X);z.bindFramebuffer(N.READ_FRAMEBUFFER,Kt),z.bindFramebuffer(N.DRAW_FRAMEBUFFER,wi);for(let Lt=0;Lt<Xe;Lt++)ua?N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,jt.__webglTexture,Y,dt+Lt):N.framebufferTexture2D(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,jt.__webglTexture,Y),Rt?N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,zr.__webglTexture,Re,Qt+Lt):N.framebufferTexture2D(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,zr.__webglTexture,Re),Y!==0?N.blitFramebuffer(Ze,lt,De,Ue,$e,At,De,Ue,N.COLOR_BUFFER_BIT,N.NEAREST):Rt?N.copyTexSubImage3D(ke,Re,$e,At,Qt+Lt,Ze,lt,De,Ue):N.copyTexSubImage2D(ke,Re,$e,At,Ze,lt,De,Ue);z.bindFramebuffer(N.READ_FRAMEBUFFER,null),z.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else Rt?T.isDataTexture||T.isData3DTexture?N.texSubImage3D(ke,Re,$e,At,Qt,De,Ue,Xe,Ct,Dn,Yt.data):X.isCompressedArrayTexture?N.compressedTexSubImage3D(ke,Re,$e,At,Qt,De,Ue,Xe,Ct,Yt.data):N.texSubImage3D(ke,Re,$e,At,Qt,De,Ue,Xe,Ct,Dn,Yt):T.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,Re,$e,At,De,Ue,Ct,Dn,Yt.data):T.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,Re,$e,At,Yt.width,Yt.height,Ct,Yt.data):N.texSubImage2D(N.TEXTURE_2D,Re,$e,At,De,Ue,Ct,Dn,Yt);z.pixelStorei(N.UNPACK_ROW_LENGTH,hi),z.pixelStorei(N.UNPACK_IMAGE_HEIGHT,Mt),z.pixelStorei(N.UNPACK_SKIP_PIXELS,Ai),z.pixelStorei(N.UNPACK_SKIP_ROWS,Zi),z.pixelStorei(N.UNPACK_SKIP_IMAGES,kr),Re===0&&X.generateMipmaps&&N.generateMipmap(ke),z.unbindTexture()},this.initRenderTarget=function(T){w.get(T).__webglFramebuffer===void 0&&y.setupRenderTarget(T)},this.initTexture=function(T){T.isCubeTexture?y.setTextureCube(T,0):T.isData3DTexture?y.setTexture3D(T,0):T.isDataArrayTexture||T.isCompressedArrayTexture?y.setTexture2DArray(T,0):y.setTexture2D(T,0),z.unbindTexture()},this.resetState=function(){H=0,V=0,D=null,z.reset(),pe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return zi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=xt._getDrawingBufferColorSpace(e),t.unpackColorSpace=xt._getUnpackColorSpace()}};function wr(r){if(r===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return r}function Xg(r,e){r.prototype=Object.create(e.prototype),r.prototype.constructor=r,r.__proto__=e}var li={autoSleep:120,force3D:"auto",nullTargetWarn:1,units:{lineHeight:""}},fl={duration:.5,overwrite:!1,delay:0},Fd,Rn,kt,Ii=1e8,It=1/Ii,wd=Math.PI*2,f1=wd/4,d1=0,qg=Math.sqrt,p1=Math.cos,m1=Math.sin,pn=function(e){return typeof e=="string"},Zt=function(e){return typeof e=="function"},Cr=function(e){return typeof e=="number"},oh=function(e){return typeof e>"u"},lr=function(e){return typeof e=="object"},oi=function(e){return e!==!1},Od=function(){return typeof window<"u"},Qu=function(e){return Zt(e)||pn(e)},Yg=typeof ArrayBuffer=="function"&&ArrayBuffer.isView||function(){},kn=Array.isArray,g1=/random\([^)]+\)/g,_1=/,\s*/g,Og=/(?:-?\.?\d|\.)+/gi,Bd=/[-+=.]*\d+[.e\-+]*\d*[e\-+]*\d*/g,Gs=/[-+=.]*\d+[.e-]*\d*[a-z%]*/g,vd=/[-+=.]*\d+\.?\d*(?:e-|e\+)?\d*/gi,kd=/[+-]=-?[.\d]+/,x1=/[^,'"\[\]\s]+/gi,v1=/^[+\-=e\s\d]*\d+[.\d]*([a-z]*|%)\s*$/i,Xt,ar,Ad,zd,xi={},nh={},Zg,Jg=function(e){return(nh=Ya(e,xi))&&zn},lh=function(e,t){return console.warn("Invalid property",e,"set to",t,"Missing plugin? gsap.registerPlugin()")},dl=function(e,t){return!t&&console.warn(e)},$g=function(e,t){return e&&(xi[e]=t)&&nh&&(nh[e]=t)||xi},pl=function(){return 0},y1={suppressEvents:!0,isStart:!0,kill:!1},ju={suppressEvents:!0,kill:!1},S1={suppressEvents:!0},Vd={},us=[],Cd={},Kg,si={},yd={},Bg=30,eh=[],Hd="",Gd=function(e){var t=e[0],n,i;if(lr(t)||Zt(t)||(e=[e]),!(n=(t._gsap||{}).harness)){for(i=eh.length;i--&&!eh[i].targetTest(t););n=eh[i]}for(i=e.length;i--;)e[i]&&(e[i]._gsap||(e[i]._gsap=new Yd(e[i],n)))||e.splice(i,1);return e},hs=function(e){return e._gsap||Gd(Di(e))[0]._gsap},Wd=function(e,t,n){return(n=e[t])&&Zt(n)?e[t]():oh(n)&&e.getAttribute&&e.getAttribute(t)||n},Zn=function(e,t){return(e=e.split(",")).forEach(t)||e},Jt=function(e){return Math.round(e*1e5)/1e5||0},Wt=function(e){return Math.round(e*1e7)/1e7||0},Ws=function(e,t){var n=t.charAt(0),i=parseFloat(t.substr(2));return e=parseFloat(e),n==="+"?e+i:n==="-"?e-i:n==="*"?e*i:e/i},M1=function(e,t){for(var n=t.length,i=0;e.indexOf(t[i])<0&&++i<n;);return i<n},ih=function(){var e=us.length,t=us.slice(0),n,i;for(Cd={},us.length=0,n=0;n<e;n++)i=t[n],i&&i._lazy&&(i.render(i._lazy[0],i._lazy[1],!0)._lazy=0)},Xd=function(e){return!!(e._initted||e._startAt||e.add)},Qg=function(e,t,n,i){us.length&&!Rn&&ih(),e.render(t,n,i||!!(Rn&&t<0&&Xd(e))),us.length&&!Rn&&ih()},jg=function(e){var t=parseFloat(e);return(t||t===0)&&(e+"").match(x1).length<2?t:pn(e)?e.trim():e},e0=function(e){return e},vi=function(e,t){for(var n in t)n in e||(e[n]=t[n]);return e},b1=function(e){return function(t,n){for(var i in n)i in t||i==="duration"&&e||i==="ease"||(t[i]=n[i])}},Ya=function(e,t){for(var n in t)e[n]=t[n];return e},kg=function r(e,t){for(var n in t)n!=="__proto__"&&n!=="constructor"&&n!=="prototype"&&(e[n]=lr(t[n])?r(e[n]||(e[n]={}),t[n]):t[n]);return e},rh=function(e,t){var n={},i;for(i in e)i in t||(n[i]=e[i]);return n},cl=function(e){var t=e.parent||Xt,n=e.keyframes?b1(kn(e.keyframes)):vi;if(oi(e.inherit))for(;t;)n(e,t.vars.defaults),t=t.parent||t._dp;return e},T1=function(e,t){for(var n=e.length,i=n===t.length;i&&n--&&e[n]===t[n];);return n<0},t0=function(e,t,n,i,s){n===void 0&&(n="_first"),i===void 0&&(i="_last");var a=e[i],o;if(s)for(o=t[s];a&&a[s]>o;)a=a._prev;return a?(t._next=a._next,a._next=t):(t._next=e[n],e[n]=t),t._next?t._next._prev=t:e[i]=t,t._prev=a,t.parent=t._dp=e,t},ch=function(e,t,n,i){n===void 0&&(n="_first"),i===void 0&&(i="_last");var s=t._prev,a=t._next;s?s._next=a:e[n]===t&&(e[n]=a),a?a._prev=s:e[i]===t&&(e[i]=s),t._next=t._prev=t.parent=null},fs=function(e,t){e.parent&&(!t||e.parent.autoRemoveChildren)&&e.parent.remove&&e.parent.remove(e),e._act=0},zs=function(e,t){if(e&&(!t||t._end>e._dur||t._start<0))for(var n=e;n;)n._dirty=1,n=n.parent;return e},E1=function(e){for(var t=e.parent;t&&t.parent;)t._dirty=1,t.totalDuration(),t=t.parent;return e},Rd=function(e,t,n,i){return e._startAt&&(Rn?e._startAt.revert(ju):e.vars.immediateRender&&!e.vars.autoRevert||e._startAt.render(t,!0,i))},w1=function r(e){return!e||e._ts&&r(e.parent)},zg=function(e){return e._repeat?Za(e._tTime,e=e.duration()+e._rDelay)*e:0},Za=function(e,t){var n=Math.floor(e=Wt(e/t));return e&&n===e?n-1:n},sh=function(e,t){return(e-t._start)*t._ts+(t._ts>=0?0:t._dirty?t.totalDuration():t._tDur)},uh=function(e){return e._end=Wt(e._start+(e._tDur/Math.abs(e._ts||e._rts||It)||0))},hh=function(e,t){var n=e._dp;return n&&n.smoothChildTiming&&e._ts&&(e._start=Wt(n._time-(e._ts>0?t/e._ts:((e._dirty?e.totalDuration():e._tDur)-t)/-e._ts)),uh(e),n._dirty||zs(n,e)),e},n0=function(e,t){var n;if((t._time||!t._dur&&t._initted||t._start<e._time&&(t._dur||!t.add))&&(n=sh(e.rawTime(),t),(!t._dur||_l(0,t.totalDuration(),n)-t._tTime>It)&&t.render(n,!0)),zs(e,t)._dp&&e._initted&&e._time>=e._dur&&e._ts){if(e._dur<e.duration())for(n=e;n._dp;)n.rawTime()>=0&&n.totalTime(n._tTime),n=n._dp;e._zTime=-It}},or=function(e,t,n,i){return t.parent&&fs(t),t._start=Wt((Cr(n)?n:n||e!==Xt?Pi(e,n,t):e._time)+t._delay),t._end=Wt(t._start+(t.totalDuration()/Math.abs(t.timeScale())||0)),t0(e,t,"_first","_last",e._sort?"_start":0),Pd(t)||(e._recent=t),i||n0(e,t),e._ts<0&&hh(e,e._tTime),e},i0=function(e,t){return(xi.ScrollTrigger||lh("scrollTrigger",t))&&xi.ScrollTrigger.create(t,e)},r0=function(e,t,n,i,s){if($d(e,t,s),!e._initted)return 1;if(!n&&e._pt&&!Rn&&(e._dur&&e.vars.lazy!==!1||!e._dur&&e.vars.lazy)&&Kg!==ai.frame)return us.push(e),e._lazy=[s,i],1},A1=function r(e){var t=e.parent;return t&&t._ts&&t._initted&&!t._lock&&(t.rawTime()<0||r(t))},Pd=function(e){var t=e.data;return t==="isFromStart"||t==="isStart"},C1=function(e,t,n,i){var s=e.ratio,a=t<0||!t&&(!e._start&&A1(e)&&!(!e._initted&&Pd(e))||(e._ts<0||e._dp._ts<0)&&!Pd(e))?0:1,o=e._rDelay,l=0,c,u,d;if(o&&e._repeat&&(l=_l(0,e._tDur,t),u=Za(l,o),e._yoyo&&u&1&&(a=1-a),u!==Za(e._tTime,o)&&(s=1-a,e.vars.repeatRefresh&&e._initted&&e.invalidate())),a!==s||Rn||i||e._zTime===It||!t&&e._zTime){if(!e._initted&&r0(e,t,i,n,l))return;for(d=e._zTime,e._zTime=t||(n?It:0),n||(n=t&&!d),e.ratio=a,e._from&&(a=1-a),e._time=0,e._tTime=l,c=e._pt;c;)c.r(a,c.d),c=c._next;t<0&&Rd(e,t,n,!0),e._onUpdate&&!n&&_i(e,"onUpdate"),l&&e._repeat&&!n&&e.parent&&_i(e,"onRepeat"),(t>=e._tDur||t<0)&&e.ratio===a&&(a&&fs(e,1),!n&&!Rn&&(_i(e,a?"onComplete":"onReverseComplete",!0),e._prom&&e._prom()))}else e._zTime||(e._zTime=t)},R1=function(e,t,n){var i;if(n>t)for(i=e._first;i&&i._start<=n;){if(i.data==="isPause"&&i._start>t)return i;i=i._next}else for(i=e._last;i&&i._start>=n;){if(i.data==="isPause"&&i._start<t)return i;i=i._prev}},Ja=function(e,t,n,i){var s=e._repeat,a=Wt(t)||0,o=e._tTime/e._tDur;return o&&!i&&(e._time*=a/e._dur),e._dur=a,e._tDur=s?s<0?1e10:Wt(a*(s+1)+e._rDelay*s):a,o>0&&!i&&hh(e,e._tTime=e._tDur*o),e.parent&&uh(e),n||zs(e.parent,e),e},Vg=function(e){return e instanceof Bn?zs(e):Ja(e,e._dur)},P1={_start:0,endTime:pl,totalDuration:pl},Pi=function r(e,t,n){var i=e.labels,s=e._recent||P1,a=e.duration()>=Ii?s.endTime(!1):e._dur,o,l,c;return pn(t)&&(isNaN(t)||t in i)?(l=t.charAt(0),c=t.substr(-1)==="%",o=t.indexOf("="),l==="<"||l===">"?(o>=0&&(t=t.replace(/=/,"")),(l==="<"?s._start:s.endTime(s._repeat>=0))+(parseFloat(t.substr(1))||0)*(c?(o<0?s:n).totalDuration()/100:1)):o<0?(t in i||(i[t]=a),i[t]):(l=parseFloat(t.charAt(o-1)+t.substr(o+1)),c&&n&&(l=l/100*(kn(n)?n[0]:n).totalDuration()),o>1?r(e,t.substr(0,o-1),n)+l:a+l)):t==null?a:+t},ul=function(e,t,n){var i=Cr(t[1]),s=(i?2:1)+(e<2?0:1),a=t[s],o,l;if(i&&(a.duration=t[1]),a.parent=n,e){for(o=a,l=n;l&&!("immediateRender"in o);)o=l.vars.defaults||{},l=oi(l.vars.inherit)&&l.parent;a.immediateRender=oi(o.immediateRender),e<2?a.runBackwards=1:a.startAt=t[s-1]}return new tn(t[0],a,t[s+1])},ds=function(e,t){return e||e===0?t(e):t},_l=function(e,t,n){return n<e?e:n>t?t:n},Pn=function(e,t){return!pn(e)||!(t=v1.exec(e))?"":t[1]},I1=function(e,t,n){return ds(n,function(i){return _l(e,t,i)})},Id=[].slice,s0=function(e,t){return e&&lr(e)&&"length"in e&&(!t&&!e.length||e.length-1 in e&&lr(e[0]))&&!e.nodeType&&e!==ar},D1=function(e,t,n){return n===void 0&&(n=[]),e.forEach(function(i){var s;return pn(i)&&!t||s0(i,1)?(s=n).push.apply(s,Di(i)):n.push(i)})||n},Di=function(e,t,n){return kt&&!t&&kt.selector?kt.selector(e):pn(e)&&!n&&(Ad||!$a())?Id.call((t||zd).querySelectorAll(e),0):kn(e)?D1(e,n):s0(e)?Id.call(e,0):e?[e]:[]},Dd=function(e){return e=Di(e)[0]||dl("Invalid scope")||{},function(t){var n=e.current||e.nativeElement||e;return Di(t,n.querySelectorAll?n:n===e?dl("Invalid scope")||zd.createElement("div"):e)}},a0=function(e){return e.sort(function(){return .5-Math.random()})},o0=function(e){if(Zt(e))return e;var t=lr(e)?e:{each:e},n=Vs(t.ease),i=t.from||0,s=parseFloat(t.base)||0,a={},o=i>0&&i<1,l=isNaN(i)||o,c=t.axis,u=i,d=i;return pn(i)?u=d={center:.5,edges:.5,end:1}[i]||0:!o&&l&&(u=i[0],d=i[1]),function(h,f,m){var _=(m||t).length,p=a[_],g,S,M,x,R,E,A,v,b;if(!p){if(b=t.grid==="auto"?0:(t.grid||[1,Ii])[1],!b){for(A=-Ii;A<(A=m[b++].getBoundingClientRect().left)&&b<_;);b<_&&b--}for(p=a[_]=[],g=l?Math.min(b,_)*u-.5:i%b,S=b===Ii?0:l?_*d/b-.5:i/b|0,A=0,v=Ii,E=0;E<_;E++)M=E%b-g,x=S-(E/b|0),p[E]=R=c?Math.abs(c==="y"?x:M):qg(M*M+x*x),R>A&&(A=R),R<v&&(v=R);i==="random"&&a0(p),p.max=A-v,p.min=v,p.v=_=(parseFloat(t.amount)||parseFloat(t.each)*(b>_?_-1:c?c==="y"?_/b:b:Math.max(b,_/b))||0)*(i==="edges"?-1:1),p.b=_<0?s-_:s,p.u=Pn(t.amount||t.each)||0,n=n&&_<0?X1(n):n}return _=(p[h]-p.min)/p.max||0,Wt(p.b+(n?n(_):_)*p.v)+p.u}},Ld=function(e){var t=Math.pow(10,((e+"").split(".")[1]||"").length);return function(n){var i=Wt(Math.round(parseFloat(n)/e)*e*t);return(i-i%1)/t+(Cr(n)?0:Pn(n))}},l0=function(e,t){var n=kn(e),i,s;return!n&&lr(e)&&(i=n=e.radius||Ii,e.values?(e=Di(e.values),(s=!Cr(e[0]))&&(i*=i)):e=Ld(e.increment)),ds(t,n?Zt(e)?function(a){return s=e(a),Math.abs(s-a)<=i?s:a}:function(a){for(var o=parseFloat(s?a.x:a),l=parseFloat(s?a.y:0),c=Ii,u=0,d=e.length,h,f;d--;)s?(h=e[d].x-o,f=e[d].y-l,h=h*h+f*f):h=Math.abs(e[d]-o),h<c&&(c=h,u=d);return u=!i||c<=i?e[u]:a,s||u===a||Cr(a)?u:u+Pn(a)}:Ld(e))},c0=function(e,t,n,i){return ds(kn(e)?!t:n===!0?!!(n=0):!i,function(){return kn(e)?e[~~(Math.random()*e.length)]:(n=n||1e-5)&&(i=n<1?Math.pow(10,(n+"").length-2):1)&&Math.floor(Math.round((e-n/2+Math.random()*(t-e+n*.99))/n)*n*i)/i})},L1=function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return function(i){return t.reduce(function(s,a){return a(s)},i)}},U1=function(e,t){return function(n){return e(parseFloat(n))+(t||Pn(n))}},N1=function(e,t,n){return h0(e,t,0,1,n)},u0=function(e,t,n){return ds(n,function(i){return e[~~t(i)]})},F1=function r(e,t,n){var i=t-e;return kn(e)?u0(e,r(0,e.length),t):ds(n,function(s){return(i+(s-e)%i)%i+e})},O1=function r(e,t,n){var i=t-e,s=i*2;return kn(e)?u0(e,r(0,e.length-1),t):ds(n,function(a){return a=(s+(a-e)%s)%s||0,e+(a>i?s-a:a)})},Ka=function(e){return e.replace(g1,function(t){var n=t.indexOf("[")+1,i=t.substring(n||7,n?t.indexOf("]"):t.length-1).split(_1);return c0(n?i:+i[0],n?0:+i[1],+i[2]||1e-5)})},h0=function(e,t,n,i,s){var a=t-e,o=i-n;return ds(s,function(l){return n+((l-e)/a*o||0)})},B1=function r(e,t,n,i){var s=isNaN(e+t)?0:function(f){return(1-f)*e+f*t};if(!s){var a=pn(e),o={},l,c,u,d,h;if(n===!0&&(i=1)&&(n=null),a)e={p:e},t={p:t};else if(kn(e)&&!kn(t)){for(u=[],d=e.length,h=d-2,c=1;c<d;c++)u.push(r(e[c-1],e[c]));d--,s=function(m){m*=d;var _=Math.min(h,~~m);return u[_](m-_)},n=t}else i||(e=Ya(kn(e)?[]:{},e));if(!u){for(l in t)Zd.call(o,e,l,"get",t[l]);s=function(m){return jd(m,o)||(a?e.p:e)}}}return ds(n,s)},Hg=function(e,t,n){var i=e.labels,s=Ii,a,o,l;for(a in i)o=i[a]-t,o<0==!!n&&o&&s>(o=Math.abs(o))&&(l=a,s=o);return l},_i=function(e,t,n){var i=e.vars,s=i[t],a=kt,o=e._ctx,l,c,u;if(s)return l=i[t+"Params"],c=i.callbackScope||e,n&&us.length&&ih(),o&&(kt=o),u=l?s.apply(c,l):s.call(c),kt=a,u},ol=function(e){return fs(e),e.scrollTrigger&&e.scrollTrigger.kill(!!Rn),e.progress()<1&&_i(e,"onInterrupt"),e},qa,f0=[],d0=function(e){if(e)if(e=!e.name&&e.default||e,Od()||e.headless){var t=e.name,n=Zt(e),i=t&&!n&&e.init?function(){this._props=[]}:e,s={init:pl,render:jd,add:Zd,kill:tT,modifier:eT,rawVars:0},a={targetTest:0,get:0,getSetter:fh,aliases:{},register:0};if($a(),e!==i){if(si[t])return;vi(i,vi(rh(e,s),a)),Ya(i.prototype,Ya(s,rh(e,a))),si[i.prop=t]=i,e.targetTest&&(eh.push(i),Vd[t]=1),t=(t==="css"?"CSS":t.charAt(0).toUpperCase()+t.substr(1))+"Plugin"}$g(t,i),e.register&&e.register(zn,i,Jn)}else f0.push(e)},Pt=255,ll={aqua:[0,Pt,Pt],lime:[0,Pt,0],silver:[192,192,192],black:[0,0,0],maroon:[128,0,0],teal:[0,128,128],blue:[0,0,Pt],navy:[0,0,128],white:[Pt,Pt,Pt],olive:[128,128,0],yellow:[Pt,Pt,0],orange:[Pt,165,0],gray:[128,128,128],purple:[128,0,128],green:[0,128,0],red:[Pt,0,0],pink:[Pt,192,203],cyan:[0,Pt,Pt],transparent:[Pt,Pt,Pt,0]},Sd=function(e,t,n){return e+=e<0?1:e>1?-1:0,(e*6<1?t+(n-t)*e*6:e<.5?n:e*3<2?t+(n-t)*(2/3-e)*6:t)*Pt+.5|0},p0=function(e,t,n){var i=e?Cr(e)?[e>>16,e>>8&Pt,e&Pt]:0:ll.black,s,a,o,l,c,u,d,h,f,m;if(!i){if(e.substr(-1)===","&&(e=e.substr(0,e.length-1)),ll[e])i=ll[e];else if(e.charAt(0)==="#"){if(e.length<6&&(s=e.charAt(1),a=e.charAt(2),o=e.charAt(3),e="#"+s+s+a+a+o+o+(e.length===5?e.charAt(4)+e.charAt(4):"")),e.length===9)return i=parseInt(e.substr(1,6),16),[i>>16,i>>8&Pt,i&Pt,parseInt(e.substr(7),16)/255];e=parseInt(e.substr(1),16),i=[e>>16,e>>8&Pt,e&Pt]}else if(e.substr(0,3)==="hsl"){if(i=m=e.match(Og),!t)l=+i[0]%360/360,c=+i[1]/100,u=+i[2]/100,a=u<=.5?u*(c+1):u+c-u*c,s=u*2-a,i.length>3&&(i[3]*=1),i[0]=Sd(l+1/3,s,a),i[1]=Sd(l,s,a),i[2]=Sd(l-1/3,s,a);else if(~e.indexOf("="))return i=e.match(Bd),n&&i.length<4&&(i[3]=1),i}else i=e.match(Og)||ll.transparent;i=i.map(Number)}return t&&!m&&(s=i[0]/Pt,a=i[1]/Pt,o=i[2]/Pt,d=Math.max(s,a,o),h=Math.min(s,a,o),u=(d+h)/2,d===h?l=c=0:(f=d-h,c=u>.5?f/(2-d-h):f/(d+h),l=d===s?(a-o)/f+(a<o?6:0):d===a?(o-s)/f+2:(s-a)/f+4,l*=60),i[0]=~~(l+.5),i[1]=~~(c*100+.5),i[2]=~~(u*100+.5)),n&&i.length<4&&(i[3]=1),i},m0=function(e){var t=[],n=[],i=-1;return e.split(Ar).forEach(function(s){var a=s.match(Gs)||[];t.push.apply(t,a),n.push(i+=a.length+1)}),t.c=n,t},Gg=function(e,t,n){var i="",s=(e+i).match(Ar),a=t?"hsla(":"rgba(",o=0,l,c,u,d;if(!s)return e;if(s=s.map(function(h){return(h=p0(h,t,1))&&a+(t?h[0]+","+h[1]+"%,"+h[2]+"%,"+h[3]:h.join(","))+")"}),n&&(u=m0(e),l=n.c,l.join(i)!==u.c.join(i)))for(c=e.replace(Ar,"1").split(Gs),d=c.length-1;o<d;o++)i+=c[o]+(~l.indexOf(o)?s.shift()||a+"0,0,0,0)":(u.length?u:s.length?s:n).shift());if(!c)for(c=e.split(Ar),d=c.length-1;o<d;o++)i+=c[o]+s[o];return i+c[d]},Ar=(function(){var r="(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#(?:[0-9a-f]{3,4}){1,2}\\b",e;for(e in ll)r+="|"+e+"\\b";return new RegExp(r+")","gi")})(),k1=/hsl[a]?\(/,qd=function(e){var t=e.join(" "),n;if(Ar.lastIndex=0,Ar.test(t))return n=k1.test(t),e[1]=Gg(e[1],n),e[0]=Gg(e[0],n,m0(e[1])),!0},ml,ai=(function(){var r=Date.now,e=500,t=33,n=r(),i=n,s=1e3/240,a=s,o=[],l,c,u,d,h,f,m=function _(p){var g=r()-i,S=p===!0,M,x,R,E;if((g>e||g<0)&&(n+=g-t),i+=g,R=i-n,M=R-a,(M>0||S)&&(E=++d.frame,h=R-d.time*1e3,d.time=R=R/1e3,a+=M+(M>=s?4:s-M),x=1),S||(l=c(_)),x)for(f=0;f<o.length;f++)o[f](R,h,E,p)};return d={time:0,frame:0,tick:function(){m(!0)},deltaRatio:function(p){return h/(1e3/(p||60))},wake:function(){Zg&&(!Ad&&Od()&&(ar=Ad=window,zd=ar.document||{},xi.gsap=zn,(ar.gsapVersions||(ar.gsapVersions=[])).push(zn.version),Jg(nh||ar.GreenSockGlobals||!ar.gsap&&ar||{}),f0.forEach(d0)),u=typeof requestAnimationFrame<"u"&&requestAnimationFrame,l&&d.sleep(),c=u||function(p){return setTimeout(p,a-d.time*1e3+1|0)},ml=1,m(2))},sleep:function(){(u?cancelAnimationFrame:clearTimeout)(l),ml=0,c=pl},lagSmoothing:function(p,g){e=p||1/0,t=Math.min(g||33,e)},fps:function(p){s=1e3/(p||240),a=d.time*1e3+s},add:function(p,g,S){var M=g?function(x,R,E,A){p(x,R,E,A),d.remove(M)}:p;return d.remove(p),o[S?"unshift":"push"](M),$a(),M},remove:function(p,g){~(g=o.indexOf(p))&&o.splice(g,1)&&f>=g&&f--},_listeners:o},d})(),$a=function(){return!ml&&ai.wake()},yt={},z1=/^[\d.\-M][\d.\-,\s]/,V1=/["']/g,H1=function(e){for(var t={},n=e.substr(1,e.length-3).split(":"),i=n[0],s=1,a=n.length,o,l,c;s<a;s++)l=n[s],o=s!==a-1?l.lastIndexOf(","):l.length,c=l.substr(0,o),t[i]=isNaN(c)?c.replace(V1,"").trim():+c,i=l.substr(o+1).trim();return t},G1=function(e){var t=e.indexOf("(")+1,n=e.indexOf(")"),i=e.indexOf("(",t);return e.substring(t,~i&&i<n?e.indexOf(")",n+1):n)},W1=function(e){var t=(e+"").split("("),n=yt[t[0]];return n&&t.length>1&&n.config?n.config.apply(null,~e.indexOf("{")?[H1(t[1])]:G1(e).split(",").map(jg)):yt._CE&&z1.test(e)?yt._CE("",e):n},X1=function(e){return function(t){return 1-e(1-t)}},Vs=function(e,t){return e&&(Zt(e)?e:yt[e]||W1(e))||t},Xs=function(e,t,n,i){n===void 0&&(n=function(l){return 1-t(1-l)}),i===void 0&&(i=function(l){return l<.5?t(l*2)/2:1-t((1-l)*2)/2});var s={easeIn:t,easeOut:n,easeInOut:i},a;return Zn(e,function(o){yt[o]=xi[o]=s,yt[a=o.toLowerCase()]=n;for(var l in s)yt[a+(l==="easeIn"?".in":l==="easeOut"?".out":".inOut")]=yt[o+"."+l]=s[l]}),s},g0=function(e){return function(t){return t<.5?(1-e(1-t*2))/2:.5+e((t-.5)*2)/2}},Md=function r(e,t,n){var i=t>=1?t:1,s=(n||(e?.3:.45))/(t<1?t:1),a=s/wd*(Math.asin(1/i)||0),o=function(u){return u===1?1:i*Math.pow(2,-10*u)*m1((u-a)*s)+1},l=e==="out"?o:e==="in"?function(c){return 1-o(1-c)}:g0(o);return s=wd/s,l.config=function(c,u){return r(e,c,u)},l},bd=function r(e,t){t===void 0&&(t=1.70158);var n=function(a){return a?--a*a*((t+1)*a+t)+1:0},i=e==="out"?n:e==="in"?function(s){return 1-n(1-s)}:g0(n);return i.config=function(s){return r(e,s)},i};Zn("Linear,Quad,Cubic,Quart,Quint,Strong",function(r,e){var t=e<5?e+1:e;Xs(r+",Power"+(t-1),e?function(n){return Math.pow(n,t)}:function(n){return n},function(n){return 1-Math.pow(1-n,t)},function(n){return n<.5?Math.pow(n*2,t)/2:1-Math.pow((1-n)*2,t)/2})});yt.Linear.easeNone=yt.none=yt.Linear.easeIn;Xs("Elastic",Md("in"),Md("out"),Md());(function(r,e){var t=1/e,n=2*t,i=2.5*t,s=function(o){return o<t?r*o*o:o<n?r*Math.pow(o-1.5/e,2)+.75:o<i?r*(o-=2.25/e)*o+.9375:r*Math.pow(o-2.625/e,2)+.984375};Xs("Bounce",function(a){return 1-s(1-a)},s)})(7.5625,2.75);Xs("Expo",function(r){return Math.pow(2,10*(r-1))*r+r*r*r*r*r*r*(1-r)});Xs("Circ",function(r){return-(qg(1-r*r)-1)});Xs("Sine",function(r){return r===1?1:-p1(r*f1)+1});Xs("Back",bd("in"),bd("out"),bd());yt.SteppedEase=yt.steps=xi.SteppedEase={config:function(e,t){e===void 0&&(e=1);var n=1/e,i=e+(t?0:1),s=t?1:0,a=1-It;return function(o){return((i*_l(0,a,o)|0)+s)*n}}};fl.ease=yt["quad.out"];Zn("onComplete,onUpdate,onStart,onRepeat,onReverseComplete,onInterrupt",function(r){return Hd+=r+","+r+"Params,"});var Yd=function(e,t){this.id=d1++,e._gsap=this,this.target=e,this.harness=t,this.get=t?t.get:Wd,this.set=t?t.getSetter:fh},gl=(function(){function r(t){this.vars=t,this._delay=+t.delay||0,(this._repeat=t.repeat===1/0?-2:t.repeat||0)&&(this._rDelay=t.repeatDelay||0,this._yoyo=!!t.yoyo||!!t.yoyoEase),this._ts=1,Ja(this,+t.duration,1,1),this.data=t.data,kt&&(this._ctx=kt,kt.data.push(this)),ml||ai.wake()}var e=r.prototype;return e.delay=function(n){return n||n===0?(this.parent&&this.parent.smoothChildTiming&&this.startTime(this._start+n-this._delay),this._delay=n,this):this._delay},e.duration=function(n){return arguments.length?this.totalDuration(this._repeat>0?n+(n+this._rDelay)*this._repeat:n):this.totalDuration()&&this._dur},e.totalDuration=function(n){return arguments.length?(this._dirty=0,Ja(this,this._repeat<0?n:(n-this._repeat*this._rDelay)/(this._repeat+1))):this._tDur},e.totalTime=function(n,i){if($a(),!arguments.length)return this._tTime;var s=this._dp;if(s&&s.smoothChildTiming&&this._ts){for(hh(this,n),!s._dp||s.parent||n0(s,this);s&&s.parent;)s.parent._time!==s._start+(s._ts>=0?s._tTime/s._ts:(s.totalDuration()-s._tTime)/-s._ts)&&s.totalTime(s._tTime,!0),s=s.parent;!this.parent&&this._dp.autoRemoveChildren&&(this._ts>0&&n<this._tDur||this._ts<0&&n>0||!this._tDur&&!n)&&or(this._dp,this,this._start-this._delay)}return(this._tTime!==n||!this._dur&&!i||this._initted&&Math.abs(this._zTime)===It||!this._initted&&this._dur&&n||!n&&!this._initted&&(this.add||this._ptLookup))&&(this._ts||(this._pTime=n),Qg(this,n,i)),this},e.time=function(n,i){return arguments.length?this.totalTime(Math.min(this.totalDuration(),n+zg(this))%(this._dur+this._rDelay)||(n?this._dur:0),i):this._time},e.totalProgress=function(n,i){return arguments.length?this.totalTime(this.totalDuration()*n,i):this.totalDuration()?Math.min(1,this._tTime/this._tDur):this.rawTime()>=0&&this._initted?1:0},e.progress=function(n,i){return arguments.length?this.totalTime(this.duration()*(this._yoyo&&!(this.iteration()&1)?1-n:n)+zg(this),i):this.duration()?Math.min(1,this._time/this._dur):this.rawTime()>0?1:0},e.iteration=function(n,i){var s=this.duration()+this._rDelay;return arguments.length?this.totalTime(this._time+(n-1)*s,i):this._repeat?Za(this._tTime,s)+1:1},e.timeScale=function(n,i){if(!arguments.length)return this._rts===-It?0:this._rts;if(this._rts===n)return this;var s=this.parent&&this._ts?sh(this.parent._time,this):this._tTime;return this._rts=+n||0,this._ts=this._ps||n===-It?0:this._rts,this.totalTime(_l(-Math.abs(this._delay),this.totalDuration(),s),i!==!1),uh(this),E1(this)},e.paused=function(n){return arguments.length?(this._ps!==n&&(this._ps=n,n?(this._pTime=this._tTime||Math.max(-this._delay,this.rawTime()),this._ts=this._act=0):($a(),this._ts=this._rts,this.totalTime(this.parent&&!this.parent.smoothChildTiming?this.rawTime():this._tTime||this._pTime,this.progress()===1&&Math.abs(this._zTime)!==It&&(this._tTime-=It)))),this):this._ps},e.startTime=function(n){if(arguments.length){this._start=Wt(n);var i=this.parent||this._dp;return i&&(i._sort||!this.parent)&&or(i,this,this._start-this._delay),this}return this._start},e.endTime=function(n){return this._start+(oi(n)?this.totalDuration():this.duration())/Math.abs(this._ts||1)},e.rawTime=function(n){var i=this.parent||this._dp;return i?n&&(!this._ts||this._repeat&&this._time&&this.totalProgress()<1)?this._tTime%(this._dur+this._rDelay):this._ts?sh(i.rawTime(n),this):this._tTime:this._tTime},e.revert=function(n){n===void 0&&(n=S1);var i=Rn;return Rn=n,Xd(this)&&(this.timeline&&this.timeline.revert(n),this.totalTime(-.01,n.suppressEvents)),this.data!=="nested"&&n.kill!==!1&&this.kill(),Rn=i,this},e.globalTime=function(n){for(var i=this,s=arguments.length?n:i.rawTime();i;)s=i._start+s/(Math.abs(i._ts)||1),i=i._dp;return!this.parent&&this._sat?this._sat.globalTime(n):s},e.repeat=function(n){return arguments.length?(this._repeat=n===1/0?-2:n,Vg(this)):this._repeat===-2?1/0:this._repeat},e.repeatDelay=function(n){if(arguments.length){var i=this._time;return this._rDelay=n,Vg(this),i?this.time(i):this}return this._rDelay},e.yoyo=function(n){return arguments.length?(this._yoyo=n,this):this._yoyo},e.seek=function(n,i){return this.totalTime(Pi(this,n),oi(i))},e.restart=function(n,i){return this.play().totalTime(n?-this._delay:0,oi(i)),this._dur||(this._zTime=-It),this},e.play=function(n,i){return n!=null&&this.seek(n,i),this.reversed(!1).paused(!1)},e.reverse=function(n,i){return n!=null&&this.seek(n||this.totalDuration(),i),this.reversed(!0).paused(!1)},e.pause=function(n,i){return n!=null&&this.seek(n,i),this.paused(!0)},e.resume=function(){return this.paused(!1)},e.reversed=function(n){return arguments.length?(!!n!==this.reversed()&&this.timeScale(-this._rts||(n?-It:0)),this):this._rts<0},e.invalidate=function(){return this._initted=this._act=0,this._zTime=-It,this},e.isActive=function(){var n=this.parent||this._dp,i=this._start,s;return!!(!n||this._ts&&this._initted&&n.isActive()&&(s=n.rawTime(!0))>=i&&s<this.endTime(!0)-It)},e.eventCallback=function(n,i,s){var a=this.vars;return arguments.length>1?(i?(a[n]=i,s&&(a[n+"Params"]=s),n==="onUpdate"&&(this._onUpdate=i)):delete a[n],this):a[n]},e.then=function(n){var i=this,s=i._prom;return new Promise(function(a){var o=Zt(n)?n:e0,l=function(){var u=i.then;i.then=null,s&&s(),Zt(o)&&(o=o(i))&&(o.then||o===i)&&(i.then=u),a(o),i.then=u};i._initted&&i.totalProgress()===1&&i._ts>=0||!i._tTime&&i._ts<0?l():i._prom=l})},e.kill=function(){ol(this)},r})();vi(gl.prototype,{_time:0,_start:0,_end:0,_tTime:0,_tDur:0,_dirty:0,_repeat:0,_yoyo:!1,parent:null,_initted:!1,_rDelay:0,_ts:1,_dp:0,ratio:0,_zTime:-It,_prom:0,_ps:!1,_rts:1});var Bn=(function(r){Xg(e,r);function e(n,i){var s;return n===void 0&&(n={}),s=r.call(this,n)||this,s.labels={},s.smoothChildTiming=!!n.smoothChildTiming,s.autoRemoveChildren=!!n.autoRemoveChildren,s._sort=oi(n.sortChildren),Xt&&or(n.parent||Xt,wr(s),i),n.reversed&&s.reverse(),n.paused&&s.paused(!0),n.scrollTrigger&&i0(wr(s),n.scrollTrigger),s}var t=e.prototype;return t.to=function(i,s,a){return ul(0,arguments,this),this},t.from=function(i,s,a){return ul(1,arguments,this),this},t.fromTo=function(i,s,a,o){return ul(2,arguments,this),this},t.set=function(i,s,a){return s.duration=0,s.parent=this,cl(s).repeatDelay||(s.repeat=0),s.immediateRender=!!s.immediateRender,new tn(i,s,Pi(this,a),1),this},t.call=function(i,s,a){return or(this,tn.delayedCall(0,i,s),a)},t.staggerTo=function(i,s,a,o,l,c,u){return a.duration=s,a.stagger=a.stagger||o,a.onComplete=c,a.onCompleteParams=u,a.parent=this,new tn(i,a,Pi(this,l)),this},t.staggerFrom=function(i,s,a,o,l,c,u){return a.runBackwards=1,cl(a).immediateRender=oi(a.immediateRender),this.staggerTo(i,s,a,o,l,c,u)},t.staggerFromTo=function(i,s,a,o,l,c,u,d){return o.startAt=a,cl(o).immediateRender=oi(o.immediateRender),this.staggerTo(i,s,o,l,c,u,d)},t.render=function(i,s,a){var o=this._time,l=this._dirty?this.totalDuration():this._tDur,c=this._dur,u=i<=0?0:Wt(i),d=this._zTime<0!=i<0&&(this._initted||!c),h,f,m,_,p,g,S,M,x,R,E,A;if(this!==Xt&&u>l&&i>=0&&(u=l),u!==this._tTime||a||d){if(o!==this._time&&c&&(u+=this._time-o,i+=this._time-o),h=u,x=this._start,M=this._ts,g=!M,d&&(c||(o=this._zTime),(i||!s)&&(this._zTime=i)),this._repeat){if(E=this._yoyo,p=c+this._rDelay,this._repeat<-1&&i<0)return this.totalTime(p*100+i,s,a);if(h=Wt(u%p),u===l?(_=this._repeat,h=c):(R=Wt(u/p),_=~~R,_&&_===R&&(h=c,_--),h>c&&(h=c)),R=Za(this._tTime,p),!o&&this._tTime&&R!==_&&this._tTime-R*p-this._dur<=0&&(R=_),E&&_&1&&(h=c-h,A=1),_!==R&&!this._lock){var v=E&&R&1,b=v===(E&&_&1);if(_<R&&(v=!v),o=v?0:u%c?c:u,this._lock=1,this.render(o||(A?0:Wt(_*p)),s,!c)._lock=0,this._tTime=u,!s&&this.parent&&_i(this,"onRepeat"),this.vars.repeatRefresh&&!A&&(this.invalidate()._lock=1,R=_),o&&o!==this._time||g!==!this._ts||this.vars.onRepeat&&!this.parent&&!this._act)return this;if(c=this._dur,l=this._tDur,b&&(this._lock=2,o=v?c:-1e-4,this.render(o,!0),this.vars.repeatRefresh&&!A&&this.invalidate()),this._lock=0,!this._ts&&!g)return this}}if(this._hasPause&&!this._forcing&&this._lock<2&&(S=R1(this,Wt(o),Wt(h)),S&&(u-=h-(h=S._start))),this._tTime=u,this._time=h,this._act=!!M,this._initted||(this._onUpdate=this.vars.onUpdate,this._initted=1,this._zTime=i,o=0),!o&&u&&c&&!s&&!R&&(_i(this,"onStart"),this._tTime!==u))return this;if(h>=o&&i>=0)for(f=this._first;f;){if(m=f._next,(f._act||h>=f._start)&&f._ts&&S!==f){if(f.parent!==this)return this.render(i,s,a);if(f.render(f._ts>0?(h-f._start)*f._ts:(f._dirty?f.totalDuration():f._tDur)+(h-f._start)*f._ts,s,a),h!==this._time||!this._ts&&!g){S=0,m&&(u+=this._zTime=-It);break}}f=m}else{f=this._last;for(var P=i<0?i:h;f;){if(m=f._prev,(f._act||P<=f._end)&&f._ts&&S!==f){if(f.parent!==this)return this.render(i,s,a);if(f.render(f._ts>0?(P-f._start)*f._ts:(f._dirty?f.totalDuration():f._tDur)+(P-f._start)*f._ts,s,a||Rn&&Xd(f)),h!==this._time||!this._ts&&!g){S=0,m&&(u+=this._zTime=P?-It:It);break}}f=m}}if(S&&!s&&(this.pause(),S.render(h>=o?0:-It)._zTime=h>=o?1:-1,this._ts))return this._start=x,uh(this),this.render(i,s,a);this._onUpdate&&!s&&_i(this,"onUpdate",!0),(u===l&&this._tTime>=this.totalDuration()||!u&&o)&&(x===this._start||Math.abs(M)!==Math.abs(this._ts))&&(this._lock||((i||!c)&&(u===l&&this._ts>0||!u&&this._ts<0)&&fs(this,1),!s&&!(i<0&&!o)&&(u||o||!l)&&(_i(this,u===l&&i>=0?"onComplete":"onReverseComplete",!0),this._prom&&!(u<l&&this.timeScale()>0)&&this._prom())))}return this},t.add=function(i,s){var a=this;if(Cr(s)||(s=Pi(this,s,i)),!(i instanceof gl)){if(kn(i))return i.forEach(function(o){return a.add(o,s)}),this;if(pn(i))return this.addLabel(i,s);if(Zt(i))i=tn.delayedCall(0,i);else return this}return this!==i?or(this,i,s):this},t.getChildren=function(i,s,a,o){i===void 0&&(i=!0),s===void 0&&(s=!0),a===void 0&&(a=!0),o===void 0&&(o=-Ii);for(var l=[],c=this._first;c;)c._start>=o&&(c instanceof tn?s&&l.push(c):(a&&l.push(c),i&&l.push.apply(l,c.getChildren(!0,s,a)))),c=c._next;return l},t.getById=function(i){for(var s=this.getChildren(1,1,1),a=s.length;a--;)if(s[a].vars.id===i)return s[a]},t.remove=function(i){return pn(i)?this.removeLabel(i):Zt(i)?this.killTweensOf(i):(i.parent===this&&ch(this,i),i===this._recent&&(this._recent=this._last),zs(this))},t.totalTime=function(i,s){return arguments.length?(this._forcing=1,!this._dp&&this._ts&&(this._start=Wt(ai.time-(this._ts>0?i/this._ts:(this.totalDuration()-i)/-this._ts))),r.prototype.totalTime.call(this,i,s),this._forcing=0,this):this._tTime},t.addLabel=function(i,s){return this.labels[i]=Pi(this,s),this},t.removeLabel=function(i){return delete this.labels[i],this},t.addPause=function(i,s,a){var o=tn.delayedCall(0,s||pl,a);return o.data="isPause",this._hasPause=1,or(this,o,Pi(this,i))},t.removePause=function(i){var s=this._first;for(i=Pi(this,i);s;)s._start===i&&s.data==="isPause"&&fs(s),s=s._next},t.killTweensOf=function(i,s,a){for(var o=this.getTweensOf(i,a),l=o.length;l--;)cs!==o[l]&&o[l].kill(i,s);return this},t.getTweensOf=function(i,s){for(var a=[],o=Di(i),l=this._first,c=Cr(s),u;l;)l instanceof tn?M1(l._targets,o)&&(c?(!cs||l._initted&&l._ts)&&l.globalTime(0)<=s&&l.globalTime(l.totalDuration())>s:!s||l.isActive())&&a.push(l):(u=l.getTweensOf(o,s)).length&&a.push.apply(a,u),l=l._next;return a},t.tweenTo=function(i,s){s=s||{};var a=this,o=Pi(a,i),l=s,c=l.startAt,u=l.onStart,d=l.onStartParams,h=l.immediateRender,f,m=tn.to(a,vi({ease:s.ease||"none",lazy:!1,immediateRender:!1,time:o,overwrite:"auto",duration:s.duration||Math.abs((o-(c&&"time"in c?c.time:a._time))/a.timeScale())||It,onStart:function(){if(a.pause(),!f){var p=s.duration||Math.abs((o-(c&&"time"in c?c.time:a._time))/a.timeScale());m._dur!==p&&Ja(m,p,0,1).render(m._time,!0,!0),f=1}u&&u.apply(m,d||[])}},s));return h?m.render(0):m},t.tweenFromTo=function(i,s,a){return this.tweenTo(s,vi({startAt:{time:Pi(this,i)}},a))},t.recent=function(){return this._recent},t.nextLabel=function(i){return i===void 0&&(i=this._time),Hg(this,Pi(this,i))},t.previousLabel=function(i){return i===void 0&&(i=this._time),Hg(this,Pi(this,i),1)},t.currentLabel=function(i){return arguments.length?this.seek(i,!0):this.previousLabel(this._time+It)},t.shiftChildren=function(i,s,a){a===void 0&&(a=0);var o=this._first,l=this.labels,c;for(i=Wt(i);o;)o._start>=a&&(o._start+=i,o._end+=i),o=o._next;if(s)for(c in l)l[c]>=a&&(l[c]+=i);return zs(this)},t.invalidate=function(i){var s=this._first;for(this._lock=0;s;)s.invalidate(i),s=s._next;return r.prototype.invalidate.call(this,i)},t.clear=function(i){i===void 0&&(i=!0);for(var s=this._first,a;s;)a=s._next,this.remove(s),s=a;return this._dp&&(this._time=this._tTime=this._pTime=0),i&&(this.labels={}),zs(this)},t.totalDuration=function(i){var s=0,a=this,o=a._last,l=Ii,c,u,d;if(arguments.length)return a.timeScale((a._repeat<0?a.duration():a.totalDuration())/(a.reversed()?-i:i));if(a._dirty){for(d=a.parent;o;)c=o._prev,o._dirty&&o.totalDuration(),u=o._start,u>l&&a._sort&&o._ts&&!a._lock?(a._lock=1,or(a,o,u-o._delay,1)._lock=0):l=u,u<0&&o._ts&&(s-=u,(!d&&!a._dp||d&&d.smoothChildTiming)&&(a._start+=Wt(u/a._ts),a._time-=u,a._tTime-=u),a.shiftChildren(-u,!1,-1/0),l=0),o._end>s&&o._ts&&(s=o._end),o=c;Ja(a,a===Xt&&a._time>s?a._time:s,1,1),a._dirty=0}return a._tDur},e.updateRoot=function(i){if(Xt._ts&&(Qg(Xt,sh(i,Xt)),Kg=ai.frame),ai.frame>=Bg){Bg+=li.autoSleep||120;var s=Xt._first;if((!s||!s._ts)&&li.autoSleep&&ai._listeners.length<2){for(;s&&!s._ts;)s=s._next;s||ai.sleep()}}},e})(gl);vi(Bn.prototype,{_lock:0,_hasPause:0,_forcing:0});var q1=function(e,t,n,i,s,a,o){var l=new Jn(this._pt,e,t,0,1,Qd,null,s),c=0,u=0,d,h,f,m,_,p,g,S;for(l.b=n,l.e=i,n+="",i+="",(g=~i.indexOf("random("))&&(i=Ka(i)),a&&(S=[n,i],a(S,e,t),n=S[0],i=S[1]),h=n.match(vd)||[];d=vd.exec(i);)m=d[0],_=i.substring(c,d.index),f?f=(f+1)%5:_.substr(-5)==="rgba("&&(f=1),m!==h[u++]&&(p=parseFloat(h[u-1])||0,l._pt={_next:l._pt,p:_||u===1?_:",",s:p,c:m.charAt(1)==="="?Ws(p,m)-p:parseFloat(m)-p,m:f&&f<4?Math.round:0},c=vd.lastIndex);return l.c=c<i.length?i.substring(c,i.length):"",l.fp=o,(kd.test(i)||g)&&(l.e=0),this._pt=l,l},Zd=function(e,t,n,i,s,a,o,l,c,u){Zt(i)&&(i=i(s||0,e,a));var d=e[t],h=n!=="get"?n:Zt(d)?c?e[t.indexOf("set")||!Zt(e["get"+t.substr(3)])?t:"get"+t.substr(3)](c):e[t]():d,f=Zt(d)?c?K1:v0:Kd,m;if(pn(i)&&(~i.indexOf("random(")&&(i=Ka(i)),i.charAt(1)==="="&&(m=Ws(h,i)+(Pn(h)||0),(m||m===0)&&(i=m))),!u||h!==i||Ud)return!isNaN(h*i)&&i!==""?(m=new Jn(this._pt,e,t,+h||0,i-(h||0),typeof d=="boolean"?j1:y0,0,f),c&&(m.fp=c),o&&m.modifier(o,this,e),this._pt=m):(!d&&!(t in e)&&lh(t,i),q1.call(this,e,t,h,i,f,l||li.stringFilter,c))},Y1=function(e,t,n,i,s){if(Zt(e)&&(e=hl(e,s,t,n,i)),!lr(e)||e.style&&e.nodeType||kn(e)||Yg(e))return pn(e)?hl(e,s,t,n,i):e;var a={},o;for(o in e)a[o]=hl(e[o],s,t,n,i);return a},Jd=function(e,t,n,i,s,a){var o,l,c,u;if(si[e]&&(o=new si[e]).init(s,o.rawVars?t[e]:Y1(t[e],i,s,a,n),n,i,a)!==!1&&(n._pt=l=new Jn(n._pt,s,e,0,1,o.render,o,0,o.priority),n!==qa))for(c=n._ptLookup[n._targets.indexOf(s)],u=o._props.length;u--;)c[o._props[u]]=l;return o},cs,Ud,$d=function r(e,t,n){var i=e.vars,s=i.ease,a=i.startAt,o=i.immediateRender,l=i.lazy,c=i.onUpdate,u=i.runBackwards,d=i.yoyoEase,h=i.keyframes,f=i.autoRevert,m=e._dur,_=e._startAt,p=e._targets,g=e.parent,S=g&&g.data==="nested"?g.vars.targets:p,M=e._overwrite==="auto"&&!Fd,x=e.timeline,R=i.easeReverse||d,E,A,v,b,P,C,I,H,V,D,O,F,Z;if(x&&(!h||!s)&&(s="none"),e._ease=Vs(s,fl.ease),e._rEase=R&&(Vs(R)||e._ease),e._from=!x&&!!i.runBackwards,e._from&&(e.ratio=1),!x||h&&!i.stagger){if(H=p[0]?hs(p[0]).harness:0,F=H&&i[H.prop],E=rh(i,Vd),_&&(_._zTime<0&&_.progress(1),t<0&&u&&o&&!f?_.render(-1,!0):_.revert(u&&m?ju:y1),_._lazy=0),a){if(fs(e._startAt=tn.set(p,vi({data:"isStart",overwrite:!1,parent:g,immediateRender:!0,lazy:!_&&oi(l),startAt:null,delay:0,onUpdate:c&&function(){return _i(e,"onUpdate")},stagger:0},a))),e._startAt._dp=0,e._startAt._sat=e,t<0&&(Rn||!o&&!f)&&e._startAt.revert(ju),o&&m&&t<=0&&n<=0){t&&(e._zTime=t);return}}else if(u&&m&&!_){if(t&&(o=!1),v=vi({overwrite:!1,data:"isFromStart",lazy:o&&!_&&oi(l),immediateRender:o,stagger:0,parent:g},E),F&&(v[H.prop]=F),fs(e._startAt=tn.set(p,v)),e._startAt._dp=0,e._startAt._sat=e,t<0&&(Rn?e._startAt.revert(ju):e._startAt.render(-1,!0)),e._zTime=t,!o)r(e._startAt,It,It);else if(!t)return}for(e._pt=e._ptCache=0,l=m&&oi(l)||l&&!m,A=0;A<p.length;A++){if(P=p[A],I=P._gsap||Gd(p)[A]._gsap,e._ptLookup[A]=D={},Cd[I.id]&&us.length&&ih(),O=S===p?A:S.indexOf(P),H&&(V=new H).init(P,F||E,e,O,S)!==!1&&(e._pt=b=new Jn(e._pt,P,V.name,0,1,V.render,V,0,V.priority),V._props.forEach(function(ee){D[ee]=b}),V.priority&&(C=1)),!H||F)for(v in E)si[v]&&(V=Jd(v,E,e,O,P,S))?V.priority&&(C=1):D[v]=b=Zd.call(e,P,v,"get",E[v],O,S,0,i.stringFilter);e._op&&e._op[A]&&e.kill(P,e._op[A]),M&&e._pt&&(cs=e,Xt.killTweensOf(P,D,e.globalTime(t)),Z=!e.parent,cs=0),e._pt&&l&&(Cd[I.id]=1)}C&&ep(e),e._onInit&&e._onInit(e)}e._onUpdate=c,e._initted=(!e._op||e._pt)&&!Z,h&&t<=0&&x.render(Ii,!0,!0)},Z1=function(e,t,n,i,s,a,o,l){var c=(e._pt&&e._ptCache||(e._ptCache={}))[t],u,d,h,f;if(!c)for(c=e._ptCache[t]=[],h=e._ptLookup,f=e._targets.length;f--;){if(u=h[f][t],u&&u.d&&u.d._pt)for(u=u.d._pt;u&&u.p!==t&&u.fp!==t;)u=u._next;if(!u)return Ud=1,e.vars[t]="+=0",$d(e,o),Ud=0,l?dl(t+" not eligible for reset. Try splitting into individual properties"):1;c.push(u)}for(f=c.length;f--;)d=c[f],u=d._pt||d,u.s=(i||i===0)&&!s?i:u.s+(i||0)+a*u.c,u.c=n-u.s,d.e&&(d.e=Jt(n)+Pn(d.e)),d.b&&(d.b=u.s+Pn(d.b))},J1=function(e,t){var n=e[0]?hs(e[0]).harness:0,i=n&&n.aliases,s,a,o,l;if(!i)return t;s=Ya({},t);for(a in i)if(a in s)for(l=i[a].split(","),o=l.length;o--;)s[l[o]]=s[a];return s},$1=function(e,t,n,i){var s=t.ease||i||"power1.inOut",a,o;if(kn(t))o=n[e]||(n[e]=[]),t.forEach(function(l,c){return o.push({t:c/(t.length-1)*100,v:l,e:s})});else for(a in t)o=n[a]||(n[a]=[]),a==="ease"||o.push({t:parseFloat(e),v:t[a],e:s})},hl=function(e,t,n,i,s){return Zt(e)?e.call(t,n,i,s):pn(e)&&~e.indexOf("random(")?Ka(e):e},_0=Hd+"repeat,repeatDelay,yoyo,repeatRefresh,yoyoEase,easeReverse,autoRevert",x0={};Zn(_0+",id,stagger,delay,duration,paused,scrollTrigger",function(r){return x0[r]=1});var tn=(function(r){Xg(e,r);function e(n,i,s,a){var o;typeof i=="number"&&(s.duration=i,i=s,s=null),o=r.call(this,a?i:cl(i))||this;var l=o.vars,c=l.duration,u=l.delay,d=l.immediateRender,h=l.stagger,f=l.overwrite,m=l.keyframes,_=l.defaults,p=l.scrollTrigger,g=i.parent||Xt,S=(kn(n)||Yg(n)?Cr(n[0]):"length"in i)?[n]:Di(n),M,x,R,E,A,v,b,P;if(o._targets=S.length?Gd(S):dl("GSAP target "+n+" not found. https://gsap.com",!li.nullTargetWarn)||[],o._ptLookup=[],o._overwrite=f,m||h||Qu(c)||Qu(u)){i=o.vars;var C=i.easeReverse||i.yoyoEase;if(M=o.timeline=new Bn({data:"nested",defaults:_||{},targets:g&&g.data==="nested"?g.vars.targets:S}),M.kill(),M.parent=M._dp=wr(o),M._start=0,h||Qu(c)||Qu(u)){if(E=S.length,b=h&&o0(h),lr(h))for(A in h)~_0.indexOf(A)&&(P||(P={}),P[A]=h[A]);for(x=0;x<E;x++)R=rh(i,x0),R.stagger=0,C&&(R.easeReverse=C),P&&Ya(R,P),v=S[x],R.duration=+hl(c,wr(o),x,v,S),R.delay=(+hl(u,wr(o),x,v,S)||0)-o._delay,!h&&E===1&&R.delay&&(o._delay=u=R.delay,o._start+=u,R.delay=0),M.to(v,R,b?b(x,v,S):0),M._ease=yt.none;M.duration()?c=u=0:o.timeline=0}else if(m){cl(vi(M.vars.defaults,{ease:"none"})),M._ease=Vs(m.ease||i.ease||"none");var I=0,H,V,D;if(kn(m))m.forEach(function(O){return M.to(S,O,">")}),M.duration();else{R={};for(A in m)A==="ease"||A==="easeEach"||$1(A,m[A],R,m.easeEach);for(A in R)for(H=R[A].sort(function(O,F){return O.t-F.t}),I=0,x=0;x<H.length;x++)V=H[x],D={ease:V.e,duration:(V.t-(x?H[x-1].t:0))/100*c},D[A]=V.v,M.to(S,D,I),I+=D.duration;M.duration()<c&&M.to({},{duration:c-M.duration()})}}c||o.duration(c=M.duration())}else o.timeline=0;return f===!0&&!Fd&&(cs=wr(o),Xt.killTweensOf(S),cs=0),or(g,wr(o),s),i.reversed&&o.reverse(),i.paused&&o.paused(!0),(d||!c&&!m&&o._start===Wt(g._time)&&oi(d)&&w1(wr(o))&&g.data!=="nested")&&(o._tTime=-It,o.render(Math.max(0,-u)||0)),p&&i0(wr(o),p),o}var t=e.prototype;return t.render=function(i,s,a){var o=this._time,l=this._tDur,c=this._dur,u=i<0,d=i>l-It&&!u?l:i<It?0:i,h,f,m,_,p,g,S,M;if(!c)C1(this,i,s,a);else if(d!==this._tTime||!i||a||!this._initted&&this._tTime||this._startAt&&this._zTime<0!==u||this._lazy){if(h=d,M=this.timeline,this._repeat){if(_=c+this._rDelay,this._repeat<-1&&u)return this.totalTime(_*100+i,s,a);if(h=Wt(d%_),d===l?(m=this._repeat,h=c):(p=Wt(d/_),m=~~p,m&&m===p?(h=c,m--):h>c&&(h=c)),g=this._yoyo&&m&1,g&&(h=c-h),p=Za(this._tTime,_),h===o&&!a&&this._initted&&m===p)return this._tTime=d,this;m!==p&&this.vars.repeatRefresh&&!g&&!this._lock&&h!==_&&this._initted&&(this._lock=a=1,this.render(Wt(_*m),!0).invalidate()._lock=0)}if(!this._initted){if(r0(this,u?i:h,a,s,d))return this._tTime=0,this;if(o!==this._time&&!(a&&this.vars.repeatRefresh&&m!==p))return this;if(c!==this._dur)return this.render(i,s,a)}if(this._rEase){var x=h<o;if(x!==this._inv){var R=x?o:c-o;this._inv=x,this._from&&(this.ratio=1-this.ratio),this._invRatio=this.ratio,this._invTime=o,this._invRecip=R?(x?-1:1)/R:0,this._invScale=x?-this.ratio:1-this.ratio,this._invEase=x?this._rEase:this._ease}this.ratio=S=this._invRatio+this._invScale*this._invEase((h-this._invTime)*this._invRecip)}else this.ratio=S=this._ease(h/c);if(this._from&&(this.ratio=S=1-S),this._tTime=d,this._time=h,!this._act&&this._ts&&(this._act=1,this._lazy=0),!o&&d&&!s&&!p&&(_i(this,"onStart"),this._tTime!==d))return this;for(f=this._pt;f;)f.r(S,f.d),f=f._next;M&&M.render(i<0?i:M._dur*M._ease(h/this._dur),s,a)||this._startAt&&(this._zTime=i),this._onUpdate&&!s&&(u&&Rd(this,i,s,a),_i(this,"onUpdate")),this._repeat&&m!==p&&this.vars.onRepeat&&!s&&this.parent&&_i(this,"onRepeat"),(d===this._tDur||!d)&&this._tTime===d&&(u&&!this._onUpdate&&Rd(this,i,!0,!0),(i||!c)&&(d===this._tDur&&this._ts>0||!d&&this._ts<0)&&fs(this,1),!s&&!(u&&!o)&&(d||o||g)&&(_i(this,d===l?"onComplete":"onReverseComplete",!0),this._prom&&!(d<l&&this.timeScale()>0)&&this._prom()))}return this},t.targets=function(){return this._targets},t.invalidate=function(i){return(!i||!this.vars.runBackwards)&&(this._startAt=0),this._pt=this._op=this._onUpdate=this._lazy=this.ratio=0,this._ptLookup=[],this.timeline&&this.timeline.invalidate(i),r.prototype.invalidate.call(this,i)},t.resetTo=function(i,s,a,o,l){ml||ai.wake(),this._ts||this.play();var c=Math.min(this._dur,(this._dp._time-this._start)*this._ts),u;return this._initted||$d(this,c),u=this._ease(c/this._dur),Z1(this,i,s,a,o,u,c,l)?this.resetTo(i,s,a,o,1):(hh(this,0),this.parent||t0(this._dp,this,"_first","_last",this._dp._sort?"_start":0),this.render(0))},t.kill=function(i,s){if(s===void 0&&(s="all"),!i&&(!s||s==="all"))return this._lazy=this._pt=0,this.parent?ol(this):this.scrollTrigger&&this.scrollTrigger.kill(!!Rn),this;if(this.timeline){var a=this.timeline.totalDuration();return this.timeline.killTweensOf(i,s,cs&&cs.vars.overwrite!==!0)._first||ol(this),this.parent&&a!==this.timeline.totalDuration()&&Ja(this,this._dur*this.timeline._tDur/a,0,1),this}var o=this._targets,l=i?Di(i):o,c=this._ptLookup,u=this._pt,d,h,f,m,_,p,g;if((!s||s==="all")&&T1(o,l))return s==="all"&&(this._pt=0),ol(this);for(d=this._op=this._op||[],s!=="all"&&(pn(s)&&(_={},Zn(s,function(S){return _[S]=1}),s=_),s=J1(o,s)),g=o.length;g--;)if(~l.indexOf(o[g])){h=c[g],s==="all"?(d[g]=s,m=h,f={}):(f=d[g]=d[g]||{},m=s);for(_ in m)p=h&&h[_],p&&((!("kill"in p.d)||p.d.kill(_)===!0)&&ch(this,p,"_pt"),delete h[_]),f!=="all"&&(f[_]=1)}return this._initted&&!this._pt&&u&&ol(this),this},e.to=function(i,s){return new e(i,s,arguments[2])},e.from=function(i,s){return ul(1,arguments)},e.delayedCall=function(i,s,a,o){return new e(s,0,{immediateRender:!1,lazy:!1,overwrite:!1,delay:i,onComplete:s,onReverseComplete:s,onCompleteParams:a,onReverseCompleteParams:a,callbackScope:o})},e.fromTo=function(i,s,a){return ul(2,arguments)},e.set=function(i,s){return s.duration=0,s.repeatDelay||(s.repeat=0),new e(i,s)},e.killTweensOf=function(i,s,a){return Xt.killTweensOf(i,s,a)},e})(gl);vi(tn.prototype,{_targets:[],_lazy:0,_startAt:0,_op:0,_onInit:0});Zn("staggerTo,staggerFrom,staggerFromTo",function(r){tn[r]=function(){var e=new Bn,t=Id.call(arguments,0);return t.splice(r==="staggerFromTo"?5:4,0,0),e[r].apply(e,t)}});var Kd=function(e,t,n){return e[t]=n},v0=function(e,t,n){return e[t](n)},K1=function(e,t,n,i){return e[t](i.fp,n)},Q1=function(e,t,n){return e.setAttribute(t,n)},fh=function(e,t){return Zt(e[t])?v0:oh(e[t])&&e.setAttribute?Q1:Kd},y0=function(e,t){return t.set(t.t,t.p,Math.round((t.s+t.c*e)*1e6)/1e6,t)},j1=function(e,t){return t.set(t.t,t.p,!!(t.s+t.c*e),t)},Qd=function(e,t){var n=t._pt,i="";if(!e&&t.b)i=t.b;else if(e===1&&t.e)i=t.e;else{for(;n;)i=n.p+(n.m?n.m(n.s+n.c*e):Math.round((n.s+n.c*e)*1e4)/1e4)+i,n=n._next;i+=t.c}t.set(t.t,t.p,i,t)},jd=function(e,t){for(var n=t._pt;n;)n.r(e,n.d),n=n._next},eT=function(e,t,n,i){for(var s=this._pt,a;s;)a=s._next,s.p===i&&s.modifier(e,t,n),s=a},tT=function(e){for(var t=this._pt,n,i;t;)i=t._next,t.p===e&&!t.op||t.op===e?ch(this,t,"_pt"):t.dep||(n=1),t=i;return!n},nT=function(e,t,n,i){i.mSet(e,t,i.m.call(i.tween,n,i.mt),i)},ep=function(e){for(var t=e._pt,n,i,s,a;t;){for(n=t._next,i=s;i&&i.pr>t.pr;)i=i._next;(t._prev=i?i._prev:a)?t._prev._next=t:s=t,(t._next=i)?i._prev=t:a=t,t=n}e._pt=s},Jn=(function(){function r(t,n,i,s,a,o,l,c,u){this.t=n,this.s=s,this.c=a,this.p=i,this.r=o||y0,this.d=l||this,this.set=c||Kd,this.pr=u||0,this._next=t,t&&(t._prev=this)}var e=r.prototype;return e.modifier=function(n,i,s){this.mSet=this.mSet||this.set,this.set=nT,this.m=n,this.mt=s,this.tween=i},r})();Zn(Hd+"parent,duration,ease,delay,overwrite,runBackwards,startAt,yoyo,immediateRender,repeat,repeatDelay,data,paused,reversed,lazy,callbackScope,stringFilter,id,yoyoEase,stagger,inherit,repeatRefresh,keyframes,autoRevert,scrollTrigger,easeReverse",function(r){return Vd[r]=1});xi.TweenMax=xi.TweenLite=tn;xi.TimelineLite=xi.TimelineMax=Bn;Xt=new Bn({sortChildren:!1,defaults:fl,autoRemoveChildren:!0,id:"root",smoothChildTiming:!0});li.stringFilter=qd;var Hs=[],th={},iT=[],Wg=0,rT=0,Td=function(e){return(th[e]||iT).map(function(t){return t()})},Nd=function(){var e=Date.now(),t=[];e-Wg>2&&(Td("matchMediaInit"),Hs.forEach(function(n){var i=n.queries,s=n.conditions,a,o,l,c;for(o in i)a=ar.matchMedia(i[o]).matches,a&&(l=1),a!==s[o]&&(s[o]=a,c=1);c&&(n.revert(),l&&t.push(n))}),Td("matchMediaRevert"),t.forEach(function(n){return n.onMatch(n,function(i){return n.add(null,i)})}),Wg=e,Td("matchMedia"))},S0=(function(){function r(t,n){this.selector=n&&Dd(n),this.data=[],this._r=[],this.isReverted=!1,this.id=rT++,t&&this.add(t)}var e=r.prototype;return e.add=function(n,i,s){Zt(n)&&(s=i,i=n,n=Zt);var a=this,o=function(){var c=kt,u=a.selector,d;return c&&c!==a&&c.data.push(a),s&&(a.selector=Dd(s)),kt=a,d=i.apply(a,arguments),Zt(d)&&a._r.push(d),kt=c,a.selector=u,a.isReverted=!1,d};return a.last=o,n===Zt?o(a,function(l){return a.add(null,l)}):n?a[n]=o:o},e.ignore=function(n){var i=kt;kt=null,n(this),kt=i},e.getTweens=function(){var n=[];return this.data.forEach(function(i){return i instanceof r?n.push.apply(n,i.getTweens()):i instanceof tn&&!(i.parent&&i.parent.data==="nested")&&n.push(i)}),n},e.clear=function(){this._r.length=this.data.length=0},e.kill=function(n,i){var s=this;if(n?(function(){for(var o=s.getTweens(),l=s.data.length,c;l--;)c=s.data[l],c.data==="isFlip"&&(c.revert(),c.getChildren(!0,!0,!1).forEach(function(u){return o.splice(o.indexOf(u),1)}));for(o.map(function(u){return{g:u._dur||u._delay||u._sat&&!u._sat.vars.immediateRender?u.globalTime(0):-1/0,t:u}}).sort(function(u,d){return d.g-u.g||-1/0}).forEach(function(u){return u.t.revert(n)}),l=s.data.length;l--;)c=s.data[l],c instanceof Bn?c.data!=="nested"&&(c.scrollTrigger&&c.scrollTrigger.revert(),c.kill()):!(c instanceof tn)&&c.revert&&c.revert(n);s._r.forEach(function(u){return u(n,s)}),s.isReverted=!0})():this.data.forEach(function(o){return o.kill&&o.kill()}),this.clear(),i)for(var a=Hs.length;a--;)Hs[a].id===this.id&&Hs.splice(a,1)},e.revert=function(n){this.kill(n||{})},r})(),sT=(function(){function r(t){this.contexts=[],this.scope=t,kt&&kt.data.push(this)}var e=r.prototype;return e.add=function(n,i,s){lr(n)||(n={matches:n});var a=new S0(0,s||this.scope),o=a.conditions={},l,c,u;kt&&!a.selector&&(a.selector=kt.selector),this.contexts.push(a),i=a.add("onMatch",i),a.queries=n;for(c in n)c==="all"?u=1:(l=ar.matchMedia(n[c]),l&&(Hs.indexOf(a)<0&&Hs.push(a),(o[c]=l.matches)&&(u=1),l.addListener?l.addListener(Nd):l.addEventListener("change",Nd)));return u&&i(a,function(d){return a.add(null,d)}),this},e.revert=function(n){this.kill(n||{})},e.kill=function(n){this.contexts.forEach(function(i){return i.kill(n,!0)})},r})(),ah={registerPlugin:function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];t.forEach(function(i){return d0(i)})},timeline:function(e){return new Bn(e)},getTweensOf:function(e,t){return Xt.getTweensOf(e,t)},getProperty:function(e,t,n,i){pn(e)&&(e=Di(e)[0]);var s=hs(e||{}).get,a=n?e0:jg;return n==="native"&&(n=""),e&&(t?a((si[t]&&si[t].get||s)(e,t,n,i)):function(o,l,c){return a((si[o]&&si[o].get||s)(e,o,l,c))})},quickSetter:function(e,t,n){if(e=Di(e),e.length>1){var i=e.map(function(u){return zn.quickSetter(u,t,n)}),s=i.length;return function(u){for(var d=s;d--;)i[d](u)}}e=e[0]||{};var a=si[t],o=hs(e),l=o.harness&&(o.harness.aliases||{})[t]||t,c=a?function(u){var d=new a;qa._pt=0,d.init(e,n?u+n:u,qa,0,[e]),d.render(1,d),qa._pt&&jd(1,qa)}:o.set(e,l);return a?c:function(u){return c(e,l,n?u+n:u,o,1)}},quickTo:function(e,t,n){var i,s=zn.to(e,vi((i={},i[t]="+=0.1",i.paused=!0,i.stagger=0,i),n||{})),a=function(l,c,u){return s.resetTo(t,l,c,u)};return a.tween=s,a},isTweening:function(e){return Xt.getTweensOf(e,!0).length>0},defaults:function(e){return e&&e.ease&&(e.ease=Vs(e.ease,fl.ease)),kg(fl,e||{})},config:function(e){return kg(li,e||{})},registerEffect:function(e){var t=e.name,n=e.effect,i=e.plugins,s=e.defaults,a=e.extendTimeline;(i||"").split(",").forEach(function(o){return o&&!si[o]&&!xi[o]&&dl(t+" effect requires "+o+" plugin.")}),yd[t]=function(o,l,c){return n(Di(o),vi(l||{},s),c)},a&&(Bn.prototype[t]=function(o,l,c){return this.add(yd[t](o,lr(l)?l:(c=l)&&{},this),c)})},registerEase:function(e,t){yt[e]=Vs(t)},parseEase:function(e,t){return arguments.length?Vs(e,t):yt},getById:function(e){return Xt.getById(e)},exportRoot:function(e,t){e===void 0&&(e={});var n=new Bn(e),i,s;for(n.smoothChildTiming=oi(e.smoothChildTiming),Xt.remove(n),n._dp=0,n._time=n._tTime=Xt._time,i=Xt._first;i;)s=i._next,(t||!(!i._dur&&i instanceof tn&&i.vars.onComplete===i._targets[0]))&&or(n,i,i._start-i._delay),i=s;return or(Xt,n,0),n},context:function(e,t){return e?new S0(e,t):kt},matchMedia:function(e){return new sT(e)},matchMediaRefresh:function(){return Hs.forEach(function(e){var t=e.conditions,n,i;for(i in t)t[i]&&(t[i]=!1,n=1);n&&e.revert()})||Nd()},addEventListener:function(e,t){var n=th[e]||(th[e]=[]);~n.indexOf(t)||n.push(t)},removeEventListener:function(e,t){var n=th[e],i=n&&n.indexOf(t);i>=0&&n.splice(i,1)},utils:{wrap:F1,wrapYoyo:O1,distribute:o0,random:c0,snap:l0,normalize:N1,getUnit:Pn,clamp:I1,splitColor:p0,toArray:Di,selector:Dd,mapRange:h0,pipe:L1,unitize:U1,interpolate:B1,shuffle:a0},install:Jg,effects:yd,ticker:ai,updateRoot:Bn.updateRoot,plugins:si,globalTimeline:Xt,core:{PropTween:Jn,globals:$g,Tween:tn,Timeline:Bn,Animation:gl,getCache:hs,_removeLinkedListItem:ch,reverting:function(){return Rn},context:function(e){return e&&kt&&(kt.data.push(e),e._ctx=kt),kt},suppressOverwrites:function(e){return Fd=e}}};Zn("to,from,fromTo,delayedCall,set,killTweensOf",function(r){return ah[r]=tn[r]});ai.add(Bn.updateRoot);qa=ah.to({},{duration:0});var aT=function(e,t){for(var n=e._pt;n&&n.p!==t&&n.op!==t&&n.fp!==t;)n=n._next;return n},oT=function(e,t){var n=e._targets,i,s,a;for(i in t)for(s=n.length;s--;)a=e._ptLookup[s][i],a&&(a=a.d)&&(a._pt&&(a=aT(a,i)),a&&a.modifier&&a.modifier(t[i],e,n[s],i))},Ed=function(e,t){return{name:e,headless:1,rawVars:1,init:function(i,s,a){a._onInit=function(o){var l,c;if(pn(s)&&(l={},Zn(s,function(u){return l[u]=1}),s=l),t){l={};for(c in s)l[c]=t(s[c]);s=l}oT(o,s)}}}},zn=ah.registerPlugin({name:"attr",init:function(e,t,n,i,s){var a,o,l;this.tween=n;for(a in t)l=e.getAttribute(a)||"",o=this.add(e,"setAttribute",(l||0)+"",t[a],i,s,0,0,a),o.op=a,o.b=l,this._props.push(a)},render:function(e,t){for(var n=t._pt;n;)Rn?n.set(n.t,n.p,n.b,n):n.r(e,n.d),n=n._next}},{name:"endArray",headless:1,init:function(e,t){for(var n=t.length;n--;)this.add(e,n,e[n]||0,t[n],0,0,0,0,0,1)}},Ed("roundProps",Ld),Ed("modifiers"),Ed("snap",l0))||ah;tn.version=Bn.version=zn.version="3.15.0";Zg=1;Od()&&$a();var lT=yt.Power0,cT=yt.Power1,uT=yt.Power2,hT=yt.Power3,fT=yt.Power4,dT=yt.Linear,pT=yt.Quad,mT=yt.Cubic,gT=yt.Quart,_T=yt.Quint,xT=yt.Strong,vT=yt.Elastic,yT=yt.Back,ST=yt.SteppedEase,MT=yt.Bounce,bT=yt.Sine,TT=yt.Expo,ET=yt.Circ;var M0,ps,ja,ap,Js,wT,b0,op,AT=function(){return typeof window<"u"},Pr={},Zs=180/Math.PI,eo=Math.PI/180,Qa=Math.atan2,T0=1e8,lp=/([A-Z])/g,CT=/(left|right|width|margin|padding|x)/i,RT=/[\s,\(]\S/,cr={autoAlpha:"opacity,visibility",scale:"scaleX,scaleY",alpha:"opacity"},np=function(e,t){return t.set(t.t,t.p,Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},PT=function(e,t){return t.set(t.t,t.p,e===1?t.e:Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},IT=function(e,t){return t.set(t.t,t.p,e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},DT=function(e,t){return t.set(t.t,t.p,e===1?t.e:e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},LT=function(e,t){var n=t.s+t.c*e;t.set(t.t,t.p,~~(n+(n<0?-.5:.5))+t.u,t)},D0=function(e,t){return t.set(t.t,t.p,e?t.e:t.b,t)},L0=function(e,t){return t.set(t.t,t.p,e!==1?t.b:t.e,t)},UT=function(e,t,n){return e.style[t]=n},NT=function(e,t,n){return e.style.setProperty(t,n)},FT=function(e,t,n){return e._gsap[t]=n},OT=function(e,t,n){return e._gsap.scaleX=e._gsap.scaleY=n},BT=function(e,t,n,i,s){var a=e._gsap;a.scaleX=a.scaleY=n,a.renderTransform(s,a)},kT=function(e,t,n,i,s){var a=e._gsap;a[t]=n,a.renderTransform(s,a)},qt="transform",ci=qt+"Origin",zT=function r(e,t){var n=this,i=this.target,s=i.style,a=i._gsap;if(e in Pr&&s){if(this.tfm=this.tfm||{},e!=="transform")e=cr[e]||e,~e.indexOf(",")?e.split(",").forEach(function(o){return n.tfm[o]=Rr(i,o)}):this.tfm[e]=a.x?a[e]:Rr(i,e),e===ci&&(this.tfm.zOrigin=a.zOrigin);else return cr.transform.split(",").forEach(function(o){return r.call(n,o,t)});if(this.props.indexOf(qt)>=0)return;a.svg&&(this.svgo=i.getAttribute("data-svg-origin"),this.props.push(ci,t,"")),e=qt}(s||t)&&this.props.push(e,t,s[e])},U0=function(e){e.translate&&(e.removeProperty("translate"),e.removeProperty("scale"),e.removeProperty("rotate"))},VT=function(){var e=this.props,t=this.target,n=t.style,i=t._gsap,s,a;for(s=0;s<e.length;s+=3)e[s+1]?e[s+1]===2?t[e[s]](e[s+2]):t[e[s]]=e[s+2]:e[s+2]?n[e[s]]=e[s+2]:n.removeProperty(e[s].substr(0,2)==="--"?e[s]:e[s].replace(lp,"-$1").toLowerCase());if(this.tfm){for(a in this.tfm)i[a]=this.tfm[a];i.svg&&(i.renderTransform(),t.setAttribute("data-svg-origin",this.svgo||"")),s=op(),(!s||!s.isStart)&&!n[qt]&&(U0(n),i.zOrigin&&n[ci]&&(n[ci]+=" "+i.zOrigin+"px",i.zOrigin=0,i.renderTransform()),i.uncache=1)}},N0=function(e,t){var n={target:e,props:[],revert:VT,save:zT};return e._gsap||zn.core.getCache(e),t&&e.style&&e.nodeType&&t.split(",").forEach(function(i){return n.save(i)}),n},F0,ip=function(e,t){var n=ps.createElementNS?ps.createElementNS((t||"http://www.w3.org/1999/xhtml").replace(/^https/,"http"),e):ps.createElement(e);return n&&n.style?n:ps.createElement(e)},yi=function r(e,t,n){var i=getComputedStyle(e);return i[t]||i.getPropertyValue(t.replace(lp,"-$1").toLowerCase())||i.getPropertyValue(t)||!n&&r(e,to(t)||t,1)||""},E0="O,Moz,ms,Ms,Webkit".split(","),to=function(e,t,n){var i=t||Js,s=i.style,a=5;if(e in s&&!n)return e;for(e=e.charAt(0).toUpperCase()+e.substr(1);a--&&!(E0[a]+e in s););return a<0?null:(a===3?"ms":a>=0?E0[a]:"")+e},rp=function(){AT()&&window.document&&(M0=window,ps=M0.document,ja=ps.documentElement,Js=ip("div")||{style:{}},wT=ip("div"),qt=to(qt),ci=qt+"Origin",Js.style.cssText="border-width:0;line-height:0;position:absolute;padding:0",F0=!!to("perspective"),op=zn.core.reverting,ap=1)},w0=function(e){var t=e.ownerSVGElement,n=ip("svg",t&&t.getAttribute("xmlns")||"http://www.w3.org/2000/svg"),i=e.cloneNode(!0),s;i.style.display="block",n.appendChild(i),ja.appendChild(n);try{s=i.getBBox()}catch{}return n.removeChild(i),ja.removeChild(n),s},A0=function(e,t){for(var n=t.length;n--;)if(e.hasAttribute(t[n]))return e.getAttribute(t[n])},O0=function(e){var t,n;try{t=e.getBBox()}catch{t=w0(e),n=1}return t&&(t.width||t.height)||n||(t=w0(e)),t&&!t.width&&!t.x&&!t.y?{x:+A0(e,["x","cx","x1"])||0,y:+A0(e,["y","cy","y1"])||0,width:0,height:0}:t},B0=function(e){return!!(e.getCTM&&(!e.parentNode||e.ownerSVGElement)&&O0(e))},gs=function(e,t){if(t){var n=e.style,i;t in Pr&&t!==ci&&(t=qt),n.removeProperty?(i=t.substr(0,2),(i==="ms"||t.substr(0,6)==="webkit")&&(t="-"+t),n.removeProperty(i==="--"?t:t.replace(lp,"-$1").toLowerCase())):n.removeAttribute(t)}},ms=function(e,t,n,i,s,a){var o=new Jn(e._pt,t,n,0,1,a?L0:D0);return e._pt=o,o.b=i,o.e=s,e._props.push(n),o},C0={deg:1,rad:1,turn:1},HT={grid:1,flex:1},_s=function r(e,t,n,i){var s=parseFloat(n)||0,a=(n+"").trim().substr((s+"").length)||"px",o=Js.style,l=CT.test(t),c=e.tagName.toLowerCase()==="svg",u=(c?"client":"offset")+(l?"Width":"Height"),d=100,h=i==="px",f=i==="%",m,_,p,g;if(i===a||!s||C0[i]||C0[a])return s;if(a!=="px"&&!h&&(s=r(e,t,n,"px")),g=e.getCTM&&B0(e),(f||a==="%")&&(Pr[t]||~t.indexOf("adius")))return m=g?e.getBBox()[l?"width":"height"]:e[u],Jt(f?s/m*d:s/100*m);if(o[l?"width":"height"]=d+(h?a:i),_=i!=="rem"&&~t.indexOf("adius")||i==="em"&&e.appendChild&&!c?e:e.parentNode,g&&(_=(e.ownerSVGElement||{}).parentNode),(!_||_===ps||!_.appendChild)&&(_=ps.body),p=_._gsap,p&&f&&p.width&&l&&p.time===ai.time&&!p.uncache)return Jt(s/p.width*d);if(f&&(t==="height"||t==="width")){var S=e.style[t];e.style[t]=d+i,m=e[u],S?e.style[t]=S:gs(e,t)}else(f||a==="%")&&!HT[yi(_,"display")]&&(o.position=yi(e,"position")),_===e&&(o.position="static"),_.appendChild(Js),m=Js[u],_.removeChild(Js),o.position="absolute";return l&&f&&(p=hs(_),p.time=ai.time,p.width=_[u]),Jt(h?m*s/d:m&&s?d/m*s:0)},Rr=function(e,t,n,i){var s;return ap||rp(),t in cr&&t!=="transform"&&(t=cr[t],~t.indexOf(",")&&(t=t.split(",")[0])),Pr[t]&&t!=="transform"?(s=yl(e,i),s=t!=="transformOrigin"?s[t]:s.svg?s.origin:ph(yi(e,ci))+" "+s.zOrigin+"px"):(s=e.style[t],(!s||s==="auto"||i||~(s+"").indexOf("calc("))&&(s=dh[t]&&dh[t](e,t,n)||yi(e,t)||Wd(e,t)||(t==="opacity"?1:0))),n&&!~(s+"").trim().indexOf(" ")?_s(e,t,s,n)+n:s},GT=function(e,t,n,i){if(!n||n==="none"){var s=to(t,e,1),a=s&&yi(e,s,1);a&&a!==n?(t=s,n=a):t==="borderColor"&&(n=yi(e,"borderTopColor"))}var o=new Jn(this._pt,e.style,t,0,1,Qd),l=0,c=0,u,d,h,f,m,_,p,g,S,M,x,R;if(o.b=n,o.e=i,n+="",i+="",i.substring(0,6)==="var(--"&&(i=yi(e,i.substring(4,i.indexOf(")")))),i==="auto"&&(_=e.style[t],e.style[t]=i,i=yi(e,t)||i,_?e.style[t]=_:gs(e,t)),u=[n,i],qd(u),n=u[0],i=u[1],h=n.match(Gs)||[],R=i.match(Gs)||[],R.length){for(;d=Gs.exec(i);)p=d[0],S=i.substring(l,d.index),m?m=(m+1)%5:(S.substr(-5)==="rgba("||S.substr(-5)==="hsla(")&&(m=1),p!==(_=h[c++]||"")&&(f=parseFloat(_)||0,x=_.substr((f+"").length),p.charAt(1)==="="&&(p=Ws(f,p)+x),g=parseFloat(p),M=p.substr((g+"").length),l=Gs.lastIndex-M.length,M||(M=M||li.units[t]||x,l===i.length&&(i+=M,o.e+=M)),x!==M&&(f=_s(e,t,_,M)||0),o._pt={_next:o._pt,p:S||c===1?S:",",s:f,c:g-f,m:m&&m<4||t==="zIndex"?Math.round:0});o.c=l<i.length?i.substring(l,i.length):""}else o.r=t==="display"&&i==="none"?L0:D0;return kd.test(i)&&(o.e=0),this._pt=o,o},R0={top:"0%",bottom:"100%",left:"0%",right:"100%",center:"50%"},WT=function(e){var t=e.split(" "),n=t[0],i=t[1]||"50%";return(n==="top"||n==="bottom"||i==="left"||i==="right")&&(e=n,n=i,i=e),t[0]=R0[n]||n,t[1]=R0[i]||i,t.join(" ")},XT=function(e,t){if(t.tween&&t.tween._time===t.tween._dur){var n=t.t,i=n.style,s=t.u,a=n._gsap,o,l,c;if(s==="all"||s===!0)i.cssText="",l=1;else for(s=s.split(","),c=s.length;--c>-1;)o=s[c],Pr[o]&&(l=1,o=o==="transformOrigin"?ci:qt),gs(n,o);l&&(gs(n,qt),a&&(a.svg&&n.removeAttribute("transform"),i.scale=i.rotate=i.translate="none",yl(n,1),a.uncache=1,U0(i)))}},dh={clearProps:function(e,t,n,i,s){if(s.data!=="isFromStart"){var a=e._pt=new Jn(e._pt,t,n,0,0,XT);return a.u=i,a.pr=-10,a.tween=s,e._props.push(n),1}}},vl=[1,0,0,1,0,0],k0={},z0=function(e){return e==="matrix(1, 0, 0, 1, 0, 0)"||e==="none"||!e},P0=function(e){var t=yi(e,qt);return z0(t)?vl:t.substr(7).match(Bd).map(Jt)},cp=function(e,t){var n=e._gsap||hs(e),i=e.style,s=P0(e),a,o,l,c;return n.svg&&e.getAttribute("transform")?(l=e.transform.baseVal.consolidate().matrix,s=[l.a,l.b,l.c,l.d,l.e,l.f],s.join(",")==="1,0,0,1,0,0"?vl:s):(s===vl&&!e.offsetParent&&e!==ja&&!n.svg&&(l=i.display,i.display="block",a=e.parentNode,(!a||!e.offsetParent&&!e.getBoundingClientRect().width)&&(c=1,o=e.nextElementSibling,ja.appendChild(e)),s=P0(e),l?i.display=l:gs(e,"display"),c&&(o?a.insertBefore(e,o):a?a.appendChild(e):ja.removeChild(e))),t&&s.length>6?[s[0],s[1],s[4],s[5],s[12],s[13]]:s)},sp=function(e,t,n,i,s,a){var o=e._gsap,l=s||cp(e,!0),c=o.xOrigin||0,u=o.yOrigin||0,d=o.xOffset||0,h=o.yOffset||0,f=l[0],m=l[1],_=l[2],p=l[3],g=l[4],S=l[5],M=t.split(" "),x=parseFloat(M[0])||0,R=parseFloat(M[1])||0,E,A,v,b;n?l!==vl&&(A=f*p-m*_)&&(v=x*(p/A)+R*(-_/A)+(_*S-p*g)/A,b=x*(-m/A)+R*(f/A)-(f*S-m*g)/A,x=v,R=b):(E=O0(e),x=E.x+(~M[0].indexOf("%")?x/100*E.width:x),R=E.y+(~(M[1]||M[0]).indexOf("%")?R/100*E.height:R)),i||i!==!1&&o.smooth?(g=x-c,S=R-u,o.xOffset=d+(g*f+S*_)-g,o.yOffset=h+(g*m+S*p)-S):o.xOffset=o.yOffset=0,o.xOrigin=x,o.yOrigin=R,o.smooth=!!i,o.origin=t,o.originIsAbsolute=!!n,e.style[ci]="0px 0px",a&&(ms(a,o,"xOrigin",c,x),ms(a,o,"yOrigin",u,R),ms(a,o,"xOffset",d,o.xOffset),ms(a,o,"yOffset",h,o.yOffset)),e.setAttribute("data-svg-origin",x+" "+R)},yl=function(e,t){var n=e._gsap||new Yd(e);if("x"in n&&!t&&!n.uncache)return n;var i=e.style,s=n.scaleX<0,a="px",o="deg",l=getComputedStyle(e),c=yi(e,ci)||"0",u,d,h,f,m,_,p,g,S,M,x,R,E,A,v,b,P,C,I,H,V,D,O,F,Z,ee,L,ie,ye,Fe,ze,Oe;return u=d=h=_=p=g=S=M=x=0,f=m=1,n.svg=!!(e.getCTM&&B0(e)),l.translate&&((l.translate!=="none"||l.scale!=="none"||l.rotate!=="none")&&(i[qt]=(l.translate!=="none"?"translate3d("+(l.translate+" 0 0").split(" ").slice(0,3).join(", ")+") ":"")+(l.rotate!=="none"?"rotate("+l.rotate+") ":"")+(l.scale!=="none"?"scale("+l.scale.split(" ").join(",")+") ":"")+(l[qt]!=="none"?l[qt]:"")),i.scale=i.rotate=i.translate="none"),A=cp(e,n.svg),n.svg&&(n.uncache?(Z=e.getBBox(),c=n.xOrigin-Z.x+"px "+(n.yOrigin-Z.y)+"px",F=""):F=!t&&e.getAttribute("data-svg-origin"),sp(e,F||c,!!F||n.originIsAbsolute,n.smooth!==!1,A)),R=n.xOrigin||0,E=n.yOrigin||0,A!==vl&&(C=A[0],I=A[1],H=A[2],V=A[3],u=D=A[4],d=O=A[5],A.length===6?(f=Math.sqrt(C*C+I*I),m=Math.sqrt(V*V+H*H),_=C||I?Qa(I,C)*Zs:0,S=H||V?Qa(H,V)*Zs+_:0,S&&(m*=Math.abs(Math.cos(S*eo))),n.svg&&(u-=R-(R*C+E*H),d-=E-(R*I+E*V))):(Oe=A[6],Fe=A[7],L=A[8],ie=A[9],ye=A[10],ze=A[11],u=A[12],d=A[13],h=A[14],v=Qa(Oe,ye),p=v*Zs,v&&(b=Math.cos(-v),P=Math.sin(-v),F=D*b+L*P,Z=O*b+ie*P,ee=Oe*b+ye*P,L=D*-P+L*b,ie=O*-P+ie*b,ye=Oe*-P+ye*b,ze=Fe*-P+ze*b,D=F,O=Z,Oe=ee),v=Qa(-H,ye),g=v*Zs,v&&(b=Math.cos(-v),P=Math.sin(-v),F=C*b-L*P,Z=I*b-ie*P,ee=H*b-ye*P,ze=V*P+ze*b,C=F,I=Z,H=ee),v=Qa(I,C),_=v*Zs,v&&(b=Math.cos(v),P=Math.sin(v),F=C*b+I*P,Z=D*b+O*P,I=I*b-C*P,O=O*b-D*P,C=F,D=Z),p&&Math.abs(p)+Math.abs(_)>359.9&&(p=_=0,g=180-g),f=Jt(Math.sqrt(C*C+I*I+H*H)),m=Jt(Math.sqrt(O*O+Oe*Oe)),v=Qa(D,O),S=Math.abs(v)>2e-4?v*Zs:0,x=ze?1/(ze<0?-ze:ze):0),n.svg&&(F=e.getAttribute("transform"),n.forceCSS=e.setAttribute("transform","")||!z0(yi(e,qt)),F&&e.setAttribute("transform",F))),Math.abs(S)>90&&Math.abs(S)<270&&(s?(f*=-1,S+=_<=0?180:-180,_+=_<=0?180:-180):(m*=-1,S+=S<=0?180:-180)),t=t||n.uncache,n.x=u-((n.xPercent=u&&(!t&&n.xPercent||(Math.round(e.offsetWidth/2)===Math.round(-u)?-50:0)))?e.offsetWidth*n.xPercent/100:0)+a,n.y=d-((n.yPercent=d&&(!t&&n.yPercent||(Math.round(e.offsetHeight/2)===Math.round(-d)?-50:0)))?e.offsetHeight*n.yPercent/100:0)+a,n.z=h+a,n.scaleX=Jt(f),n.scaleY=Jt(m),n.rotation=Jt(_)+o,n.rotationX=Jt(p)+o,n.rotationY=Jt(g)+o,n.skewX=S+o,n.skewY=M+o,n.transformPerspective=x+a,(n.zOrigin=parseFloat(c.split(" ")[2])||!t&&n.zOrigin||0)&&(i[ci]=ph(c)),n.xOffset=n.yOffset=0,n.force3D=li.force3D,n.renderTransform=n.svg?YT:F0?V0:qT,n.uncache=0,n},ph=function(e){return(e=e.split(" "))[0]+" "+e[1]},tp=function(e,t,n){var i=Pn(t);return Jt(parseFloat(t)+parseFloat(_s(e,"x",n+"px",i)))+i},qT=function(e,t){t.z="0px",t.rotationY=t.rotationX="0deg",t.force3D=0,V0(e,t)},qs="0deg",xl="0px",Ys=") ",V0=function(e,t){var n=t||this,i=n.xPercent,s=n.yPercent,a=n.x,o=n.y,l=n.z,c=n.rotation,u=n.rotationY,d=n.rotationX,h=n.skewX,f=n.skewY,m=n.scaleX,_=n.scaleY,p=n.transformPerspective,g=n.force3D,S=n.target,M=n.zOrigin,x="",R=g==="auto"&&e&&e!==1||g===!0;if(M&&(d!==qs||u!==qs)){var E=parseFloat(u)*eo,A=Math.sin(E),v=Math.cos(E),b;E=parseFloat(d)*eo,b=Math.cos(E),a=tp(S,a,A*b*-M),o=tp(S,o,-Math.sin(E)*-M),l=tp(S,l,v*b*-M+M)}p!==xl&&(x+="perspective("+p+Ys),(i||s)&&(x+="translate("+i+"%, "+s+"%) "),(R||a!==xl||o!==xl||l!==xl)&&(x+=l!==xl||R?"translate3d("+a+", "+o+", "+l+") ":"translate("+a+", "+o+Ys),c!==qs&&(x+="rotate("+c+Ys),u!==qs&&(x+="rotateY("+u+Ys),d!==qs&&(x+="rotateX("+d+Ys),(h!==qs||f!==qs)&&(x+="skew("+h+", "+f+Ys),(m!==1||_!==1)&&(x+="scale("+m+", "+_+Ys),S.style[qt]=x||"translate(0, 0)"},YT=function(e,t){var n=t||this,i=n.xPercent,s=n.yPercent,a=n.x,o=n.y,l=n.rotation,c=n.skewX,u=n.skewY,d=n.scaleX,h=n.scaleY,f=n.target,m=n.xOrigin,_=n.yOrigin,p=n.xOffset,g=n.yOffset,S=n.forceCSS,M=parseFloat(a),x=parseFloat(o),R,E,A,v,b;l=parseFloat(l),c=parseFloat(c),u=parseFloat(u),u&&(u=parseFloat(u),c+=u,l+=u),l||c?(l*=eo,c*=eo,R=Math.cos(l)*d,E=Math.sin(l)*d,A=Math.sin(l-c)*-h,v=Math.cos(l-c)*h,c&&(u*=eo,b=Math.tan(c-u),b=Math.sqrt(1+b*b),A*=b,v*=b,u&&(b=Math.tan(u),b=Math.sqrt(1+b*b),R*=b,E*=b)),R=Jt(R),E=Jt(E),A=Jt(A),v=Jt(v)):(R=d,v=h,E=A=0),(M&&!~(a+"").indexOf("px")||x&&!~(o+"").indexOf("px"))&&(M=_s(f,"x",a,"px"),x=_s(f,"y",o,"px")),(m||_||p||g)&&(M=Jt(M+m-(m*R+_*A)+p),x=Jt(x+_-(m*E+_*v)+g)),(i||s)&&(b=f.getBBox(),M=Jt(M+i/100*b.width),x=Jt(x+s/100*b.height)),b="matrix("+R+","+E+","+A+","+v+","+M+","+x+")",f.setAttribute("transform",b),S&&(f.style[qt]=b)},ZT=function(e,t,n,i,s){var a=360,o=pn(s),l=parseFloat(s)*(o&&~s.indexOf("rad")?Zs:1),c=l-i,u=i+c+"deg",d,h;return o&&(d=s.split("_")[1],d==="short"&&(c%=a,c!==c%(a/2)&&(c+=c<0?a:-a)),d==="cw"&&c<0?c=(c+a*T0)%a-~~(c/a)*a:d==="ccw"&&c>0&&(c=(c-a*T0)%a-~~(c/a)*a)),e._pt=h=new Jn(e._pt,t,n,i,c,PT),h.e=u,h.u="deg",e._props.push(n),h},I0=function(e,t){for(var n in t)e[n]=t[n];return e},JT=function(e,t,n){var i=I0({},n._gsap),s="perspective,force3D,transformOrigin,svgOrigin",a=n.style,o,l,c,u,d,h,f,m;i.svg?(c=n.getAttribute("transform"),n.setAttribute("transform",""),a[qt]=t,o=yl(n,1),gs(n,qt),n.setAttribute("transform",c)):(c=getComputedStyle(n)[qt],a[qt]=t,o=yl(n,1),a[qt]=c);for(l in Pr)c=i[l],u=o[l],c!==u&&s.indexOf(l)<0&&(f=Pn(c),m=Pn(u),d=f!==m?_s(n,l,c,m):parseFloat(c),h=parseFloat(u),e._pt=new Jn(e._pt,o,l,d,h-d,np),e._pt.u=m||0,e._props.push(l));I0(o,i)};Zn("padding,margin,Width,Radius",function(r,e){var t="Top",n="Right",i="Bottom",s="Left",a=(e<3?[t,n,i,s]:[t+s,t+n,i+n,i+s]).map(function(o){return e<2?r+o:"border"+o+r});dh[e>1?"border"+r:r]=function(o,l,c,u,d){var h,f;if(arguments.length<4)return h=a.map(function(m){return Rr(o,m,c)}),f=h.join(" "),f.split(h[0]).length===5?h[0]:f;h=(u+"").split(" "),f={},a.forEach(function(m,_){return f[m]=h[_]=h[_]||h[(_-1)/2|0]}),o.init(l,f,d)}});var up={name:"css",register:rp,targetTest:function(e){return e.style&&e.nodeType},init:function(e,t,n,i,s){var a=this._props,o=e.style,l=n.vars.startAt,c,u,d,h,f,m,_,p,g,S,M,x,R,E,A,v,b;ap||rp(),this.styles=this.styles||N0(e),v=this.styles.props,this.tween=n;for(_ in t)if(_!=="autoRound"&&(u=t[_],!(si[_]&&Jd(_,t,n,i,e,s)))){if(f=typeof u,m=dh[_],f==="function"&&(u=u.call(n,i,e,s),f=typeof u),f==="string"&&~u.indexOf("random(")&&(u=Ka(u)),m)m(this,e,_,u,n)&&(A=1);else if(_.substr(0,2)==="--")c=(getComputedStyle(e).getPropertyValue(_)+"").trim(),u+="",Ar.lastIndex=0,Ar.test(c)||(p=Pn(c),g=Pn(u),g?p!==g&&(c=_s(e,_,c,g)+g):p&&(u+=p)),this.add(o,"setProperty",c,u,i,s,0,0,_),a.push(_),v.push(_,0,o[_]);else if(f!=="undefined"){if(l&&_ in l?(c=typeof l[_]=="function"?l[_].call(n,i,e,s):l[_],pn(c)&&~c.indexOf("random(")&&(c=Ka(c)),Pn(c+"")||c==="auto"||(c+=li.units[_]||Pn(Rr(e,_))||""),(c+"").charAt(1)==="="&&(c=Rr(e,_))):c=Rr(e,_),h=parseFloat(c),S=f==="string"&&u.charAt(1)==="="&&u.substr(0,2),S&&(u=u.substr(2)),d=parseFloat(u),_ in cr&&(_==="autoAlpha"&&(h===1&&Rr(e,"visibility")==="hidden"&&d&&(h=0),v.push("visibility",0,o.visibility),ms(this,o,"visibility",h?"inherit":"hidden",d?"inherit":"hidden",!d)),_!=="scale"&&_!=="transform"&&(_=cr[_],~_.indexOf(",")&&(_=_.split(",")[0]))),M=_ in Pr,M){if(this.styles.save(_),b=u,f==="string"&&u.substring(0,6)==="var(--"){if(u=yi(e,u.substring(4,u.indexOf(")"))),u.substring(0,5)==="calc("){var P=e.style.perspective;e.style.perspective=u,u=yi(e,"perspective"),P?e.style.perspective=P:gs(e,"perspective")}d=parseFloat(u)}if(x||(R=e._gsap,R.renderTransform&&!t.parseTransform||yl(e,t.parseTransform),E=t.smoothOrigin!==!1&&R.smooth,x=this._pt=new Jn(this._pt,o,qt,0,1,R.renderTransform,R,0,-1),x.dep=1),_==="scale")this._pt=new Jn(this._pt,R,"scaleY",R.scaleY,(S?Ws(R.scaleY,S+d):d)-R.scaleY||0,np),this._pt.u=0,a.push("scaleY",_),_+="X";else if(_==="transformOrigin"){v.push(ci,0,o[ci]),u=WT(u),R.svg?sp(e,u,0,E,0,this):(g=parseFloat(u.split(" ")[2])||0,g!==R.zOrigin&&ms(this,R,"zOrigin",R.zOrigin,g),ms(this,o,_,ph(c),ph(u)));continue}else if(_==="svgOrigin"){sp(e,u,1,E,0,this);continue}else if(_ in k0){ZT(this,R,_,h,S?Ws(h,S+u):u);continue}else if(_==="smoothOrigin"){ms(this,R,"smooth",R.smooth,u);continue}else if(_==="force3D"){R[_]=u;continue}else if(_==="transform"){JT(this,u,e);continue}}else _ in o||(_=to(_)||_);if(M||(d||d===0)&&(h||h===0)&&!RT.test(u)&&_ in o)p=(c+"").substr((h+"").length),d||(d=0),g=Pn(u)||(_ in li.units?li.units[_]:p),p!==g&&(h=_s(e,_,c,g)),this._pt=new Jn(this._pt,M?R:o,_,h,(S?Ws(h,S+d):d)-h,!M&&(g==="px"||_==="zIndex")&&t.autoRound!==!1?LT:np),this._pt.u=g||0,M&&b!==u?(this._pt.b=c,this._pt.e=b,this._pt.r=DT):p!==g&&g!=="%"&&(this._pt.b=c,this._pt.r=IT);else if(_ in o)GT.call(this,e,_,c,S?S+u:u);else if(_ in e)this.add(e,_,c||e[_],S?S+u:u,i,s);else if(_!=="parseTransform"){lh(_,u);continue}M||(_ in o?v.push(_,0,o[_]):typeof e[_]=="function"?v.push(_,2,e[_]()):v.push(_,1,c||e[_])),a.push(_)}}A&&ep(this)},render:function(e,t){if(t.tween._time||!op())for(var n=t._pt;n;)n.r(e,n.d),n=n._next;else t.styles.revert()},get:Rr,aliases:cr,getSetter:function(e,t,n){var i=cr[t];return i&&i.indexOf(",")<0&&(t=i),t in Pr&&t!==ci&&(e._gsap.x||Rr(e,"x"))?n&&b0===n?t==="scale"?OT:FT:(b0=n||{})&&(t==="scale"?BT:kT):e.style&&!oh(e.style[t])?UT:~t.indexOf("-")?NT:fh(e,t)},core:{_removeProperty:gs,_getMatrix:cp}};zn.utils.checkPrefix=to;zn.core.getStyleSaver=N0;(function(r,e,t,n){var i=Zn(r+","+e+","+t,function(s){Pr[s]=1});Zn(e,function(s){li.units[s]="deg",k0[s]=1}),cr[i[13]]=r+","+e,Zn(n,function(s){var a=s.split(":");cr[a[1]]=i[a[0]]})})("x,y,z,scale,scaleX,scaleY,xPercent,yPercent","rotation,rotationX,rotationY,skewX,skewY","transform,transformOrigin,svgOrigin,force3D,smoothOrigin,transformPerspective","0:translateX,1:translateY,2:translateZ,8:rotate,8:rotationZ,8:rotateZ,9:rotateX,10:rotateY");Zn("x,y,z,top,right,bottom,left,width,height,fontSize,padding,margin,perspective",function(r){li.units[r]="px"});zn.registerPlugin(up);var mh=zn.registerPlugin(up)||zn,XC=mh.core.Tween;function H0(r,e){for(var t=0;t<e.length;t++){var n=e[t];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(r,n.key,n)}}function $T(r,e,t){return e&&H0(r.prototype,e),t&&H0(r,t),r}var In,xh,KT,Si,xs,vs,io,W0,$s,ro,X0,Ir,Wi,q0,Y0=function(){return In||typeof window<"u"&&(In=window.gsap)&&In.registerPlugin&&In},Z0=1,no=[],mt=[],Xi=[],Ml=Date.now,hp=function(e,t){return t},QT=function(){var e=ro.core,t=e.bridge||{},n=e._scrollers,i=e._proxies;n.push.apply(n,mt),i.push.apply(i,Xi),mt=n,Xi=i,hp=function(a,o){return t[a](o)}},Lr=function(e,t){return~Xi.indexOf(e)&&Xi[Xi.indexOf(e)+1][t]},bl=function(e){return!!~X0.indexOf(e)},Kn=function(e,t,n,i,s){return e.addEventListener(t,n,{passive:i!==!1,capture:!!s})},$n=function(e,t,n,i){return e.removeEventListener(t,n,!!i)},gh="scrollLeft",_h="scrollTop",fp=function(){return Ir&&Ir.isPressed||mt.cache++},vh=function(e,t){var n=function i(s){if(s||s===0){Z0&&(Si.history.scrollRestoration="manual");var a=Ir&&Ir.isPressed;s=i.v=Math.round(s)||(Ir&&Ir.iOS?1:0),e(s),i.cacheID=mt.cache,a&&hp("ss",s)}else(t||mt.cache!==i.cacheID||hp("ref"))&&(i.cacheID=mt.cache,i.v=e());return i.v+i.offset};return n.offset=0,e&&n},Vn={s:gh,p:"left",p2:"Left",os:"right",os2:"Right",d:"width",d2:"Width",a:"x",sc:vh(function(r){return arguments.length?Si.scrollTo(r,cn.sc()):Si.pageXOffset||xs[gh]||vs[gh]||io[gh]||0})},cn={s:_h,p:"top",p2:"Top",os:"bottom",os2:"Bottom",d:"height",d2:"Height",a:"y",op:Vn,sc:vh(function(r){return arguments.length?Si.scrollTo(Vn.sc(),r):Si.pageYOffset||xs[_h]||vs[_h]||io[_h]||0})},Qn=function(e,t){return(t&&t._ctx&&t._ctx.selector||In.utils.toArray)(e)[0]||(typeof e=="string"&&In.config().nullTargetWarn!==!1?console.warn("Element not found:",e):null)},jT=function(e,t){for(var n=t.length;n--;)if(t[n]===e||t[n].contains(e))return!0;return!1},Dr=function(e,t){var n=t.s,i=t.sc;bl(e)&&(e=xs.scrollingElement||vs);var s=mt.indexOf(e),a=i===cn.sc?1:2;!~s&&(s=mt.push(e)-1),mt[s+a]||Kn(e,"scroll",fp);var o=mt[s+a],l=o||(mt[s+a]=vh(Lr(e,n),!0)||(bl(e)?i:vh(function(c){return arguments.length?e[n]=c:e[n]})));return l.target=e,o||(l.smooth=In.getProperty(e,"scrollBehavior")==="smooth"),l},yh=function(e,t,n){var i=e,s=e,a=Ml(),o=a,l=t||50,c=Math.max(500,l*3),u=function(m,_){var p=Ml();_||p-a>l?(s=i,i=m,o=a,a=p):n?i+=m:i=s+(m-s)/(p-o)*(a-o)},d=function(){s=i=n?0:i,o=a=0},h=function(m){var _=o,p=s,g=Ml();return(m||m===0)&&m!==i&&u(m),a===o||g-o>c?0:(i+(n?p:-p))/((n?g:a)-_)*1e3};return{update:u,reset:d,getVelocity:h}},Sl=function(e,t){return t&&!e._gsapAllow&&e.cancelable!==!1&&e.preventDefault(),e.changedTouches?e.changedTouches[0]:e},G0=function(e){var t=Math.max.apply(Math,e),n=Math.min.apply(Math,e);return Math.abs(t)>=Math.abs(n)?t:n},J0=function(){ro=In.core.globals().ScrollTrigger,ro&&ro.core&&QT()},$0=function(e){return In=e||Y0(),!xh&&In&&typeof document<"u"&&document.body&&(Si=window,xs=document,vs=xs.documentElement,io=xs.body,X0=[Si,xs,vs,io],KT=In.utils.clamp,q0=In.core.context||function(){},$s="onpointerenter"in io?"pointer":"mouse",W0=$t.isTouch=Si.matchMedia&&Si.matchMedia("(hover: none), (pointer: coarse)").matches?1:"ontouchstart"in Si||navigator.maxTouchPoints>0||navigator.msMaxTouchPoints>0?2:0,Wi=$t.eventTypes=("ontouchstart"in vs?"touchstart,touchmove,touchcancel,touchend":"onpointerdown"in vs?"pointerdown,pointermove,pointercancel,pointerup":"mousedown,mousemove,mouseup,mouseup").split(","),setTimeout(function(){return Z0=0},500),xh=1),ro||J0(),xh};Vn.op=cn;mt.cache=0;var $t=(function(){function r(t){this.init(t)}var e=r.prototype;return e.init=function(n){xh||$0(In)||console.warn("Please gsap.registerPlugin(Observer)"),ro||J0();var i=n.tolerance,s=n.dragMinimum,a=n.type,o=n.target,l=n.lineHeight,c=n.debounce,u=n.preventDefault,d=n.onStop,h=n.onStopDelay,f=n.ignore,m=n.wheelSpeed,_=n.event,p=n.onDragStart,g=n.onDragEnd,S=n.onDrag,M=n.onPress,x=n.onRelease,R=n.onRight,E=n.onLeft,A=n.onUp,v=n.onDown,b=n.onChangeX,P=n.onChangeY,C=n.onChange,I=n.onToggleX,H=n.onToggleY,V=n.onHover,D=n.onHoverEnd,O=n.onMove,F=n.ignoreCheck,Z=n.isNormalizer,ee=n.onGestureStart,L=n.onGestureEnd,ie=n.onWheel,ye=n.onEnable,Fe=n.onDisable,ze=n.onClick,Oe=n.scrollSpeed,K=n.capture,le=n.allowClicks,ue=n.lockAxis,Ee=n.onLockAxis;this.target=o=Qn(o)||vs,this.vars=n,f&&(f=In.utils.toArray(f)),i=i||1e-9,s=s||0,m=m||1,Oe=Oe||1,a=a||"wheel,touch,pointer",c=c!==!1,l||(l=parseFloat(Si.getComputedStyle(io).lineHeight)||22);var He,Ae,Ye,Se,j,oe,re,B=this,me=0,We=0,N=n.passive||!u&&n.passive!==!1,Ne=Dr(o,Vn),Pe=Dr(o,cn),Q=Ne(),z=Pe(),Me=~a.indexOf("touch")&&!~a.indexOf("pointer")&&Wi[0]==="pointerdown",w=bl(o),y=o.ownerDocument||xs,G=[0,0,0],$=[0,0,0],se=0,fe=function(){return se=Ml()},ae=function(_e,Je){return(B.event=_e)&&f&&jT(_e.target,f)||Je&&Me&&_e.pointerType!=="touch"||F&&F(_e,Je)},U=function(){B._vx.reset(),B._vy.reset(),Ae.pause(),d&&d(B)},te=function(){var _e=B.deltaX=G0(G),Je=B.deltaY=G0($),he=Math.abs(_e)>=i,Ke=Math.abs(Je)>=i;C&&(he||Ke)&&C(B,_e,Je,G,$),he&&(R&&B.deltaX>0&&R(B),E&&B.deltaX<0&&E(B),b&&b(B),I&&B.deltaX<0!=me<0&&I(B),me=B.deltaX,G[0]=G[1]=G[2]=0),Ke&&(v&&B.deltaY>0&&v(B),A&&B.deltaY<0&&A(B),P&&P(B),H&&B.deltaY<0!=We<0&&H(B),We=B.deltaY,$[0]=$[1]=$[2]=0),(Se||Ye)&&(O&&O(B),Ye&&(p&&Ye===1&&p(B),S&&S(B),Ye=0),Se=!1),oe&&!(oe=!1)&&Ee&&Ee(B),j&&(ie(B),j=!1),He=0},Te=function(_e,Je,he){G[he]+=_e,$[he]+=Je,B._vx.update(_e),B._vy.update(Je),c?He||(He=requestAnimationFrame(te)):te()},Ce=function(_e,Je){ue&&!re&&(B.axis=re=Math.abs(_e)>Math.abs(Je)?"x":"y",oe=!0),re!=="y"&&(G[2]+=_e,B._vx.update(_e,!0)),re!=="x"&&($[2]+=Je,B._vy.update(Je,!0)),c?He||(He=requestAnimationFrame(te)):te()},ve=function(_e){if(!ae(_e,1)){_e=Sl(_e,u);var Je=_e.clientX,he=_e.clientY,Ke=Je-B.x,Ve=he-B.y,je=B.isDragging;B.x=Je,B.y=he,(je||(Ke||Ve)&&(Math.abs(B.startX-Je)>=s||Math.abs(B.startY-he)>=s))&&(Ye||(Ye=je?2:1),je||(B.isDragging=!0),Ce(Ke,Ve))}},ge=B.onPress=function(de){ae(de,1)||de&&de.button||(B.axis=re=null,Ae.pause(),B.isPressed=!0,de=Sl(de),me=We=0,B.startX=B.x=de.clientX,B.startY=B.y=de.clientY,B._vx.reset(),B._vy.reset(),Kn(Z?o:y,Wi[1],ve,N,!0),B.deltaX=B.deltaY=0,M&&M(B))},be=B.onRelease=function(de){if(!ae(de,1)){$n(Z?o:y,Wi[1],ve,!0);var _e=!isNaN(B.y-B.startY),Je=B.isDragging,he=Je&&(Math.abs(B.x-B.startX)>3||Math.abs(B.y-B.startY)>3),Ke=Sl(de);!he&&_e&&(B._vx.reset(),B._vy.reset(),u&&le&&In.delayedCall(.08,function(){if(Ml()-se>300&&!de.defaultPrevented){if(de.target.click)de.target.click();else if(y.createEvent){var Ve=y.createEvent("MouseEvents");Ve.initMouseEvent("click",!0,!0,Si,1,Ke.screenX,Ke.screenY,Ke.clientX,Ke.clientY,!1,!1,!1,!1,0,null),de.target.dispatchEvent(Ve)}}})),B.isDragging=B.isGesturing=B.isPressed=!1,d&&Je&&!Z&&Ae.restart(!0),Ye&&te(),g&&Je&&g(B),x&&x(B,he)}},Qe=function(_e){return _e.touches&&_e.touches.length>1&&(B.isGesturing=!0)&&ee(_e,B.isDragging)},it=function(){return(B.isGesturing=!1)||L(B)},k=function(_e){if(!ae(_e)){var Je=Ne(),he=Pe();Te((Je-Q)*Oe,(he-z)*Oe,1),Q=Je,z=he,d&&Ae.restart(!0)}},pe=function(_e){if(!ae(_e)){_e=Sl(_e,u),ie&&(j=!0);var Je=(_e.deltaMode===1?l:_e.deltaMode===2?Si.innerHeight:1)*m;Te(_e.deltaX*Je,_e.deltaY*Je,0),d&&!Z&&Ae.restart(!0)}},ne=function(_e){if(!ae(_e)){var Je=_e.clientX,he=_e.clientY,Ke=Je-B.x,Ve=he-B.y;B.x=Je,B.y=he,Se=!0,d&&Ae.restart(!0),(Ke||Ve)&&Ce(Ke,Ve)}},Ie=function(_e){B.event=_e,V(B)},xe=function(_e){B.event=_e,D(B)},ce=function(_e){return ae(_e)||Sl(_e,u)&&ze(B)};Ae=B._dc=In.delayedCall(h||.25,U).pause(),B.deltaX=B.deltaY=0,B._vx=yh(0,50,!0),B._vy=yh(0,50,!0),B.scrollX=Ne,B.scrollY=Pe,B.isDragging=B.isGesturing=B.isPressed=!1,q0(this),B.enable=function(de){return B.isEnabled||(Kn(w?y:o,"scroll",fp),a.indexOf("scroll")>=0&&Kn(w?y:o,"scroll",k,N,K),a.indexOf("wheel")>=0&&Kn(o,"wheel",pe,N,K),(a.indexOf("touch")>=0&&W0||a.indexOf("pointer")>=0)&&(Kn(o,Wi[0],ge,N,K),Kn(y,Wi[2],be),Kn(y,Wi[3],be),le&&Kn(o,"click",fe,!0,!0),ze&&Kn(o,"click",ce),ee&&Kn(y,"gesturestart",Qe),L&&Kn(y,"gestureend",it),V&&Kn(o,$s+"enter",Ie),D&&Kn(o,$s+"leave",xe),O&&Kn(o,$s+"move",ne)),B.isEnabled=!0,B.isDragging=B.isGesturing=B.isPressed=Se=Ye=!1,B._vx.reset(),B._vy.reset(),Q=Ne(),z=Pe(),de&&de.type&&ge(de),ye&&ye(B)),B},B.disable=function(){B.isEnabled&&(no.filter(function(de){return de!==B&&bl(de.target)}).length||$n(w?y:o,"scroll",fp),B.isPressed&&(B._vx.reset(),B._vy.reset(),$n(Z?o:y,Wi[1],ve,!0)),$n(w?y:o,"scroll",k,K),$n(o,"wheel",pe,K),$n(o,Wi[0],ge,K),$n(y,Wi[2],be),$n(y,Wi[3],be),$n(o,"click",fe,!0),$n(o,"click",ce),$n(y,"gesturestart",Qe),$n(y,"gestureend",it),$n(o,$s+"enter",Ie),$n(o,$s+"leave",xe),$n(o,$s+"move",ne),B.isEnabled=B.isPressed=B.isDragging=!1,Fe&&Fe(B))},B.kill=B.revert=function(){B.disable();var de=no.indexOf(B);de>=0&&no.splice(de,1),Ir===B&&(Ir=0)},no.push(B),Z&&bl(o)&&(Ir=B),B.enable(_)},$T(r,[{key:"velocityX",get:function(){return this._vx.getVelocity()}},{key:"velocityY",get:function(){return this._vy.getVelocity()}}]),r})();$t.version="3.15.0";$t.create=function(r){return new $t(r)};$t.register=$0;$t.getAll=function(){return no.slice()};$t.getById=function(r){return no.filter(function(e){return e.vars.id===r})[0]};Y0()&&In.registerPlugin($t);var Ge,lo,_t,wt,Ti,Et,wp,Fh,Ol,Pl,El,Sh,Hn,kh,vp,ei,K0,Q0,co,p_,dp,m_,jn,yp,g_,__,ys,Sp,Ap,uo,Cp,Il,Mp,pp,Mh=1,Gn=Date.now,mp=Gn(),Ni=0,wl=0,j0=function(e,t,n){var i=bi(e)&&(e.substr(0,6)==="clamp("||e.indexOf("max")>-1);return n["_"+t+"Clamp"]=i,i?e.substr(6,e.length-7):e},e_=function(e,t){return t&&(!bi(e)||e.substr(0,6)!=="clamp(")?"clamp("+e+")":e},eE=function r(){return wl&&requestAnimationFrame(r)},t_=function(){return kh=1},n_=function(){return kh=0},ur=function(e){return e},Al=function(e){return Math.round(e*1e5)/1e5||0},x_=function(){return typeof window<"u"},v_=function(){return Ge||x_()&&(Ge=window.gsap)&&Ge.registerPlugin&&Ge},na=function(e){return!!~wp.indexOf(e)},y_=function(e){return(e==="Height"?Cp:_t["inner"+e])||Ti["client"+e]||Et["client"+e]},S_=function(e){return Lr(e,"getBoundingClientRect")||(na(e)?function(){return Nh.width=_t.innerWidth,Nh.height=Cp,Nh}:function(){return Ur(e)})},tE=function(e,t,n){var i=n.d,s=n.d2,a=n.a;return(a=Lr(e,"getBoundingClientRect"))?function(){return a()[i]}:function(){return(t?y_(s):e["client"+s])||0}},nE=function(e,t){return!t||~Xi.indexOf(e)?S_(e):function(){return Nh}},hr=function(e,t){var n=t.s,i=t.d2,s=t.d,a=t.a;return Math.max(0,(n="scroll"+i)&&(a=Lr(e,n))?a()-S_(e)()[s]:na(e)?(Ti[n]||Et[n])-y_(i):e[n]-e["offset"+i])},bh=function(e,t){for(var n=0;n<co.length;n+=3)(!t||~t.indexOf(co[n+1]))&&e(co[n],co[n+1],co[n+2])},bi=function(e){return typeof e=="string"},Wn=function(e){return typeof e=="function"},Cl=function(e){return typeof e=="number"},Ks=function(e){return typeof e=="object"},Tl=function(e,t,n){return e&&e.progress(t?0:1)&&n&&e.pause()},so=function(e,t,n){if(e.enabled){var i=e._ctx?e._ctx.add(function(){return t(e,n)}):t(e,n);i&&i.totalTime&&(e.callbackAnimation=i)}},ao=Math.abs,M_="left",b_="top",Rp="right",Pp="bottom",js="width",ea="height",Dl="Right",Ll="Left",Ul="Top",Nl="Bottom",un="padding",Li="margin",fo="Width",Ip="Height",mn="px",Ui=function(e){return _t.getComputedStyle(e.nodeType===Node.DOCUMENT_NODE?e.scrollingElement:e)},iE=function(e){var t=Ui(e).position;e.style.position=t==="absolute"||t==="fixed"?t:"relative"},i_=function(e,t){for(var n in t)n in e||(e[n]=t[n]);return e},Ur=function(e,t){var n=t&&Ui(e)[vp]!=="matrix(1, 0, 0, 1, 0, 0)"&&Ge.to(e,{x:0,y:0,xPercent:0,yPercent:0,rotation:0,rotationX:0,rotationY:0,scale:1,skewX:0,skewY:0}).progress(1),i=e.getBoundingClientRect?e.getBoundingClientRect():e.scrollingElement.getBoundingClientRect();return n&&n.progress(0).kill(),i},Oh=function(e,t){var n=t.d2;return e["offset"+n]||e["client"+n]||0},T_=function(e){var t=[],n=e.labels,i=e.duration(),s;for(s in n)t.push(n[s]/i);return t},rE=function(e){return function(t){return Ge.utils.snap(T_(e),t)}},Dp=function(e){var t=Ge.utils.snap(e),n=Array.isArray(e)&&e.slice(0).sort(function(i,s){return i-s});return n?function(i,s,a){a===void 0&&(a=.001);var o;if(!s)return t(i);if(s>0){for(i-=a,o=0;o<n.length;o++)if(n[o]>=i)return n[o];return n[o-1]}else for(o=n.length,i+=a;o--;)if(n[o]<=i)return n[o];return n[0]}:function(i,s,a){a===void 0&&(a=.001);var o=t(i);return!s||Math.abs(o-i)<a||o-i<0==s<0?o:t(s<0?i-e:i+e)}},sE=function(e){return function(t,n){return Dp(T_(e))(t,n.direction)}},Th=function(e,t,n,i){return n.split(",").forEach(function(s){return e(t,s,i)})},wn=function(e,t,n,i,s){return e.addEventListener(t,n,{passive:!i,capture:!!s})},En=function(e,t,n,i){return e.removeEventListener(t,n,!!i)},Eh=function(e,t,n){n=n&&n.wheelHandler,n&&(e(t,"wheel",n),e(t,"touchmove",n))},r_={startColor:"green",endColor:"red",indent:0,fontSize:"16px",fontWeight:"normal"},wh={toggleActions:"play",anticipatePin:0},Bh={top:0,left:0,center:.5,bottom:1,right:1},Ih=function(e,t){if(bi(e)){var n=e.indexOf("="),i=~n?+(e.charAt(n-1)+1)*parseFloat(e.substr(n+1)):0;~n&&(e.indexOf("%")>n&&(i*=t/100),e=e.substr(0,n-1)),e=i+(e in Bh?Bh[e]*t:~e.indexOf("%")?parseFloat(e)*t/100:parseFloat(e)||0)}return e},Ah=function(e,t,n,i,s,a,o,l){var c=s.startColor,u=s.endColor,d=s.fontSize,h=s.indent,f=s.fontWeight,m=wt.createElement("div"),_=na(n)||Lr(n,"pinType")==="fixed",p=e.indexOf("scroller")!==-1,g=_?Et:n.tagName==="IFRAME"?n.contentDocument.body:n,S=e.indexOf("start")!==-1,M=S?c:u,x="border-color:"+M+";font-size:"+d+";color:"+M+";font-weight:"+f+";pointer-events:none;white-space:nowrap;font-family:sans-serif,Arial;z-index:1000;padding:4px 8px;border-width:0;border-style:solid;";return x+="position:"+((p||l)&&_?"fixed;":"absolute;"),(p||l||!_)&&(x+=(i===cn?Rp:Pp)+":"+(a+parseFloat(h))+"px;"),o&&(x+="box-sizing:border-box;text-align:left;width:"+o.offsetWidth+"px;"),m._isStart=S,m.setAttribute("class","gsap-marker-"+e+(t?" marker-"+t:"")),m.style.cssText=x,m.innerText=t||t===0?e+"-"+t:e,g.children[0]?g.insertBefore(m,g.children[0]):g.appendChild(m),m._offset=m["offset"+i.op.d2],Dh(m,0,i,S),m},Dh=function(e,t,n,i){var s={display:"block"},a=n[i?"os2":"p2"],o=n[i?"p2":"os2"];e._isFlipped=i,s[n.a+"Percent"]=i?-100:0,s[n.a]=i?"1px":0,s["border"+a+fo]=1,s["border"+o+fo]=0,s[n.p]=t+"px",Ge.set(e,s)},gt=[],bp={},Bl,s_=function(){return Gn()-Ni>34&&(Bl||(Bl=requestAnimationFrame(Nr)))},oo=function(){(!jn||!jn.isPressed||jn.startX>Et.clientWidth)&&(mt.cache++,jn?Bl||(Bl=requestAnimationFrame(Nr)):Nr(),Ni||ra("scrollStart"),Ni=Gn())},gp=function(){__=_t.innerWidth,g_=_t.innerHeight},Rl=function(e){mt.cache++,(e===!0||!Hn&&!m_&&!wt.fullscreenElement&&!wt.webkitFullscreenElement&&(!yp||__!==_t.innerWidth||Math.abs(_t.innerHeight-g_)>_t.innerHeight*.25))&&Fh.restart(!0)},ia={},aE=[],E_=function r(){return En(ct,"scrollEnd",r)||Qs(!0)},ra=function(e){return ia[e]&&ia[e].map(function(t){return t()})||aE},Mi=[],w_=function(e){for(var t=0;t<Mi.length;t+=5)(!e||Mi[t+4]&&Mi[t+4].query===e)&&(Mi[t].style.cssText=Mi[t+1],Mi[t].getBBox&&Mi[t].setAttribute("transform",Mi[t+2]||""),Mi[t+3].uncache=1)},A_=function(){return mt.forEach(function(e){return Wn(e)&&++e.cacheID&&(e.rec=e())})},Lp=function(e,t){var n;for(ei=0;ei<gt.length;ei++)n=gt[ei],n&&(!t||n._ctx===t)&&(e?n.kill(1):n.revert(!0,!0));Il=!0,t&&w_(t),t||ra("revert")},C_=function(e,t){mt.cache++,(t||!ti)&&mt.forEach(function(n){return Wn(n)&&n.cacheID++&&(n.rec=0)}),bi(e)&&(_t.history.scrollRestoration=Ap=e)},ti,ta=0,a_,oE=function(){if(a_!==ta){var e=a_=ta;requestAnimationFrame(function(){return e===ta&&Qs(!0)})}},R_=function(){Et.appendChild(uo),Cp=!jn&&uo.offsetHeight||_t.innerHeight,Et.removeChild(uo)},o_=function(e){return Ol(".gsap-marker-start, .gsap-marker-end, .gsap-marker-scroller-start, .gsap-marker-scroller-end").forEach(function(t){return t.style.display=e?"none":"block"})},Qs=function(e,t){if(Ti=wt.documentElement,Et=wt.body,wp=[_t,wt,Ti,Et],Ni&&!e&&!Il){wn(ct,"scrollEnd",E_);return}R_(),ti=ct.isRefreshing=!0,Il||A_();var n=ra("refreshInit");p_&&ct.sort(),t||Lp(),mt.forEach(function(i){Wn(i)&&(i.smooth&&(i.target.style.scrollBehavior="auto"),i(0))}),gt.slice(0).forEach(function(i){return i.refresh()}),Il=!1,gt.forEach(function(i){if(i._subPinOffset&&i.pin){var s=i.vars.horizontal?"offsetWidth":"offsetHeight",a=i.pin[s];i.revert(!0,1),i.adjustPinSpacing(i.pin[s]-a),i.refresh()}}),Mp=1,o_(!0),gt.forEach(function(i){var s=hr(i.scroller,i._dir),a=i.vars.end==="max"||i._endClamp&&i.end>s,o=i._startClamp&&i.start>=s;(a||o)&&i.setPositions(o?s-1:i.start,a?Math.max(o?s:i.start+1,s):i.end,!0)}),o_(!1),Mp=0,n.forEach(function(i){return i&&i.render&&i.render(-1)}),mt.forEach(function(i){Wn(i)&&(i.smooth&&requestAnimationFrame(function(){return i.target.style.scrollBehavior="smooth"}),i.rec&&i(i.rec))}),C_(Ap,1),Fh.pause(),ta++,ti=2,Nr(2),gt.forEach(function(i){return Wn(i.vars.onRefresh)&&i.vars.onRefresh(i)}),ti=ct.isRefreshing=!1,ra("refresh")},Tp=0,Lh=1,Fl,Nr=function(e){if(e===2||!ti&&!Il){ct.isUpdating=!0,Fl&&Fl.update(0);var t=gt.length,n=Gn(),i=n-mp>=50,s=t&&gt[0].scroll();if(Lh=Tp>s?-1:1,ti||(Tp=s),i&&(Ni&&!kh&&n-Ni>200&&(Ni=0,ra("scrollEnd")),El=mp,mp=n),Lh<0){for(ei=t;ei-- >0;)gt[ei]&&gt[ei].update(0,i);Lh=1}else for(ei=0;ei<t;ei++)gt[ei]&&gt[ei].update(0,i);ct.isUpdating=!1}Bl=0},Ep=[M_,b_,Pp,Rp,Li+Nl,Li+Dl,Li+Ul,Li+Ll,"display","flexShrink","float","zIndex","gridColumnStart","gridColumnEnd","gridRowStart","gridRowEnd","gridArea","justifySelf","alignSelf","placeSelf","order"],Uh=Ep.concat([js,ea,"boxSizing","max"+fo,"max"+Ip,"position",Li,un,un+Ul,un+Dl,un+Nl,un+Ll]),lE=function(e,t,n){ho(n);var i=e._gsap;if(i.spacerIsNative)ho(i.spacerState);else if(e._gsap.swappedIn){var s=t.parentNode;s&&(s.insertBefore(e,t),s.removeChild(t))}e._gsap.swappedIn=!1},_p=function(e,t,n,i){if(!e._gsap.swappedIn){for(var s=Ep.length,a=t.style,o=e.style,l;s--;)l=Ep[s],a[l]=n[l];a.position=n.position==="absolute"?"absolute":"relative",n.display==="inline"&&(a.display="inline-block"),o[Pp]=o[Rp]="auto",a.flexBasis=n.flexBasis||"auto",a.overflow="visible",a.boxSizing="border-box",a[js]=Oh(e,Vn)+mn,a[ea]=Oh(e,cn)+mn,a[un]=o[Li]=o[b_]=o[M_]="0",ho(i),o[js]=o["max"+fo]=n[js],o[ea]=o["max"+Ip]=n[ea],o[un]=n[un],e.parentNode!==t&&(e.parentNode.insertBefore(t,e),t.appendChild(e)),e._gsap.swappedIn=!0}},cE=/([A-Z])/g,ho=function(e){if(e){var t=e.t.style,n=e.length,i=0,s,a;for((e.t._gsap||Ge.core.getCache(e.t)).uncache=1;i<n;i+=2)a=e[i+1],s=e[i],a?t[s]=a:t[s]&&t.removeProperty(s.replace(cE,"-$1").toLowerCase())}},Ch=function(e){for(var t=Uh.length,n=e.style,i=[],s=0;s<t;s++)i.push(Uh[s],n[Uh[s]]);return i.t=e,i},uE=function(e,t,n){for(var i=[],s=e.length,a=n?8:0,o;a<s;a+=2)o=e[a],i.push(o,o in t?t[o]:e[a+1]);return i.t=e.t,i},Nh={left:0,top:0},l_=function(e,t,n,i,s,a,o,l,c,u,d,h,f,m){Wn(e)&&(e=e(l)),bi(e)&&e.substr(0,3)==="max"&&(e=h+(e.charAt(4)==="="?Ih("0"+e.substr(3),n):0));var _=f?f.time():0,p,g,S;if(f&&f.seek(0),isNaN(e)||(e=+e),Cl(e))f&&(e=Ge.utils.mapRange(f.scrollTrigger.start,f.scrollTrigger.end,0,h,e)),o&&Dh(o,n,i,!0);else{Wn(t)&&(t=t(l));var M=(e||"0").split(" "),x,R,E,A;S=Qn(t,l)||Et,x=Ur(S)||{},(!x||!x.left&&!x.top)&&Ui(S).display==="none"&&(A=S.style.display,S.style.display="block",x=Ur(S),A?S.style.display=A:S.style.removeProperty("display")),R=Ih(M[0],x[i.d]),E=Ih(M[1]||"0",n),e=x[i.p]-c[i.p]-u+R+s-E,o&&Dh(o,E,i,n-E<20||o._isStart&&E>20),n-=n-E}if(m&&(l[m]=e||-.001,e<0&&(e=0)),a){var v=e+n,b=a._isStart;p="scroll"+i.d2,Dh(a,v,i,b&&v>20||!b&&(d?Math.max(Et[p],Ti[p]):a.parentNode[p])<=v+1),d&&(c=Ur(o),d&&(a.style[i.op.p]=c[i.op.p]-i.op.m-a._offset+mn))}return f&&S&&(p=Ur(S),f.seek(h),g=Ur(S),f._caScrollDist=p[i.p]-g[i.p],e=e/f._caScrollDist*h),f&&f.seek(_),f?e:Math.round(e)},hE=/(webkit|moz|length|cssText|inset)/i,c_=function(e,t,n,i){if(e.parentNode!==t){var s=e.style,a,o;if(t===Et){e._stOrig=s.cssText,o=Ui(e);for(a in o)!+a&&!hE.test(a)&&o[a]&&typeof s[a]=="string"&&a!=="0"&&(s[a]=o[a]);s.top=n,s.left=i}else s.cssText=e._stOrig;Ge.core.getCache(e).uncache=1,t.appendChild(e)}},P_=function(e,t,n){var i=t,s=i;return function(a){var o=Math.round(e());return o!==i&&o!==s&&Math.abs(o-i)>3&&Math.abs(o-s)>3&&(a=o,n&&n()),s=i,i=Math.round(a),i}},Rh=function(e,t,n){var i={};i[t.p]="+="+n,Ge.set(e,i)},u_=function(e,t){var n=Dr(e,t),i="_scroll"+t.p2,s=function a(o,l,c,u,d){var h=a.tween,f=l.onComplete,m={};c=c||n();var _=P_(n,c,function(){h.kill(),a.tween=0});return d=u&&d||0,u=u||o-c,h&&h.kill(),l[i]=o,l.inherit=!1,l.modifiers=m,m[i]=function(){return _(c+u*h.ratio+d*h.ratio*h.ratio)},l.onUpdate=function(){mt.cache++,a.tween&&Nr()},l.onComplete=function(){a.tween=0,f&&f.call(h)},h=a.tween=Ge.to(e,l),h};return e[i]=n,n.wheelHandler=function(){return s.tween&&s.tween.kill()&&(s.tween=0)},wn(e,"wheel",n.wheelHandler),ct.isTouch&&wn(e,"touchmove",n.wheelHandler),s},ct=(function(){function r(t,n){lo||r.register(Ge)||console.warn("Please gsap.registerPlugin(ScrollTrigger)"),Sp(this),this.init(t,n)}var e=r.prototype;return e.init=function(n,i){if(this.progress=this.start=0,this.vars&&this.kill(!0,!0),!wl){this.update=this.refresh=this.kill=ur;return}n=i_(bi(n)||Cl(n)||n.nodeType?{trigger:n}:n,wh);var s=n,a=s.onUpdate,o=s.toggleClass,l=s.id,c=s.onToggle,u=s.onRefresh,d=s.scrub,h=s.trigger,f=s.pin,m=s.pinSpacing,_=s.invalidateOnRefresh,p=s.anticipatePin,g=s.onScrubComplete,S=s.onSnapComplete,M=s.once,x=s.snap,R=s.pinReparent,E=s.pinSpacer,A=s.containerAnimation,v=s.fastScrollEnd,b=s.preventOverlaps,P=n.horizontal||n.containerAnimation&&n.horizontal!==!1?Vn:cn,C=!d&&d!==0,I=Qn(n.scroller||_t),H=Ge.core.getCache(I),V=na(I),D=("pinType"in n?n.pinType:Lr(I,"pinType")||V&&"fixed")==="fixed",O=[n.onEnter,n.onLeave,n.onEnterBack,n.onLeaveBack],F=C&&n.toggleActions.split(" "),Z="markers"in n?n.markers:wh.markers,ee=V?0:parseFloat(Ui(I)["border"+P.p2+fo])||0,L=this,ie=n.onRefreshInit&&function(){return n.onRefreshInit(L)},ye=tE(I,V,P),Fe=nE(I,V),ze=0,Oe=0,K=0,le=Dr(I,P),ue,Ee,He,Ae,Ye,Se,j,oe,re,B,me,We,N,Ne,Pe,Q,z,Me,w,y,G,$,se,fe,ae,U,te,Te,Ce,ve,ge,be,Qe,it,k,pe,ne,Ie,xe;if(L._startClamp=L._endClamp=!1,L._dir=P,p*=45,L.scroller=I,L.scroll=A?A.time.bind(A):le,Ae=le(),L.vars=n,i=i||n.animation,"refreshPriority"in n&&(p_=1,n.refreshPriority===-9999&&(Fl=L)),H.tweenScroll=H.tweenScroll||{top:u_(I,cn),left:u_(I,Vn)},L.tweenTo=ue=H.tweenScroll[P.p],L.scrubDuration=function(he){Qe=Cl(he)&&he,Qe?be?be.duration(he):be=Ge.to(i,{ease:"expo",totalProgress:"+=0",inherit:!1,duration:Qe,paused:!0,onComplete:function(){return g&&g(L)}}):(be&&be.progress(1).kill(),be=0)},i&&(i.vars.lazy=!1,i._initted&&!L.isReverted||i.vars.immediateRender!==!1&&n.immediateRender!==!1&&i.duration()&&i.render(0,!0,!0),L.animation=i.pause(),i.scrollTrigger=L,L.scrubDuration(d),ve=0,l||(l=i.vars.id)),x&&((!Ks(x)||x.push)&&(x={snapTo:x}),"scrollBehavior"in Et.style&&Ge.set(V?[Et,Ti]:I,{scrollBehavior:"auto"}),mt.forEach(function(he){return Wn(he)&&he.target===(V?wt.scrollingElement||Ti:I)&&(he.smooth=!1)}),He=Wn(x.snapTo)?x.snapTo:x.snapTo==="labels"?rE(i):x.snapTo==="labelsDirectional"?sE(i):x.directional!==!1?function(he,Ke){return Dp(x.snapTo)(he,Gn()-Oe<500?0:Ke.direction)}:Ge.utils.snap(x.snapTo),it=x.duration||{min:.1,max:2},it=Ks(it)?Pl(it.min,it.max):Pl(it,it),k=Ge.delayedCall(x.delay||Qe/2||.1,function(){var he=le(),Ke=Gn()-Oe<500,Ve=ue.tween;if((Ke||Math.abs(L.getVelocity())<10)&&!Ve&&!kh&&ze!==he){var je=(he-Se)/Ne,Ot=i&&!C?i.totalProgress():je,ut=Ke?0:(Ot-ge)/(Gn()-El)*1e3||0,St=Ge.utils.clamp(-je,1-je,ao(ut/2)*ut/.185),et=je+(x.inertia===!1?0:St),ht,ot,at=x,gn=at.onStart,Dt=at.onInterrupt,_n=at.onComplete;if(ht=He(et,L),Cl(ht)||(ht=et),ot=Math.max(0,Math.round(Se+ht*Ne)),he<=j&&he>=Se&&ot!==he){if(Ve&&!Ve._initted&&Ve.data<=ao(ot-he))return;x.inertia===!1&&(St=ht-je),ue(ot,{duration:it(ao(Math.max(ao(et-Ot),ao(ht-Ot))*.185/ut/.05||0)),ease:x.ease||"power3",data:ao(ot-he),onInterrupt:function(){return k.restart(!0)&&Dt&&so(L,Dt)},onComplete:function(){L.update(),ze=le(),i&&!C&&(be?be.resetTo("totalProgress",ht,i._tTime/i._tDur):i.progress(ht)),ve=ge=i&&!C?i.totalProgress():L.progress,S&&S(L),_n&&so(L,_n)}},he,St*Ne,ot-he-St*Ne),gn&&so(L,gn,ue.tween)}}else L.isActive&&ze!==he&&k.restart(!0)}).pause()),l&&(bp[l]=L),h=L.trigger=Qn(h||f!==!0&&f),xe=h&&h._gsap&&h._gsap.stRevert,xe&&(xe=xe(L)),f=f===!0?h:Qn(f),bi(o)&&(o={targets:h,className:o}),f&&(m===!1||m===Li||(m=!m&&f.parentNode&&f.parentNode.style&&Ui(f.parentNode).display==="flex"?!1:un),L.pin=f,Ee=Ge.core.getCache(f),Ee.spacer?Pe=Ee.pinState:(E&&(E=Qn(E),E&&!E.nodeType&&(E=E.current||E.nativeElement),Ee.spacerIsNative=!!E,E&&(Ee.spacerState=Ch(E))),Ee.spacer=Me=E||wt.createElement("div"),Me.classList.add("pin-spacer"),l&&Me.classList.add("pin-spacer-"+l),Ee.pinState=Pe=Ch(f)),n.force3D!==!1&&Ge.set(f,{force3D:!0}),L.spacer=Me=Ee.spacer,Ce=Ui(f),fe=Ce[m+P.os2],y=Ge.getProperty(f),G=Ge.quickSetter(f,P.a,mn),_p(f,Me,Ce),z=Ch(f)),Z){We=Ks(Z)?i_(Z,r_):r_,B=Ah("scroller-start",l,I,P,We,0),me=Ah("scroller-end",l,I,P,We,0,B),w=B["offset"+P.op.d2];var ce=Qn(Lr(I,"content")||I);oe=this.markerStart=Ah("start",l,ce,P,We,w,0,A),re=this.markerEnd=Ah("end",l,ce,P,We,w,0,A),A&&(Ie=Ge.quickSetter([oe,re],P.a,mn)),!D&&!(Xi.length&&Lr(I,"fixedMarkers")===!0)&&(iE(V?Et:I),Ge.set([B,me],{force3D:!0}),U=Ge.quickSetter(B,P.a,mn),Te=Ge.quickSetter(me,P.a,mn))}if(A){var de=A.vars.onUpdate,_e=A.vars.onUpdateParams;A.eventCallback("onUpdate",function(){L.update(0,0,1),de&&de.apply(A,_e||[])})}if(L.previous=function(){return gt[gt.indexOf(L)-1]},L.next=function(){return gt[gt.indexOf(L)+1]},L.revert=function(he,Ke){if(!Ke)return L.kill(!0);var Ve=he!==!1||!L.enabled,je=Hn;Ve!==L.isReverted&&(Ve&&(pe=Math.max(le(),L.scroll.rec||0),K=L.progress,ne=i&&i.progress()),oe&&[oe,re,B,me].forEach(function(Ot){return Ot.style.display=Ve?"none":"block"}),Ve&&(Hn=L,L.update(Ve)),f&&(!R||!L.isActive)&&(Ve?lE(f,Me,Pe):_p(f,Me,Ui(f),ae)),Ve||L.update(Ve),Hn=je,L.isReverted=Ve)},L.refresh=function(he,Ke,Ve,je){if(!((Hn||!L.enabled)&&!Ke)){if(f&&he&&Ni){wn(r,"scrollEnd",E_);return}!ti&&ie&&ie(L),Hn=L,ue.tween&&!Ve&&(ue.tween.kill(),ue.tween=0),be&&be.pause(),_&&i&&(i.revert({kill:!1}).invalidate(),i.getChildren?i.getChildren(!0,!0,!1).forEach(function(De){return De.vars.immediateRender&&De.render(0,!0,!0)}):i.vars.immediateRender&&i.render(0,!0,!0)),L.isReverted||L.revert(!0,!0),L._subPinOffset=!1;var Ot=ye(),ut=Fe(),St=A?A.duration():hr(I,P),et=Ne<=.01||!Ne,ht=0,ot=je||0,at=Ks(Ve)?Ve.end:n.end,gn=n.endTrigger||h,Dt=Ks(Ve)?Ve.start:n.start||(n.start===0||!h?0:f?"0 0":"0 100%"),_n=L.pinnedContainer=n.pinnedContainer&&Qn(n.pinnedContainer,L),ui=h&&Math.max(0,gt.indexOf(L))||0,nn=ui,hn,xn,dr,ca,vn,Kt,wi,T,X,J,q,Y,Re;for(Z&&Ks(Ve)&&(Y=Ge.getProperty(B,P.p),Re=Ge.getProperty(me,P.p));nn-- >0;)Kt=gt[nn],Kt.end||Kt.refresh(0,1)||(Hn=L),wi=Kt.pin,wi&&(wi===h||wi===f||wi===_n)&&!Kt.isReverted&&(J||(J=[]),J.unshift(Kt),Kt.revert(!0,!0)),Kt!==gt[nn]&&(ui--,nn--);for(Wn(Dt)&&(Dt=Dt(L)),Dt=j0(Dt,"start",L),Se=l_(Dt,h,Ot,P,le(),oe,B,L,ut,ee,D,St,A,L._startClamp&&"_startClamp")||(f?-.001:0),Wn(at)&&(at=at(L)),bi(at)&&!at.indexOf("+=")&&(~at.indexOf(" ")?at=(bi(Dt)?Dt.split(" ")[0]:"")+at:(ht=Ih(at.substr(2),Ot),at=bi(Dt)?Dt:(A?Ge.utils.mapRange(0,A.duration(),A.scrollTrigger.start,A.scrollTrigger.end,Se):Se)+ht,gn=h)),at=j0(at,"end",L),j=Math.max(Se,l_(at||(gn?"100% 0":St),gn,Ot,P,le()+ht,re,me,L,ut,ee,D,St,A,L._endClamp&&"_endClamp"))||-.001,ht=0,nn=ui;nn--;)Kt=gt[nn]||{},wi=Kt.pin,wi&&Kt.start-Kt._pinPush<=Se&&!A&&Kt.end>0&&(hn=Kt.end-(L._startClamp?Math.max(0,Kt.start):Kt.start),(wi===h&&Kt.start-Kt._pinPush<Se||wi===_n)&&isNaN(Dt)&&(ht+=hn*(1-Kt.progress)),wi===f&&(ot+=hn));if(Se+=ht,j+=ht,L._startClamp&&(L._startClamp+=ht),L._endClamp&&!ti&&(L._endClamp=j||-.001,j=Math.min(j,hr(I,P))),Ne=j-Se||(Se-=.01)&&.001,et&&(K=Ge.utils.clamp(0,1,Ge.utils.normalize(Se,j,pe))),L._pinPush=ot,oe&&ht&&(hn={},hn[P.a]="+="+ht,_n&&(hn[P.p]="-="+le()),Ge.set([oe,re],hn)),f&&!(Mp&&L.end>=hr(I,P)))hn=Ui(f),ca=P===cn,dr=le(),$=parseFloat(y(P.a))+ot,!St&&j>1&&(q=(V?wt.scrollingElement||Ti:I).style,q={style:q,value:q["overflow"+P.a.toUpperCase()]},V&&Ui(Et)["overflow"+P.a.toUpperCase()]!=="scroll"&&(q.style["overflow"+P.a.toUpperCase()]="scroll")),_p(f,Me,hn),z=Ch(f),xn=Ur(f,!0),T=D&&Dr(I,ca?Vn:cn)(),m?(ae=[m+P.os2,Ne+ot+mn],ae.t=Me,nn=m===un?Oh(f,P)+Ne+ot:0,nn&&(ae.push(P.d,nn+mn),Me.style.flexBasis!=="auto"&&(Me.style.flexBasis=nn+mn)),ho(ae),_n&&gt.forEach(function(De){De.pin===_n&&De.vars.pinSpacing!==!1&&(De._subPinOffset=!0)}),D&&le(pe)):(nn=Oh(f,P),nn&&Me.style.flexBasis!=="auto"&&(Me.style.flexBasis=nn+mn)),D&&(vn={top:xn.top+(ca?dr-Se:T)+mn,left:xn.left+(ca?T:dr-Se)+mn,boxSizing:"border-box",position:"fixed"},vn[js]=vn["max"+fo]=Math.ceil(xn.width)+mn,vn[ea]=vn["max"+Ip]=Math.ceil(xn.height)+mn,vn[Li]=vn[Li+Ul]=vn[Li+Dl]=vn[Li+Nl]=vn[Li+Ll]="0",vn[un]=hn[un],vn[un+Ul]=hn[un+Ul],vn[un+Dl]=hn[un+Dl],vn[un+Nl]=hn[un+Nl],vn[un+Ll]=hn[un+Ll],Q=uE(Pe,vn,R),ti&&le(0)),i?(X=i._initted,dp(1),i.render(i.duration(),!0,!0),se=y(P.a)-$+Ne+ot,te=Math.abs(Ne-se)>1,D&&te&&Q.splice(Q.length-2,2),i.render(0,!0,!0),X||i.invalidate(!0),i.parent||i.totalTime(i.totalTime()),dp(0)):se=Ne,q&&(q.value?q.style["overflow"+P.a.toUpperCase()]=q.value:q.style.removeProperty("overflow-"+P.a));else if(h&&le()&&!A)for(xn=h.parentNode;xn&&xn!==Et;)xn._pinOffset&&(Se-=xn._pinOffset,j-=xn._pinOffset),xn=xn.parentNode;J&&J.forEach(function(De){return De.revert(!1,!0)}),L.start=Se,L.end=j,Ae=Ye=ti?pe:le(),!A&&!ti&&(Ae<pe&&le(pe),L.scroll.rec=0),L.revert(!1,!0),Oe=Gn(),k&&(ze=-1,k.restart(!0)),Hn=0,i&&C&&(i._initted||ne)&&i.progress()!==ne&&i.progress(ne||0,!0).render(i.time(),!0,!0),(et||K!==L.progress||A||_||i&&!i._initted)&&(i&&!C&&(i._initted||K||i.vars.immediateRender!==!1)&&i.totalProgress(A&&Se<-.001&&!K?Ge.utils.normalize(Se,j,0):K,!0),L.progress=et||(Ae-Se)/Ne===K?0:K),f&&m&&(Me._pinOffset=Math.round(L.progress*se)),be&&be.invalidate(),isNaN(Y)||(Y-=Ge.getProperty(B,P.p),Re-=Ge.getProperty(me,P.p),Rh(B,P,Y),Rh(oe,P,Y-(je||0)),Rh(me,P,Re),Rh(re,P,Re-(je||0))),et&&!ti&&L.update(),u&&!ti&&!N&&(N=!0,u(L),N=!1)}},L.getVelocity=function(){return(le()-Ye)/(Gn()-El)*1e3||0},L.endAnimation=function(){Tl(L.callbackAnimation),i&&(be?be.progress(1):i.paused()?C||Tl(i,L.direction<0,1):Tl(i,i.reversed()))},L.labelToScroll=function(he){return i&&i.labels&&(Se||L.refresh()||Se)+i.labels[he]/i.duration()*Ne||0},L.getTrailing=function(he){var Ke=gt.indexOf(L),Ve=L.direction>0?gt.slice(0,Ke).reverse():gt.slice(Ke+1);return(bi(he)?Ve.filter(function(je){return je.vars.preventOverlaps===he}):Ve).filter(function(je){return L.direction>0?je.end<=Se:je.start>=j})},L.update=function(he,Ke,Ve){if(!(A&&!Ve&&!he)){var je=ti===!0?pe:L.scroll(),Ot=he?0:(je-Se)/Ne,ut=Ot<0?0:Ot>1?1:Ot||0,St=L.progress,et,ht,ot,at,gn,Dt,_n,ui;if(Ke&&(Ye=Ae,Ae=A?le():je,x&&(ge=ve,ve=i&&!C?i.totalProgress():ut)),p&&f&&!Hn&&!Mh&&Ni&&(!ut&&Se<je+(je-Ye)/(Gn()-El)*p?ut=1e-4:ut===1&&j>je+(je-Ye)/(Gn()-El)*p&&(ut=.9999)),ut!==St&&L.enabled){if(et=L.isActive=!!ut&&ut<1,ht=!!St&&St<1,Dt=et!==ht,gn=Dt||!!ut!=!!St,L.direction=ut>St?1:-1,L.progress=ut,gn&&!Hn&&(ot=ut&&!St?0:ut===1?1:St===1?2:3,C&&(at=!Dt&&F[ot+1]!=="none"&&F[ot+1]||F[ot],ui=i&&(at==="complete"||at==="reset"||at in i))),b&&(Dt||ui)&&(ui||d||!i)&&(Wn(b)?b(L):L.getTrailing(b).forEach(function(dr){return dr.endAnimation()})),C||(be&&!Hn&&!Mh?(be._dp._time-be._start!==be._time&&be.render(be._dp._time-be._start),be.resetTo?be.resetTo("totalProgress",ut,i._tTime/i._tDur):(be.vars.totalProgress=ut,be.invalidate().restart())):i&&i.totalProgress(ut,!!(Hn&&(Oe||he)))),f){if(he&&m&&(Me.style[m+P.os2]=fe),!D)G(Al($+se*ut));else if(gn){if(_n=!he&&ut>St&&j+1>je&&je+1>=hr(I,P),R)if(!he&&(et||_n)){var nn=Ur(f,!0),hn=je-Se;c_(f,Et,nn.top+(P===cn?hn:0)+mn,nn.left+(P===cn?0:hn)+mn)}else c_(f,Me);ho(et||_n?Q:z),te&&ut<1&&et||G($+(ut===1&&!_n?se:0))}}x&&!ue.tween&&!Hn&&!Mh&&k.restart(!0),o&&(Dt||M&&ut&&(ut<1||!pp))&&Ol(o.targets).forEach(function(dr){return dr.classList[et||M?"add":"remove"](o.className)}),a&&!C&&!he&&a(L),gn&&!Hn?(C&&(ui&&(at==="complete"?i.pause().totalProgress(1):at==="reset"?i.restart(!0).pause():at==="restart"?i.restart(!0):i[at]()),a&&a(L)),(Dt||!pp)&&(c&&Dt&&so(L,c),O[ot]&&so(L,O[ot]),M&&(ut===1?L.kill(!1,1):O[ot]=0),Dt||(ot=ut===1?1:3,O[ot]&&so(L,O[ot]))),v&&!et&&Math.abs(L.getVelocity())>(Cl(v)?v:2500)&&(Tl(L.callbackAnimation),be?be.progress(1):Tl(i,at==="reverse"?1:!ut,1))):C&&a&&!Hn&&a(L)}if(Te){var xn=A?je/A.duration()*(A._caScrollDist||0):je;U(xn+(B._isFlipped?1:0)),Te(xn)}Ie&&Ie(-je/A.duration()*(A._caScrollDist||0))}},L.enable=function(he,Ke){L.enabled||(L.enabled=!0,wn(I,"resize",Rl),V||wn(I,"scroll",oo),ie&&wn(r,"refreshInit",ie),he!==!1&&(L.progress=K=0,Ae=Ye=ze=le()),Ke!==!1&&L.refresh())},L.getTween=function(he){return he&&ue?ue.tween:be},L.setPositions=function(he,Ke,Ve,je){if(A){var Ot=A.scrollTrigger,ut=A.duration(),St=Ot.end-Ot.start;he=Ot.start+St*he/ut,Ke=Ot.start+St*Ke/ut}L.refresh(!1,!1,{start:e_(he,Ve&&!!L._startClamp),end:e_(Ke,Ve&&!!L._endClamp)},je),L.update()},L.adjustPinSpacing=function(he){if(ae&&he){var Ke=ae.indexOf(P.d)+1;ae[Ke]=parseFloat(ae[Ke])+he+mn,ae[1]=parseFloat(ae[1])+he+mn,ho(ae)}},L.disable=function(he,Ke){if(he!==!1&&L.revert(!0,!0),L.enabled&&(L.enabled=L.isActive=!1,Ke||be&&be.pause(),pe=0,Ee&&(Ee.uncache=1),ie&&En(r,"refreshInit",ie),k&&(k.pause(),ue.tween&&ue.tween.kill()&&(ue.tween=0)),!V)){for(var Ve=gt.length;Ve--;)if(gt[Ve].scroller===I&&gt[Ve]!==L)return;En(I,"resize",Rl),V||En(I,"scroll",oo)}},L.kill=function(he,Ke){L.disable(he,Ke),be&&!Ke&&be.kill(),l&&delete bp[l];var Ve=gt.indexOf(L);Ve>=0&&gt.splice(Ve,1),Ve===ei&&Lh>0&&ei--,Ve=0,gt.forEach(function(je){return je.scroller===L.scroller&&(Ve=1)}),Ve||ti||(L.scroll.rec=0),i&&(i.scrollTrigger=null,he&&i.revert({kill:!1}),Ke||i.kill()),oe&&[oe,re,B,me].forEach(function(je){return je.parentNode&&je.parentNode.removeChild(je)}),Fl===L&&(Fl=0),f&&(Ee&&(Ee.uncache=1),Ve=0,gt.forEach(function(je){return je.pin===f&&Ve++}),Ve||(Ee.spacer=0)),n.onKill&&n.onKill(L)},gt.push(L),L.enable(!1,!1),xe&&xe(L),i&&i.add&&!Ne){var Je=L.update;L.update=function(){L.update=Je,mt.cache++,Se||j||L.refresh()},Ge.delayedCall(.01,L.update),Ne=.01,Se=j=0}else L.refresh();f&&oE()},r.register=function(n){return lo||(Ge=n||v_(),x_()&&window.document&&r.enable(),lo=wl),lo},r.defaults=function(n){if(n)for(var i in n)wh[i]=n[i];return wh},r.disable=function(n,i){wl=0,gt.forEach(function(a){return a[i?"kill":"disable"](n)}),En(_t,"wheel",oo),En(wt,"scroll",oo),clearInterval(Sh),En(wt,"touchcancel",ur),En(Et,"touchstart",ur),Th(En,wt,"pointerdown,touchstart,mousedown",t_),Th(En,wt,"pointerup,touchend,mouseup",n_),Fh.kill(),bh(En);for(var s=0;s<mt.length;s+=3)Eh(En,mt[s],mt[s+1]),Eh(En,mt[s],mt[s+2])},r.enable=function(){if(_t=window,wt=document,Ti=wt.documentElement,Et=wt.body,Ge){if(Ol=Ge.utils.toArray,Pl=Ge.utils.clamp,Sp=Ge.core.context||ur,dp=Ge.core.suppressOverwrites||ur,Ap=_t.history.scrollRestoration||"auto",Tp=_t.pageYOffset||0,Ge.core.globals("ScrollTrigger",r),Et){wl=1,uo=document.createElement("div"),uo.style.height="100vh",uo.style.position="absolute",R_(),eE(),$t.register(Ge),r.isTouch=$t.isTouch,ys=$t.isTouch&&/(iPad|iPhone|iPod|Mac)/g.test(navigator.userAgent),yp=$t.isTouch===1,wn(_t,"wheel",oo),wp=[_t,wt,Ti,Et],Ge.matchMedia?(r.matchMedia=function(u){var d=Ge.matchMedia(),h;for(h in u)d.add(h,u[h]);return d},Ge.addEventListener("matchMediaInit",function(){A_(),Lp()}),Ge.addEventListener("matchMediaRevert",function(){return w_()}),Ge.addEventListener("matchMedia",function(){Qs(0,1),ra("matchMedia")}),Ge.matchMedia().add("(orientation: portrait)",function(){return gp(),gp})):console.warn("Requires GSAP 3.11.0 or later"),gp(),wn(wt,"scroll",oo);var n=Et.hasAttribute("style"),i=Et.style,s=i.borderTopStyle,a=Ge.core.Animation.prototype,o,l;for(a.revert||Object.defineProperty(a,"revert",{value:function(){return this.time(-.01,!0)}}),i.borderTopStyle="solid",o=Ur(Et),cn.m=Math.round(o.top+cn.sc())||0,Vn.m=Math.round(o.left+Vn.sc())||0,s?i.borderTopStyle=s:i.removeProperty("border-top-style"),n||(Et.setAttribute("style",""),Et.removeAttribute("style")),Sh=setInterval(s_,250),Ge.delayedCall(.5,function(){return Mh=0}),wn(wt,"touchcancel",ur),wn(Et,"touchstart",ur),Th(wn,wt,"pointerdown,touchstart,mousedown",t_),Th(wn,wt,"pointerup,touchend,mouseup",n_),vp=Ge.utils.checkPrefix("transform"),Uh.push(vp),lo=Gn(),Fh=Ge.delayedCall(.2,Qs).pause(),co=[wt,"visibilitychange",function(){var u=_t.innerWidth,d=_t.innerHeight;wt.hidden?(K0=u,Q0=d):(K0!==u||Q0!==d)&&Rl()},wt,"DOMContentLoaded",Qs,_t,"load",Qs,_t,"resize",Rl],bh(wn),gt.forEach(function(u){return u.enable(0,1)}),l=0;l<mt.length;l+=3)Eh(En,mt[l],mt[l+1]),Eh(En,mt[l],mt[l+2])}else if(wt){var c=function u(){r.enable(),wt.removeEventListener("DOMContentLoaded",u)};wt.addEventListener("DOMContentLoaded",c)}}},r.config=function(n){"limitCallbacks"in n&&(pp=!!n.limitCallbacks);var i=n.syncInterval;i&&clearInterval(Sh)||(Sh=i)&&setInterval(s_,i),"ignoreMobileResize"in n&&(yp=r.isTouch===1&&n.ignoreMobileResize),"autoRefreshEvents"in n&&(bh(En)||bh(wn,n.autoRefreshEvents||"none"),m_=(n.autoRefreshEvents+"").indexOf("resize")===-1)},r.scrollerProxy=function(n,i){var s=Qn(n),a=mt.indexOf(s),o=na(s);~a&&mt.splice(a,o?6:2),i&&(o?Xi.unshift(_t,i,Et,i,Ti,i):Xi.unshift(s,i))},r.clearMatchMedia=function(n){gt.forEach(function(i){return i._ctx&&i._ctx.query===n&&i._ctx.kill(!0,!0)})},r.isInViewport=function(n,i,s){var a=(bi(n)?Qn(n):n).getBoundingClientRect(),o=a[s?js:ea]*i||0;return s?a.right-o>0&&a.left+o<_t.innerWidth:a.bottom-o>0&&a.top+o<_t.innerHeight},r.positionInViewport=function(n,i,s){bi(n)&&(n=Qn(n));var a=n.getBoundingClientRect(),o=a[s?js:ea],l=i==null?o/2:i in Bh?Bh[i]*o:~i.indexOf("%")?parseFloat(i)*o/100:parseFloat(i)||0;return s?(a.left+l)/_t.innerWidth:(a.top+l)/_t.innerHeight},r.killAll=function(n){if(gt.slice(0).forEach(function(s){return s.vars.id!=="ScrollSmoother"&&s.kill()}),n!==!0){var i=ia.killAll||[];ia={},i.forEach(function(s){return s()})}},r})();ct.version="3.15.0";ct.saveStyles=function(r){return r?Ol(r).forEach(function(e){if(e&&e.style){var t=Mi.indexOf(e);t>=0&&Mi.splice(t,5),Mi.push(e,e.style.cssText,e.getBBox&&e.getAttribute("transform"),Ge.core.getCache(e),Sp())}}):Mi};ct.revert=function(r,e){return Lp(!r,e)};ct.create=function(r,e){return new ct(r,e)};ct.refresh=function(r){return r?Rl(!0):(lo||ct.register())&&Qs(!0)};ct.update=function(r){return++mt.cache&&Nr(r===!0?2:0)};ct.clearScrollMemory=C_;ct.maxScroll=function(r,e){return hr(r,e?Vn:cn)};ct.getScrollFunc=function(r,e){return Dr(Qn(r),e?Vn:cn)};ct.getById=function(r){return bp[r]};ct.getAll=function(){return gt.filter(function(r){return r.vars.id!=="ScrollSmoother"})};ct.isScrolling=function(){return!!Ni};ct.snapDirectional=Dp;ct.addEventListener=function(r,e){var t=ia[r]||(ia[r]=[]);~t.indexOf(e)||t.push(e)};ct.removeEventListener=function(r,e){var t=ia[r],n=t&&t.indexOf(e);n>=0&&t.splice(n,1)};ct.batch=function(r,e){var t=[],n={},i=e.interval||.016,s=e.batchMax||1e9,a=function(c,u){var d=[],h=[],f=Ge.delayedCall(i,function(){u(d,h),d=[],h=[]}).pause();return function(m){d.length||f.restart(!0),d.push(m.trigger),h.push(m),s<=d.length&&f.progress(1)}},o;for(o in e)n[o]=o.substr(0,2)==="on"&&Wn(e[o])&&o!=="onRefreshInit"?a(o,e[o]):e[o];return Wn(s)&&(s=s(),wn(ct,"refresh",function(){return s=e.batchMax()})),Ol(r).forEach(function(l){var c={};for(o in n)c[o]=n[o];c.trigger=l,t.push(ct.create(c))}),t};var h_=function(e,t,n,i){return t>i?e(i):t<0&&e(0),n>i?(i-t)/(n-t):n<0?t/(t-n):1},xp=function r(e,t){t===!0?e.style.removeProperty("touch-action"):e.style.touchAction=t===!0?"auto":t?"pan-"+t+($t.isTouch?" pinch-zoom":""):"none",e===Ti&&r(Et,t)},Ph={auto:1,scroll:1},fE=function(e){var t=e.event,n=e.target,i=e.axis,s=(t.changedTouches?t.changedTouches[0]:t).target,a=s._gsap||Ge.core.getCache(s),o=Gn(),l;if(!a._isScrollT||o-a._isScrollT>2e3){for(;s&&s!==Et&&(s.scrollHeight<=s.clientHeight&&s.scrollWidth<=s.clientWidth||!(Ph[(l=Ui(s)).overflowY]||Ph[l.overflowX]));)s=s.parentNode;a._isScroll=s&&s!==n&&!na(s)&&(Ph[(l=Ui(s)).overflowY]||Ph[l.overflowX]),a._isScrollT=o}(a._isScroll||i==="x")&&(t.stopPropagation(),t._gsapAllow=!0)},I_=function(e,t,n,i){return $t.create({target:e,capture:!0,debounce:!1,lockAxis:!0,type:t,onWheel:i=i&&fE,onPress:i,onDrag:i,onScroll:i,onEnable:function(){return n&&wn(wt,$t.eventTypes[0],d_,!1,!0)},onDisable:function(){return En(wt,$t.eventTypes[0],d_,!0)}})},dE=/(input|label|select|textarea)/i,f_,d_=function(e){var t=dE.test(e.target.tagName);(t||f_)&&(e._gsapAllow=!0,f_=t)},pE=function(e){Ks(e)||(e={}),e.preventDefault=e.isNormalizer=e.allowClicks=!0,e.type||(e.type="wheel,touch"),e.debounce=!!e.debounce,e.id=e.id||"normalizer";var t=e,n=t.normalizeScrollX,i=t.momentum,s=t.allowNestedScroll,a=t.onRelease,o,l,c=Qn(e.target)||Ti,u=Ge.core.globals().ScrollSmoother,d=u&&u.get(),h=ys&&(e.content&&Qn(e.content)||d&&e.content!==!1&&!d.smooth()&&d.content()),f=Dr(c,cn),m=Dr(c,Vn),_=1,p=($t.isTouch&&_t.visualViewport?_t.visualViewport.scale*_t.visualViewport.width:_t.outerWidth)/_t.innerWidth,g=0,S=Wn(i)?function(){return i(o)}:function(){return i||2.8},M,x,R=I_(c,e.type,!0,s),E=function(){return x=!1},A=ur,v=ur,b=function(){l=hr(c,cn),v=Pl(ys?1:0,l),n&&(A=Pl(0,hr(c,Vn))),M=ta},P=function(){h._gsap.y=Al(parseFloat(h._gsap.y)+f.offset)+"px",h.style.transform="matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, "+parseFloat(h._gsap.y)+", 0, 1)",f.offset=f.cacheID=0},C=function(){if(x){requestAnimationFrame(E);var Z=Al(o.deltaY/2),ee=v(f.v-Z);if(h&&ee!==f.v+f.offset){f.offset=ee-f.v;var L=Al((parseFloat(h&&h._gsap.y)||0)-f.offset);h.style.transform="matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, "+L+", 0, 1)",h._gsap.y=L+"px",f.cacheID=mt.cache,Nr()}return!0}f.offset&&P(),x=!0},I,H,V,D,O=function(){b(),I.isActive()&&I.vars.scrollY>l&&(f()>l?I.progress(1)&&f(l):I.resetTo("scrollY",l))};return h&&Ge.set(h,{y:"+=0"}),e.ignoreCheck=function(F){return ys&&F.type==="touchmove"&&C(F)||_>1.05&&F.type!=="touchstart"||o.isGesturing||F.touches&&F.touches.length>1},e.onPress=function(){x=!1;var F=_;_=Al((_t.visualViewport&&_t.visualViewport.scale||1)/p),I.pause(),F!==_&&xp(c,_>1.01?!0:n?!1:"x"),H=m(),V=f(),b(),M=ta},e.onRelease=e.onGestureStart=function(F,Z){if(f.offset&&P(),!Z)D.restart(!0);else{mt.cache++;var ee=S(),L,ie;n&&(L=m(),ie=L+ee*.05*-F.velocityX/.227,ee*=h_(m,L,ie,hr(c,Vn)),I.vars.scrollX=A(ie)),L=f(),ie=L+ee*.05*-F.velocityY/.227,ee*=h_(f,L,ie,hr(c,cn)),I.vars.scrollY=v(ie),I.invalidate().duration(ee).play(.01),(ys&&I.vars.scrollY>=l||L>=l-1)&&Ge.to({},{onUpdate:O,duration:ee})}a&&a(F)},e.onWheel=function(){I._ts&&I.pause(),Gn()-g>1e3&&(M=0,g=Gn())},e.onChange=function(F,Z,ee,L,ie){if(ta!==M&&b(),Z&&n&&m(A(L[2]===Z?H+(F.startX-F.x):m()+Z-L[1])),ee){f.offset&&P();var ye=ie[2]===ee,Fe=ye?V+F.startY-F.y:f()+ee-ie[1],ze=v(Fe);ye&&Fe!==ze&&(V+=ze-Fe),f(ze)}(ee||Z)&&Nr()},e.onEnable=function(){xp(c,n?!1:"x"),ct.addEventListener("refresh",O),wn(_t,"resize",O),f.smooth&&(f.target.style.scrollBehavior="auto",f.smooth=m.smooth=!1),R.enable()},e.onDisable=function(){xp(c,!0),En(_t,"resize",O),ct.removeEventListener("refresh",O),R.kill()},e.lockAxis=e.lockAxis!==!1,o=new $t(e),o.iOS=ys,ys&&!f()&&f(1),ys&&Ge.ticker.add(ur),D=o._dc,I=Ge.to(o,{ease:"power4",paused:!0,inherit:!1,scrollX:n?"+=0.1":"+=0",scrollY:"+=0.1",modifiers:{scrollY:P_(f,f(),function(){return I.pause()})},onUpdate:Nr,onComplete:D.vars.onComplete}),o};ct.sort=function(r){if(Wn(r))return gt.sort(r);var e=_t.pageYOffset||0;return ct.getAll().forEach(function(t){return t._sortY=t.trigger?e+t.trigger.getBoundingClientRect().top:t.start+_t.innerHeight}),gt.sort(r||function(t,n){return(t.vars.refreshPriority||0)*-1e6+(t.vars.containerAnimation?1e6:t._sortY)-((n.vars.containerAnimation?1e6:n._sortY)+(n.vars.refreshPriority||0)*-1e6)})};ct.observe=function(r){return new $t(r)};ct.normalizeScroll=function(r){if(typeof r>"u")return jn;if(r===!0&&jn)return jn.enable();if(r===!1){jn&&jn.kill(),jn=r;return}var e=r instanceof $t?r:pE(r);return jn&&jn.target===e.target&&jn.kill(),na(e.target)&&(jn=e),e};ct.core={_getVelocityProp:yh,_inputObserver:I_,_scrollers:mt,_proxies:Xi,bridge:{ss:function(){Ni||ra("scrollStart"),Ni=Gn()},ref:function(){return Hn}}};v_()&&Ge.registerPlugin(ct);async function D_(r="geometry"){let e=globalThis.__DIANA_ASSET_BASE__,t=l=>e?`${String(e).replace(/\/$/,"")}/${l}`:`./${l}`,[n,i]=await Promise.all([fetch(t(`${r}.json`)),fetch(t(`${r}.bin`))]);if(!n.ok||!i.ok)throw new Error("The Diana model could not load");let[s,a]=await Promise.all([n.json(),i.arrayBuffer()]),o=new an;for(let[l,c]of Object.entries(s.attributes)){let u=c.type==="Uint32"?new Uint32Array(a,c.offset,c.length):new Float32Array(a,c.offset,c.length);l==="index"?o.setIndex(new sn(u,1)):o.setAttribute(l,new sn(u,c.itemSize))}return o.computeBoundingSphere(),{geometry:o,count:s.fragments,planes:s.planes}}function L_(r){let e=new qn;e.background=new qe("#34343e");function t(s,a,o,l){let c=new on({color:new qe(s).multiplyScalar(a),side:Bt}),u=new vt(new ln(...o),c);u.position.set(...l),u.lookAt(0,0,0),e.add(u)}t("#fbd4f0",2.2,[.65,7],[-4,2,5]),t("#a9e8ff",2.4,[.7,8],[4,-1,3]),t("#ffffff",2.4,[6,.65],[0,5,2]),t("#eab5ec",2.5,[2,6],[-4,0,-3]),t("#b3ecff",2,[4,.8],[1,-5,1]),t("#f0c6ef",1.5,[8,10],[-2,1,11]),t("#ace9fb",1.1,[5,9],[5,0,9]);let n=new Wa(r),i=n.fromScene(e,.02,.1,40);n.dispose();for(let s of e.children)s.geometry.dispose(),s.material.dispose();return i}async function U_(){let{geometry:r}=await D_("resting"),e=[],t=[];for(let s=0;s<r.index.count;s+=3){let a=r.index.getX(s),o=r.index.getX(s+1),l=r.index.getX(s+2);(r.attributes.aLobe.getX(a)<.5?e:t).push(a,o,l)}r.setIndex([...e,...t]),r.clearGroups(),r.addGroup(0,e.length,0),r.addGroup(e.length,t.length,1);for(let s of Object.keys(r.attributes))["position","normal"].includes(s)||r.deleteAttribute(s);let n={color:"#ffffff",metalness:0,roughness:.02,transmission:1,thickness:1.05,ior:1.5,dispersion:.65,clearcoat:1,clearcoatRoughness:.025,envMapIntensity:1.3,attenuationDistance:1.5,iridescence:.12,iridescenceIOR:1.25,iridescenceThicknessRange:[140,280]},i=[new tr({...n,attenuationColor:"#e5adeb"}),new tr({...n,attenuationColor:"#9ce0f3",attenuationDistance:1.8})];for(let[s,a]of i.entries())a.onBeforeCompile=o=>{o.uniforms.uRimTint={value:new qe(s?"#a7e8fa":"#efb9e9")},o.fragmentShader=`uniform vec3 uRimTint;
`+o.fragmentShader,o.fragmentShader=o.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
        float rim=pow(1.-abs(dot(normal,normalize(vViewPosition))),2.5);
        totalEmissiveRadiance+=uRimTint*rim*.18;
      `)};return new vt(r,i)}function N_(){let r=document.createElement("canvas");r.width=4096,r.height=1024;let e=r.getContext("2d");e.font="600 900px Outfit",e.textAlign="center",e.textBaseline="alphabetic";let t=900*3900/e.measureText("DIANA").width;e.font=`600 ${t}px Outfit`;let n=e.measureText("DIANA");e.fillStyle="#ffffff",e.fillText("DIANA",2048,(1024+n.actualBoundingBoxAscent-n.actualBoundingBoxDescent)/2);let i=new Ls(r);return i.colorSpace=Vt,new vt(new ln(1,1),new on({map:i,alphaTest:.025,toneMapped:!1,side:Bt}))}function F_(r){let e=document.createElement("canvas").getContext("2d");e.font="700 300px Outfit";let t=e.measureText(r),n=(t.actualBoundingBoxAscent+t.actualBoundingBoxDescent+30)/(t.width+60),i=document.createElement("canvas");i.width=4096,i.height=Math.ceil(i.width*n);let s=i.getContext("2d"),a=300*i.width/(t.width+60);s.font=`700 ${a}px Outfit`,s.textAlign="center",s.textBaseline="alphabetic";let o=s.measureText(r);s.fillStyle="#000000",s.fillRect(0,0,i.width,i.height),s.fillStyle="#ffffff",s.fillText(r,i.width/2,(i.height+o.actualBoundingBoxAscent-o.actualBoundingBoxDescent)/2);let l=new Ls(i);return l.minFilter=Ft,l.magFilter=Ft,l.generateMipmaps=!1,{texture:l,aspect:n}}function O_(){let r=["HOMEWORK","THAT FITS","YOUR LIFE"].map(F_),e=F_("YOUR  AI  TUTOR"),t=new ln(26.6,40,320,1),n=t.attributes.position,i=new Float32Array(n.count*2);for(let o=0;o<n.count;o++){let l=n.getX(o),c=n.getY(o),u=l/9.5;n.setXYZ(o,9.5*Math.sin(u),c,9.5*(1-Math.cos(u))),i[o*2]=l,i[o*2+1]=c}t.setAttribute("screenCoord",new sn(i,2)),t.computeVertexNormals();let s={uTime:{value:0},uPitch:{value:.045},uMobile:{value:0},uSpan:{value:18},uCopyBottom:{value:.25},uCopyTop:{value:.88},uIntensity:{value:.55},uHomework:{value:r[0].texture},uFits:{value:r[1].texture},uBottom:{value:r[2].texture},uAspects:{value:new W(...r.map(o=>o.aspect))},uOpening:{value:1},uTutor:{value:0},uTextCenter:{value:0},uTutorOffset:{value:new we},uTutorLine:{value:e.texture},uTutorAspect:{value:e.aspect},uBrand:{value:null},uBrandOpacity:{value:1},uBrandScreenToLocal:{value:new st},uCyan:{value:new qe("#46cee2")},uPink:{value:new qe("#f08abf")}},a=new en({uniforms:s,side:Bt,toneMapped:!1,vertexShader:`
      attribute vec2 screenCoord;
      varying vec2 vScreen;
      varying vec3 vNormal;
      varying vec4 vClip;
      void main() {
        vScreen = screenCoord;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vClip = gl_Position;
      }
    `,fragmentShader:`
      uniform float uTime;
      uniform float uPitch;
      uniform float uMobile;
      uniform float uSpan;
      uniform float uCopyBottom;
      uniform float uCopyTop;
      uniform float uIntensity;
      uniform vec3 uAspects;
      uniform float uOpening;
      uniform float uTutor;
      uniform float uTextCenter;
      uniform vec2 uTutorOffset;
      uniform float uTutorAspect;
      uniform sampler2D uTutorLine;
      uniform sampler2D uBrand;
      uniform float uBrandOpacity;
      uniform mat3 uBrandScreenToLocal;
      uniform sampler2D uBottom;
      uniform sampler2D uHomework;
      uniform sampler2D uFits;
      uniform vec3 uCyan;
      uniform vec3 uPink;
      varying vec2 vScreen;
      varying vec3 vNormal;
      varying vec4 vClip;

      float glyph(sampler2D plate, vec2 p, float y, float width, float aspect, float travel, float period) {
        float x = mod(p.x + travel + period * 0.5, period) - period * 0.5;
        vec2 uv = vec2(x / width, (p.y - y) / (width * aspect)) + 0.5;
        if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
        return texture2D(plate, uv).r;
      }

      void main() {
        vec2 cell = vScreen / uPitch;
        vec2 center = (floor(cell) + 0.5) * uPitch;
        vec2 q = abs(fract(cell) - 0.5);
        float edge = max(q.x, q.y);
        float aa = max(fwidth(cell.x), fwidth(cell.y)) * 0.5;
        float emitter = 1.0 - smoothstep(0.32 - aa, 0.38 + aa, edge);
        float housing = 1.0 - smoothstep(0.44 - aa, 0.49 + aa, edge);

        // Sample content at fixed LED centers: only the light changes, not the pixel lattice.
        vec2 textPoint = center;
        textPoint.x += center.y * 0.14 * (1.0 - uMobile);
        float textMask = 0.0;
        if (uOpening > 0.0 && uMobile > 0.5) {
          float period = uSpan * 1.7;
          textMask = max(
            glyph(uHomework, textPoint, 2.4, uSpan * 0.84, uAspects.x, uTime / 40.0 * period, period),
            max(glyph(uFits, textPoint, 0.0, uSpan * 0.84, uAspects.y, -uTime / 48.0 * period, period),
                glyph(uBottom, textPoint, -2.4, uSpan * 0.84, uAspects.z, uTime / 44.0 * period, period))
          );
        } else if (uOpening > 0.0) {
          float period = 24.0;
          textMask = max(
            glyph(uHomework, textPoint, 3.6, 16.0, uAspects.x, uTime / 48.0 * period, period),
            max(glyph(uFits, textPoint, 0.0, 15.0, uAspects.y, -uTime / 56.0 * period, period),
                glyph(uBottom, textPoint, -3.6, 16.0, uAspects.z, uTime / 40.0 * period, period))
          );
        }

        float openingWidth = uMobile > 0.5 ? uSpan * 0.84 : 16.0;
        float tutorWidth = openingWidth * (uMobile > 0.5 ? 0.68 : 0.45);
        // The tutor line now holds in place while the timeline handles opacity.
        vec2 tutorPoint = center - uTutorOffset - vec2(0.0, uTextCenter);
        tutorPoint = mat2(1.0, 0.0, 0.0, 1.0) * tutorPoint;
        float tutorMask = 0.0;
        if (uTutor > 0.0) {
          tutorMask = glyph(uTutorLine, tutorPoint, 0.0, tutorWidth, uTutorAspect, 0.0, 90.0);
        }
        textMask *= uOpening;

        float phase = sin(uTime * 6.2831853 / 24.0);
        float saturation = pow(abs(phase), 0.8) * 0.94;
        float hue = smoothstep(-0.7, 0.7, center.x / max(uSpan, 6.0) * 0.7 - phase * 0.75);
        vec3 screenColor = mix(vec3(0.76, 0.8, 0.84), mix(uCyan, uPink, hue), saturation);
        float sweep = smoothstep(0.2, 0.85, 0.5 + 0.5 * sin(center.x * 0.55 + center.y * 0.16 - uTime * 0.3));
        float scan = 0.65 + 0.35 * sin(center.y * 0.8 + uTime * 0.16);
        float field = 0.009 + mix(0.012, 0.22, saturation) * sweep * scan;
        float facing = pow(abs(normalize(vNormal).z), 1.6);
        float falloff = mix(0.55, 1.0, facing);
        float screenY = 0.5 + 0.5 * vClip.y / vClip.w;
        float copySpace = smoothstep(uCopyBottom - 0.03, uCopyBottom + 0.22, screenY)
          * (1.0 - smoothstep(uCopyTop - 0.08, uCopyTop + 0.03, screenY));
        float light = uIntensity * mix(0.65, 1.0, copySpace);
        float mobileType = 1.0 - uMobile * (1.0 - smoothstep(0.05, 0.8, saturation)) * 0.4;
        float luminance = (field + textMask * mix(0.88, 0.13, saturation) * 0.38 * mobileType
          + tutorMask * uTutor * mix(0.7, 0.38, saturation)) * falloff * light;

        vec2 module = abs(fract(vScreen / 1.28 + 0.5) - 0.5);
        vec2 moduleAA = fwidth(vScreen / 1.28);
        float joint = 1.0 - min(smoothstep(0.007, 0.007 + moduleAA.x, module.x), smoothstep(0.007, 0.007 + moduleAA.y, module.y));
        vec3 color = vec3(0.0013, 0.0016, 0.0022);
        color += vec3(0.0012, 0.0015, 0.0018) * housing;
        color += screenColor * luminance * emitter;
        color = mix(color, vec3(0.003, 0.004, 0.005), joint * 0.94);
        if (uBrandOpacity > 0.0) {
          vec3 brandLocal = uBrandScreenToLocal * vec3(vClip.xy / vClip.w, 1.0);
          vec2 brandUV = brandLocal.xy / brandLocal.z + 0.5;
          if (all(greaterThanEqual(brandUV, vec2(0.0))) && all(lessThanEqual(brandUV, vec2(1.0)))) {
            color = mix(color, vec3(1.0), texture2D(uBrand, brandUV).a * uBrandOpacity);
          }
        }
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `});return{mesh:new vt(t,a),uniforms:s}}function B_(r,e,t){let n=new Us,i=r/2,s=e/2;n.moveTo(-i+t,-s);for(let a=1;a<=64;a++)n.lineTo(-i+t+(r-2*t)*a/64,-s);n.quadraticCurveTo(i,-s,i,-s+t),n.lineTo(i,s-t),n.quadraticCurveTo(i,s,i-t,s);for(let a=1;a<=64;a++)n.lineTo(i-t-(r-2*t)*a/64,s);return n.quadraticCurveTo(-i,s,-i,s-t),n.lineTo(-i,-s+t),n.quadraticCurveTo(-i,-s,-i+t,-s),n.closePath(),n}function k_(r,e,t=!1){let n=e<0?-1:1;e=Math.abs(e);let i=r.attributes.position,s=r.userData.rest??=i.array.slice();for(let a=0;a<i.count;a++){let o=s[a*3],l=s[a*3+1],c=s[a*3+2],u=o/e;i.setXYZ(a,(e+c)*Math.sin(u),l,-n*e*(1-Math.cos(u))+c*Math.cos(u))}i.needsUpdate=!0,t&&r.computeVertexNormals(),r.computeBoundingSphere()}function po(r,e){let t=new Nn,n=rt.clamp(r*.012,.026,.068),i=rt.clamp(r*.027,.064,.15),s=B_(r+n*2,e+n*2,n*.8),a=new Fa(s.getPoints(8));a.holes.push(B_(r+.012,e+.012,.006));let o=new qo(a,{depth:i,steps:1,bevelEnabled:!0,bevelSize:n*.2,bevelThickness:n*.2,bevelSegments:3,curveSegments:8});o.translate(0,0,-i);let l=new tr({color:"#d9edf1",metalness:.08,roughness:.14,transmission:.72,thickness:i,ior:1.46,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.6,transparent:!0,opacity:0,depthWrite:!1,attenuationColor:"#c5e9ec",attenuationDistance:.65}),c=new vt(o,l);t.add(c);let u=[];for(let[f,m,_]of[[.008,"#edfaff",.6],[-i,"#a6bdce",.32]]){let p=s.getPoints(8).map(S=>new W(S.x,S.y,f)),g=new Ds(new an().setFromPoints(p),new Kr({color:m,transparent:!0,opacity:0,depthWrite:!1}));g.userData.opacity=_,u.push(g),t.add(g)}t.userData.dimensions={width:r,height:e,border:n,depth:i};let d;function h(f){Math.abs((d??0)-f)<1e-4||(k_(o,r*f,!0),u.forEach(m=>k_(m.geometry,r*f)),d=f,t.userData.curvature=f)}return h(1.15),{group:t,update(f,m=1.15){f>.002&&h(m),l.opacity=f*.94,u.forEach(_=>{_.material.opacity=f*_.userData.opacity})},dispose(){t.traverse(f=>{f.geometry?.dispose(),f.material?.dispose()})}}}var An=r=>{let e=globalThis.__DIANA_ASSET_BASE__,t=globalThis.__DIANA_ASSET_VERSION__;return e?`${String(e).replace(/\/$/,"")}/${r}${t?`?v=${t}`:""}`:r},Fr=[{title:"Your Day Starts Here",description:"Open your lobby and see where to start first.",detail:"Optional check-ins for energy, sleep, and movement help Diana understand how your day is going before you begin.",image:An("lobby.webp"),mobile:An("lobby-mobile.webp"),scale:.9,detailImage:An("check-in.webp"),detailMobile:An("check-in-mobile.webp"),alt:"Diana Lobby with the next assignment and separate optional Check-in tab"},{title:"Homework Organized",description:"Assignments, deadlines, saved progress, and review status stay in one place, so your next step is easier to find.",detail:"",image:An("control-work.webp"),mobile:An("control-work-mobile.webp"),alt:"Diana Work with a weekly assignment list and saved progress"},{title:"Work Through It",description:"Ask Diana for help and work the problem together, one question and one step at a time.",detail:"Talk to Diana live, type a question or use voice to text to work through a confusing part.",image:An("work-through-it.webp"),mobile:An("work-through-it-mobile.webp"),alt:"Diana linear equations workspace with message, voice-to-text, and live voice support"},{title:"Prepare For The Test",description:"Turn what you are learning into practice. Review the parts that need another look.",detail:"",image:An("practice-desktop.webp"),mobile:An("practice-mobile.webp"),alt:"Diana practice questions with readable answer choices"}];var Or=[{title:"See Your Whole Day",description:"",detail:"Diana helps you see where schoolwork fits around real life, then choose a realistic starting point for the time you have.",image:An("calendar.webp"),mobile:An("calendar-mobile.webp"),alt:"Diana Calendar with basketball practice, robotics club, and a study block",action:"See Your Calendar"},{title:"Bring It All Together",description:"Put homework, notes, syllabi, screenshots, and class files in one place instead of searching through apps when you sit down.",detail:"",image:An("bring-it-all-together-poster.webp"),video:An("bring-it-all-together.mp4"),alt:"Student taking notes during a classroom lesson",action:"Watch Class Context"},{title:"Beyond Homework",description:"Make a plan with room for the things you care about, and a clear place to pick up when you come back.",detail:"",image:An("beyond-homework-poster.webp"),video:An("beyond-homework.mp4"),alt:"Students walking together after school, representing life beyond homework",action:"See The Film"}];var ni=Fr;function z_(r){let e=rt.clamp(r,0,1),t=rt.smoothstep(e,.2,1),n=.8*(1-t);return{angle:n,yaw:n*.5,y:-.45*(1-t),opacity:e,neighbors:rt.smoothstep(e,.78,1)}}function mE(r){let e=rt.smoothstep(r,0,.82),t=.8*e;return{angle:t,yaw:t*.5,y:.18*e,opacity:1-rt.smoothstep(r,.4,.82)}}function gE(r,e,t){if(t===0&&e<=0)return z_(r);let n=e-t;return n>0?mE(n):z_(rt.smoothstep(1+n,.42,1))}function _E(r){return rt.lerp(1e4,1.15,rt.smoothstep(Math.abs(r),.02,.52))}function xE(r,e,t){let n=e<r?1:e===Math.round(r)?t:0;return rt.smoothstep(n,.32,.68)}function zh(r,e){if(Math.abs((r.userData.curvature??0)-e)<1e-4)return;let t=r.userData.width,n=r.attributes.position,i=r.attributes.uv,s=e<0?-1:1,a=t*Math.abs(e);for(let o=0;o<n.count;o++){let l=(i.getX(o)-.5)*t/a;n.setXYZ(o,a*Math.sin(l),n.getY(o),-s*a*(1-Math.cos(l)))}n.needsUpdate=!0,r.computeVertexNormals(),r.computeBoundingSphere(),r.userData.curvature=e}function kl(r,e){let t=new ln(r,e,96,1);return t.userData.width=r,zh(t,1.15),t}async function V_(r){let e=new ts,t=new Nn,n=[];for(let h of ni){let f=await e.loadAsync(h.image),m=h.mobileCrop?f.clone():h.image===h.mobile?f:await e.loadAsync(h.mobile),_=h.detailImage?await e.loadAsync(h.detailImage):null,p=!_||!h.detailMobile||h.detailImage===h.detailMobile?_:await e.loadAsync(h.detailMobile);if(h.mobileCrop){let A=h.mobileCrop;m.repeat.set(A.width,A.height),m.offset.set(A.x,1-A.y-A.height),m.needsUpdate=!0}for(let A of[f,m,_,p])A&&(A.colorSpace=Vt,A.anisotropy=Math.min(8,r.capabilities.getMaxAnisotropy()));let g=new on({map:f,side:Bt,toneMapped:!1,transparent:!0,opacity:0}),S=new vt(kl(6,3.375),g),M=_?new on({map:_,side:Bt,toneMapped:!1,transparent:!0,opacity:0}):null,x=M?new vt(S.geometry,M):null;S.userData.slide=n.length;let R=new Nn,E=po(6,3.375);S.position.z=.016,x&&(x.position.z=.018),R.add(S),x&&R.add(x),R.add(E.group),t.add(R),n.push({mesh:S,detailMesh:x,pivot:R,frame:E,desktop:f,mobile:m,detailDesktop:_,detailMobile:p})}let i=!1,s=7.8,a=.4,o=2.2,l=6,c=3.4;t.visible=!1;function u({width:h,height:f,copyTop:m,headerBottom:_}){i=h<960&&h<f;let p=10.8-o,g=2*Math.tan(16*Math.PI/180)*p,S=g*h/f,M=Math.max(140,m-_-56)/f*g;l=i?S*.86:Math.min(S*.87,M*2.06),c=i?Math.min(M,l*1.65):l/1.78,s=l*1.08,a=(.5-(_+m)/2/f)*g;for(let x of n){let R=ni[x.mesh.userData.slide],E=i&&h<700&&R.mobileCrop,A=i&&(!R.mobileCrop||E)?x.mobile:x.desktop,v=x.detailDesktop?i&&x.detailMobile?x.detailMobile:x.detailDesktop:null,b=i&&E?A.image.height/A.image.width*(R.mobileCrop.height/R.mobileCrop.width):9/16,P=Math.min(l,c/b);x.mesh.geometry.dispose(),x.mesh.geometry=kl(P,P*b),x.detailMesh&&(x.detailMesh.geometry=x.mesh.geometry),x.mesh.material.map=A,x.detailMesh&&v&&(x.detailMesh.material.map=v),x.pivot.remove(x.frame.group),x.frame.dispose(),x.frame=po(P,P*b),x.pivot.add(x.frame.group)}}function d(h,f,m=0){t.visible=h>.001,n.forEach(({mesh:_,detailMesh:p,pivot:g,frame:S},M)=>{let x=gE(h,f,M),R=x.angle;g.position.set(Math.sin(R)*s,a+x.y,o+s*(Math.cos(R)-1)),g.rotation.set(0,R+x.yaw,0);let E=p?xE(f,M,m):0;_.material.opacity=x.opacity*(1-E),p&&(p.material.opacity=x.opacity*E,p.visible=E>.002);let A=_E(R);x.opacity>.002&&zh(_.geometry,A),S.update(x.opacity,A),g.visible=x.opacity>.002,_.material.color.setScalar(.68+.32*rt.smoothstep(Math.cos(R),.5,1))})}return{group:t,resize:u,update:d,panels:n}}var ii=(r,e,t)=>Math.min(t,Math.max(e,r)),zt=(r,e,t)=>{let n=ii((r-e)/(t-e),0,1);return n*n*(3-2*n)};function H_({height:r,span:e,tutorWidth:t}){let n=r*1.28,i=r,s=i*.56,a=e*.95,o=-e*.58-t/2-1.4,l=r*2.4,c=0,u=r<720?1.1:2.05,d=l+n*.08,h=n*1.16,f=n*1.24,m=f+n*.82,_=n*1.08,p=Fr.map((z,Me)=>Me===0?m:f),g=Fr.map((z,Me)=>d+h+Me*(f+_)+(Me>0?m-f:0)),S=g[0],M=g.at(-1),x=n*1.08,R=M+f+x,E=M+f+x*.45,A=R+n*.44,v=A+n*.1,b=v+n*1.62,P=b+n*.28,C=P+n*8.4,I=P+n*.48,H=C,V=C+n*.18,D=V+n*1.25,O=D-n*.13,F=O+n*.82,Z=n*1.58,ee=n*1.4,L=Or.map(z=>z.video?n*.1:Z),ie=[F];for(let z=1;z<Or.length;z++)ie.push(ie[z-1]+L[z-1]+ee);let ye=ie.at(-1),Fe=ye+L.at(-1)+n*1.2,ze=Fe+n*.06,Oe=ze+n*2.1,K=ze+n*1.8,le=K+n*.32,ue=K+n*.84,Ee=K+n*1.55,He=Ee+n*.36,Ae=n*.68,Ye=n*.96,Se=[He,He+Ae+Ye,He+2*(Ae+Ye)],j=Se.at(-1)+Ae,oe=j,re=ie.map((z,Me)=>z+L[Me]*.18),B=ie.map((z,Me)=>Or[Me].video?z:null),me=g.map(z=>z+f*.45),We=Se.map(z=>z+Ae*.2),N=Array.from({length:7},(z,Me)=>I+(Me+.3)/7*(H-I)),Ne=[...N.map((z,Me)=>({id:`vision-${Me}`,point:z,duration:Me===3?1800:2300})),{id:"control-title",point:le,duration:2200}],Pe=(z,Me,w,y)=>Me.reduce((G,$,se)=>{let fe=Array.isArray(w)?w[se]:w;return G+zt(z,$+fe,Me[se+1]??y)},0),Q=[A,v+(b-v)*.5,b+r*.2];return{end:oe,nativeEnd:oe-(l-s),textExit:l,tutorLockStart:s,tutorX:c,tutorY:u,carouselStart:d,stops:me,finaleStops:Q,waveStart:v,waveEnd:b,exitEnd:R,startX:a,endX:o,tutorWidth:t,visionStart:P,visionEnd:C,diveStart:V,diveEnd:D,dayStart:O,daySettled:F,dayReadingStops:re,dayPlaybackStops:B,dayExitEnd:Fe,breachStart:ze,breachEnd:Oe,controlStart:K,controlEnd:j,controlReadingStops:We,readingStops:Ne,visionReadingStops:N,controlStop:le,dayStops:[V+r*.7,V+r*1.35,O+r*.3,F+r*.4],visionStops:[P+r*.6,P+r*1.7,C],progressAt(z,Me=null){let w=Me===null?z:s+ii(Me,0,1)*(l-s);return ii(w/oe,0,1)},at(z){let Me=zt(z,d,S),w=Pe(z,g,p,R),y=Math.min(Fr.length-1,Math.round(w)),G=ii((z-g[y])/p[y],0,1),$=Pe(z,ie,L,Fe),se=Math.min(Or.length-1,Math.round($)),fe=ii((z-ie[se])/L[se],0,1),ae=zt(z,O+r*.35,F)*(1-zt(Math.abs($-Math.round($)),.32,.5))*(1-zt($,Or.length-.6,Or.length)),U=ii((z-K)/(j-K),0,1),te=ii((z-K)/(Ee-K),0,1),Te=zt(z,Se[0]+Ae,Se[1])+zt(z,Se[1]+Ae,Se[2]);return{opening:1-zt(z,i*.015,s),tutor:0,x:c,y:u,stage:Me,index:w,productDetail:zt(G,.42,.54),growth:zt(z,E,A),wave:ii((z-v)/(b-v),0,1),vision:zt(z,P,P+r*1.5),draw:ii((z-P)/(r*1.2),0,1),explanation:zt(z,I,I+n*.22),visionSequence:ii((z-I)/(H-I),0,1),gridTravel:ii(z-P,0,C-P)*.42,dive:ii((z-V)/(D-V),0,1),visionFade:1-zt(z,V,V+r*.5),day:ii((z-O)/(F-O),0,1),dayTravel:ii((z-V)/r,0,(oe-V)/r),dayIndex:$,dayActive:se,dayDetail:zt(fe,.42,.58),dayCopy:ae,dayHeading:zt(z,O+r*.35,F)*(1-zt(z,ye+L.at(-1),Fe)),breach:ii((z-ze)/(Oe-ze),0,1),control:zt(z,K,K+n*.3),controlScene:U,controlIntro:te,controlDim:zt(z,ue,Ee),controlTitle:zt(z,K+n*.05,le)*(1-zt(z,ue,Ee)),controlEnter:zt(z,ue+n*.3,He),controlExit:0,controlBeatIndex:Te,controlBeatActive:Math.min(2,Math.round(Te)),active:Math.min(Fr.length-1,Math.round(w)),copy:zt(Me,.28,.86)*(1-zt(Math.abs(w-Math.round(w)),.22,.5))*(1-zt(w,Fr.length-.8,Fr.length-.35))}}}}var G_=`
  uniform vec2 uResolution;
  uniform float uGridTravel;
  uniform vec3 uGray;
  float gridLine(vec2 p, float period) {
    vec2 cell = abs(fract(p / period - .5) - .5) * period;
    vec2 line = 1.0 - smoothstep(vec2(.25), max(fwidth(p), vec2(.7)), cell);
    return max(line.x, line.y);
  }
  vec3 grayGrid(vec2 uv) {
    vec2 p = (uv - .5) * uResolution;
    p.y += p.x * p.x / uResolution.x * .1;
    p.y -= uGridTravel;
    p.x += pow(p.x / uResolution.x, 3.0) * uResolution.x * .28;
    float pitch = uResolution.x < 700.0 ? 78.0 : 116.0;
    float lines = max(gridLine(p, pitch) * .2, gridLine(p, pitch * 4.0) * .32);
    float light = 1.0 + .035 * uv.y + .025 * sin(uv.x * 3.14159265) * uv.y * (1.0 - uv.y);
    return mix(uGray * light, vec3(.14, .17, .18), lines);
  }
`,vE=`varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, .999, 1.0); }`;function W_(r,e){return-.12+1.24*r+.035*Math.sin(e*Math.PI*1.4+r*1.8)+.012*Math.sin(e*Math.PI*2-r*.8)}function X_(r){let e=new qn;e.background=new qe("#000000");let t=new vt(r.geometry,[new on({color:"#ff0000",toneMapped:!1}),new on({color:"#00ff00",toneMapped:!1})]);t.matrixAutoUpdate=!1,e.add(t);let n=new Tn(1,1,{depthBuffer:!0,minFilter:Ft,magFilter:Ft});n.samples=4;let i={uMask:{value:n.texture},uWave:{value:0},uTexel:{value:new we(1,1)},uPixelRatio:{value:1},uGray:{value:new qe("#c6cccd")},uOutline:{value:new qe("#fcfdfd")},uResolution:{value:new we(1,1)},uGridTravel:{value:0},uGlass:{value:0}},s=new vt(new ln(2,2),new en({uniforms:i,depthWrite:!1,depthTest:!1,toneMapped:!1,vertexShader:vE,fragmentShader:`varying vec2 vUv; ${G_}
      void main() {
        gl_FragColor = vec4(grayGrid(vUv), 1.0);
        #include <colorspace_fragment>
      }`}));s.frustumCulled=!1,s.renderOrder=-10,s.visible=!1;let a=new en({uniforms:i,transparent:!0,depthTest:!1,depthWrite:!1,toneMapped:!1,vertexShader:`varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,fragmentShader:`
      uniform sampler2D uMask;
      uniform float uWave;
      uniform vec2 uTexel;
      uniform float uPixelRatio;
      uniform vec3 uOutline;
      uniform float uGlass;
      ${G_}
      varying vec2 vUv;
      void main() {
        float boundary = -.12 + 1.24 * uWave
          + .035 * sin(vUv.x * 3.14159265 * 1.4 + uWave * 1.8)
          + .012 * sin(vUv.x * 3.14159265 * 2.0 - uWave * .8);
        float coverage = 1.0 - smoothstep(boundary - uTexel.y, boundary + uTexel.y, vUv.y);
        if (coverage <= 0.0) discard;
        vec2 center = texture2D(uMask, vUv).rg;
        vec2 low = center;
        vec2 high = low;
        for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
            vec2 samplePoint = vUv + vec2(float(x), float(y)) * uTexel * uPixelRatio * 1.15;
            vec2 sampleMask = texture2D(uMask, samplePoint).rg;
            low = min(low, sampleMask); high = max(high, sampleMask);
          }
        }
        float edge = smoothstep(.12, .8, length(high - low));
        float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453) - .5;
        float interior = clamp(center.r + center.g, 0.0, 1.0);
        vec3 gray = mix(grayGrid(vUv), uGray, interior * smoothstep(0.0, .05, uGlass)) + grain * .002;
        gl_FragColor = vec4(mix(gray, uOutline, edge * .92 * (1.0 - uGlass)), coverage * (1.0 - interior * uGlass));
        #include <colorspace_fragment>
      }
    `}),o=new qn;o.add(new vt(new ln(2,2),a));let l=new Tr;return{backdrop:s,update(c,u){i.uGlass.value=c,i.uGridTravel.value=u*6.5,s.visible=c>0},resize(c,u,d){n.setSize(Math.round(c*d),Math.round(u*d)),i.uTexel.value.set(1/n.width,1/n.height),i.uPixelRatio.value=d,i.uResolution.value.set(c,u)},render(c,u,d,h){if(h<=0){c.render(u,d);return}i.uWave.value=h,r.updateWorldMatrix(!0,!1),t.matrix.copy(r.matrixWorld),t.visible=r.visible;let f=c.getRenderTarget();c.setRenderTarget(n),c.render(e,d),c.setRenderTarget(f),c.render(u,d);let m=c.autoClear;c.autoClear=!1,c.render(o,l),c.autoClear=m}}}function q_(r){let e=r.material,t={value:0},i=[["#ed1597","#6320d6"],["#04dfec","#075bc9"]].map(([s,a],o)=>{let l=new tr({color:"#ffffff",metalness:.55,roughness:.16,transmission:0,transparent:!1,opacity:1,clearcoat:1,clearcoatRoughness:.055,ior:1.5,iridescence:.28,iridescenceIOR:1.35,iridescenceThicknessRange:[180,340],envMapIntensity:1.05});return l.onBeforeCompile=c=>{Object.assign(c.uniforms,{uJewelTime:t,uJewelBright:{value:new qe(s)},uJewelDeep:{value:new qe(a)},uJewelPhase:{value:o*1.8}}),c.vertexShader=`varying vec3 vJewelPosition;
`+c.vertexShader,c.vertexShader=c.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
vJewelPosition = position;`),c.fragmentShader=`uniform float uJewelTime;
        uniform float uJewelPhase;
        uniform vec3 uJewelBright;
        uniform vec3 uJewelDeep;
        varying vec3 vJewelPosition;
`+c.fragmentShader,c.fragmentShader=c.fragmentShader.replace("#include <color_fragment>",`
        #include <color_fragment>
        float flow = .5 + .5 * sin(vJewelPosition.y * 1.9 + vJewelPosition.x * 1.2 - uJewelTime * .38 + uJewelPhase);
        diffuseColor.rgb *= mix(uJewelDeep, uJewelBright, smoothstep(.06, .94, flow));
      `),c.fragmentShader=c.fragmentShader.replace("#include <emissivemap_fragment>",`
        #include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * .055;
      `)},l.customProgramCacheKey=()=>"diana-opaque-jewel-v1",l});return{materials:i,update(s,a){r.material=s>0?i:e,t.value=a,i.forEach((o,l)=>{o.envMapRotation.set(.06*Math.sin(a*.19),.22*Math.sin(a*.23+l*.7),0)})}}}var fr=Or;function Y_(r,e,t){let{smoothstep:n,clamp:i}=rt,s=e-t,a=t===0&&e<=0?r:n(1+s,.32,1),o=i(s,0,1),l=n(a,.12,1),c=n(o,0,.9),u=-.92*(1-l+c);return{angle:u,yaw:u*.48,y:-.3*(1-l)+c*.65,opacity:n(a,0,.35)*(1-n(o,.32,.9)),curvature:64}}function Z_(r){return r*.18}var zl=rt.smoothstep,Ss=r=>{let e=Math.sin(r*127.1+311.7)*43758.5453;return e-Math.floor(e)};function yE(r,e,t){let n=Ss(e+9)*.05,i=zl(r,.08+n,.82),s=Math.atan2(t.y,t.x),a=Math.pow(i,1.35)*(4.6+Ss(e+20)*3.8);return{x:Math.cos(s)*a,y:Math.sin(s)*a-i*i*1.3,z:i*(2+Ss(e+40)*6),rx:i*(Ss(e+50)-.5)*3,ry:i*(Ss(e+60)-.5)*4,rz:i*(Ss(e+70)-.5)*2,opacity:1-zl(i,.5,.95),edge:zl(r,.035,.18)*(1-zl(i,.42,.88))}}function SE(r){let t=[.17,.49,1.02,Math.hypot(r,1)+.8],n=new we(r*.06,.025),i=t.map((a,o)=>Array.from({length:17},(l,c)=>{let u=c/17*Math.PI*2+(Ss(c+1)-.5)*.11,d=a*(o===3?1:.84+Ss(o*17+c+99)*.32);return new we(Math.cos(u)*d,Math.sin(u)*d).add(n)})),s=[];for(let a=0;a<17;a++){let o=(a+1)%17;s.push([n,i[0][a],i[0][o]]);for(let l=0;l<i.length-1;l++){let c=i[l][a],u=i[l][o],d=i[l+1][a],h=i[l+1][o];s.push([c,d,h],[c,h,u])}}return s}function J_(r,e){let t=new qn;t.background=new qe("#f1f3f0");let n=new ns(-1,1,1,-1,.1,40);n.position.z=12;let i=new vt(new ln(2,2),new on({map:e,transparent:!0,opacity:0,toneMapped:!1,depthWrite:!1}));i.position.z=-8,i.renderOrder=-1,t.add(i);let s=[];return{resize(a,o){let l=a/o;n.left=-l,n.right=l,n.updateProjectionMatrix(),i.scale.x=l;let c=e.image.width/e.image.height,u=Math.min(1,l/c),d=Math.min(1,c/l);e.repeat.set(u,d),e.offset.set((1-u)*(o>a?.1:.5),(1-d)/2),e.needsUpdate=!0,s.forEach(h=>h.group.traverse(f=>{f.geometry?.dispose(),f.material?.dispose()})),t.clear(),t.add(i),s=SE(l).map((h,f)=>{let m=h.reduce((v,b)=>v.add(b),new we).multiplyScalar(.3333333333333333),_=h.map(v=>new W(v.x-m.x,v.y-m.y,0)),p=new an().setFromPoints(_);p.setAttribute("uv",new Mn(h.flatMap(v=>[v.x/(l*2)+.5,v.y/2+.5]),2)),p.computeVertexNormals();let g=new on({map:r,side:Bt,transparent:!0,toneMapped:!1}),S=new vt(p,g),M=new Nn;M.add(S),M.position.set(m.x,m.y,0);let x=new Ds(new an().setFromPoints(_.map(v=>v.clone().setZ(.004))),new Kr({color:"#dff7ff",transparent:!0,opacity:0}));M.add(x);let R=[];for(let v=0;v<3;v++){let b=_[v],P=_[(v+1)%3];R.push(b.x,b.y,0,P.x,P.y,0,P.x,P.y,-.024,b.x,b.y,0,P.x,P.y,-.024,b.x,b.y,-.024)}let E=new an;E.setAttribute("position",new Mn(R,3));let A=new vt(E,new on({color:"#81b5c7",side:Bt,transparent:!0,opacity:0,toneMapped:!1}));return M.add(A),t.add(M),{group:M,material:g,edge:x,side:A,center:m,index:f}})},render(a,o){i.material.opacity=zl(o,.24,.55);for(let l of s){let c=yE(o,l.index,l.center);l.group.position.set(l.center.x+c.x,l.center.y+c.y,c.z),l.group.rotation.set(c.rx,c.ry,c.rz),l.group.visible=c.opacity>.001,l.material.opacity=c.opacity,l.edge.material.opacity=c.edge*.62,l.side.material.opacity=c.edge*.75}a.render(t,n)}}}var go=rt.smoothstep,mo=rt.lerp;function $_(r){return{approach:go(r,0,.56),distortion:go(r,.34,.56)*(1-go(r,.74,1)),reveal:go(r,.6,.96)}}async function K_(r,e){let t=new qn;t.background=new qe("#090b15"),t.environment=e;let n=new Sn(38,1,.1,80);n.position.set(0,.1,11),n.lookAt(0,0,-2);let i=new qn,s=new Tr,a=new Tn(1,1,{type:gi}),o=new Tn(1,1,{type:gi}),l=await new ts().loadAsync(An("day-student.webp"));l.colorSpace=Vt;let c=J_(o.texture,l);a.samples=4,o.samples=4;let u={uOriginal:{value:a.texture},uRoom:{value:o.texture},uReveal:{value:0},uDistort:{value:0},uProgress:{value:0}},d=new en({uniforms:u,depthTest:!1,depthWrite:!1,toneMapped:!1,vertexShader:"varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",fragmentShader:`
      uniform sampler2D uOriginal;
      uniform sampler2D uRoom;
      uniform float uReveal;
      uniform float uDistort;
      uniform float uProgress;
      varying vec2 vUv;
      vec2 lens(vec2 uv, float strength) {
        vec2 p = uv - .5;
        float radius = dot(p,p);
        p *= 1.0 + radius * strength * 1.5;
        p += strength * .025 * vec2(sin(p.y * 7. + uProgress * 6.), sin(p.x * 6. - uProgress * 5.));
        return clamp(.5 + p, .001, .999);
      }
      void main() {
        vec2 p = lens(vUv, uDistort);
        vec2 split = normalize(vUv - .5 + vec2(.0001)) * .004 * uDistort;
        vec3 front = vec3(texture2D(uOriginal, p + split).r, texture2D(uOriginal, p).g, texture2D(uOriginal, p - split).b);
        vec2 destination = lens(vUv, uDistort * .45);
        vec3 next = texture2D(uRoom, destination).rgb;
        gl_FragColor = vec4(mix(front, next, uReveal), 1.);
        #include <colorspace_fragment>
      }
    `});i.add(new vt(new ln(2,2),d));let h={uTime:{value:0},uTravel:{value:0},uPaletteSpread:{value:1}},f=new ln(46,30,192,8),m=f.attributes.position,_=m.array.slice();f.setAttribute("gridCoord",new sn(_,3));for(let C=0;C<m.count;C++){let I=m.getX(C)/15;m.setXYZ(C,15*Math.sin(I),m.getY(C),15*(1-Math.cos(I)))}f.computeVertexNormals(),f.computeBoundingSphere();let p=new vt(f,new en({uniforms:h,side:Bt,toneMapped:!1,depthWrite:!1,vertexShader:`attribute vec3 gridCoord; varying vec2 vGrid;
      void main() { vGrid=gridCoord.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,fragmentShader:`
      uniform float uTime; uniform float uTravel; uniform float uPaletteSpread; varying vec2 vGrid;
      float lines(vec2 p,float spacing) {
        vec2 cell=abs(fract(p/spacing-.5)-.5)*spacing;
        vec2 ink=1.-smoothstep(vec2(.006), max(fwidth(p)*.9,vec2(.012)),cell);
        return max(ink.x,ink.y);
      }
      void main() {
        vec2 p=vGrid+vec2(uTravel,0.);
        float flow=p.x*.29*uPaletteSpread+p.y*.13-uTime*.07;
        float pink=pow(.5+.5*sin(flow),6.);
        float cyan=pow(.5+.5*sin(flow+2.6),6.);
        float blue=pow(.5+.5*sin(flow+4.5),6.);
        vec3 color=vec3(.004,.007,.016)
          +vec3(.16,.001,.045)*pink+vec3(.001,.08,.12)*cyan+vec3(.006,.01,.11)*blue;
        float fine=lines(p,1.1), major=lines(p,5.5);
        color=mix(color,vec3(.35,.52,.65),fine*.09+major*.04);
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }
    `}));p.position.set(0,0,-7),p.rotation.set(.03,-.25,-.065),p.renderOrder=-1,t.add(p);let g=await Promise.all(fr.map(async C=>{let I=await new ts().loadAsync(C.image);I.colorSpace=Vt,I.anisotropy=Math.min(8,r.capabilities.getMaxAnisotropy());let H=new vt(kl(6,3.375),new on({map:I,side:Bt,transparent:!0,opacity:0,toneMapped:!1}));H.position.z=.016;let V=new Nn;V.add(H),t.add(V);let D=po(6,3.375);V.add(D.group);let O=null,F=null;return C.video&&!C.videoPending&&(O=document.createElement("video"),O.muted=!0,O.loop=!1,O.playsInline=!0,O.preload="metadata",O.src=C.video,F=new Fo(O),F.colorSpace=Vt,O.addEventListener("loadeddata",()=>{H.material.map=F,H.material.needsUpdate=!0}),O.addEventListener("error",()=>{H.material.map=I,H.material.needsUpdate=!0})),{group:V,image:H,frame:D,texture:I,video:O,playing:!1,started:!1,finished:!1,playAttempt:0,lastProgressAt:0,lastTime:0}})),S=new is("#e5f6ff",2);S.position.set(3,4,7),t.add(S);let M=-2,x=0,R=9,E=!1,A=()=>{},v=()=>{};function b(C,I){C.playAttempt++,C.video?.pause(),C.playing=!1,C.finished=!0,v(I)}g.forEach((C,I)=>{C.video?.addEventListener("ended",()=>b(C,I)),C.video?.addEventListener("error",()=>b(C,I))});function P(C,I){let H=++C.playAttempt;C.playing=!0,C.lastProgressAt=performance.now(),C.video.play().catch(V=>{H===C.playAttempt&&(C.playing=!1,E&&V.name!=="AbortError"&&b(C,I))})}return{setVideoCallbacks({onStart:C,onEnd:I}){A=C??A,v=I??v},videoState(){return g.map(C=>({started:C.started,finished:C.finished,playing:C.playing,duration:C.video?.duration??0,currentTime:C.video?.currentTime??0,paused:C.video?.paused??!0,angle:C.group.rotation.y,opacity:C.image.material.opacity}))},setPlayback(C){E=C,g.forEach((I,H)=>{!I.started||I.finished||(C?I.playing||P(I,H):(I.playAttempt++,I.video.pause(),I.playing=!1))})},cancelPlayback(){g.forEach((C,I)=>{C.started&&!C.finished&&b(C,I)})},prepare(C,I,H){let V=$_(H.dive);if(V.approach>0){I.updateWorldMatrix(!0,!1);let D=new W(.6,-.45,.35).applyMatrix4(I.matrixWorld),O=new W(0,.12,10.8),F=D.clone().add(new W(0,0,.7));C.position.copy(O.lerp(F,V.approach)),C.lookAt(new W().lerp(D,V.approach))}return V},resize(C,I,H){for(let F of[a,o])F.setSize(Math.round(C*H),Math.round(I*H));c.resize(C,I),n.aspect=C/I,n.updateProjectionMatrix();let V=2*Math.tan(19*Math.PI/180)*11,D=V*C/I,O=C<1e3&&I>C;h.uPaletteSpread.value=O?1.8:1,M=O?0:-D*.18,x=O?V*.08:0,R=D*1.25;for(let F of g){let Z=F.texture.image.width/F.texture.image.height,ee=V*(O?.33:.52),L=Math.min(O?D*.86:D*.52,ee*Z),ie=L/Z;F.image.geometry.dispose(),F.image.geometry=kl(L,ie),F.group.remove(F.frame.group),F.frame.dispose(),F.frame=po(L,ie),F.group.add(F.frame.group)}},render(C,I,H,V){if(H.dive<=0){I();return}let D=$_(H.dive),O=go(H.dive,.6,1),F=go(H.breach||0,0,.48);n.position.set(mo(-1.1,0,O)+F*.5,.1,mo(mo(8.8,11,O),-3.5,F)),n.lookAt(mo(1,0,O),0,mo(-2,-7,F)),n.rotateZ(mo(-.08,0,O));for(let[ie,ye]of g.entries()){let Fe=Y_(H.day,H.dayIndex||0,ie);ye.group.visible=Fe.opacity>.001&&!H.breach,ye.group.position.set(M+Math.sin(Fe.angle)*R,x+Fe.y,R*(Math.cos(Fe.angle)-1)),ye.group.rotation.set(0,Fe.yaw,0),ye.image.material.opacity=Fe.opacity,ye.group.visible&&zh(ye.image.geometry,Fe.curvature),ye.frame.update(Fe.opacity,Fe.curvature)}let Z=g[H.dayActive],ee=H.day>=.999&&Math.abs(H.dayIndex-H.dayActive)<1e-4&&H.dayCopy>.999&&Z?.group.visible&&Math.abs(Z.group.rotation.y)<1e-4;E&&ee&&Z?.video&&!Z.started&&!Z.finished&&(Z.started=!0,Z.video.currentTime=0,A(H.dayActive,H.timelinePixels),P(Z,H.dayActive)),g.forEach((ie,ye)=>{!ie.playing||!ie.video||(ie.video.currentTime>ie.lastTime?(ie.lastTime=ie.video.currentTime,ie.lastProgressAt=performance.now()):performance.now()-ie.lastProgressAt>15e3&&b(ie,ye))}),h.uTime.value=V,h.uTravel.value=Z_(V),u.uReveal.value=D.reveal,u.uDistort.value=D.distortion,u.uProgress.value=H.dive;let L=C.getRenderTarget();D.reveal<1&&(C.setRenderTarget(a),I()),C.setRenderTarget(o),C.render(t,n),C.setRenderTarget(L),H.breach>.2?c.render(C,H.breach):C.render(i,s)}}}function Q_(){let r=new Set,e=null;return{get active(){return e},cancel(){e&&r.add(e.id),e=null},update(t,n,i,s){if(e){if(i-e.startedAt<e.duration)return e.point;r.add(e.id),e=null}if(n<t-2){for(let o of s)n<o.point-80&&r.delete(o.id);return n}let a=s.find(o=>!r.has(o.id)&&t<=o.point&&n>=o.point);return a?(e={...a,startedAt:i},a.point):n}}}function j_(r,e=!1){let t=(s,a)=>{let o=Math.max(0,Math.min(1,(r-s)/(a-s)));return o*o*(3-2*o)},n=t(.05,.26),i=e?0:t(.78,.98);return{opacity:n*(1-i),y:18*(1-n)-18*i}}var Fi=document.querySelector("#scene"),Vl=document.querySelector(".hero"),ex=document.querySelector(".header"),Br=document.querySelector("#motion"),bt=matchMedia("(prefers-reduced-motion: reduce)"),Up=matchMedia("(hover: hover) and (pointer: fine)"),qi=document.querySelector(".hero-story"),sa=document.querySelector(".carousel-copy"),Np=document.querySelector(".carousel-controls"),Fp=document.querySelector(".hero-footer"),Ms=document.querySelector(".tutor-intro"),aa=document.querySelector(".vision-copy"),oa=document.querySelector(".day-copy"),_o=oa.querySelector(".day-caption"),ME=oa.querySelector(".day-controls"),Ei=document.querySelector(".control-chapter"),bE=Ei.querySelector(".control-photo"),Op=[...Ei.querySelectorAll(".control-beat")],Vh=[...sa.querySelectorAll("p")],Bp=_o.querySelector(".day-summary"),kp=_o.querySelector(".day-detail"),la=Ei.cloneNode(!0),zp=document.querySelector(".story-progress"),tx=document.querySelector(".scroll-cue");la.removeAttribute("id");la.removeAttribute("aria-labelledby");la.removeAttribute("aria-hidden");la.inert=!1;la.querySelectorAll("[id]").forEach(r=>r.removeAttribute("id"));document.querySelector(".fallback-control").append(la);document.querySelectorAll(".closing-emblem path").forEach(r=>r.setAttribute("pathLength","1"));var nx=[...aa.querySelectorAll(".outline-title path")],Vp=[...aa.querySelectorAll(".vision-sequence > *")],Be={ready:!1,playing:!bt.matches,renders:0,time:0,progress:0,rotation:0,rotating:!bt.matches,reducedMotion:bt.matches};window.__dianaComposition=Be;mh.registerPlugin(ct);var Hh=(r,e={})=>window.dispatchEvent(new CustomEvent("diana:cinematic-event",{detail:{name:r,...e}}));document.querySelectorAll('a[href="#waitlist"]').forEach(r=>r.addEventListener("click",()=>Hh("cta",{location:r.classList.contains("header-cta")?"header":"hero"})));document.querySelectorAll(".chapter-menu a").forEach(r=>r.addEventListener("click",()=>{r.closest("details").open=!1}));var Yi=document.querySelector("#work-dialog");function ix(r){Yi.classList.remove("zoomed"),document.querySelector("#zoom-screen").setAttribute("aria-pressed","false"),Yi.querySelector("source").srcset=r.mobile||r.image,Yi.querySelector("img").src=r.image,Yi.querySelector("img").alt=r.alt,document.querySelector("#dialog-heading").textContent=r.title,Yi.showModal()}function Gh(r=0,e=!1){ix((e?fr:ni)[r])}document.querySelectorAll("[data-control]").forEach(r=>r.addEventListener("click",()=>{let e=r.closest(".control-beat"),t=e.querySelector("img");ix({title:e.querySelector("h3").textContent,image:t.getAttribute("src"),alt:t.alt})}));document.querySelectorAll("[data-slide]").forEach(r=>r.addEventListener("click",()=>Gh(Number(r.dataset.slide))));document.querySelectorAll("[data-day]").forEach(r=>r.addEventListener("click",()=>Gh(Number(r.dataset.day),!0)));document.querySelector("#zoom-screen").addEventListener("click",r=>{let e=Yi.classList.toggle("zoomed");r.currentTarget.setAttribute("aria-pressed",String(e))});document.querySelector("#close-dialog").addEventListener("click",()=>Yi.close());Yi.addEventListener("click",r=>{r.target===Yi&&Yi.close()});async function TE(){await Promise.all([document.fonts.load("600 100px Outfit"),document.fonts.load("700 200px Outfit")]);let r=new Ju({canvas:Fi,antialias:!0,powerPreference:"high-performance"});r.outputColorSpace=Vt,r.toneMapping=Jo,r.toneMappingExposure=1,r.transmissionResolutionScale=1;let e=new qn;e.background=new qe("#08090c");let t=new Sn(32,1,.1,80);t.position.set(0,.12,10.8),t.lookAt(0,0,0);let n=L_(r);e.environment=n.texture;let i=await U_(),s=q_(i),a=X_(i),o=N_(),l=O_(),c=await V_(r),u=await K_(r,n.texture);l.uniforms.uBrand.value=o.material.map;let d=new Ut;e.add(l.mesh,i,c.group,a.backdrop);let h=new is("#ffffff",2);h.position.set(-3,5,6),e.add(h);let f=new is("#e0eaff",.45);f.position.set(4,-1,3),e.add(f);let m=new we,_=new we,p=0,g=0,S=!0,M,x,R=0,E=1,A=0,v=0,b=!1,P=-1,C=-1,I=-1,H=!1,V={progress:0},D={active:!1,complete:!1,departed:!1,startedAt:0,lockedY:0,duration:6200,progress:0},O={active:!1,index:-1,lockedY:0,lockedTimeline:0},F=Q_(),Z=0,ee=0,L=null,ie=[],ye=new Set(["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"," "]);function Fe(Q,z,Me){let w=rt.clamp((Q-z)/(Me-z),0,1);return w*w*(3-2*w)}function ze(Q){!D.active&&!O.active&&!F.active||Q.type==="keydown"&&!ye.has(Q.key)||Q.preventDefault()}window.addEventListener("wheel",ze,{passive:!1}),window.addEventListener("touchmove",ze,{passive:!1}),window.addEventListener("keydown",ze);function Oe(){let Q=O.active?O.lockedY:F.active?ee:null;Q===null||Math.abs(scrollY-Q)<=1||window.scrollTo({top:Q,left:0,behavior:"instant"})}window.addEventListener("scroll",Oe,{passive:!0}),u.setVideoCallbacks({onStart(Q,z){!x||bt.matches||O.active||(O.active=!0,O.index=Q,O.lockedY=re(z),O.lockedTimeline=z,V.progress=(O.lockedY-qi.offsetTop)/Math.max(1,M.scrollTrigger.end-M.scrollTrigger.start),Oe())},onEnd(Q){O.index===Q&&(O.active=!1,O.index=-1,O.lockedTimeline=0,Be.videoLocked=!1,Be.videoPlayback=u.videoState())}});function K(){F.cancel(),u.cancelPlayback(),O.active=!1,D.active=!1}function le(){let Q=Math.max(1,M?.scrollTrigger?.end-M?.scrollTrigger?.start||1),z=rt.clamp((scrollY-qi.offsetTop)/Q,0,1);b&&Math.abs(V.progress-z)<.001&&(b=!1);let Me=bt.matches?0:b?z:V.progress;Be.progress=Me;let w=Me*Q,y=Math.max(0,scrollY-qi.offsetTop),G=Math.abs(w-y)<innerHeight*.3,$=y<v-1?-1:y>v+1?1:0,se=Math.max(0,x.textExit-x.tutorLockStart);D.complete&&y>x.tutorLockStart+innerHeight*.5&&(D.departed=!0),D.complete&&D.departed&&$<0&&y<=x.tutorLockStart+innerHeight*.08&&(D.complete=!1,D.departed=!1,D.progress=0);let fe=D.complete?Math.max(x.textExit,w+se):w,ae=O.active?O.lockedTimeline:fe;if(Be.playing&&!bt.matches&&!b&&!O.active){ae=F.update(Z,ae,performance.now(),x.readingStops);let et=u.videoState(),ht=x.dayPlaybackStops.find((ot,at)=>ot!==null&&!et[at].started&&!et[at].finished&&Z<=ot&&ae>=ot);ht!==void 0&&(ae=ht),(F.active||ht!==void 0)&&(ee=re(ae),Math.abs(scrollY-ee)>1&&window.scrollTo({top:ee,left:0,behavior:"instant"}),V.progress=(ee-qi.offsetTop)/Q,G=!0)}let U=x.at(ae),te=0,Te=14,Ce=.985;if(w<x.tutorLockStart-48&&(D.complete=!1,D.active=!1,D.departed=!1,D.progress=0),!bt.matches&&!D.complete&&G&&(D.active||w>=x.tutorLockStart&&w<x.carouselStart)){D.active||(D.active=!0,D.startedAt=performance.now(),D.lockedY=qi.offsetTop+x.tutorLockStart),Math.abs(scrollY-D.lockedY)>1&&window.scrollTo({top:D.lockedY,left:0,behavior:"instant"});let et=rt.clamp((performance.now()-D.startedAt)/D.duration,0,1),ht=Fe(et,.025,.43),ot=Fe(et,.74,.98),at=Fe(et,.74,1);D.progress=et,te=ht*(1-ot),Te=rt.lerp(18,-70,at),Ce=rt.lerp(.982,1,ht)-at*.018,U={...U,opening:0,tutor:0,x:x.tutorX,y:x.tutorY,stage:0,copy:0},et>=1&&(D.active=!1,D.complete=!0,D.departed=!1,U=x.at(x.textExit))}else D.complete&&w<x.textExit&&(U={...U,tutor:0,x:x.tutorX,y:x.tutorY});Ms&&(Ms.style.setProperty("--tutor-alpha",String(te)),Ms.style.setProperty("--tutor-y",`${Te}px`),Ms.style.setProperty("--tutor-scale",String(Ce)));let ge=D.complete?Math.max(x.textExit,ae):ae,be=x.progressAt(ge,D.active?D.progress:null),Qe=Math.round(be*100);zp.style.setProperty("--story-progress",String(be)),zp.setAttribute("aria-valuenow",String(Qe));let it=U.control>.4?"Your control":U.day>.2?"Your day":U.vision>.1?"Why Diana":U.stage>.2?"Diana workspace":"Introduction";zp.setAttribute("aria-valuetext",it),s.update(U.vision,Be.time),a.update(U.vision,Be.time),l.mesh.visible=Be.layers?.wall!==!1&&U.vision===0,l.uniforms.uTime.value=Be.time,l.uniforms.uOpening.value=U.opening,l.uniforms.uTutor.value=U.tutor,l.uniforms.uTutorOffset.value.set(U.x,U.y),l.uniforms.uBrandOpacity.value=o.visible?U.opening:0,l.uniforms.uIntensity.value=.55-U.stage*.25,c.update(U.stage,U.index,U.productDetail),Be.finalizing=U.growth>0;let pe=Fi.clientWidth>=700&&Fi.clientWidth<1e3&&Fi.clientHeight>Fi.clientWidth?1.14*.62:1.14;i.scale.setScalar(E*rt.lerp(1-U.stage*.42,pe,U.growth)*(1-.2*U.vision)),i.position.set(0,A*(1-U.growth),-U.stage*1.2*(1-U.growth)),Vl.classList.toggle("light-chapter",U.breach>.75&&U.controlIntro<.2||U.dive<.43&&U.wave>0&&W_(U.wave,.5)>1-(Be.headerBottom||80)*.5/Fi.clientHeight);let ne=1-rt.smoothstep(U.breach,.25,.45)*(1-rt.smoothstep(U.breach,.76,.94));ex.style.opacity=String(ne),ex.inert=ne<.05,Fp.style.opacity=String(U.opening),Fp.inert=U.opening<.1;let xe=(ni[U.active]??ni[0]).detail?U.productDetail:0;sa.style.opacity=String(U.copy),sa.style.setProperty("--product-detail",String(xe)),Vh[0].setAttribute("aria-hidden",String(xe>.5)),Vh[1].setAttribute("aria-hidden",String(xe<=.5));let ce=U.draw>0&&U.visionFade>0&&!bt.matches;aa.style.visibility=ce?"visible":"hidden",aa.style.opacity=String(U.visionFade),aa.inert=!ce,aa.setAttribute("aria-hidden",String(!ce)),oa.style.opacity=String(U.dayHeading),_o.style.opacity=String(U.dayCopy),_o.style.transform=`translateY(${(U.dayActive-U.dayIndex)*innerHeight*.75}px)`,ME.style.opacity=String(U.dayCopy);let _e=(fr[U.dayActive]??fr[0]).detail?U.dayDetail:0;if(Bp.style.opacity=String(1-rt.smoothstep(_e,0,.45)),kp.style.opacity=String(rt.smoothstep(_e,.55,1)),Bp.setAttribute("aria-hidden",String(_e>.5)),kp.setAttribute("aria-hidden",String(_e<=.5)),oa.style.visibility=U.dayHeading>0&&!bt.matches?"visible":"hidden",oa.inert=U.dayCopy===0||bt.matches,oa.setAttribute("aria-hidden",String(oa.inert)),C!==U.dayActive){C=U.dayActive;let et=fr[C];_o.querySelector("h3").textContent=et.title,Bp.textContent=et.description,kp.textContent=et.detail,_o.querySelector("button").firstChild.textContent=`${et.action} `,document.querySelector("#day-count").textContent=`0${C+1} / 0${fr.length}`,document.querySelector("#previous-day").disabled=C===0,document.querySelector("#next-day").disabled=C===fr.length-1,Hh("section",{section:"your_day",scene:C})}let Je=U.controlEnter,he=U.controlExit,Ke=Je*(1-he);Ei.style.opacity=String(U.control),Ei.style.setProperty("--control-photo",String(rt.smoothstep(U.controlIntro,.05,.22))),Ei.style.setProperty("--control-dim",String(U.controlDim)),Ei.style.setProperty("--control-title",String(U.controlTitle)),Ei.style.setProperty("--control-travel",`${U.controlScene*-innerHeight*.95}px`);for(let et=0;et<3;et++){let ht=Math.abs(U.controlBeatIndex-et),ot=Ke*(1-rt.smoothstep(ht,.62,.9));Ei.style.setProperty(`--beat-${et}`,String(ot));let at=(et-U.controlBeatIndex)*innerHeight*.86+(1-Je)*innerHeight*.58-he*innerHeight*.28;Op[et].style.transform=`translate(-50%, calc(-50% + ${at}px))`,Op[et].inert=ot<.95,Op[et].setAttribute("aria-hidden",String(ot<.05))}U.control>.9&&I!==U.controlBeatActive&&(I=U.controlBeatActive,Hh("section",{section:"control",scene:I})),bE.style.opacity=String(rt.smoothstep(U.controlIntro,.05,.22)),Ei.style.visibility=U.control>0&&!bt.matches?"visible":"hidden",Ei.inert=U.control<.9||bt.matches,Ei.setAttribute("aria-hidden",String(Ei.inert)),nx.forEach((et,ht)=>{let ot=ht/nx.length*.58,at=rt.smoothstep(U.draw,ot,ot+.42);et.style.strokeDashoffset=String(1-at)});let Ve=1/Vp.length;Vp.forEach((et,ht)=>{let ot=rt.clamp((U.visionSequence-ht*Ve)/Ve,0,1),{opacity:at,y:gn}=j_(ot,ht===Vp.length-1);et.style.opacity=String(at),et.style.transform=`translateY(${gn}px)`,et.setAttribute("aria-hidden",String(at<.1))}),aa.querySelector(".vision-sequence").style.opacity=String(U.explanation),Np.style.opacity=String(rt.smoothstep(U.stage,.85,1)*(1-rt.smoothstep(U.index,ni.length-.95,ni.length-.5)));let je=U.stage>.95&&U.index<ni.length-.5&&!bt.matches;H!==je&&(H=je,sa.inert=!je,Np.inert=!je,sa.setAttribute("aria-hidden",String(!je)),Np.setAttribute("aria-hidden",String(!je))),P!==U.active&&(P=U.active,sa.querySelector("h2").textContent=ni[P].title,Vh[0].textContent=ni[P].description,Vh[1].textContent=ni[P].detail,document.querySelector("#slide-count").textContent=`0${P+1} / 0${ni.length}`,document.querySelector("#previous-screen").disabled=P===0,document.querySelector("#next-screen").disabled=P===ni.length-1,Hh("product",{scene:P}));let Ot=-.16+Be.rotation+_.x*.045*(1-U.growth),ut=Math.atan2(Math.sin(-Ot),Math.cos(-Ot));i.rotation.set((.035+_.y*.04)*(1-U.growth)-.12*U.vision,Ot+ut*U.growth+.6*U.vision,-.018*(1-U.growth)-.08*U.vision),t.position.x=_.x*.11*(1-U.growth),t.position.y=.12+_.y*.04*(1-U.growth),t.position.z=10.8,t.lookAt(0,0,0),u.prepare(t,i,U),t.updateMatrixWorld(),o.updateMatrixWorld(),d.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse).multiply(o.matrixWorld);let St=d.elements;l.uniforms.uBrandScreenToLocal.value.set(St[0],St[4],St[12],St[1],St[5],St[13],St[3],St[7],St[15]).invert(),U.timelinePixels=ae,u.setPlayback(Be.playing&&S&&(O.active||G)&&!document.hidden&&!Yi.open),U.control<1&&u.render(r,()=>a.render(r,e,t,U.wave),U,Be.time),Object.assign(Be,{dive:U.dive,day:U.day,dayCopy:U.dayCopy,dayStops:x.dayStops,diveStart:x.diveStart,diveEnd:x.diveEnd,dayStart:x.dayStart,daySettled:x.daySettled,cameraPosition:t.position.toArray()}),Object.assign(Be,{dayIndex:U.dayIndex,dayReadingStops:x.dayReadingStops,dayExitEnd:x.dayExitEnd,breachStart:x.breachStart,breachEnd:x.breachEnd,breach:U.breach,control:U.control,controlScene:U.controlScene,controlIntro:U.controlIntro,controlDim:U.controlDim,controlStop:x.controlStop}),Object.assign(Be,{controlReadingStops:x.controlReadingStops,controlStart:x.controlStart,controlEnd:x.controlEnd,dayDetail:_e,videoPlayback:u.videoState()}),Object.assign(Be,{readingHold:F.active?.id??null,readingStops:x.readingStops,videoLocked:O.active,dayPlaybackStops:x.dayPlaybackStops,nativeEnd:x.nativeEnd}),ue(),Object.assign(Be,{renders:Be.renders+1,yaw:i.rotation.y,scrollPixels:w,timelinePixels:ae,scrollRange:Q,growth:U.growth,wave:U.wave,vision:U.vision,draw:U.draw,gridTravel:U.gridTravel,visionStops:x.visionStops,visionStart:x.visionStart,visionEnd:x.visionEnd,finaleStops:x.finaleStops,waveStart:x.waveStart,waveEnd:x.waveEnd,exitEnd:x.exitEnd,wordmarkOpacity:U.opening,tutorOpacity:U.tutor,tutorOverlayOpacity:te,tutorOverlayY:Te,tutorOverlayScale:Ce,tutorOffset:l.uniforms.uTutorOffset.value.toArray(),tutorSequenceProgress:D.progress,tutorSequenceActive:D.active,carousel:U.stage,carouselIndex:U.index,activeSlide:P,checkInOpacity:c.panels[0].detailMesh?.material.opacity??0,lobbyOpacity:c.panels[0].mesh.material.opacity,textExit:x.textExit,carouselStart:x.carouselStart,stops:x.stops,textRightEdge:U.x+x.tutorWidth/2,width:Fi.clientWidth,height:Fi.clientHeight,triangles:r.info.render.triangles}),v=y,Z=ae,Be.readingHold!==L&&(L=Be.readingHold,window.dispatchEvent(new CustomEvent("diana:reading-hold",{detail:{id:Be.readingHold,timelinePixels:ae}})))}function ue(){let Q=!bt.matches&&(Fp.inert||!Be.playing||D.active||O.active||!!F.active);tx.classList.toggle("is-held",Q),tx.setAttribute("aria-hidden",String(Q))}function Ee(){ue(),Br.innerHTML=document.querySelector(Be.playing?"#pause-icon":"#play-icon").innerHTML;let Q=bt.matches?"Motion disabled by reduced-motion preference":Be.playing?"Pause motion":"Play motion";Br.setAttribute("aria-label",Q),Br.title=Q,Br.setAttribute("aria-pressed",String(!Be.playing)),Br.disabled=bt.matches}function He(Q){if(p=0,!Be.playing||!S||document.hidden||!Be.ready)return;let z=Math.max(0,(Q-g)/1e3);g=Q;let Me=Math.min(z,.1);ie.push(z*1e3),ie.length>120&&ie.shift(),Be.time+=Me,Be.rotating&&!Be.finalizing&&(Be.rotation+=Math.PI*2/28*Me),_.lerp(m,1-Math.exp(-6*Me)),le(),p=requestAnimationFrame(He)}function Ae(){p||!Be.playing||!S||document.hidden||!Be.ready||(g=performance.now(),p=requestAnimationFrame(He))}function Ye(){cancelAnimationFrame(p),p=0,u.setPlayback(!1),Be.videoPlayback=u.videoState()}function Se(){Be.playing=!1,F.cancel(),Ye(),Ee()}function j(){let Q=Fi.clientWidth,z=Fi.clientHeight;t.aspect=Q/z,t.updateProjectionMatrix();let Me=Math.min(devicePixelRatio,Up.matches?1.5:1.25);r.setPixelRatio(Me),r.setSize(Q,z,!1),a.resize(Q,z,Me),u.resize(Q,z,Me);let w=2*Math.tan(rt.degToRad(16))*10.8,y=w*t.aspect,G=Q<700,$=document.querySelector(".hero-footer").offsetTop,se=document.querySelector(".header").offsetHeight,fe=G?Math.min($,z-(z<680?252:268)):$,ae=(se+fe)/2,U=Math.max(150,fe-se-48),te=Math.min(.87,y/(G?5.5:5.1),U/z*w/4.45);E=te,A=(.5-ae/z)*w,i.scale.setScalar(te),i.position.y=A;let Te=U/z*w*4,Ce=Math.min(y*(G?.95:.895),Te)*(10.8+1.8)/10.8*.9;o.scale.set(Ce,Ce/4,1),o.position.set(0,i.position.y*(10.8+1.8)/10.8,-1.8);let ve=Q<z,ge=ve?56:48,be=2*Math.tan(rt.degToRad(16))/Math.tan(rt.degToRad(ge/2));l.mesh.scale.set(be,be,2),l.mesh.position.z=10.8-24,l.uniforms.uMobile.value=Q<=960||ve?1:0,l.uniforms.uPitch.value=G?.032:.045,l.uniforms.uSpan.value=2*Math.tan(rt.degToRad(ge/2))*12*t.aspect,l.uniforms.uTextCenter.value=i.position.y*24/10.8/be,l.uniforms.uCopyBottom.value=1-$/z,l.uniforms.uCopyTop.value=1-se/z;let Qe=l.uniforms.uSpan.value,it=l.uniforms.uMobile.value?Qe*.84*.68:16*.45;if(x=H_({height:innerHeight,span:Qe,tutorWidth:it}),Ms){Ms.style.setProperty("--tutor-font-size","100px");let pe=100*Math.max(280,Q-(G?24:36))/Math.max(1,Ms.scrollWidth);Ms.style.setProperty("--tutor-font-size",`${pe}px`)}qi.style.setProperty("--scroll-distance",`${x.nativeEnd}px`),c.resize({width:Q,height:z,headerBottom:se,copyTop:sa.offsetTop}),Object.assign(Be,{symbolScale:te,focalCenter:ae,headerBottom:se,footerTop:$}),le(),M&&(cancelAnimationFrame(R),R=requestAnimationFrame(()=>{ct.refresh(),le()}))}Br.addEventListener("click",()=>{bt.matches||(Be.playing?Se():(Be.playing=!0,Ee(),Ae()))}),Vl.addEventListener("pointermove",Q=>{if(!Be.playing||bt.matches||!Up.matches||Q.pointerType!=="mouse")return;let z=Vl.getBoundingClientRect();m.set((Q.clientX/z.width-.5)*2,(.5-(Q.clientY-z.top)/z.height)*2)}),Vl.addEventListener("pointerleave",()=>m.set(0,0));function oe(){M?.scrollTrigger?.kill(),M?.kill(),V.progress=0,document.body.classList.toggle("motion-ready",!bt.matches&&Be.ready),!bt.matches&&Be.ready&&(M=mh.fromTo(V,{progress:0},{progress:1,ease:"none",scrollTrigger:{trigger:qi,start:"top top",end:"bottom bottom",scrub:.38},onUpdate:()=>{le()}}),ct.refresh()),le()}function re(Q){let z=Q>=x.textExit?Math.max(0,x.textExit-x.tutorLockStart):0;return qi.offsetTop+Q-z}function B(Q,z){location.hash!==Q&&history.pushState(null,"",Q),K(),D.complete=z>qi.offsetTop+x.tutorLockStart,Z=z-qi.offsetTop+(D.complete?x.textExit-x.tutorLockStart:0),b=!0,window.scrollTo({top:z,behavior:"instant"}),M?.scrollTrigger?.update(),le()}function me(Q){let z=re(x.stops[rt.clamp(Q,0,ni.length-1)]);window.scrollTo({top:z,behavior:bt.matches?"instant":"smooth"})}document.querySelectorAll('a[href="#homework"]').forEach(Q=>Q.addEventListener("click",z=>{!Be.ready||bt.matches||(z.preventDefault(),B("#homework",re(x.stops[0])))})),document.querySelector("#previous-screen").addEventListener("click",()=>me(P-1)),document.querySelector("#next-screen").addEventListener("click",()=>me(P+1)),document.querySelector("#inspect-screen").addEventListener("click",()=>Gh(P)),document.querySelector("#inspect-day").addEventListener("click",()=>Gh(C,!0));function We(Q){window.scrollTo({top:re(x.dayReadingStops[rt.clamp(Q,0,fr.length-1)]),behavior:bt.matches?"instant":"smooth"})}document.querySelector("#previous-day").addEventListener("click",()=>We(C-1)),document.querySelector("#next-day").addEventListener("click",()=>We(C+1)),document.querySelectorAll('a[href="#your-day"]').forEach(Q=>Q.addEventListener("click",z=>{z.preventDefault(),bt.matches||!Be.ready?document.querySelector(".fallback-day-heading").scrollIntoView():B("#your-day",re(x.dayReadingStops[0]))})),document.querySelectorAll(".questions details").forEach(Q=>Q.addEventListener("toggle",()=>ct.refresh())),document.querySelectorAll('a[href="#your-control"]').forEach(Q=>Q.addEventListener("click",z=>{z.preventDefault(),bt.matches||!Be.ready?la.scrollIntoView():B("#your-control",re(x.controlStop))}));let N=document.querySelector(".closing");document.querySelectorAll('a[href="#waitlist"]').forEach(Q=>Q.addEventListener("click",z=>{z.preventDefault(),B("#waitlist",N.getBoundingClientRect().top+scrollY)})),document.querySelectorAll('a[href="#opening"]').forEach(Q=>Q.addEventListener("click",z=>{z.preventDefault(),B("#opening",0)}));function Ne(Q){N.style.setProperty("--closing-progress",String(Q));for(let z=0;z<5;z++){let Me=rt.clamp((Q-(.42+z*.045))/.28,0,1);N.style.setProperty(`--letter-${z}-alpha`,String(Me)),N.style.setProperty(`--letter-${z}-clip`,`${(1-Me)*100}%`)}}let Pe=ct.create({trigger:N,start:"top bottom",end:"bottom bottom",onUpdate:Q=>{Ne(bt.matches?1:Q.progress)}});Be.closingMotion=Pe,Ne(bt.matches?1:Pe.progress),bt.addEventListener("change",()=>{K(),Be.reducedMotion=bt.matches,Se(),_.set(0,0),m.set(0,0),Be.rotating=!bt.matches,bt.matches&&(Be.time=0,Be.rotation=0),Ne(bt.matches?1:Pe.progress),oe(),Ee()}),Up.addEventListener("change",()=>{_.set(0,0),m.set(0,0),j()}),new ResizeObserver(j).observe(Vl),new IntersectionObserver(Q=>{S=Q[0].isIntersecting,S?Ae():Ye()},{threshold:0}).observe(qi),document.addEventListener("visibilitychange",()=>{document.hidden?Ye():Ae()}),Fi.addEventListener("webglcontextlost",Q=>{K(),Q.preventDefault(),Ye(),Be.ready=!1,M?.scrollTrigger?.kill(),M?.kill(),document.body.classList.remove("ready","motion-ready")}),Fi.addEventListener("webglcontextrestored",()=>{j(),Be.ready=!0,document.body.classList.add("ready"),oe(),Ae()}),Be.seek=Q=>{Se(),Be.time=Math.max(0,Number(Q)||0),_.set(0,0),m.set(0,0),le()},Be.setAngle=Q=>{Se(),Be.rotation=Number(Q)+.16,_.set(0,0),m.set(0,0),le()},Be.play=()=>{bt.matches||(Be.playing=!0,Ee(),Ae())},Be.redraw=le,Be.performance=()=>({samples:ie.length,meanFrameMs:ie.reduce((Q,z)=>Q+z,0)/Math.max(1,ie.length),drawCalls:r.info.render.calls,triangles:r.info.render.triangles}),Be.goToSlide=me,Be.goToDay=We,Be.layers={wall:!0,wordmark:!0,symbol:!0},Be.showLayer=(Q,z)=>{let Me={wall:l.mesh,wordmark:o,symbol:i}[Q];Me&&(Me.visible=z,Be.layers[Q]=z,le())},j(),Be.ready=!0,Ee(),document.body.classList.add("ready"),oe(),Ae()}TE().catch(r=>{Be.error=String(r),document.body.classList.remove("ready","motion-ready"),Br.disabled=!0,Br.title="Motion unavailable",Br.setAttribute("aria-label","Motion unavailable")});})();
/*! Bundled license information:

three/build/three.core.js:
three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2026 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)

gsap/gsap-core.js:
  (*!
   * GSAP 3.15.0
   * https://gsap.com
   *
   * @license Copyright 2008-2026, GreenSock. All rights reserved.
   * Subject to the terms at https://gsap.com/standard-license
   * @author: Jack Doyle, jack@greensock.com
  *)

gsap/CSSPlugin.js:
  (*!
   * CSSPlugin 3.15.0
   * https://gsap.com
   *
   * Copyright 2008-2026, GreenSock. All rights reserved.
   * Subject to the terms at https://gsap.com/standard-license
   * @author: Jack Doyle, jack@greensock.com
  *)

gsap/Observer.js:
  (*!
   * Observer 3.15.0
   * https://gsap.com
   *
   * @license Copyright 2008-2026, GreenSock. All rights reserved.
   * Subject to the terms at https://gsap.com/standard-license
   * @author: Jack Doyle, jack@greensock.com
  *)

gsap/ScrollTrigger.js:
  (*!
   * ScrollTrigger 3.15.0
   * https://gsap.com
   *
   * @license Copyright 2008-2026, GreenSock. All rights reserved.
   * Subject to the terms at https://gsap.com/standard-license
   * @author: Jack Doyle, jack@greensock.com
  *)
*/
