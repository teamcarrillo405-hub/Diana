"use strict";(()=>{var xm=0,If=1,vm=2;var Zo=1,ym=2,ka=3,yr=0,Yn=1,Bt=2,nr=0,Rs=1,Df=2,Lf=3,Uf=4,Sm=5;var Jr=100,Mm=101,bm=102,Tm=103,Em=104,wm=200,Am=201,Cm=202,Rm=203,pc=204,mc=205,Pm=206,Im=207,Dm=208,Lm=209,Um=210,Nm=211,Fm=212,Om=213,Bm=214,gc=0,_c=1,xc=2,Ps=3,vc=4,yc=5,Sc=6,Mc=7,Nf=0,km=1,zm=2,Vi=0,Ff=1,Of=2,Bf=3,Jo=4,kf=5,zf=6,Vf=7;var Hf=300,rs=301,Fs=302,ru=303,su=304,$o=306,bc=1e3,Ki=1001,Tc=1002,Mn=1003,Vm=1004;var Ko=1005;var Ot=1006,au=1007;var ss=1008;var ii=1009,Gf=1010,Wf=1011,za=1012,ou=1013,Hi=1014,Gi=1015,gi=1016,lu=1017,cu=1018,Va=1020,Xf=35902,qf=35899,Yf=1021,Zf=1022,Ri=1023,Qi=1026,as=1027,Jf=1028,uu=1029,os=1030,hu=1031;var fu=1033,Qo=33776,jo=33777,el=33778,tl=33779,du=35840,pu=35841,mu=35842,gu=35843,_u=36196,xu=37492,vu=37496,yu=37488,Su=37489,nl=37490,Mu=37491,bu=37808,Tu=37809,Eu=37810,wu=37811,Au=37812,Cu=37813,Ru=37814,Pu=37815,Iu=37816,Du=37817,Lu=37818,Uu=37819,Nu=37820,Fu=37821,Ou=36492,Bu=36494,ku=36495,zu=36283,Vu=36284,il=36285,Hu=36286;var Co=2300,Ec=2301,fc=2302,_f=2303,xf=2400,vf=2401,yf=2402;var Hm=3200;var Gu=0,Gm=1,Er="",Vt="srgb",Ro="srgb-linear",Po="linear",bt="srgb";var As=7680;var Sf=519,Wm=512,Xm=513,qm=514,Wu=515,Ym=516,Zm=517,Xu=518,Jm=519,Mf=35044;var $f="300 es",zi=2e3,Aa=2001;function ix(r){for(let e=r.length-1;e>=0;--e)if(r[e]>=65535)return!0;return!1}function rx(r){return ArrayBuffer.isView(r)&&!(r instanceof DataView)}function Ca(r){return document.createElementNS("http://www.w3.org/1999/xhtml",r)}function $m(){let r=Ca("canvas");return r.style.display="block",r}var Hp={},Ra=null;function Kf(...r){let e="THREE."+r.shift();Ra?Ra("log",e,...r):console.log(e,...r)}function Km(r){let e=r[0];if(typeof e=="string"&&e.startsWith("TSL:")){let t=r[1];t&&t.isStackTrace?r[0]+=" "+t.getLocation():r[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return r}function et(...r){r=Km(r);let e="THREE."+r.shift();if(Ra)Ra("warn",e,...r);else{let t=r[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...r)}}function nt(...r){r=Km(r);let e="THREE."+r.shift();if(Ra)Ra("error",e,...r);else{let t=r[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...r)}}function wc(...r){let e=r.join(" ");e in Hp||(Hp[e]=!0,et(...r))}function Qm(r,e,t){return new Promise(function(n,i){function s(){switch(r.clientWaitSync(e,r.SYNC_FLUSH_COMMANDS_BIT,0)){case r.WAIT_FAILED:i();break;case r.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}}setTimeout(s,t)})}var jm={[gc]:_c,[xc]:Sc,[vc]:Mc,[Ps]:yc,[_c]:gc,[Sc]:xc,[Mc]:vc,[yc]:Ps},ji=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let i=n[e];if(i!==void 0){let s=i.indexOf(t);s!==-1&&i.splice(s,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let i=n.slice(0);for(let s=0,a=i.length;s<a;s++)i[s].call(this,e);e.target=null}}},Ln=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Gp=1234567,To=Math.PI/180,Pa=180/Math.PI;function Os(){let r=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ln[r&255]+Ln[r>>8&255]+Ln[r>>16&255]+Ln[r>>24&255]+"-"+Ln[e&255]+Ln[e>>8&255]+"-"+Ln[e>>16&15|64]+Ln[e>>24&255]+"-"+Ln[t&63|128]+Ln[t>>8&255]+"-"+Ln[t>>16&255]+Ln[t>>24&255]+Ln[n&255]+Ln[n>>8&255]+Ln[n>>16&255]+Ln[n>>24&255]).toLowerCase()}function ft(r,e,t){return Math.max(e,Math.min(t,r))}function Qf(r,e){return(r%e+e)%e}function sx(r,e,t,n,i){return n+(r-e)*(i-n)/(t-e)}function ax(r,e,t){return r!==e?(t-r)/(e-r):0}function Eo(r,e,t){return(1-t)*r+t*e}function ox(r,e,t,n){return Eo(r,e,1-Math.exp(-t*n))}function lx(r,e=1){return e-Math.abs(Qf(r,e*2)-e)}function cx(r,e,t){return r<=e?0:r>=t?1:(r=(r-e)/(t-e),r*r*(3-2*r))}function ux(r,e,t){return r<=e?0:r>=t?1:(r=(r-e)/(t-e),r*r*r*(r*(r*6-15)+10))}function hx(r,e){return r+Math.floor(Math.random()*(e-r+1))}function fx(r,e){return r+Math.random()*(e-r)}function dx(r){return r*(.5-Math.random())}function px(r){r!==void 0&&(Gp=r);let e=Gp+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function mx(r){return r*To}function gx(r){return r*Pa}function _x(r){return(r&r-1)===0&&r!==0}function xx(r){return Math.pow(2,Math.ceil(Math.log(r)/Math.LN2))}function vx(r){return Math.pow(2,Math.floor(Math.log(r)/Math.LN2))}function yx(r,e,t,n,i){let s=Math.cos,a=Math.sin,o=s(t/2),l=a(t/2),c=s((e+n)/2),u=a((e+n)/2),d=s((e-n)/2),h=a((e-n)/2),f=s((n-e)/2),m=a((n-e)/2);switch(i){case"XYX":r.set(o*u,l*d,l*h,o*c);break;case"YZY":r.set(l*h,o*u,l*d,o*c);break;case"ZXZ":r.set(l*d,l*h,o*u,o*c);break;case"XZX":r.set(o*u,l*m,l*f,o*c);break;case"YXY":r.set(l*f,o*u,l*m,o*c);break;case"ZYZ":r.set(l*m,l*f,o*u,o*c);break;default:et("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function Ea(r,e){switch(e.constructor){case Float32Array:return r;case Uint32Array:return r/4294967295;case Uint16Array:return r/65535;case Uint8Array:return r/255;case Int32Array:return Math.max(r/2147483647,-1);case Int16Array:return Math.max(r/32767,-1);case Int8Array:return Math.max(r/127,-1);default:throw new Error("Invalid component type.")}}function Xn(r,e){switch(e.constructor){case Float32Array:return r;case Uint32Array:return Math.round(r*4294967295);case Uint16Array:return Math.round(r*65535);case Uint8Array:return Math.round(r*255);case Int32Array:return Math.round(r*2147483647);case Int16Array:return Math.round(r*32767);case Int8Array:return Math.round(r*127);default:throw new Error("Invalid component type.")}}var st={DEG2RAD:To,RAD2DEG:Pa,generateUUID:Os,clamp:ft,euclideanModulo:Qf,mapLinear:sx,inverseLerp:ax,lerp:Eo,damp:ox,pingpong:lx,smoothstep:cx,smootherstep:ux,randInt:hx,randFloat:fx,randFloatSpread:dx,seededRandom:px,degToRad:mx,radToDeg:gx,isPowerOfTwo:_x,ceilPowerOfTwo:xx,floorPowerOfTwo:vx,setQuaternionFromProperEuler:yx,normalize:Xn,denormalize:Ea},we=class r{static{r.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=ft(this.x,e.x,t.x),this.y=ft(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=ft(this.x,e,t),this.y=ft(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ft(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(ft(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),i=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*n-a*i+e.x,this.y=s*i+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},er=class{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,s,a,o){let l=n[i+0],c=n[i+1],u=n[i+2],d=n[i+3],h=s[a+0],f=s[a+1],m=s[a+2],_=s[a+3];if(d!==_||l!==h||c!==f||u!==m){let p=l*h+c*f+u*m+d*_;p<0&&(h=-h,f=-f,m=-m,_=-_,p=-p);let g=1-o;if(p<.9995){let S=Math.acos(p),M=Math.sin(S);g=Math.sin(g*S)/M,o=Math.sin(o*S)/M,l=l*g+h*o,c=c*g+f*o,u=u*g+m*o,d=d*g+_*o}else{l=l*g+h*o,c=c*g+f*o,u=u*g+m*o,d=d*g+_*o;let S=1/Math.sqrt(l*l+c*c+u*u+d*d);l*=S,c*=S,u*=S,d*=S}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=d}static multiplyQuaternionsFlat(e,t,n,i,s,a){let o=n[i],l=n[i+1],c=n[i+2],u=n[i+3],d=s[a],h=s[a+1],f=s[a+2],m=s[a+3];return e[t]=o*m+u*d+l*f-c*h,e[t+1]=l*m+u*h+c*d-o*f,e[t+2]=c*m+u*f+o*h-l*d,e[t+3]=u*m-o*d-l*h-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,i=e._y,s=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(n/2),u=o(i/2),d=o(s/2),h=l(n/2),f=l(i/2),m=l(s/2);switch(a){case"XYZ":this._x=h*u*d+c*f*m,this._y=c*f*d-h*u*m,this._z=c*u*m+h*f*d,this._w=c*u*d-h*f*m;break;case"YXZ":this._x=h*u*d+c*f*m,this._y=c*f*d-h*u*m,this._z=c*u*m-h*f*d,this._w=c*u*d+h*f*m;break;case"ZXY":this._x=h*u*d-c*f*m,this._y=c*f*d+h*u*m,this._z=c*u*m+h*f*d,this._w=c*u*d-h*f*m;break;case"ZYX":this._x=h*u*d-c*f*m,this._y=c*f*d+h*u*m,this._z=c*u*m-h*f*d,this._w=c*u*d+h*f*m;break;case"YZX":this._x=h*u*d+c*f*m,this._y=c*f*d+h*u*m,this._z=c*u*m-h*f*d,this._w=c*u*d-h*f*m;break;case"XZY":this._x=h*u*d-c*f*m,this._y=c*f*d-h*u*m,this._z=c*u*m+h*f*d,this._w=c*u*d+h*f*m;break;default:et("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],i=t[4],s=t[8],a=t[1],o=t[5],l=t[9],c=t[2],u=t[6],d=t[10],h=n+o+d;if(h>0){let f=.5/Math.sqrt(h+1);this._w=.25/f,this._x=(u-l)*f,this._y=(s-c)*f,this._z=(a-i)*f}else if(n>o&&n>d){let f=2*Math.sqrt(1+n-o-d);this._w=(u-l)/f,this._x=.25*f,this._y=(i+a)/f,this._z=(s+c)/f}else if(o>d){let f=2*Math.sqrt(1+o-n-d);this._w=(s-c)/f,this._x=(i+a)/f,this._y=.25*f,this._z=(l+u)/f}else{let f=2*Math.sqrt(1+d-n-o);this._w=(a-i)/f,this._x=(s+c)/f,this._y=(l+u)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(ft(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,i=e._y,s=e._z,a=e._w,o=t._x,l=t._y,c=t._z,u=t._w;return this._x=n*u+a*o+i*c-s*l,this._y=i*u+a*l+s*o-n*c,this._z=s*u+a*c+n*l-i*o,this._w=a*u-n*o-i*l-s*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,i=e._y,s=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,i=-i,s=-s,a=-a,o=-o);let l=1-t;if(o<.9995){let c=Math.acos(o),u=Math.sin(c);l=Math.sin(l*c)/u,t=Math.sin(t*c)/u,this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+s*t,this._w=this._w*l+a*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+i*t,this._z=this._z*l+s*t,this._w=this._w*l+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},G=class r{static{r.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Wp.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Wp.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*i,this.y=s[1]*t+s[4]*n+s[7]*i,this.z=s[2]*t+s[5]*n+s[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,i=this.z,s=e.elements,a=1/(s[3]*t+s[7]*n+s[11]*i+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*i+s[12])*a,this.y=(s[1]*t+s[5]*n+s[9]*i+s[13])*a,this.z=(s[2]*t+s[6]*n+s[10]*i+s[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,i=this.z,s=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*i-o*n),u=2*(o*t-s*i),d=2*(s*n-a*t);return this.x=t+l*c+a*d-o*u,this.y=n+l*u+o*c-s*d,this.z=i+l*d+s*u-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*i,this.y=s[1]*t+s[5]*n+s[9]*i,this.z=s[2]*t+s[6]*n+s[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=ft(this.x,e.x,t.x),this.y=ft(this.y,e.y,t.y),this.z=ft(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=ft(this.x,e,t),this.y=ft(this.y,e,t),this.z=ft(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ft(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,i=e.y,s=e.z,a=t.x,o=t.y,l=t.z;return this.x=i*l-s*o,this.y=s*a-n*l,this.z=n*o-i*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Wh.copy(this).projectOnVector(e),this.sub(Wh)}reflect(e){return this.sub(Wh.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(ft(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Wh=new G,Wp=new er,at=class r{static{r.prototype.isMatrix3=!0}constructor(e,t,n,i,s,a,o,l,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,s,a,o,l,c)}set(e,t,n,i,s,a,o,l,c){let u=this.elements;return u[0]=e,u[1]=i,u[2]=o,u[3]=t,u[4]=s,u[5]=l,u[6]=n,u[7]=a,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,i=t.elements,s=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],u=n[4],d=n[7],h=n[2],f=n[5],m=n[8],_=i[0],p=i[3],g=i[6],S=i[1],M=i[4],x=i[7],C=i[2],E=i[5],w=i[8];return s[0]=a*_+o*S+l*C,s[3]=a*p+o*M+l*E,s[6]=a*g+o*x+l*w,s[1]=c*_+u*S+d*C,s[4]=c*p+u*M+d*E,s[7]=c*g+u*x+d*w,s[2]=h*_+f*S+m*C,s[5]=h*p+f*M+m*E,s[8]=h*g+f*x+m*w,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8];return t*a*u-t*o*c-n*s*u+n*o*l+i*s*c-i*a*l}invert(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8],d=u*a-o*c,h=o*l-u*s,f=c*s-a*l,m=t*d+n*h+i*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let _=1/m;return e[0]=d*_,e[1]=(i*c-u*n)*_,e[2]=(o*n-i*a)*_,e[3]=h*_,e[4]=(u*t-i*l)*_,e[5]=(i*s-o*t)*_,e[6]=f*_,e[7]=(n*l-c*t)*_,e[8]=(a*t-n*s)*_,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,s,a,o){let l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*a+c*o)+a+e,-i*c,i*l,-i*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Xh.makeScale(e,t)),this}rotate(e){return this.premultiply(Xh.makeRotation(-e)),this}translate(e,t){return this.premultiply(Xh.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Xh=new at,Xp=new at().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),qp=new at().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Sx(){let r={enabled:!0,workingColorSpace:Ro,spaces:{},convert:function(i,s,a){return this.enabled===!1||s===a||!s||!a||(this.spaces[s].transfer===bt&&(i.r=vr(i.r),i.g=vr(i.g),i.b=vr(i.b)),this.spaces[s].primaries!==this.spaces[a].primaries&&(i.applyMatrix3(this.spaces[s].toXYZ),i.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===bt&&(i.r=wa(i.r),i.g=wa(i.g),i.b=wa(i.b))),i},workingToColorSpace:function(i,s){return this.convert(i,this.workingColorSpace,s)},colorSpaceToWorking:function(i,s){return this.convert(i,s,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===Er?Po:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,s=this.workingColorSpace){return i.fromArray(this.spaces[s].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,s,a){return i.copy(this.spaces[s].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(i,s){return wc("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),r.workingToColorSpace(i,s)},toWorkingColorSpace:function(i,s){return wc("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),r.colorSpaceToWorking(i,s)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return r.define({[Ro]:{primaries:e,whitePoint:n,transfer:Po,toXYZ:Xp,fromXYZ:qp,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Vt},outputColorSpaceConfig:{drawingBufferColorSpace:Vt}},[Vt]:{primaries:e,whitePoint:n,transfer:bt,toXYZ:Xp,fromXYZ:qp,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Vt}}}),r}var _t=Sx();function vr(r){return r<.04045?r*.0773993808:Math.pow(r*.9478672986+.0521327014,2.4)}function wa(r){return r<.0031308?r*12.92:1.055*Math.pow(r,.41666)-.055}var fa,Ac=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{fa===void 0&&(fa=Ca("canvas")),fa.width=e.width,fa.height=e.height;let i=fa.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=fa}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=Ca("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let i=n.getImageData(0,0,e.width,e.height),s=i.data;for(let a=0;a<s.length;a++)s[a]=vr(s[a]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(vr(t[n]/255)*255):t[n]=vr(t[n]);return{data:t,width:e.width,height:e.height}}else return et("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},Mx=0,Ia=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Mx++}),this.uuid=Os(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let s;if(Array.isArray(i)){s=[];for(let a=0,o=i.length;a<o;a++)i[a].isDataTexture?s.push(qh(i[a].image)):s.push(qh(i[a]))}else s=qh(i);n.url=s}return t||(e.images[this.uuid]=n),n}};function qh(r){return typeof HTMLImageElement<"u"&&r instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&r instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&r instanceof ImageBitmap?Ac.getDataURL(r):r.data?{data:Array.from(r.data),width:r.width,height:r.height,type:r.data.constructor.name}:(et("Texture: Unable to serialize Texture."),{})}var bx=0,Yh=new G,wn=class r extends ji{constructor(e=r.DEFAULT_IMAGE,t=r.DEFAULT_MAPPING,n=Ki,i=Ki,s=Ot,a=ss,o=Ri,l=ii,c=r.DEFAULT_ANISOTROPY,u=Er){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:bx++}),this.uuid=Os(),this.name="",this.source=new Ia(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=s,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new we(0,0),this.repeat=new we(1,1),this.center=new we(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new at,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Yh).x}get height(){return this.source.getSize(Yh).y}get depth(){return this.source.getSize(Yh).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){et(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let i=this[t];if(i===void 0){et(`Texture.setValues(): property '${t}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Hf)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case bc:e.x=e.x-Math.floor(e.x);break;case Ki:e.x=e.x<0?0:1;break;case Tc:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case bc:e.y=e.y-Math.floor(e.y);break;case Ki:e.y=e.y<0?0:1;break;case Tc:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};wn.DEFAULT_IMAGE=null;wn.DEFAULT_MAPPING=Hf;wn.DEFAULT_ANISOTROPY=1;var Gt=class r{static{r.prototype.isVector4=!0}constructor(e=0,t=0,n=0,i=1){this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,i=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*i+a[12]*s,this.y=a[1]*t+a[5]*n+a[9]*i+a[13]*s,this.z=a[2]*t+a[6]*n+a[10]*i+a[14]*s,this.w=a[3]*t+a[7]*n+a[11]*i+a[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,s,l=e.elements,c=l[0],u=l[4],d=l[8],h=l[1],f=l[5],m=l[9],_=l[2],p=l[6],g=l[10];if(Math.abs(u-h)<.01&&Math.abs(d-_)<.01&&Math.abs(m-p)<.01){if(Math.abs(u+h)<.1&&Math.abs(d+_)<.1&&Math.abs(m+p)<.1&&Math.abs(c+f+g-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let M=(c+1)/2,x=(f+1)/2,C=(g+1)/2,E=(u+h)/4,w=(d+_)/4,y=(m+p)/4;return M>x&&M>C?M<.01?(n=0,i=.707106781,s=.707106781):(n=Math.sqrt(M),i=E/n,s=w/n):x>C?x<.01?(n=.707106781,i=0,s=.707106781):(i=Math.sqrt(x),n=E/i,s=y/i):C<.01?(n=.707106781,i=.707106781,s=0):(s=Math.sqrt(C),n=w/s,i=y/s),this.set(n,i,s,t),this}let S=Math.sqrt((p-m)*(p-m)+(d-_)*(d-_)+(h-u)*(h-u));return Math.abs(S)<.001&&(S=1),this.x=(p-m)/S,this.y=(d-_)/S,this.z=(h-u)/S,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=ft(this.x,e.x,t.x),this.y=ft(this.y,e.y,t.y),this.z=ft(this.z,e.z,t.z),this.w=ft(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=ft(this.x,e,t),this.y=ft(this.y,e,t),this.z=ft(this.z,e,t),this.w=ft(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ft(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Cc=class extends ji{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ot,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Gt(0,0,e,t),this.scissorTest=!1,this.viewport=new Gt(0,0,e,t),this.textures=[];let i={width:e,height:t,depth:n.depth},s=new wn(i),a=n.count;for(let o=0;o<a;o++)this.textures[o]=s.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){let t={minFilter:Ot,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,s=this.textures.length;i<s;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0&&(this.textures[i].isArrayTexture=this.textures[i].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let i=Object.assign({},e.textures[t].image);this.textures[t].source=new Ia(i)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this}dispose(){this.dispatchEvent({type:"dispose"})}},bn=class extends Cc{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},Io=class extends wn{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=Mn,this.minFilter=Mn,this.wrapR=Ki,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var Rc=class extends wn{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=Mn,this.minFilter=Mn,this.wrapR=Ki,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Nt=class r{static{r.prototype.isMatrix4=!0}constructor(e,t,n,i,s,a,o,l,c,u,d,h,f,m,_,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,s,a,o,l,c,u,d,h,f,m,_,p)}set(e,t,n,i,s,a,o,l,c,u,d,h,f,m,_,p){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=i,g[1]=s,g[5]=a,g[9]=o,g[13]=l,g[2]=c,g[6]=u,g[10]=d,g[14]=h,g[3]=f,g[7]=m,g[11]=_,g[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new r().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinant()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinant()===0)return this.identity();let t=this.elements,n=e.elements,i=1/da.setFromMatrixColumn(e,0).length(),s=1/da.setFromMatrixColumn(e,1).length(),a=1/da.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,i=e.y,s=e.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(i),c=Math.sin(i),u=Math.cos(s),d=Math.sin(s);if(e.order==="XYZ"){let h=a*u,f=a*d,m=o*u,_=o*d;t[0]=l*u,t[4]=-l*d,t[8]=c,t[1]=f+m*c,t[5]=h-_*c,t[9]=-o*l,t[2]=_-h*c,t[6]=m+f*c,t[10]=a*l}else if(e.order==="YXZ"){let h=l*u,f=l*d,m=c*u,_=c*d;t[0]=h+_*o,t[4]=m*o-f,t[8]=a*c,t[1]=a*d,t[5]=a*u,t[9]=-o,t[2]=f*o-m,t[6]=_+h*o,t[10]=a*l}else if(e.order==="ZXY"){let h=l*u,f=l*d,m=c*u,_=c*d;t[0]=h-_*o,t[4]=-a*d,t[8]=m+f*o,t[1]=f+m*o,t[5]=a*u,t[9]=_-h*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){let h=a*u,f=a*d,m=o*u,_=o*d;t[0]=l*u,t[4]=m*c-f,t[8]=h*c+_,t[1]=l*d,t[5]=_*c+h,t[9]=f*c-m,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){let h=a*l,f=a*c,m=o*l,_=o*c;t[0]=l*u,t[4]=_-h*d,t[8]=m*d+f,t[1]=d,t[5]=a*u,t[9]=-o*u,t[2]=-c*u,t[6]=f*d+m,t[10]=h-_*d}else if(e.order==="XZY"){let h=a*l,f=a*c,m=o*l,_=o*c;t[0]=l*u,t[4]=-d,t[8]=c*u,t[1]=h*d+_,t[5]=a*u,t[9]=f*d-m,t[2]=m*d-f,t[6]=o*u,t[10]=_*d+h}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Tx,e,Ex)}lookAt(e,t,n){let i=this.elements;return fi.subVectors(e,t),fi.lengthSq()===0&&(fi.z=1),fi.normalize(),Hr.crossVectors(n,fi),Hr.lengthSq()===0&&(Math.abs(n.z)===1?fi.x+=1e-4:fi.z+=1e-4,fi.normalize(),Hr.crossVectors(n,fi)),Hr.normalize(),Hl.crossVectors(fi,Hr),i[0]=Hr.x,i[4]=Hl.x,i[8]=fi.x,i[1]=Hr.y,i[5]=Hl.y,i[9]=fi.y,i[2]=Hr.z,i[6]=Hl.z,i[10]=fi.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,i=t.elements,s=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],u=n[1],d=n[5],h=n[9],f=n[13],m=n[2],_=n[6],p=n[10],g=n[14],S=n[3],M=n[7],x=n[11],C=n[15],E=i[0],w=i[4],y=i[8],b=i[12],P=i[1],A=i[5],I=i[9],z=i[13],H=i[2],D=i[6],F=i[10],U=i[14],Y=i[3],Q=i[7],L=i[11],se=i[15];return s[0]=a*E+o*P+l*H+c*Y,s[4]=a*w+o*A+l*D+c*Q,s[8]=a*y+o*I+l*F+c*L,s[12]=a*b+o*z+l*U+c*se,s[1]=u*E+d*P+h*H+f*Y,s[5]=u*w+d*A+h*D+f*Q,s[9]=u*y+d*I+h*F+f*L,s[13]=u*b+d*z+h*U+f*se,s[2]=m*E+_*P+p*H+g*Y,s[6]=m*w+_*A+p*D+g*Q,s[10]=m*y+_*I+p*F+g*L,s[14]=m*b+_*z+p*U+g*se,s[3]=S*E+M*P+x*H+C*Y,s[7]=S*w+M*A+x*D+C*Q,s[11]=S*y+M*I+x*F+C*L,s[15]=S*b+M*z+x*U+C*se,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],i=e[8],s=e[12],a=e[1],o=e[5],l=e[9],c=e[13],u=e[2],d=e[6],h=e[10],f=e[14],m=e[3],_=e[7],p=e[11],g=e[15],S=l*f-c*h,M=o*f-c*d,x=o*h-l*d,C=a*f-c*u,E=a*h-l*u,w=a*d-o*u;return t*(_*S-p*M+g*x)-n*(m*S-p*C+g*E)+i*(m*M-_*C+g*w)-s*(m*x-_*E+p*w)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8],d=e[9],h=e[10],f=e[11],m=e[12],_=e[13],p=e[14],g=e[15],S=t*o-n*a,M=t*l-i*a,x=t*c-s*a,C=n*l-i*o,E=n*c-s*o,w=i*c-s*l,y=u*_-d*m,b=u*p-h*m,P=u*g-f*m,A=d*p-h*_,I=d*g-f*_,z=h*g-f*p,H=S*z-M*I+x*A+C*P-E*b+w*y;if(H===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let D=1/H;return e[0]=(o*z-l*I+c*A)*D,e[1]=(i*I-n*z-s*A)*D,e[2]=(_*w-p*E+g*C)*D,e[3]=(h*E-d*w-f*C)*D,e[4]=(l*P-a*z-c*b)*D,e[5]=(t*z-i*P+s*b)*D,e[6]=(p*x-m*w-g*M)*D,e[7]=(u*w-h*x+f*M)*D,e[8]=(a*I-o*P+c*y)*D,e[9]=(n*P-t*I-s*y)*D,e[10]=(m*E-_*x+g*S)*D,e[11]=(d*x-u*E-f*S)*D,e[12]=(o*b-a*A-l*y)*D,e[13]=(t*A-n*b+i*y)*D,e[14]=(_*M-m*C-p*S)*D,e[15]=(u*C-d*M+h*S)*D,this}scale(e){let t=this.elements,n=e.x,i=e.y,s=e.z;return t[0]*=n,t[4]*=i,t[8]*=s,t[1]*=n,t[5]*=i,t[9]*=s,t[2]*=n,t[6]*=i,t[10]*=s,t[3]*=n,t[7]*=i,t[11]*=s,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),i=Math.sin(t),s=1-n,a=e.x,o=e.y,l=e.z,c=s*a,u=s*o;return this.set(c*a+n,c*o-i*l,c*l+i*o,0,c*o+i*l,u*o+n,u*l-i*a,0,c*l-i*o,u*l+i*a,s*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,s,a){return this.set(1,n,s,0,e,1,a,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){let i=this.elements,s=t._x,a=t._y,o=t._z,l=t._w,c=s+s,u=a+a,d=o+o,h=s*c,f=s*u,m=s*d,_=a*u,p=a*d,g=o*d,S=l*c,M=l*u,x=l*d,C=n.x,E=n.y,w=n.z;return i[0]=(1-(_+g))*C,i[1]=(f+x)*C,i[2]=(m-M)*C,i[3]=0,i[4]=(f-x)*E,i[5]=(1-(h+g))*E,i[6]=(p+S)*E,i[7]=0,i[8]=(m+M)*w,i[9]=(p-S)*w,i[10]=(1-(h+_))*w,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){let i=this.elements;e.x=i[12],e.y=i[13],e.z=i[14];let s=this.determinant();if(s===0)return n.set(1,1,1),t.identity(),this;let a=da.set(i[0],i[1],i[2]).length(),o=da.set(i[4],i[5],i[6]).length(),l=da.set(i[8],i[9],i[10]).length();s<0&&(a=-a),Oi.copy(this);let c=1/a,u=1/o,d=1/l;return Oi.elements[0]*=c,Oi.elements[1]*=c,Oi.elements[2]*=c,Oi.elements[4]*=u,Oi.elements[5]*=u,Oi.elements[6]*=u,Oi.elements[8]*=d,Oi.elements[9]*=d,Oi.elements[10]*=d,t.setFromRotationMatrix(Oi),n.x=a,n.y=o,n.z=l,this}makePerspective(e,t,n,i,s,a,o=zi,l=!1){let c=this.elements,u=2*s/(t-e),d=2*s/(n-i),h=(t+e)/(t-e),f=(n+i)/(n-i),m,_;if(l)m=s/(a-s),_=a*s/(a-s);else if(o===zi)m=-(a+s)/(a-s),_=-2*a*s/(a-s);else if(o===Aa)m=-a/(a-s),_=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=h,c[12]=0,c[1]=0,c[5]=d,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=_,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,i,s,a,o=zi,l=!1){let c=this.elements,u=2/(t-e),d=2/(n-i),h=-(t+e)/(t-e),f=-(n+i)/(n-i),m,_;if(l)m=1/(a-s),_=a/(a-s);else if(o===zi)m=-2/(a-s),_=-(a+s)/(a-s);else if(o===Aa)m=-1/(a-s),_=-s/(a-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=0,c[12]=h,c[1]=0,c[5]=d,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=m,c[14]=_,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},da=new G,Oi=new Nt,Tx=new G(0,0,0),Ex=new G(1,1,1),Hr=new G,Hl=new G,fi=new G,Yp=new Nt,Zp=new er,Sr=class r{constructor(e=0,t=0,n=0,i=r.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let i=e.elements,s=i[0],a=i[4],o=i[8],l=i[1],c=i[5],u=i[9],d=i[2],h=i[6],f=i[10];switch(t){case"XYZ":this._y=Math.asin(ft(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,f),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(h,c),this._z=0);break;case"YXZ":this._x=Math.asin(-ft(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,s),this._z=0);break;case"ZXY":this._x=Math.asin(ft(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-ft(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(h,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(ft(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-d,s)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-ft(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(h,c),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-u,f),this._y=0);break;default:et("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Yp.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Yp,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Zp.setFromEuler(this),this.setFromQuaternion(Zp,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Sr.DEFAULT_ORDER="XYZ";var Do=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},wx=0,Jp=new G,pa=new er,pr=new Nt,Gl=new G,xo=new G,Ax=new G,Cx=new er,$p=new G(1,0,0),Kp=new G(0,1,0),Qp=new G(0,0,1),jp={type:"added"},Rx={type:"removed"},ma={type:"childadded",child:null},Zh={type:"childremoved",child:null},Fn=class r extends ji{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:wx++}),this.uuid=Os(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=r.DEFAULT_UP.clone();let e=new G,t=new Sr,n=new er,i=new G(1,1,1);function s(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Nt},normalMatrix:{value:new at}}),this.matrix=new Nt,this.matrixWorld=new Nt,this.matrixAutoUpdate=r.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=r.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Do,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return pa.setFromAxisAngle(e,t),this.quaternion.multiply(pa),this}rotateOnWorldAxis(e,t){return pa.setFromAxisAngle(e,t),this.quaternion.premultiply(pa),this}rotateX(e){return this.rotateOnAxis($p,e)}rotateY(e){return this.rotateOnAxis(Kp,e)}rotateZ(e){return this.rotateOnAxis(Qp,e)}translateOnAxis(e,t){return Jp.copy(e).applyQuaternion(this.quaternion),this.position.add(Jp.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis($p,e)}translateY(e){return this.translateOnAxis(Kp,e)}translateZ(e){return this.translateOnAxis(Qp,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(pr.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Gl.copy(e):Gl.set(e,t,n);let i=this.parent;this.updateWorldMatrix(!0,!1),xo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?pr.lookAt(xo,Gl,this.up):pr.lookAt(Gl,xo,this.up),this.quaternion.setFromRotationMatrix(pr),i&&(pr.extractRotation(i.matrixWorld),pa.setFromRotationMatrix(pr),this.quaternion.premultiply(pa.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(nt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(jp),ma.child=e,this.dispatchEvent(ma),ma.child=null):nt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Rx),Zh.child=e,this.dispatchEvent(Zh),Zh.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),pr.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),pr.multiply(e.parent.matrixWorld)),e.applyMatrix4(pr),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(jp),ma.child=e,this.dispatchEvent(ma),ma.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){let a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let i=this.children;for(let s=0,a=i.length;s<a;s++)i[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(xo,e,Ax),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(xo,Cx,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,i=e.z,s=this.matrix.elements;s[12]+=t-s[0]*t-s[4]*n-s[8]*i,s[13]+=n-s[1]*t-s[5]*n-s[9]*i,s[14]+=i-s[2]*t-s[6]*n-s[10]*i}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){let n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){let i=this.children;for(let s=0,a=i.length;s<a;s++)i[s].updateWorldMatrix(!1,!0)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),this.static!==!1&&(i.static=this.static),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.pivot!==null&&(i.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(i.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(i.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(o=>({...o})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function s(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=s(e.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){let d=l[c];s(e.shapes,d)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(s(e.materials,this.material[l]));i.material=o}else i.material=s(e.materials,this.material);if(this.children.length>0){i.children=[];for(let o=0;o<this.children.length;o++)i.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];i.animations.push(s(e.animations,l))}}if(t){let o=a(e.geometries),l=a(e.materials),c=a(e.textures),u=a(e.images),d=a(e.shapes),h=a(e.skeletons),f=a(e.animations),m=a(e.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),u.length>0&&(n.images=u),d.length>0&&(n.shapes=d),h.length>0&&(n.skeletons=h),f.length>0&&(n.animations=f),m.length>0&&(n.nodes=m)}return n.object=i,n;function a(o){let l=[];for(let c in o){let u=o[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let i=e.children[n];this.add(i.clone())}return this}};Fn.DEFAULT_UP=new G(0,1,0);Fn.DEFAULT_MATRIX_AUTO_UPDATE=!0;Fn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Nn=class extends Fn{constructor(){super(),this.isGroup=!0,this.type="Group"}},Px={type:"move"},Da=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Nn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Nn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new G,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new G),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Nn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new G,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new G,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,s=null,a=null,o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(let _ of e.hand.values()){let p=t.getJointPose(_,n),g=this._getHandJoint(c,_);p!==null&&(g.matrix.fromArray(p.transform.matrix),g.matrix.decompose(g.position,g.rotation,g.scale),g.matrixWorldNeedsUpdate=!0,g.jointRadius=p.radius),g.visible=p!==null}let u=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],h=u.position.distanceTo(d.position),f=.02,m=.005;c.inputState.pinching&&h>f+m?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&h<=f-m&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));o!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&s!==null&&(i=s),i!==null&&(o.matrix.fromArray(i.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,i.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(i.linearVelocity)):o.hasLinearVelocity=!1,i.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(i.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Px)))}return o!==null&&(o.visible=i!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new Nn;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},eg={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Gr={h:0,s:0,l:0},Wl={h:0,s:0,l:0};function Jh(r,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?r+(e-r)*6*t:t<1/2?e:t<2/3?r+(e-r)*6*(2/3-t):r}var Ye=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Vt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,_t.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=_t.workingColorSpace){return this.r=e,this.g=t,this.b=n,_t.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=_t.workingColorSpace){if(e=Qf(e,1),t=ft(t,0,1),n=ft(n,0,1),t===0)this.r=this.g=this.b=n;else{let s=n<=.5?n*(1+t):n+t-n*t,a=2*n-s;this.r=Jh(a,s,e+1/3),this.g=Jh(a,s,e),this.b=Jh(a,s,e-1/3)}return _t.colorSpaceToWorking(this,i),this}setStyle(e,t=Vt){function n(s){s!==void 0&&parseFloat(s)<1&&et("Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let s,a=i[1],o=i[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:et("Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){let s=i[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(s,16),t);et("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Vt){let n=eg[e.toLowerCase()];return n!==void 0?this.setHex(n,t):et("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=vr(e.r),this.g=vr(e.g),this.b=vr(e.b),this}copyLinearToSRGB(e){return this.r=wa(e.r),this.g=wa(e.g),this.b=wa(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Vt){return _t.workingToColorSpace(Un.copy(this),e),Math.round(ft(Un.r*255,0,255))*65536+Math.round(ft(Un.g*255,0,255))*256+Math.round(ft(Un.b*255,0,255))}getHexString(e=Vt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=_t.workingColorSpace){_t.workingToColorSpace(Un.copy(this),t);let n=Un.r,i=Un.g,s=Un.b,a=Math.max(n,i,s),o=Math.min(n,i,s),l,c,u=(o+a)/2;if(o===a)l=0,c=0;else{let d=a-o;switch(c=u<=.5?d/(a+o):d/(2-a-o),a){case n:l=(i-s)/d+(i<s?6:0);break;case i:l=(s-n)/d+2;break;case s:l=(n-i)/d+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=_t.workingColorSpace){return _t.workingToColorSpace(Un.copy(this),t),e.r=Un.r,e.g=Un.g,e.b=Un.b,e}getStyle(e=Vt){_t.workingToColorSpace(Un.copy(this),e);let t=Un.r,n=Un.g,i=Un.b;return e!==Vt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(Gr),this.setHSL(Gr.h+e,Gr.s+t,Gr.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Gr),e.getHSL(Wl);let n=Eo(Gr.h,Wl.h,t),i=Eo(Gr.s,Wl.s,t),s=Eo(Gr.l,Wl.l,t);return this.setHSL(n,i,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,i=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*i,this.g=s[1]*t+s[4]*n+s[7]*i,this.b=s[2]*t+s[5]*n+s[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Un=new Ye;Ye.NAMES=eg;var qn=class extends Fn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Sr,this.environmentIntensity=1,this.environmentRotation=new Sr,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},Bi=new G,mr=new G,$h=new G,gr=new G,ga=new G,_a=new G,em=new G,Kh=new G,Qh=new G,jh=new G,ef=new Gt,tf=new Gt,nf=new Gt,Zr=class r{constructor(e=new G,t=new G,n=new G){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),Bi.subVectors(e,t),i.cross(Bi);let s=i.lengthSq();return s>0?i.multiplyScalar(1/Math.sqrt(s)):i.set(0,0,0)}static getBarycoord(e,t,n,i,s){Bi.subVectors(i,t),mr.subVectors(n,t),$h.subVectors(e,t);let a=Bi.dot(Bi),o=Bi.dot(mr),l=Bi.dot($h),c=mr.dot(mr),u=mr.dot($h),d=a*c-o*o;if(d===0)return s.set(0,0,0),null;let h=1/d,f=(c*l-o*u)*h,m=(a*u-o*l)*h;return s.set(1-f-m,m,f)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,gr)===null?!1:gr.x>=0&&gr.y>=0&&gr.x+gr.y<=1}static getInterpolation(e,t,n,i,s,a,o,l){return this.getBarycoord(e,t,n,i,gr)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,gr.x),l.addScaledVector(a,gr.y),l.addScaledVector(o,gr.z),l)}static getInterpolatedAttribute(e,t,n,i,s,a){return ef.setScalar(0),tf.setScalar(0),nf.setScalar(0),ef.fromBufferAttribute(e,t),tf.fromBufferAttribute(e,n),nf.fromBufferAttribute(e,i),a.setScalar(0),a.addScaledVector(ef,s.x),a.addScaledVector(tf,s.y),a.addScaledVector(nf,s.z),a}static isFrontFacing(e,t,n,i){return Bi.subVectors(n,t),mr.subVectors(e,t),Bi.cross(mr).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Bi.subVectors(this.c,this.b),mr.subVectors(this.a,this.b),Bi.cross(mr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return r.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return r.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,s){return r.getInterpolation(e,this.a,this.b,this.c,t,n,i,s)}containsPoint(e){return r.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return r.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,i=this.b,s=this.c,a,o;ga.subVectors(i,n),_a.subVectors(s,n),Kh.subVectors(e,n);let l=ga.dot(Kh),c=_a.dot(Kh);if(l<=0&&c<=0)return t.copy(n);Qh.subVectors(e,i);let u=ga.dot(Qh),d=_a.dot(Qh);if(u>=0&&d<=u)return t.copy(i);let h=l*d-u*c;if(h<=0&&l>=0&&u<=0)return a=l/(l-u),t.copy(n).addScaledVector(ga,a);jh.subVectors(e,s);let f=ga.dot(jh),m=_a.dot(jh);if(m>=0&&f<=m)return t.copy(s);let _=f*c-l*m;if(_<=0&&c>=0&&m<=0)return o=c/(c-m),t.copy(n).addScaledVector(_a,o);let p=u*m-f*d;if(p<=0&&d-u>=0&&f-m>=0)return em.subVectors(s,i),o=(d-u)/(d-u+(f-m)),t.copy(i).addScaledVector(em,o);let g=1/(p+_+h);return a=_*g,o=h*g,t.copy(n).addScaledVector(ga,a).addScaledVector(_a,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},$r=class{constructor(e=new G(1/0,1/0,1/0),t=new G(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(ki.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(ki.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=ki.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,ki):ki.fromBufferAttribute(s,a),ki.applyMatrix4(e.matrixWorld),this.expandByPoint(ki);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Xl.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Xl.copy(n.boundingBox)),Xl.applyMatrix4(e.matrixWorld),this.union(Xl)}let i=e.children;for(let s=0,a=i.length;s<a;s++)this.expandByObject(i[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,ki),ki.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(vo),ql.subVectors(this.max,vo),xa.subVectors(e.a,vo),va.subVectors(e.b,vo),ya.subVectors(e.c,vo),Wr.subVectors(va,xa),Xr.subVectors(ya,va),bs.subVectors(xa,ya);let t=[0,-Wr.z,Wr.y,0,-Xr.z,Xr.y,0,-bs.z,bs.y,Wr.z,0,-Wr.x,Xr.z,0,-Xr.x,bs.z,0,-bs.x,-Wr.y,Wr.x,0,-Xr.y,Xr.x,0,-bs.y,bs.x,0];return!rf(t,xa,va,ya,ql)||(t=[1,0,0,0,1,0,0,0,1],!rf(t,xa,va,ya,ql))?!1:(Yl.crossVectors(Wr,Xr),t=[Yl.x,Yl.y,Yl.z],rf(t,xa,va,ya,ql))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,ki).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(ki).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(_r[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),_r[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),_r[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),_r[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),_r[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),_r[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),_r[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),_r[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(_r),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},_r=[new G,new G,new G,new G,new G,new G,new G,new G],ki=new G,Xl=new $r,xa=new G,va=new G,ya=new G,Wr=new G,Xr=new G,bs=new G,vo=new G,ql=new G,Yl=new G,Ts=new G;function rf(r,e,t,n,i){for(let s=0,a=r.length-3;s<=a;s+=3){Ts.fromArray(r,s);let o=i.x*Math.abs(Ts.x)+i.y*Math.abs(Ts.y)+i.z*Math.abs(Ts.z),l=e.dot(Ts),c=t.dot(Ts),u=n.dot(Ts);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>o)return!1}return!0}var rn=new G,Zl=new we,Ix=0,sn=class extends ji{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Ix++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Mf,this.updateRanges=[],this.gpuType=Gi,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,s=this.itemSize;i<s;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Zl.fromBufferAttribute(this,t),Zl.applyMatrix3(e),this.setXY(t,Zl.x,Zl.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)rn.fromBufferAttribute(this,t),rn.applyMatrix3(e),this.setXYZ(t,rn.x,rn.y,rn.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)rn.fromBufferAttribute(this,t),rn.applyMatrix4(e),this.setXYZ(t,rn.x,rn.y,rn.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)rn.fromBufferAttribute(this,t),rn.applyNormalMatrix(e),this.setXYZ(t,rn.x,rn.y,rn.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)rn.fromBufferAttribute(this,t),rn.transformDirection(e),this.setXYZ(t,rn.x,rn.y,rn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Ea(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Xn(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Ea(t,this.array)),t}setX(e,t){return this.normalized&&(t=Xn(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Ea(t,this.array)),t}setY(e,t){return this.normalized&&(t=Xn(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Ea(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Xn(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Ea(t,this.array)),t}setW(e,t){return this.normalized&&(t=Xn(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Xn(t,this.array),n=Xn(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=Xn(t,this.array),n=Xn(n,this.array),i=Xn(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,s){return e*=this.itemSize,this.normalized&&(t=Xn(t,this.array),n=Xn(n,this.array),i=Xn(i,this.array),s=Xn(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Mf&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}};var Lo=class extends sn{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var Uo=class extends sn{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var Sn=class extends sn{constructor(e,t,n){super(new Float32Array(e),t,n)}},Dx=new $r,yo=new G,sf=new G,Is=class{constructor(e=new G,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):Dx.setFromPoints(e).getCenter(n);let i=0;for(let s=0,a=e.length;s<a;s++)i=Math.max(i,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;yo.subVectors(e,this.center);let t=yo.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(yo,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(sf.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(yo.copy(e.center).add(sf)),this.expandByPoint(yo.copy(e.center).sub(sf))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Lx=0,Ci=new Nt,af=new Fn,Sa=new G,di=new $r,So=new $r,vn=new G,an=class r extends ji{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Lx++}),this.uuid=Os(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(ix(e)?Uo:Lo)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let s=new at().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}let i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Ci.makeRotationFromQuaternion(e),this.applyMatrix4(Ci),this}rotateX(e){return Ci.makeRotationX(e),this.applyMatrix4(Ci),this}rotateY(e){return Ci.makeRotationY(e),this.applyMatrix4(Ci),this}rotateZ(e){return Ci.makeRotationZ(e),this.applyMatrix4(Ci),this}translate(e,t,n){return Ci.makeTranslation(e,t,n),this.applyMatrix4(Ci),this}scale(e,t,n){return Ci.makeScale(e,t,n),this.applyMatrix4(Ci),this}lookAt(e){return af.lookAt(e),af.updateMatrix(),this.applyMatrix4(af.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Sa).negate(),this.translate(Sa.x,Sa.y,Sa.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let n=[];for(let i=0,s=e.length;i<s;i++){let a=e[i];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new Sn(n,3))}else{let n=Math.min(e.length,t.count);for(let i=0;i<n;i++){let s=e[i];t.setXYZ(i,s.x,s.y,s.z||0)}e.length>t.count&&et("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new $r);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){nt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new G(-1/0,-1/0,-1/0),new G(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){let s=t[n];di.setFromBufferAttribute(s),this.morphTargetsRelative?(vn.addVectors(this.boundingBox.min,di.min),this.boundingBox.expandByPoint(vn),vn.addVectors(this.boundingBox.max,di.max),this.boundingBox.expandByPoint(vn)):(this.boundingBox.expandByPoint(di.min),this.boundingBox.expandByPoint(di.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&nt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Is);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){nt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new G,1/0);return}if(e){let n=this.boundingSphere.center;if(di.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){let o=t[s];So.setFromBufferAttribute(o),this.morphTargetsRelative?(vn.addVectors(di.min,So.min),di.expandByPoint(vn),vn.addVectors(di.max,So.max),di.expandByPoint(vn)):(di.expandByPoint(So.min),di.expandByPoint(So.max))}di.getCenter(n);let i=0;for(let s=0,a=e.count;s<a;s++)vn.fromBufferAttribute(e,s),i=Math.max(i,n.distanceToSquared(vn));if(t)for(let s=0,a=t.length;s<a;s++){let o=t[s],l=this.morphTargetsRelative;for(let c=0,u=o.count;c<u;c++)vn.fromBufferAttribute(o,c),l&&(Sa.fromBufferAttribute(e,c),vn.add(Sa)),i=Math.max(i,n.distanceToSquared(vn))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&nt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){nt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,i=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new sn(new Float32Array(4*n.count),4));let a=this.getAttribute("tangent"),o=[],l=[];for(let y=0;y<n.count;y++)o[y]=new G,l[y]=new G;let c=new G,u=new G,d=new G,h=new we,f=new we,m=new we,_=new G,p=new G;function g(y,b,P){c.fromBufferAttribute(n,y),u.fromBufferAttribute(n,b),d.fromBufferAttribute(n,P),h.fromBufferAttribute(s,y),f.fromBufferAttribute(s,b),m.fromBufferAttribute(s,P),u.sub(c),d.sub(c),f.sub(h),m.sub(h);let A=1/(f.x*m.y-m.x*f.y);isFinite(A)&&(_.copy(u).multiplyScalar(m.y).addScaledVector(d,-f.y).multiplyScalar(A),p.copy(d).multiplyScalar(f.x).addScaledVector(u,-m.x).multiplyScalar(A),o[y].add(_),o[b].add(_),o[P].add(_),l[y].add(p),l[b].add(p),l[P].add(p))}let S=this.groups;S.length===0&&(S=[{start:0,count:e.count}]);for(let y=0,b=S.length;y<b;++y){let P=S[y],A=P.start,I=P.count;for(let z=A,H=A+I;z<H;z+=3)g(e.getX(z+0),e.getX(z+1),e.getX(z+2))}let M=new G,x=new G,C=new G,E=new G;function w(y){C.fromBufferAttribute(i,y),E.copy(C);let b=o[y];M.copy(b),M.sub(C.multiplyScalar(C.dot(b))).normalize(),x.crossVectors(E,b);let A=x.dot(l[y])<0?-1:1;a.setXYZW(y,M.x,M.y,M.z,A)}for(let y=0,b=S.length;y<b;++y){let P=S[y],A=P.start,I=P.count;for(let z=A,H=A+I;z<H;z+=3)w(e.getX(z+0)),w(e.getX(z+1)),w(e.getX(z+2))}}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new sn(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let h=0,f=n.count;h<f;h++)n.setXYZ(h,0,0,0);let i=new G,s=new G,a=new G,o=new G,l=new G,c=new G,u=new G,d=new G;if(e)for(let h=0,f=e.count;h<f;h+=3){let m=e.getX(h+0),_=e.getX(h+1),p=e.getX(h+2);i.fromBufferAttribute(t,m),s.fromBufferAttribute(t,_),a.fromBufferAttribute(t,p),u.subVectors(a,s),d.subVectors(i,s),u.cross(d),o.fromBufferAttribute(n,m),l.fromBufferAttribute(n,_),c.fromBufferAttribute(n,p),o.add(u),l.add(u),c.add(u),n.setXYZ(m,o.x,o.y,o.z),n.setXYZ(_,l.x,l.y,l.z),n.setXYZ(p,c.x,c.y,c.z)}else for(let h=0,f=t.count;h<f;h+=3)i.fromBufferAttribute(t,h+0),s.fromBufferAttribute(t,h+1),a.fromBufferAttribute(t,h+2),u.subVectors(a,s),d.subVectors(i,s),u.cross(d),n.setXYZ(h+0,u.x,u.y,u.z),n.setXYZ(h+1,u.x,u.y,u.z),n.setXYZ(h+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)vn.fromBufferAttribute(e,t),vn.normalize(),e.setXYZ(t,vn.x,vn.y,vn.z)}toNonIndexed(){function e(o,l){let c=o.array,u=o.itemSize,d=o.normalized,h=new c.constructor(l.length*u),f=0,m=0;for(let _=0,p=l.length;_<p;_++){o.isInterleavedBufferAttribute?f=l[_]*o.data.stride+o.offset:f=l[_]*u;for(let g=0;g<u;g++)h[m++]=c[f++]}return new sn(h,u,d)}if(this.index===null)return et("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new r,n=this.index.array,i=this.attributes;for(let o in i){let l=i[o],c=e(l,n);t.setAttribute(o,c)}let s=this.morphAttributes;for(let o in s){let l=[],c=s[o];for(let u=0,d=c.length;u<d;u++){let h=c[u],f=e(h,n);l.push(f)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,l=a.length;o<l;o++){let c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let l in n){let c=n[l];e.data.attributes[l]=c.toJSON(e.data)}let i={},s=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],u=[];for(let d=0,h=c.length;d<h;d++){let f=c[d];u.push(f.toJSON(e.data))}u.length>0&&(i[l]=u,s=!0)}s&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let i=e.attributes;for(let c in i){let u=i[c];this.setAttribute(c,u.clone(t))}let s=e.morphAttributes;for(let c in s){let u=[],d=s[c];for(let h=0,f=d.length;h<f;h++)u.push(d[h].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let c=0,u=a.length;c<u;c++){let d=a[c];this.addGroup(d.start,d.count,d.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}};var Ux=0,Mr=class extends ji{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Ux++}),this.uuid=Os(),this.name="",this.type="Material",this.blending=Rs,this.side=yr,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=pc,this.blendDst=mc,this.blendEquation=Jr,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ye(0,0,0),this.blendAlpha=0,this.depthFunc=Ps,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Sf,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=As,this.stencilZFail=As,this.stencilZPass=As,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){et(`Material: parameter '${t}' has value of undefined.`);continue}let i=this[t];if(i===void 0){et(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Rs&&(n.blending=this.blending),this.side!==yr&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==pc&&(n.blendSrc=this.blendSrc),this.blendDst!==mc&&(n.blendDst=this.blendDst),this.blendEquation!==Jr&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Ps&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Sf&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==As&&(n.stencilFail=this.stencilFail),this.stencilZFail!==As&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==As&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(s){let a=[];for(let o in s){let l=s[o];delete l.metadata,a.push(l)}return a}if(t){let s=i(e.textures),a=i(e.images);s.length>0&&(n.textures=s),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let i=t.length;n=new Array(i);for(let s=0;s!==i;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}};var xr=new G,of=new G,Jl=new G,qr=new G,lf=new G,$l=new G,cf=new G,No=class{constructor(e=new G,t=new G(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,xr)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=xr.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(xr.copy(this.origin).addScaledVector(this.direction,t),xr.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){of.copy(e).add(t).multiplyScalar(.5),Jl.copy(t).sub(e).normalize(),qr.copy(this.origin).sub(of);let s=e.distanceTo(t)*.5,a=-this.direction.dot(Jl),o=qr.dot(this.direction),l=-qr.dot(Jl),c=qr.lengthSq(),u=Math.abs(1-a*a),d,h,f,m;if(u>0)if(d=a*l-o,h=a*o-l,m=s*u,d>=0)if(h>=-m)if(h<=m){let _=1/u;d*=_,h*=_,f=d*(d+a*h+2*o)+h*(a*d+h+2*l)+c}else h=s,d=Math.max(0,-(a*h+o)),f=-d*d+h*(h+2*l)+c;else h=-s,d=Math.max(0,-(a*h+o)),f=-d*d+h*(h+2*l)+c;else h<=-m?(d=Math.max(0,-(-a*s+o)),h=d>0?-s:Math.min(Math.max(-s,-l),s),f=-d*d+h*(h+2*l)+c):h<=m?(d=0,h=Math.min(Math.max(-s,-l),s),f=h*(h+2*l)+c):(d=Math.max(0,-(a*s+o)),h=d>0?s:Math.min(Math.max(-s,-l),s),f=-d*d+h*(h+2*l)+c);else h=a>0?-s:s,d=Math.max(0,-(a*h+o)),f=-d*d+h*(h+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),i&&i.copy(of).addScaledVector(Jl,h),f}intersectSphere(e,t){xr.subVectors(e.center,this.origin);let n=xr.dot(this.direction),i=xr.dot(xr)-n*n,s=e.radius*e.radius;if(i>s)return null;let a=Math.sqrt(s-i),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,s,a,o,l,c=1/this.direction.x,u=1/this.direction.y,d=1/this.direction.z,h=this.origin;return c>=0?(n=(e.min.x-h.x)*c,i=(e.max.x-h.x)*c):(n=(e.max.x-h.x)*c,i=(e.min.x-h.x)*c),u>=0?(s=(e.min.y-h.y)*u,a=(e.max.y-h.y)*u):(s=(e.max.y-h.y)*u,a=(e.min.y-h.y)*u),n>a||s>i||((s>n||isNaN(n))&&(n=s),(a<i||isNaN(i))&&(i=a),d>=0?(o=(e.min.z-h.z)*d,l=(e.max.z-h.z)*d):(o=(e.max.z-h.z)*d,l=(e.min.z-h.z)*d),n>l||o>i)||((o>n||n!==n)&&(n=o),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,xr)!==null}intersectTriangle(e,t,n,i,s){lf.subVectors(t,e),$l.subVectors(n,e),cf.crossVectors(lf,$l);let a=this.direction.dot(cf),o;if(a>0){if(i)return null;o=1}else if(a<0)o=-1,a=-a;else return null;qr.subVectors(this.origin,e);let l=o*this.direction.dot($l.crossVectors(qr,$l));if(l<0)return null;let c=o*this.direction.dot(lf.cross(qr));if(c<0||l+c>a)return null;let u=-o*qr.dot(cf);return u<0?null:this.at(u/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},on=class extends Mr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ye(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Sr,this.combine=Nf,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},tm=new Nt,Es=new No,Kl=new Is,nm=new G,Ql=new G,jl=new G,ec=new G,uf=new G,tc=new G,im=new G,nc=new G,xt=class extends Fn{constructor(e=new an,t=new on){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=i.length;s<a;s++){let o=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(e,t){let n=this.geometry,i=n.attributes.position,s=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(i,e);let o=this.morphTargetInfluences;if(s&&o){tc.set(0,0,0);for(let l=0,c=s.length;l<c;l++){let u=o[l],d=s[l];u!==0&&(uf.fromBufferAttribute(d,e),a?tc.addScaledVector(uf,u):tc.addScaledVector(uf.sub(t),u))}t.add(tc)}return t}raycast(e,t){let n=this.geometry,i=this.material,s=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Kl.copy(n.boundingSphere),Kl.applyMatrix4(s),Es.copy(e.ray).recast(e.near),!(Kl.containsPoint(Es.origin)===!1&&(Es.intersectSphere(Kl,nm)===null||Es.origin.distanceToSquared(nm)>(e.far-e.near)**2))&&(tm.copy(s).invert(),Es.copy(e.ray).applyMatrix4(tm),!(n.boundingBox!==null&&Es.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Es)))}_computeIntersections(e,t,n){let i,s=this.geometry,a=this.material,o=s.index,l=s.attributes.position,c=s.attributes.uv,u=s.attributes.uv1,d=s.attributes.normal,h=s.groups,f=s.drawRange;if(o!==null)if(Array.isArray(a))for(let m=0,_=h.length;m<_;m++){let p=h[m],g=a[p.materialIndex],S=Math.max(p.start,f.start),M=Math.min(o.count,Math.min(p.start+p.count,f.start+f.count));for(let x=S,C=M;x<C;x+=3){let E=o.getX(x),w=o.getX(x+1),y=o.getX(x+2);i=ic(this,g,e,n,c,u,d,E,w,y),i&&(i.faceIndex=Math.floor(x/3),i.face.materialIndex=p.materialIndex,t.push(i))}}else{let m=Math.max(0,f.start),_=Math.min(o.count,f.start+f.count);for(let p=m,g=_;p<g;p+=3){let S=o.getX(p),M=o.getX(p+1),x=o.getX(p+2);i=ic(this,a,e,n,c,u,d,S,M,x),i&&(i.faceIndex=Math.floor(p/3),t.push(i))}}else if(l!==void 0)if(Array.isArray(a))for(let m=0,_=h.length;m<_;m++){let p=h[m],g=a[p.materialIndex],S=Math.max(p.start,f.start),M=Math.min(l.count,Math.min(p.start+p.count,f.start+f.count));for(let x=S,C=M;x<C;x+=3){let E=x,w=x+1,y=x+2;i=ic(this,g,e,n,c,u,d,E,w,y),i&&(i.faceIndex=Math.floor(x/3),i.face.materialIndex=p.materialIndex,t.push(i))}}else{let m=Math.max(0,f.start),_=Math.min(l.count,f.start+f.count);for(let p=m,g=_;p<g;p+=3){let S=p,M=p+1,x=p+2;i=ic(this,a,e,n,c,u,d,S,M,x),i&&(i.faceIndex=Math.floor(p/3),t.push(i))}}}};function Nx(r,e,t,n,i,s,a,o){let l;if(e.side===Yn?l=n.intersectTriangle(a,s,i,!0,o):l=n.intersectTriangle(i,s,a,e.side===yr,o),l===null)return null;nc.copy(o),nc.applyMatrix4(r.matrixWorld);let c=t.ray.origin.distanceTo(nc);return c<t.near||c>t.far?null:{distance:c,point:nc.clone(),object:r}}function ic(r,e,t,n,i,s,a,o,l,c){r.getVertexPosition(o,Ql),r.getVertexPosition(l,jl),r.getVertexPosition(c,ec);let u=Nx(r,e,t,n,Ql,jl,ec,im);if(u){let d=new G;Zr.getBarycoord(im,Ql,jl,ec,d),i&&(u.uv=Zr.getInterpolatedAttribute(i,o,l,c,d,new we)),s&&(u.uv1=Zr.getInterpolatedAttribute(s,o,l,c,d,new we)),a&&(u.normal=Zr.getInterpolatedAttribute(a,o,l,c,d,new G),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));let h={a:o,b:l,c,normal:new G,materialIndex:0};Zr.getNormal(Ql,jl,ec,h.normal),u.face=h,u.barycoord=d}return u}var Pc=class extends wn{constructor(e=null,t=1,n=1,i,s,a,o,l,c=Mn,u=Mn,d,h){super(null,a,o,l,c,u,i,s,d,h),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var hf=new G,Fx=new G,Ox=new at,$i=class{constructor(e=new G(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let i=hf.subVectors(n,t).cross(Fx.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let i=e.delta(hf),s=this.normal.dot(i);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/s;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(i,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||Ox.getNormalMatrix(e),i=this.coplanarPoint(hf).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},ws=new Is,Bx=new we(.5,.5),rc=new G,La=class{constructor(e=new $i,t=new $i,n=new $i,i=new $i,s=new $i,a=new $i){this.planes=[e,t,n,i,s,a]}set(e,t,n,i,s,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(i),o[4].copy(s),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=zi,n=!1){let i=this.planes,s=e.elements,a=s[0],o=s[1],l=s[2],c=s[3],u=s[4],d=s[5],h=s[6],f=s[7],m=s[8],_=s[9],p=s[10],g=s[11],S=s[12],M=s[13],x=s[14],C=s[15];if(i[0].setComponents(c-a,f-u,g-m,C-S).normalize(),i[1].setComponents(c+a,f+u,g+m,C+S).normalize(),i[2].setComponents(c+o,f+d,g+_,C+M).normalize(),i[3].setComponents(c-o,f-d,g-_,C-M).normalize(),n)i[4].setComponents(l,h,p,x).normalize(),i[5].setComponents(c-l,f-h,g-p,C-x).normalize();else if(i[4].setComponents(c-l,f-h,g-p,C-x).normalize(),t===zi)i[5].setComponents(c+l,f+h,g+p,C+x).normalize();else if(t===Aa)i[5].setComponents(l,h,p,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),ws.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),ws.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(ws)}intersectsSprite(e){ws.center.set(0,0,0);let t=Bx.distanceTo(e.center);return ws.radius=.7071067811865476+t,ws.applyMatrix4(e.matrixWorld),this.intersectsSphere(ws)}intersectsSphere(e){let t=this.planes,n=e.center,i=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let i=t[n];if(rc.x=i.normal.x>0?e.max.x:e.min.x,rc.y=i.normal.y>0?e.max.y:e.min.y,rc.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(rc)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Kr=class extends Mr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ye(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Ic=new G,Dc=new G,rm=new Nt,Mo=new No,sc=new Is,ff=new G,sm=new G,Lc=class extends Fn{constructor(e=new an,t=new Kr){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let i=1,s=t.count;i<s;i++)Ic.fromBufferAttribute(t,i-1),Dc.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=Ic.distanceTo(Dc);e.setAttribute("lineDistance",new Sn(n,1))}else et("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){let n=this.geometry,i=this.matrixWorld,s=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),sc.copy(n.boundingSphere),sc.applyMatrix4(i),sc.radius+=s,e.ray.intersectsSphere(sc)===!1)return;rm.copy(i).invert(),Mo.copy(e.ray).applyMatrix4(rm);let o=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,u=n.index,h=n.attributes.position;if(u!==null){let f=Math.max(0,a.start),m=Math.min(u.count,a.start+a.count);for(let _=f,p=m-1;_<p;_+=c){let g=u.getX(_),S=u.getX(_+1),M=ac(this,e,Mo,l,g,S,_);M&&t.push(M)}if(this.isLineLoop){let _=u.getX(m-1),p=u.getX(f),g=ac(this,e,Mo,l,_,p,m-1);g&&t.push(g)}}else{let f=Math.max(0,a.start),m=Math.min(h.count,a.start+a.count);for(let _=f,p=m-1;_<p;_+=c){let g=ac(this,e,Mo,l,_,_+1,_);g&&t.push(g)}if(this.isLineLoop){let _=ac(this,e,Mo,l,m-1,f,m-1);_&&t.push(_)}}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=i.length;s<a;s++){let o=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}};function ac(r,e,t,n,i,s,a){let o=r.geometry.attributes.position;if(Ic.fromBufferAttribute(o,i),Dc.fromBufferAttribute(o,s),t.distanceSqToSegment(Ic,Dc,ff,sm)>n)return;ff.applyMatrix4(r.matrixWorld);let c=e.ray.origin.distanceTo(ff);if(!(c<e.near||c>e.far))return{distance:c,point:sm.clone().applyMatrix4(r.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:r}}var Ds=class extends Lc{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}};var Fo=class extends wn{constructor(e,t,n,i,s=Ot,a=Ot,o,l,c){super(e,t,n,i,s,a,o,l,c),this.isVideoTexture=!0,this.generateMipmaps=!1,this._requestVideoFrameCallbackId=0;let u=this;function d(){u.needsUpdate=!0,u._requestVideoFrameCallbackId=e.requestVideoFrameCallback(d)}"requestVideoFrameCallback"in e&&(this._requestVideoFrameCallbackId=e.requestVideoFrameCallback(d))}clone(){return new this.constructor(this.image).copy(this)}update(){let e=this.image;"requestVideoFrameCallback"in e===!1&&e.readyState>=e.HAVE_CURRENT_DATA&&(this.needsUpdate=!0)}dispose(){this._requestVideoFrameCallbackId!==0&&(this.source.data.cancelVideoFrameCallback(this._requestVideoFrameCallbackId),this._requestVideoFrameCallbackId=0),super.dispose()}};var Oo=class extends wn{constructor(e=[],t=rs,n,i,s,a,o,l,c,u){super(e,t,n,i,s,a,o,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Ls=class extends wn{constructor(e,t,n,i,s,a,o,l,c){super(e,t,n,i,s,a,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var br=class extends wn{constructor(e,t,n=Hi,i,s,a,o=Mn,l=Mn,c,u=Qi,d=1){if(u!==Qi&&u!==as)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let h={width:e,height:t,depth:d};super(h,i,s,a,o,l,u,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Ia(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},Uc=class extends br{constructor(e,t=Hi,n=rs,i,s,a=Mn,o=Mn,l,c=Qi){let u={width:e,height:e,depth:1},d=[u,u,u,u,u,u];super(e,e,t,n,i,s,a,o,l,c),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Bo=class extends wn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},Ua=class r extends an{constructor(e=1,t=1,n=1,i=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:s,depthSegments:a};let o=this;i=Math.floor(i),s=Math.floor(s),a=Math.floor(a);let l=[],c=[],u=[],d=[],h=0,f=0;m("z","y","x",-1,-1,n,t,e,a,s,0),m("z","y","x",1,-1,n,t,-e,a,s,1),m("x","z","y",1,1,e,n,t,i,a,2),m("x","z","y",1,-1,e,n,-t,i,a,3),m("x","y","z",1,-1,e,t,n,i,s,4),m("x","y","z",-1,-1,e,t,-n,i,s,5),this.setIndex(l),this.setAttribute("position",new Sn(c,3)),this.setAttribute("normal",new Sn(u,3)),this.setAttribute("uv",new Sn(d,2));function m(_,p,g,S,M,x,C,E,w,y,b){let P=x/w,A=C/y,I=x/2,z=C/2,H=E/2,D=w+1,F=y+1,U=0,Y=0,Q=new G;for(let L=0;L<F;L++){let se=L*A-z;for(let Se=0;Se<D;Se++){let Le=Se*P-I;Q[_]=Le*S,Q[p]=se*M,Q[g]=H,c.push(Q.x,Q.y,Q.z),Q[_]=0,Q[p]=0,Q[g]=E>0?1:-1,u.push(Q.x,Q.y,Q.z),d.push(Se/w),d.push(1-L/y),U+=1}}for(let L=0;L<y;L++)for(let se=0;se<w;se++){let Se=h+se+D*L,Le=h+se+D*(L+1),Oe=h+(se+1)+D*(L+1),Be=h+(se+1)+D*L;l.push(Se,Le,Be),l.push(Le,Oe,Be),Y+=6}o.addGroup(f,Y,b),f+=Y,h+=U}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new r(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};var pi=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){et("Curve: .getPoint() not implemented.")}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,i=this.getPoint(0),s=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),s+=n.distanceTo(i),t.push(s),i=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),i=0,s=n.length,a;t?a=t:a=e*n[s-1];let o=0,l=s-1,c;for(;o<=l;)if(i=Math.floor(o+(l-o)/2),c=n[i]-a,c<0)o=i+1;else if(c>0)l=i-1;else{l=i;break}if(i=l,n[i]===a)return i/(s-1);let u=n[i],h=n[i+1]-u,f=(a-u)/h;return(i+f)/(s-1)}getTangent(e,t){let i=e-1e-4,s=e+1e-4;i<0&&(i=0),s>1&&(s=1);let a=this.getPoint(i),o=this.getPoint(s),l=t||(a.isVector2?new we:new G);return l.copy(o).sub(a).normalize(),l}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new G,i=[],s=[],a=[],o=new G,l=new Nt;for(let f=0;f<=e;f++){let m=f/e;i[f]=this.getTangentAt(m,new G)}s[0]=new G,a[0]=new G;let c=Number.MAX_VALUE,u=Math.abs(i[0].x),d=Math.abs(i[0].y),h=Math.abs(i[0].z);u<=c&&(c=u,n.set(1,0,0)),d<=c&&(c=d,n.set(0,1,0)),h<=c&&n.set(0,0,1),o.crossVectors(i[0],n).normalize(),s[0].crossVectors(i[0],o),a[0].crossVectors(i[0],s[0]);for(let f=1;f<=e;f++){if(s[f]=s[f-1].clone(),a[f]=a[f-1].clone(),o.crossVectors(i[f-1],i[f]),o.length()>Number.EPSILON){o.normalize();let m=Math.acos(ft(i[f-1].dot(i[f]),-1,1));s[f].applyMatrix4(l.makeRotationAxis(o,m))}a[f].crossVectors(i[f],s[f])}if(t===!0){let f=Math.acos(ft(s[0].dot(s[e]),-1,1));f/=e,i[0].dot(o.crossVectors(s[0],s[e]))>0&&(f=-f);for(let m=1;m<=e;m++)s[m].applyMatrix4(l.makeRotationAxis(i[m],f*m)),a[m].crossVectors(i[m],s[m])}return{tangents:i,normals:s,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},Na=class extends pi{constructor(e=0,t=0,n=1,i=1,s=0,a=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=i,this.aStartAngle=s,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(e,t=new we){let n=t,i=Math.PI*2,s=this.aEndAngle-this.aStartAngle,a=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=i;for(;s>i;)s-=i;s<Number.EPSILON&&(a?s=0:s=i),this.aClockwise===!0&&!a&&(s===i?s=-i:s=s-i);let o=this.aStartAngle+e*s,l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let u=Math.cos(this.aRotation),d=Math.sin(this.aRotation),h=l-this.aX,f=c-this.aY;l=h*u-f*d+this.aX,c=h*d+f*u+this.aY}return n.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},Nc=class extends Na{constructor(e,t,n,i,s,a){super(e,t,n,n,i,s,a),this.isArcCurve=!0,this.type="ArcCurve"}};function jf(){let r=0,e=0,t=0,n=0;function i(s,a,o,l){r=s,e=o,t=-3*s+3*a-2*o-l,n=2*s-2*a+o+l}return{initCatmullRom:function(s,a,o,l,c){i(a,o,c*(o-s),c*(l-a))},initNonuniformCatmullRom:function(s,a,o,l,c,u,d){let h=(a-s)/c-(o-s)/(c+u)+(o-a)/u,f=(o-a)/u-(l-a)/(u+d)+(l-o)/d;h*=u,f*=u,i(a,o,h,f)},calc:function(s){let a=s*s,o=a*s;return r+e*s+t*a+n*o}}}var am=new G,om=new G,df=new jf,pf=new jf,mf=new jf,Fc=class extends pi{constructor(e=[],t=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=i}getPoint(e,t=new G){let n=t,i=this.points,s=i.length,a=(s-(this.closed?0:1))*e,o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/s)+1)*s:l===0&&o===s-1&&(o=s-2,l=1);let c,u;this.closed||o>0?c=i[(o-1)%s]:(om.subVectors(i[0],i[1]).add(i[0]),c=om);let d=i[o%s],h=i[(o+1)%s];if(this.closed||o+2<s?u=i[(o+2)%s]:(am.subVectors(i[s-1],i[s-2]).add(i[s-1]),u=am),this.curveType==="centripetal"||this.curveType==="chordal"){let f=this.curveType==="chordal"?.5:.25,m=Math.pow(c.distanceToSquared(d),f),_=Math.pow(d.distanceToSquared(h),f),p=Math.pow(h.distanceToSquared(u),f);_<1e-4&&(_=1),m<1e-4&&(m=_),p<1e-4&&(p=_),df.initNonuniformCatmullRom(c.x,d.x,h.x,u.x,m,_,p),pf.initNonuniformCatmullRom(c.y,d.y,h.y,u.y,m,_,p),mf.initNonuniformCatmullRom(c.z,d.z,h.z,u.z,m,_,p)}else this.curveType==="catmullrom"&&(df.initCatmullRom(c.x,d.x,h.x,u.x,this.tension),pf.initCatmullRom(c.y,d.y,h.y,u.y,this.tension),mf.initCatmullRom(c.z,d.z,h.z,u.z,this.tension));return n.set(df.calc(l),pf.calc(l),mf.calc(l)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(i.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let i=this.points[t];e.points.push(i.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(new G().fromArray(i))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function lm(r,e,t,n,i){let s=(n-e)*.5,a=(i-t)*.5,o=r*r,l=r*o;return(2*t-2*n+s+a)*l+(-3*t+3*n-2*s-a)*o+s*r+t}function kx(r,e){let t=1-r;return t*t*e}function zx(r,e){return 2*(1-r)*r*e}function Vx(r,e){return r*r*e}function wo(r,e,t,n){return kx(r,e)+zx(r,t)+Vx(r,n)}function Hx(r,e){let t=1-r;return t*t*t*e}function Gx(r,e){let t=1-r;return 3*t*t*r*e}function Wx(r,e){return 3*(1-r)*r*r*e}function Xx(r,e){return r*r*r*e}function Ao(r,e,t,n,i){return Hx(r,e)+Gx(r,t)+Wx(r,n)+Xx(r,i)}var ko=class extends pi{constructor(e=new we,t=new we,n=new we,i=new we){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new we){let n=t,i=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set(Ao(e,i.x,s.x,a.x,o.x),Ao(e,i.y,s.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Oc=class extends pi{constructor(e=new G,t=new G,n=new G,i=new G){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new G){let n=t,i=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set(Ao(e,i.x,s.x,a.x,o.x),Ao(e,i.y,s.y,a.y,o.y),Ao(e,i.z,s.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},zo=class extends pi{constructor(e=new we,t=new we){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new we){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new we){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Bc=class extends pi{constructor(e=new G,t=new G){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new G){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new G){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Vo=class extends pi{constructor(e=new we,t=new we,n=new we){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new we){let n=t,i=this.v0,s=this.v1,a=this.v2;return n.set(wo(e,i.x,s.x,a.x),wo(e,i.y,s.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},kc=class extends pi{constructor(e=new G,t=new G,n=new G){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new G){let n=t,i=this.v0,s=this.v1,a=this.v2;return n.set(wo(e,i.x,s.x,a.x),wo(e,i.y,s.y,a.y),wo(e,i.z,s.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ho=class extends pi{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new we){let n=t,i=this.points,s=(i.length-1)*e,a=Math.floor(s),o=s-a,l=i[a===0?a:a-1],c=i[a],u=i[a>i.length-2?i.length-1:a+1],d=i[a>i.length-3?i.length-1:a+2];return n.set(lm(o,l.x,c.x,u.x,d.x),lm(o,l.y,c.y,u.y,d.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(i.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let i=this.points[t];e.points.push(i.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(new we().fromArray(i))}return this}},bf=Object.freeze({__proto__:null,ArcCurve:Nc,CatmullRomCurve3:Fc,CubicBezierCurve:ko,CubicBezierCurve3:Oc,EllipseCurve:Na,LineCurve:zo,LineCurve3:Bc,QuadraticBezierCurve:Vo,QuadraticBezierCurve3:kc,SplineCurve:Ho}),zc=class extends pi{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new bf[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),i=this.getCurveLengths(),s=0;for(;s<i.length;){if(i[s]>=n){let a=i[s]-n,o=this.curves[s],l=o.getLength(),c=l===0?0:1-a/l;return o.getPointAt(c,t)}s++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,i=this.curves.length;n<i;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let i=0,s=this.curves;i<s.length;i++){let a=s[i],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,l=a.getPoints(o);for(let c=0;c<l.length;c++){let u=l[c];n&&n.equals(u)||(t.push(u),n=u)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let i=e.curves[t];this.curves.push(i.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let i=this.curves[t];e.curves.push(i.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let i=e.curves[t];this.curves.push(new bf[i.type]().fromJSON(i))}return this}},Us=class extends zc{constructor(e){super(),this.type="Path",this.currentPoint=new we,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new zo(this.currentPoint.clone(),new we(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,i){let s=new Vo(this.currentPoint.clone(),new we(e,t),new we(n,i));return this.curves.push(s),this.currentPoint.set(n,i),this}bezierCurveTo(e,t,n,i,s,a){let o=new ko(this.currentPoint.clone(),new we(e,t),new we(n,i),new we(s,a));return this.curves.push(o),this.currentPoint.set(s,a),this}splineThru(e){let t=[this.currentPoint.clone()].concat(e),n=new Ho(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,i,s,a){let o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(e+o,t+l,n,i,s,a),this}absarc(e,t,n,i,s,a){return this.absellipse(e,t,n,n,i,s,a),this}ellipse(e,t,n,i,s,a,o,l){let c=this.currentPoint.x,u=this.currentPoint.y;return this.absellipse(e+c,t+u,n,i,s,a,o,l),this}absellipse(e,t,n,i,s,a,o,l){let c=new Na(e,t,n,i,s,a,o,l);if(this.curves.length>0){let d=c.getPoint(0);d.equals(this.currentPoint)||this.lineTo(d.x,d.y)}this.curves.push(c);let u=c.getPoint(1);return this.currentPoint.copy(u),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},Fa=class extends Us{constructor(e){super(e),this.uuid=Os(),this.type="Shape",this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,i=this.holes.length;n<i;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let i=e.holes[t];this.holes.push(i.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let i=this.holes[t];e.holes.push(i.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let i=e.holes[t];this.holes.push(new Us().fromJSON(i))}return this}};function qx(r,e,t=2){let n=e&&e.length,i=n?e[0]*t:r.length,s=tg(r,0,i,t,!0),a=[];if(!s||s.next===s.prev)return a;let o,l,c;if(n&&(s=Kx(r,e,s,t)),r.length>80*t){o=r[0],l=r[1];let u=o,d=l;for(let h=t;h<i;h+=t){let f=r[h],m=r[h+1];f<o&&(o=f),m<l&&(l=m),f>u&&(u=f),m>d&&(d=m)}c=Math.max(u-o,d-l),c=c!==0?32767/c:0}return Go(s,a,t,o,l,c,0),a}function tg(r,e,t,n,i){let s;if(i===lv(r,e,t,n)>0)for(let a=e;a<t;a+=n)s=cm(a/n|0,r[a],r[a+1],s);else for(let a=t-n;a>=e;a-=n)s=cm(a/n|0,r[a],r[a+1],s);return s&&Oa(s,s.next)&&(Xo(s),s=s.next),s}function Ns(r,e){if(!r)return r;e||(e=r);let t=r,n;do if(n=!1,!t.steiner&&(Oa(t,t.next)||Ht(t.prev,t,t.next)===0)){if(Xo(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function Go(r,e,t,n,i,s,a){if(!r)return;!a&&s&&nv(r,n,i,s);let o=r;for(;r.prev!==r.next;){let l=r.prev,c=r.next;if(s?Zx(r,n,i,s):Yx(r)){e.push(l.i,r.i,c.i),Xo(r),r=c.next,o=c.next;continue}if(r=c,r===o){a?a===1?(r=Jx(Ns(r),e),Go(r,e,t,n,i,s,2)):a===2&&$x(r,e,t,n,i,s):Go(Ns(r),e,t,n,i,s,1);break}}}function Yx(r){let e=r.prev,t=r,n=r.next;if(Ht(e,t,n)>=0)return!1;let i=e.x,s=t.x,a=n.x,o=e.y,l=t.y,c=n.y,u=Math.min(i,s,a),d=Math.min(o,l,c),h=Math.max(i,s,a),f=Math.max(o,l,c),m=n.next;for(;m!==e;){if(m.x>=u&&m.x<=h&&m.y>=d&&m.y<=f&&bo(i,o,s,l,a,c,m.x,m.y)&&Ht(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function Zx(r,e,t,n){let i=r.prev,s=r,a=r.next;if(Ht(i,s,a)>=0)return!1;let o=i.x,l=s.x,c=a.x,u=i.y,d=s.y,h=a.y,f=Math.min(o,l,c),m=Math.min(u,d,h),_=Math.max(o,l,c),p=Math.max(u,d,h),g=Tf(f,m,e,t,n),S=Tf(_,p,e,t,n),M=r.prevZ,x=r.nextZ;for(;M&&M.z>=g&&x&&x.z<=S;){if(M.x>=f&&M.x<=_&&M.y>=m&&M.y<=p&&M!==i&&M!==a&&bo(o,u,l,d,c,h,M.x,M.y)&&Ht(M.prev,M,M.next)>=0||(M=M.prevZ,x.x>=f&&x.x<=_&&x.y>=m&&x.y<=p&&x!==i&&x!==a&&bo(o,u,l,d,c,h,x.x,x.y)&&Ht(x.prev,x,x.next)>=0))return!1;x=x.nextZ}for(;M&&M.z>=g;){if(M.x>=f&&M.x<=_&&M.y>=m&&M.y<=p&&M!==i&&M!==a&&bo(o,u,l,d,c,h,M.x,M.y)&&Ht(M.prev,M,M.next)>=0)return!1;M=M.prevZ}for(;x&&x.z<=S;){if(x.x>=f&&x.x<=_&&x.y>=m&&x.y<=p&&x!==i&&x!==a&&bo(o,u,l,d,c,h,x.x,x.y)&&Ht(x.prev,x,x.next)>=0)return!1;x=x.nextZ}return!0}function Jx(r,e){let t=r;do{let n=t.prev,i=t.next.next;!Oa(n,i)&&ig(n,t,t.next,i)&&Wo(n,i)&&Wo(i,n)&&(e.push(n.i,t.i,i.i),Xo(t),Xo(t.next),t=r=i),t=t.next}while(t!==r);return Ns(t)}function $x(r,e,t,n,i,s){let a=r;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&sv(a,o)){let l=rg(a,o);a=Ns(a,a.next),l=Ns(l,l.next),Go(a,e,t,n,i,s,0),Go(l,e,t,n,i,s,0);return}o=o.next}a=a.next}while(a!==r)}function Kx(r,e,t,n){let i=[];for(let s=0,a=e.length;s<a;s++){let o=e[s]*n,l=s<a-1?e[s+1]*n:r.length,c=tg(r,o,l,n,!1);c===c.next&&(c.steiner=!0),i.push(rv(c))}i.sort(Qx);for(let s=0;s<i.length;s++)t=jx(i[s],t);return t}function Qx(r,e){let t=r.x-e.x;if(t===0&&(t=r.y-e.y,t===0)){let n=(r.next.y-r.y)/(r.next.x-r.x),i=(e.next.y-e.y)/(e.next.x-e.x);t=n-i}return t}function jx(r,e){let t=ev(r,e);if(!t)return e;let n=rg(t,r);return Ns(n,n.next),Ns(t,t.next)}function ev(r,e){let t=e,n=r.x,i=r.y,s=-1/0,a;if(Oa(r,t))return t;do{if(Oa(r,t.next))return t.next;if(i<=t.y&&i>=t.next.y&&t.next.y!==t.y){let d=t.x+(i-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(d<=n&&d>s&&(s=d,a=t.x<t.next.x?t:t.next,d===n))return a}t=t.next}while(t!==e);if(!a)return null;let o=a,l=a.x,c=a.y,u=1/0;t=a;do{if(n>=t.x&&t.x>=l&&n!==t.x&&ng(i<c?n:s,i,l,c,i<c?s:n,i,t.x,t.y)){let d=Math.abs(i-t.y)/(n-t.x);Wo(t,r)&&(d<u||d===u&&(t.x>a.x||t.x===a.x&&tv(a,t)))&&(a=t,u=d)}t=t.next}while(t!==o);return a}function tv(r,e){return Ht(r.prev,r,e.prev)<0&&Ht(e.next,r,r.next)<0}function nv(r,e,t,n){let i=r;do i.z===0&&(i.z=Tf(i.x,i.y,e,t,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==r);i.prevZ.nextZ=null,i.prevZ=null,iv(i)}function iv(r){let e,t=1;do{let n=r,i;r=null;let s=null;for(e=0;n;){e++;let a=n,o=0;for(let c=0;c<t&&(o++,a=a.nextZ,!!a);c++);let l=t;for(;o>0||l>0&&a;)o!==0&&(l===0||!a||n.z<=a.z)?(i=n,n=n.nextZ,o--):(i=a,a=a.nextZ,l--),s?s.nextZ=i:r=i,i.prevZ=s,s=i;n=a}s.nextZ=null,t*=2}while(e>1);return r}function Tf(r,e,t,n,i){return r=(r-t)*i|0,e=(e-n)*i|0,r=(r|r<<8)&16711935,r=(r|r<<4)&252645135,r=(r|r<<2)&858993459,r=(r|r<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,r|e<<1}function rv(r){let e=r,t=r;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==r);return t}function ng(r,e,t,n,i,s,a,o){return(i-a)*(e-o)>=(r-a)*(s-o)&&(r-a)*(n-o)>=(t-a)*(e-o)&&(t-a)*(s-o)>=(i-a)*(n-o)}function bo(r,e,t,n,i,s,a,o){return!(r===a&&e===o)&&ng(r,e,t,n,i,s,a,o)}function sv(r,e){return r.next.i!==e.i&&r.prev.i!==e.i&&!av(r,e)&&(Wo(r,e)&&Wo(e,r)&&ov(r,e)&&(Ht(r.prev,r,e.prev)||Ht(r,e.prev,e))||Oa(r,e)&&Ht(r.prev,r,r.next)>0&&Ht(e.prev,e,e.next)>0)}function Ht(r,e,t){return(e.y-r.y)*(t.x-e.x)-(e.x-r.x)*(t.y-e.y)}function Oa(r,e){return r.x===e.x&&r.y===e.y}function ig(r,e,t,n){let i=lc(Ht(r,e,t)),s=lc(Ht(r,e,n)),a=lc(Ht(t,n,r)),o=lc(Ht(t,n,e));return!!(i!==s&&a!==o||i===0&&oc(r,t,e)||s===0&&oc(r,n,e)||a===0&&oc(t,r,n)||o===0&&oc(t,e,n))}function oc(r,e,t){return e.x<=Math.max(r.x,t.x)&&e.x>=Math.min(r.x,t.x)&&e.y<=Math.max(r.y,t.y)&&e.y>=Math.min(r.y,t.y)}function lc(r){return r>0?1:r<0?-1:0}function av(r,e){let t=r;do{if(t.i!==r.i&&t.next.i!==r.i&&t.i!==e.i&&t.next.i!==e.i&&ig(t,t.next,r,e))return!0;t=t.next}while(t!==r);return!1}function Wo(r,e){return Ht(r.prev,r,r.next)<0?Ht(r,e,r.next)>=0&&Ht(r,r.prev,e)>=0:Ht(r,e,r.prev)<0||Ht(r,r.next,e)<0}function ov(r,e){let t=r,n=!1,i=(r.x+e.x)/2,s=(r.y+e.y)/2;do t.y>s!=t.next.y>s&&t.next.y!==t.y&&i<(t.next.x-t.x)*(s-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==r);return n}function rg(r,e){let t=Ef(r.i,r.x,r.y),n=Ef(e.i,e.x,e.y),i=r.next,s=e.prev;return r.next=e,e.prev=r,t.next=i,i.prev=t,n.next=t,t.prev=n,s.next=n,n.prev=s,n}function cm(r,e,t,n){let i=Ef(r,e,t);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function Xo(r){r.next.prev=r.prev,r.prev.next=r.next,r.prevZ&&(r.prevZ.nextZ=r.nextZ),r.nextZ&&(r.nextZ.prevZ=r.prevZ)}function Ef(r,e,t){return{i:r,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function lv(r,e,t,n){let i=0;for(let s=e,a=t-n;s<t;s+=n)i+=(r[a]-r[s])*(r[s+1]+r[a+1]),a=s;return i}var wf=class{static triangulate(e,t,n=2){return qx(e,t,n)}},Cs=class r{static area(e){let t=e.length,n=0;for(let i=t-1,s=0;s<t;i=s++)n+=e[i].x*e[s].y-e[s].x*e[i].y;return n*.5}static isClockWise(e){return r.area(e)<0}static triangulateShape(e,t){let n=[],i=[],s=[];um(e),hm(n,e);let a=e.length;t.forEach(um);for(let l=0;l<t.length;l++)i.push(a),a+=t[l].length,hm(n,t[l]);let o=wf.triangulate(n,i);for(let l=0;l<o.length;l+=3)s.push(o.slice(l,l+3));return s}};function um(r){let e=r.length;e>2&&r[e-1].equals(r[0])&&r.pop()}function hm(r,e){for(let t=0;t<e.length;t++)r.push(e[t].x),r.push(e[t].y)}var qo=class r extends an{constructor(e=new Fa([new we(.5,.5),new we(-.5,.5),new we(-.5,-.5),new we(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let n=this,i=[],s=[];for(let o=0,l=e.length;o<l;o++){let c=e[o];a(c)}this.setAttribute("position",new Sn(i,3)),this.setAttribute("uv",new Sn(s,2)),this.computeVertexNormals();function a(o){let l=[],c=t.curveSegments!==void 0?t.curveSegments:12,u=t.steps!==void 0?t.steps:1,d=t.depth!==void 0?t.depth:1,h=t.bevelEnabled!==void 0?t.bevelEnabled:!0,f=t.bevelThickness!==void 0?t.bevelThickness:.2,m=t.bevelSize!==void 0?t.bevelSize:f-.1,_=t.bevelOffset!==void 0?t.bevelOffset:0,p=t.bevelSegments!==void 0?t.bevelSegments:3,g=t.extrudePath,S=t.UVGenerator!==void 0?t.UVGenerator:cv,M,x=!1,C,E,w,y;if(g){M=g.getSpacedPoints(u),x=!0,h=!1;let j=g.isCatmullRomCurve3?g.closed:!1;C=g.computeFrenetFrames(u,j),E=new G,w=new G,y=new G}h||(p=0,f=0,m=0,_=0);let b=o.extractPoints(c),P=b.shape,A=b.holes;if(!Cs.isClockWise(P)){P=P.reverse();for(let j=0,oe=A.length;j<oe;j++){let ie=A[j];Cs.isClockWise(ie)&&(A[j]=ie.reverse())}}function z(j){let ie=10000000000000001e-36,B=j[0];for(let me=1;me<=j.length;me++){let We=me%j.length,N=j[We],Ne=N.x-B.x,J=N.y-B.y,le=Ne*Ne+J*J,ae=Math.max(Math.abs(N.x),Math.abs(N.y),Math.abs(B.x),Math.abs(B.y)),Fe=ie*ae*ae;if(le<=Fe){j.splice(We,1),me--;continue}B=N}}z(P),A.forEach(z);let H=A.length,D=P;for(let j=0;j<H;j++){let oe=A[j];P=P.concat(oe)}function F(j,oe,ie){return oe||nt("ExtrudeGeometry: vec does not exist"),j.clone().addScaledVector(oe,ie)}let U=P.length;function Y(j,oe,ie){let B,me,We,N=j.x-oe.x,Ne=j.y-oe.y,J=ie.x-j.x,le=ie.y-j.y,ae=N*N+Ne*Ne,Fe=N*le-Ne*J;if(Math.abs(Fe)>Number.EPSILON){let R=Math.sqrt(ae),v=Math.sqrt(J*J+le*le),V=oe.x-Ne/R,K=oe.y+N/R,re=ie.x-le/v,ue=ie.y+J/v,O=((re-V)*le-(ue-K)*J)/(N*le-Ne*J);B=V+N*O-j.x,me=K+Ne*O-j.y;let Z=B*B+me*me;if(Z<=2)return new we(B,me);We=Math.sqrt(Z/2)}else{let R=!1;N>Number.EPSILON?J>Number.EPSILON&&(R=!0):N<-Number.EPSILON?J<-Number.EPSILON&&(R=!0):Math.sign(Ne)===Math.sign(le)&&(R=!0),R?(B=-Ne,me=N,We=Math.sqrt(ae)):(B=N,me=Ne,We=Math.sqrt(ae/2))}return new we(B/We,me/We)}let Q=[];for(let j=0,oe=D.length,ie=oe-1,B=j+1;j<oe;j++,ie++,B++)ie===oe&&(ie=0),B===oe&&(B=0),Q[j]=Y(D[j],D[ie],D[B]);let L=[],se,Se=Q.concat();for(let j=0,oe=H;j<oe;j++){let ie=A[j];se=[];for(let B=0,me=ie.length,We=me-1,N=B+1;B<me;B++,We++,N++)We===me&&(We=0),N===me&&(N=0),se[B]=Y(ie[B],ie[We],ie[N]);L.push(se),Se=Se.concat(se)}let Le;if(p===0)Le=Cs.triangulateShape(D,A);else{let j=[],oe=[];for(let ie=0;ie<p;ie++){let B=ie/p,me=f*Math.cos(B*Math.PI/2),We=m*Math.sin(B*Math.PI/2)+_;for(let N=0,Ne=D.length;N<Ne;N++){let J=F(D[N],Q[N],We);Me(J.x,J.y,-me),B===0&&j.push(J)}for(let N=0,Ne=H;N<Ne;N++){let J=A[N];se=L[N];let le=[];for(let ae=0,Fe=J.length;ae<Fe;ae++){let R=F(J[ae],se[ae],We);Me(R.x,R.y,-me),B===0&&le.push(R)}B===0&&oe.push(le)}}Le=Cs.triangulateShape(j,oe)}let Oe=Le.length,Be=m+_;for(let j=0;j<U;j++){let oe=h?F(P[j],Se[j],Be):P[j];x?(w.copy(C.normals[0]).multiplyScalar(oe.x),E.copy(C.binormals[0]).multiplyScalar(oe.y),y.copy(M[0]).add(w).add(E),Me(y.x,y.y,y.z)):Me(oe.x,oe.y,0)}for(let j=1;j<=u;j++)for(let oe=0;oe<U;oe++){let ie=h?F(P[oe],Se[oe],Be):P[oe];x?(w.copy(C.normals[j]).multiplyScalar(ie.x),E.copy(C.binormals[j]).multiplyScalar(ie.y),y.copy(M[j]).add(w).add(E),Me(y.x,y.y,y.z)):Me(ie.x,ie.y,d/u*j)}for(let j=p-1;j>=0;j--){let oe=j/p,ie=f*Math.cos(oe*Math.PI/2),B=m*Math.sin(oe*Math.PI/2)+_;for(let me=0,We=D.length;me<We;me++){let N=F(D[me],Q[me],B);Me(N.x,N.y,d+ie)}for(let me=0,We=A.length;me<We;me++){let N=A[me];se=L[me];for(let Ne=0,J=N.length;Ne<J;Ne++){let le=F(N[Ne],se[Ne],B);x?Me(le.x,le.y+M[u-1].y,M[u-1].x+ie):Me(le.x,le.y,d+ie)}}}ee(),ce();function ee(){let j=i.length/3;if(h){let oe=0,ie=U*oe;for(let B=0;B<Oe;B++){let me=Le[B];ke(me[2]+ie,me[1]+ie,me[0]+ie)}oe=u+p*2,ie=U*oe;for(let B=0;B<Oe;B++){let me=Le[B];ke(me[0]+ie,me[1]+ie,me[2]+ie)}}else{for(let oe=0;oe<Oe;oe++){let ie=Le[oe];ke(ie[2],ie[1],ie[0])}for(let oe=0;oe<Oe;oe++){let ie=Le[oe];ke(ie[0]+U*u,ie[1]+U*u,ie[2]+U*u)}}n.addGroup(j,i.length/3-j,0)}function ce(){let j=i.length/3,oe=0;he(D,oe),oe+=D.length;for(let ie=0,B=A.length;ie<B;ie++){let me=A[ie];he(me,oe),oe+=me.length}n.addGroup(j,i.length/3-j,1)}function he(j,oe){let ie=j.length;for(;--ie>=0;){let B=ie,me=ie-1;me<0&&(me=j.length-1);for(let We=0,N=u+p*2;We<N;We++){let Ne=U*We,J=U*(We+1),le=oe+B+Ne,ae=oe+me+Ne,Fe=oe+me+J,R=oe+B+J;Pe(le,ae,Fe,R)}}}function Me(j,oe,ie){l.push(j),l.push(oe),l.push(ie)}function ke(j,oe,ie){qe(j),qe(oe),qe(ie);let B=i.length/3,me=S.generateTopUV(n,i,B-3,B-2,B-1);be(me[0]),be(me[1]),be(me[2])}function Pe(j,oe,ie,B){qe(j),qe(oe),qe(B),qe(oe),qe(ie),qe(B);let me=i.length/3,We=S.generateSideWallUV(n,i,me-6,me-3,me-2,me-1);be(We[0]),be(We[1]),be(We[3]),be(We[1]),be(We[2]),be(We[3])}function qe(j){i.push(l[j*3+0]),i.push(l[j*3+1]),i.push(l[j*3+2])}function be(j){s.push(j.x),s.push(j.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return uv(t,n,e)}static fromJSON(e,t){let n=[];for(let s=0,a=e.shapes.length;s<a;s++){let o=t[e.shapes[s]];n.push(o)}let i=e.options.extrudePath;return i!==void 0&&(e.options.extrudePath=new bf[i.type]().fromJSON(i)),new r(n,e.options)}},cv={generateTopUV:function(r,e,t,n,i){let s=e[t*3],a=e[t*3+1],o=e[n*3],l=e[n*3+1],c=e[i*3],u=e[i*3+1];return[new we(s,a),new we(o,l),new we(c,u)]},generateSideWallUV:function(r,e,t,n,i,s){let a=e[t*3],o=e[t*3+1],l=e[t*3+2],c=e[n*3],u=e[n*3+1],d=e[n*3+2],h=e[i*3],f=e[i*3+1],m=e[i*3+2],_=e[s*3],p=e[s*3+1],g=e[s*3+2];return Math.abs(o-u)<Math.abs(a-c)?[new we(a,1-l),new we(c,1-d),new we(h,1-m),new we(_,1-g)]:[new we(o,1-l),new we(u,1-d),new we(f,1-m),new we(p,1-g)]}};function uv(r,e,t){if(t.shapes=[],Array.isArray(r))for(let n=0,i=r.length;n<i;n++){let s=r[n];t.shapes.push(s.uuid)}else t.shapes.push(r.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}var ln=class r extends an{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};let s=e/2,a=t/2,o=Math.floor(n),l=Math.floor(i),c=o+1,u=l+1,d=e/o,h=t/l,f=[],m=[],_=[],p=[];for(let g=0;g<u;g++){let S=g*h-a;for(let M=0;M<c;M++){let x=M*d-s;m.push(x,-S,0),_.push(0,0,1),p.push(M/o),p.push(1-g/l)}}for(let g=0;g<l;g++)for(let S=0;S<o;S++){let M=S+c*g,x=S+c*(g+1),C=S+1+c*(g+1),E=S+1+c*g;f.push(M,x,E),f.push(x,C,E)}this.setIndex(f),this.setAttribute("position",new Sn(m,3)),this.setAttribute("normal",new Sn(_,3)),this.setAttribute("uv",new Sn(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new r(e.width,e.height,e.widthSegments,e.heightSegments)}};function Bs(r){let e={};for(let t in r){e[t]={};for(let n in r[t]){let i=r[t][n];if(fm(i))i.isRenderTargetTexture?(et("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone();else if(Array.isArray(i))if(fm(i[0])){let s=[];for(let a=0,o=i.length;a<o;a++)s[a]=i[a].clone();e[t][n]=s}else e[t][n]=i.slice();else e[t][n]=i}}return e}function On(r){let e={};for(let t=0;t<r.length;t++){let n=Bs(r[t]);for(let i in n)e[i]=n[i]}return e}function fm(r){return r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)}function hv(r){let e=[];for(let t=0;t<r.length;t++)e.push(r[t].clone());return e}function ed(r){let e=r.getRenderTarget();return e===null?r.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:_t.workingColorSpace}var sg={clone:Bs,merge:On},fv=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,dv=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,en=class extends Mr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=fv,this.fragmentShader=dv,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Bs(e.uniforms),this.uniformsGroups=hv(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let i in this.uniforms){let a=this.uniforms[i].value;a&&a.isTexture?t.uniforms[i]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[i]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[i]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[i]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[i]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[i]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[i]={type:"m4",value:a.toArray()}:t.uniforms[i]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}},Vc=class extends en{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Hc=class extends Mr{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ye(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ye(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Gu,this.normalScale=new we(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Sr,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},tr=class extends Hc{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new we(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return ft(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Ye(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Ye(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Ye(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};var Gc=class extends Mr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Hm,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Wc=class extends Mr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function cc(r,e){return!r||r.constructor===e?r:typeof e.BYTES_PER_ELEMENT=="number"?new e(r):Array.prototype.slice.call(r)}var Qr=class{constructor(e,t,n,i){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,i=t[n],s=t[n-1];n:{e:{let a;t:{i:if(!(e<i)){for(let o=n+2;;){if(i===void 0){if(e<s)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(s=i,i=t[++n],e<i)break e}a=t.length;break t}if(!(e>=s)){let o=t[1];e<o&&(n=2,s=o);for(let l=n-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(i=s,s=t[--n-1],e>=s)break e}a=n,n=0;break t}break n}for(;n<a;){let o=n+a>>>1;e<t[o]?a=o:n=o+1}if(i=t[n],s=t[n-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,s,i)}return this.interpolate_(n,s,e,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,s=e*i;for(let a=0;a!==i;++a)t[a]=n[s+a];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},Xc=class extends Qr{constructor(e,t,n,i){super(e,t,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:xf,endingEnd:xf}}intervalChanged_(e,t,n){let i=this.parameterPositions,s=e-2,a=e+1,o=i[s],l=i[a];if(o===void 0)switch(this.getSettings_().endingStart){case vf:s=e,o=2*t-n;break;case yf:s=i.length-2,o=t+i[s]-i[s+1];break;default:s=e,o=n}if(l===void 0)switch(this.getSettings_().endingEnd){case vf:a=e,l=2*n-t;break;case yf:a=1,l=n+i[1]-i[0];break;default:a=e-1,l=t}let c=(n-t)*.5,u=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(l-n),this._offsetPrev=s*u,this._offsetNext=a*u}interpolate_(e,t,n,i){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,u=this._offsetPrev,d=this._offsetNext,h=this._weightPrev,f=this._weightNext,m=(n-t)/(i-t),_=m*m,p=_*m,g=-h*p+2*h*_-h*m,S=(1+h)*p+(-1.5-2*h)*_+(-.5+h)*m+1,M=(-1-f)*p+(1.5+f)*_+.5*m,x=f*p-f*_;for(let C=0;C!==o;++C)s[C]=g*a[u+C]+S*a[c+C]+M*a[l+C]+x*a[d+C];return s}},qc=class extends Qr{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,u=(n-t)/(i-t),d=1-u;for(let h=0;h!==o;++h)s[h]=a[c+h]*d+a[l+h]*u;return s}},Yc=class extends Qr{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e){return this.copySampleValue_(e-1)}},Zc=class extends Qr{interpolate_(e,t,n,i){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,u=this.settings||this.DefaultSettings_,d=u.inTangents,h=u.outTangents;if(!d||!h){let _=(n-t)/(i-t),p=1-_;for(let g=0;g!==o;++g)s[g]=a[c+g]*p+a[l+g]*_;return s}let f=o*2,m=e-1;for(let _=0;_!==o;++_){let p=a[c+_],g=a[l+_],S=m*f+_*2,M=h[S],x=h[S+1],C=e*f+_*2,E=d[C],w=d[C+1],y=(n-t)/(i-t),b,P,A,I,z;for(let H=0;H<8;H++){b=y*y,P=b*y,A=1-y,I=A*A,z=I*A;let F=z*t+3*I*y*M+3*A*b*E+P*i-n;if(Math.abs(F)<1e-10)break;let U=3*I*(M-t)+6*A*y*(E-M)+3*b*(i-E);if(Math.abs(U)<1e-10)break;y=y-F/U,y=Math.max(0,Math.min(1,y))}s[_]=z*p+3*I*y*x+3*A*b*w+P*g}return s}},mi=class{constructor(e,t,n,i){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=cc(t,this.TimeBufferType),this.values=cc(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:cc(e.times,Array),values:cc(e.values,Array)};let i=e.getInterpolation();i!==e.DefaultInterpolation&&(n.interpolation=i)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Yc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new qc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Xc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new Zc(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.settings=this.settings),t}setInterpolation(e){let t;switch(e){case Co:t=this.InterpolantFactoryMethodDiscrete;break;case Ec:t=this.InterpolantFactoryMethodLinear;break;case fc:t=this.InterpolantFactoryMethodSmooth;break;case _f:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return et("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Co;case this.InterpolantFactoryMethodLinear:return Ec;case this.InterpolantFactoryMethodSmooth:return fc;case this.InterpolantFactoryMethodBezier:return _f}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]*=e}return this}trim(e,t){let n=this.times,i=n.length,s=0,a=i-1;for(;s!==i&&n[s]<e;)++s;for(;a!==-1&&n[a]>t;)--a;if(++a,s!==0||a!==i){s>=a&&(a=Math.max(a,1),s=a-1);let o=this.getValueSize();this.times=n.slice(s,a),this.values=this.values.slice(s*o,a*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(nt("KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,i=this.values,s=n.length;s===0&&(nt("KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==s;o++){let l=n[o];if(typeof l=="number"&&isNaN(l)){nt("KeyframeTrack: Time is not a valid number.",this,o,l),e=!1;break}if(a!==null&&a>l){nt("KeyframeTrack: Out of order keys.",this,o,l,a),e=!1;break}a=l}if(i!==void 0&&rx(i))for(let o=0,l=i.length;o!==l;++o){let c=i[o];if(isNaN(c)){nt("KeyframeTrack: Value is not a valid number.",this,o,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),i=this.getInterpolation()===fc,s=e.length-1,a=1;for(let o=1;o<s;++o){let l=!1,c=e[o],u=e[o+1];if(c!==u&&(o!==1||c!==e[0]))if(i)l=!0;else{let d=o*n,h=d-n,f=d+n;for(let m=0;m!==n;++m){let _=t[d+m];if(_!==t[h+m]||_!==t[f+m]){l=!0;break}}}if(l){if(o!==a){e[a]=e[o];let d=o*n,h=a*n;for(let f=0;f!==n;++f)t[h+f]=t[d+f]}++a}}if(s>0){e[a]=e[s];for(let o=s*n,l=a*n,c=0;c!==n;++c)t[l+c]=t[o+c];++a}return a!==e.length?(this.times=e.slice(0,a),this.values=t.slice(0,a*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,i=new n(this.name,e,t);return i.createInterpolant=this.createInterpolant,i}};mi.prototype.ValueTypeName="";mi.prototype.TimeBufferType=Float32Array;mi.prototype.ValueBufferType=Float32Array;mi.prototype.DefaultInterpolation=Ec;var jr=class extends mi{constructor(e,t,n){super(e,t,n)}};jr.prototype.ValueTypeName="bool";jr.prototype.ValueBufferType=Array;jr.prototype.DefaultInterpolation=Co;jr.prototype.InterpolantFactoryMethodLinear=void 0;jr.prototype.InterpolantFactoryMethodSmooth=void 0;var Jc=class extends mi{constructor(e,t,n,i){super(e,t,n,i)}};Jc.prototype.ValueTypeName="color";var $c=class extends mi{constructor(e,t,n,i){super(e,t,n,i)}};$c.prototype.ValueTypeName="number";var Kc=class extends Qr{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,l=(n-t)/(i-t),c=e*o;for(let u=c+o;c!==u;c+=4)er.slerpFlat(s,0,a,c-o,a,c,l);return s}},Yo=class extends mi{constructor(e,t,n,i){super(e,t,n,i)}InterpolantFactoryMethodLinear(e){return new Kc(this.times,this.values,this.getValueSize(),e)}};Yo.prototype.ValueTypeName="quaternion";Yo.prototype.InterpolantFactoryMethodSmooth=void 0;var es=class extends mi{constructor(e,t,n){super(e,t,n)}};es.prototype.ValueTypeName="string";es.prototype.ValueBufferType=Array;es.prototype.DefaultInterpolation=Co;es.prototype.InterpolantFactoryMethodLinear=void 0;es.prototype.InterpolantFactoryMethodSmooth=void 0;var Qc=class extends mi{constructor(e,t,n,i){super(e,t,n,i)}};Qc.prototype.ValueTypeName="vector";var dc={enabled:!1,files:{},add:function(r,e){this.enabled!==!1&&(dm(r)||(this.files[r]=e))},get:function(r){if(this.enabled!==!1&&!dm(r))return this.files[r]},remove:function(r){delete this.files[r]},clear:function(){this.files={}}};function dm(r){try{let e=r.slice(r.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}var jc=class{constructor(e,t,n){let i=this,s=!1,a=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(u){o++,s===!1&&i.onStart!==void 0&&i.onStart(u,a,o),s=!0},this.itemEnd=function(u){a++,i.onProgress!==void 0&&i.onProgress(u,a,o),a===o&&(s=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(u){i.onError!==void 0&&i.onError(u)},this.resolveURL=function(u){return l?l(u):u},this.setURLModifier=function(u){return l=u,this},this.addHandler=function(u,d){return c.push(u,d),this},this.removeHandler=function(u){let d=c.indexOf(u);return d!==-1&&c.splice(d,2),this},this.getHandler=function(u){for(let d=0,h=c.length;d<h;d+=2){let f=c[d],m=c[d+1];if(f.global&&(f.lastIndex=0),f.test(u))return m}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},ag=new jc,Ba=class{constructor(e){this.manager=e!==void 0?e:ag,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(i,s){n.load(e,i,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};Ba.DEFAULT_MATERIAL_NAME="__DEFAULT";var Ma=new WeakMap,eu=class extends Ba{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let s=this,a=dc.get(`image:${e}`);if(a!==void 0){if(a.complete===!0)s.manager.itemStart(e),setTimeout(function(){t&&t(a),s.manager.itemEnd(e)},0);else{let d=Ma.get(a);d===void 0&&(d=[],Ma.set(a,d)),d.push({onLoad:t,onError:i})}return a}let o=Ca("img");function l(){u(),t&&t(this);let d=Ma.get(this)||[];for(let h=0;h<d.length;h++){let f=d[h];f.onLoad&&f.onLoad(this)}Ma.delete(this),s.manager.itemEnd(e)}function c(d){u(),i&&i(d),dc.remove(`image:${e}`);let h=Ma.get(this)||[];for(let f=0;f<h.length;f++){let m=h[f];m.onError&&m.onError(d)}Ma.delete(this),s.manager.itemError(e),s.manager.itemEnd(e)}function u(){o.removeEventListener("load",l,!1),o.removeEventListener("error",c,!1)}return o.addEventListener("load",l,!1),o.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),dc.add(`image:${e}`,o),s.manager.itemStart(e),o.src=e,o}};var ts=class extends Ba{constructor(e){super(e)}load(e,t,n,i){let s=new wn,a=new eu(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){s.image=o,s.needsUpdate=!0,t!==void 0&&t(s)},n,i),s}},tu=class extends Fn{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ye(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}};var gf=new Nt,pm=new G,mm=new G,Af=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new we(512,512),this.mapType=ii,this.map=null,this.mapPass=null,this.matrix=new Nt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new La,this._frameExtents=new we(1,1),this._viewportCount=1,this._viewports=[new Gt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;pm.setFromMatrixPosition(e.matrixWorld),t.position.copy(pm),mm.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(mm),t.updateMatrixWorld(),gf.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(gf,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===Aa||t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(gf)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},uc=new G,hc=new er,Ji=new G,Tr=class extends Fn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Nt,this.projectionMatrix=new Nt,this.projectionMatrixInverse=new Nt,this.coordinateSystem=zi,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(uc,hc,Ji),Ji.x===1&&Ji.y===1&&Ji.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(uc,hc,Ji.set(1,1,1)).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorld.decompose(uc,hc,Ji),Ji.x===1&&Ji.y===1&&Ji.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(uc,hc,Ji.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Yr=new G,gm=new we,_m=new we,yn=class extends Tr{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Pa*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(To*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Pa*2*Math.atan(Math.tan(To*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Yr.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Yr.x,Yr.y).multiplyScalar(-e/Yr.z),Yr.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Yr.x,Yr.y).multiplyScalar(-e/Yr.z)}getViewSize(e,t){return this.getViewBounds(e,gm,_m),t.subVectors(_m,gm)}setViewOffset(e,t,n,i,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(To*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,s=-.5*i,a=this.view;if(this.view!==null&&this.view.enabled){let l=a.fullWidth,c=a.fullHeight;s+=a.offsetX*i/l,t-=a.offsetY*n/c,i*=a.width/l,n*=a.height/c}let o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}};var ns=class extends Tr{constructor(e=-1,t=1,n=1,i=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2,s=n-e,a=n+e,o=i+t,l=i-t;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,a=s+c*this.view.width,o-=u*this.view.offsetY,l=o-u*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},Cf=class extends Af{constructor(){super(new ns(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},is=class extends tu{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Fn.DEFAULT_UP),this.updateMatrix(),this.target=new Fn,this.shadow=new Cf}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}};var ba=-90,Ta=1,nu=class extends Fn{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let i=new yn(ba,Ta,e,t);i.layers=this.layers,this.add(i);let s=new yn(ba,Ta,e,t);s.layers=this.layers,this.add(s);let a=new yn(ba,Ta,e,t);a.layers=this.layers,this.add(a);let o=new yn(ba,Ta,e,t);o.layers=this.layers,this.add(o);let l=new yn(ba,Ta,e,t);l.layers=this.layers,this.add(l);let c=new yn(ba,Ta,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,i,s,a,o,l]=t;for(let c of t)this.remove(c);if(e===zi)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Aa)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[s,a,o,l,c,u]=this.children,d=e.getRenderTarget(),h=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;let _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let p=!1;e.isWebGLRenderer===!0?p=e.state.buffers.depth.getReversed():p=e.reversedDepthBuffer,e.setRenderTarget(n,0,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,1,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(n,4,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=_,e.setRenderTarget(n,5,i),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,u),e.setRenderTarget(d,h,f),e.xr.enabled=m,n.texture.needsPMREMUpdate=!0}},iu=class extends yn{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}};var td="\\[\\]\\.:\\/",pv=new RegExp("["+td+"]","g"),nd="[^"+td+"]",mv="[^"+td.replace("\\.","")+"]",gv=/((?:WC+[\/:])*)/.source.replace("WC",nd),_v=/(WCOD+)?/.source.replace("WCOD",mv),xv=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",nd),vv=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",nd),yv=new RegExp("^"+gv+_v+xv+vv+"$"),Sv=["material","materials","bones","map"],Rf=class{constructor(e,t,n){let i=n||Ft.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,i)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,s=n.length;i!==s;++i)n[i].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},Ft=class r{constructor(e,t,n){this.path=t,this.parsedPath=n||r.parseTrackName(t),this.node=r.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new r.Composite(e,t,n):new r(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(pv,"")}static parseTrackName(e){let t=yv.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){let s=n.nodeName.substring(i+1);Sv.indexOf(s)!==-1&&(n.nodeName=n.nodeName.substring(0,i),n.objectName=s)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(s){for(let a=0;a<s.length;a++){let o=s[a];if(o.name===t||o.uuid===t)return o;let l=n(o.children);if(l)return l}return null},i=n(e.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)e[t++]=n[i]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,i=t.propertyName,s=t.propertyIndex;if(e||(e=r.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){et("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){nt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){nt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){nt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===c){c=u;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){nt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){nt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){nt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){nt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let a=e[i];if(a===void 0){let c=t.nodeName;nt("PropertyBinding: Trying to update property for track: "+c+"."+i+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?o=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(s!==void 0){if(i==="morphTargetInfluences"){if(!e.geometry){nt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){nt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}l=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=s}else a.fromArray!==void 0&&a.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(l=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=i;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Ft.Composite=Rf;Ft.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Ft.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Ft.prototype.GetterByBindingType=[Ft.prototype._getValue_direct,Ft.prototype._getValue_array,Ft.prototype._getValue_arrayElement,Ft.prototype._getValue_toArray];Ft.prototype.SetterByBindingTypeAndVersioning=[[Ft.prototype._setValue_direct,Ft.prototype._setValue_direct_setNeedsUpdate,Ft.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Ft.prototype._setValue_array,Ft.prototype._setValue_array_setNeedsUpdate,Ft.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Ft.prototype._setValue_arrayElement,Ft.prototype._setValue_arrayElement_setNeedsUpdate,Ft.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Ft.prototype._setValue_fromArray,Ft.prototype._setValue_fromArray_setNeedsUpdate,Ft.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var TE=new Float32Array(1);var Pf=class r{static{r.prototype.isMatrix2=!0}constructor(e,t,n,i){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,i)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,i){let s=this.elements;return s[0]=e,s[2]=t,s[1]=n,s[3]=i,this}};function id(r,e,t,n){let i=Mv(n);switch(t){case Yf:return r*e;case Jf:return r*e/i.components*i.byteLength;case uu:return r*e/i.components*i.byteLength;case os:return r*e*2/i.components*i.byteLength;case hu:return r*e*2/i.components*i.byteLength;case Zf:return r*e*3/i.components*i.byteLength;case Ri:return r*e*4/i.components*i.byteLength;case fu:return r*e*4/i.components*i.byteLength;case Qo:case jo:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*8;case el:case tl:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case pu:case gu:return Math.max(r,16)*Math.max(e,8)/4;case du:case mu:return Math.max(r,8)*Math.max(e,8)/2;case _u:case xu:case yu:case Su:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*8;case vu:case nl:case Mu:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case bu:return Math.floor((r+3)/4)*Math.floor((e+3)/4)*16;case Tu:return Math.floor((r+4)/5)*Math.floor((e+3)/4)*16;case Eu:return Math.floor((r+4)/5)*Math.floor((e+4)/5)*16;case wu:return Math.floor((r+5)/6)*Math.floor((e+4)/5)*16;case Au:return Math.floor((r+5)/6)*Math.floor((e+5)/6)*16;case Cu:return Math.floor((r+7)/8)*Math.floor((e+4)/5)*16;case Ru:return Math.floor((r+7)/8)*Math.floor((e+5)/6)*16;case Pu:return Math.floor((r+7)/8)*Math.floor((e+7)/8)*16;case Iu:return Math.floor((r+9)/10)*Math.floor((e+4)/5)*16;case Du:return Math.floor((r+9)/10)*Math.floor((e+5)/6)*16;case Lu:return Math.floor((r+9)/10)*Math.floor((e+7)/8)*16;case Uu:return Math.floor((r+9)/10)*Math.floor((e+9)/10)*16;case Nu:return Math.floor((r+11)/12)*Math.floor((e+9)/10)*16;case Fu:return Math.floor((r+11)/12)*Math.floor((e+11)/12)*16;case Ou:case Bu:case ku:return Math.ceil(r/4)*Math.ceil(e/4)*16;case zu:case Vu:return Math.ceil(r/4)*Math.ceil(e/4)*8;case il:case Hu:return Math.ceil(r/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Mv(r){switch(r){case ii:case Gf:return{byteLength:1,components:1};case za:case Wf:case gi:return{byteLength:2,components:1};case lu:case cu:return{byteLength:2,components:4};case Hi:case ou:case Gi:return{byteLength:4,components:1};case Xf:case qf:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${r}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"184"}}));typeof window<"u"&&(window.__THREE__?et("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="184");function Rg(){let r=null,e=!1,t=null,n=null;function i(s,a){t(s,a),n=r.requestAnimationFrame(i)}return{start:function(){e!==!0&&t!==null&&r!==null&&(n=r.requestAnimationFrame(i),e=!0)},stop:function(){r!==null&&r.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){r=s}}}function Tv(r){let e=new WeakMap;function t(o,l){let c=o.array,u=o.usage,d=c.byteLength,h=r.createBuffer();r.bindBuffer(l,h),r.bufferData(l,c,u),o.onUploadCallback();let f;if(c instanceof Float32Array)f=r.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=r.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?f=r.HALF_FLOAT:f=r.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=r.SHORT;else if(c instanceof Uint32Array)f=r.UNSIGNED_INT;else if(c instanceof Int32Array)f=r.INT;else if(c instanceof Int8Array)f=r.BYTE;else if(c instanceof Uint8Array)f=r.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=r.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:h,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:d}}function n(o,l,c){let u=l.array,d=l.updateRanges;if(r.bindBuffer(c,o),d.length===0)r.bufferSubData(c,0,u);else{d.sort((f,m)=>f.start-m.start);let h=0;for(let f=1;f<d.length;f++){let m=d[h],_=d[f];_.start<=m.start+m.count+1?m.count=Math.max(m.count,_.start+_.count-m.start):(++h,d[h]=_)}d.length=h+1;for(let f=0,m=d.length;f<m;f++){let _=d[f];r.bufferSubData(c,_.start*u.BYTES_PER_ELEMENT,u,_.start,_.count)}l.clearUpdateRanges()}l.onUploadCallback()}function i(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function s(o){o.isInterleavedBufferAttribute&&(o=o.data);let l=e.get(o);l&&(r.deleteBuffer(l.buffer),e.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let u=e.get(o);(!u||u.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:i,remove:s,update:a}}var Ev=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,wv=`#ifdef USE_ALPHAHASH
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
#endif`,Av=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Cv=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Rv=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Pv=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Iv=`#ifdef USE_AOMAP
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
#endif`,Dv=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Lv=`#ifdef USE_BATCHING
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
#endif`,Uv=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Nv=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Fv=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Ov=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Bv=`#ifdef USE_IRIDESCENCE
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
#endif`,kv=`#ifdef USE_BUMPMAP
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
#endif`,zv=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Vv=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Hv=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Gv=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Wv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Xv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,qv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Yv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,Zv=`#define PI 3.141592653589793
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
} // validated`,Jv=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,$v=`vec3 transformedNormal = objectNormal;
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
#endif`,Kv=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Qv=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,jv=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,ey=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,ty="gl_FragColor = linearToOutputTexel( gl_FragColor );",ny=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,iy=`#ifdef USE_ENVMAP
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
#endif`,ry=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,sy=`#ifdef USE_ENVMAP
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
#endif`,ay=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,oy=`#ifdef USE_ENVMAP
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
#endif`,ly=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,cy=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,uy=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,hy=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,fy=`#ifdef USE_GRADIENTMAP
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
}`,dy=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,py=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,my=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,gy=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,_y=`#ifdef USE_ENVMAP
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
#endif`,xy=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,vy=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,yy=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Sy=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,My=`PhysicalMaterial material;
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
#endif`,by=`uniform sampler2D dfgLUT;
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
}`,Ty=`
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
#endif`,Ey=`#if defined( RE_IndirectDiffuse )
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
#endif`,wy=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ay=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,Cy=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Ry=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Py=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Iy=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Dy=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Ly=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Uy=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Ny=`#if defined( USE_POINTS_UV )
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
#endif`,Fy=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Oy=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,By=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,ky=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,zy=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Vy=`#ifdef USE_MORPHTARGETS
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
#endif`,Hy=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Gy=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,Wy=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Xy=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,qy=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Yy=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Zy=`#ifdef USE_NORMALMAP
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
#endif`,Jy=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,$y=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Ky=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Qy=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,jy=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,eS=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,tS=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,nS=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,iS=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,rS=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,sS=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,aS=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,oS=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,lS=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,cS=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,uS=`float getShadowMask() {
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
}`,hS=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,fS=`#ifdef USE_SKINNING
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
#endif`,dS=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,pS=`#ifdef USE_SKINNING
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
#endif`,mS=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,gS=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,_S=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,xS=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,vS=`#ifdef USE_TRANSMISSION
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
#endif`,yS=`#ifdef USE_TRANSMISSION
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
#endif`,SS=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,MS=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,bS=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,TS=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,ES=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,wS=`uniform sampler2D t2D;
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
}`,AS=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,CS=`#ifdef ENVMAP_TYPE_CUBE
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
}`,RS=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,PS=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,IS=`#include <common>
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
}`,DS=`#if DEPTH_PACKING == 3200
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
}`,LS=`#define DISTANCE
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
}`,US=`#define DISTANCE
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
}`,NS=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,FS=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,OS=`uniform float scale;
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
}`,BS=`uniform vec3 diffuse;
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
}`,kS=`#include <common>
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
}`,zS=`uniform vec3 diffuse;
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
}`,VS=`#define LAMBERT
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
}`,HS=`#define LAMBERT
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
}`,GS=`#define MATCAP
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
}`,WS=`#define MATCAP
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
}`,XS=`#define NORMAL
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
}`,qS=`#define NORMAL
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
}`,YS=`#define PHONG
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
}`,ZS=`#define PHONG
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
}`,JS=`#define STANDARD
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
}`,$S=`#define STANDARD
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
}`,KS=`#define TOON
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
}`,QS=`#define TOON
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
}`,jS=`uniform float size;
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
}`,eM=`uniform vec3 diffuse;
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
}`,tM=`#include <common>
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
}`,nM=`uniform vec3 color;
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
}`,iM=`uniform float rotation;
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
}`,rM=`uniform vec3 diffuse;
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
}`,ct={alphahash_fragment:Ev,alphahash_pars_fragment:wv,alphamap_fragment:Av,alphamap_pars_fragment:Cv,alphatest_fragment:Rv,alphatest_pars_fragment:Pv,aomap_fragment:Iv,aomap_pars_fragment:Dv,batching_pars_vertex:Lv,batching_vertex:Uv,begin_vertex:Nv,beginnormal_vertex:Fv,bsdfs:Ov,iridescence_fragment:Bv,bumpmap_pars_fragment:kv,clipping_planes_fragment:zv,clipping_planes_pars_fragment:Vv,clipping_planes_pars_vertex:Hv,clipping_planes_vertex:Gv,color_fragment:Wv,color_pars_fragment:Xv,color_pars_vertex:qv,color_vertex:Yv,common:Zv,cube_uv_reflection_fragment:Jv,defaultnormal_vertex:$v,displacementmap_pars_vertex:Kv,displacementmap_vertex:Qv,emissivemap_fragment:jv,emissivemap_pars_fragment:ey,colorspace_fragment:ty,colorspace_pars_fragment:ny,envmap_fragment:iy,envmap_common_pars_fragment:ry,envmap_pars_fragment:sy,envmap_pars_vertex:ay,envmap_physical_pars_fragment:_y,envmap_vertex:oy,fog_vertex:ly,fog_pars_vertex:cy,fog_fragment:uy,fog_pars_fragment:hy,gradientmap_pars_fragment:fy,lightmap_pars_fragment:dy,lights_lambert_fragment:py,lights_lambert_pars_fragment:my,lights_pars_begin:gy,lights_toon_fragment:xy,lights_toon_pars_fragment:vy,lights_phong_fragment:yy,lights_phong_pars_fragment:Sy,lights_physical_fragment:My,lights_physical_pars_fragment:by,lights_fragment_begin:Ty,lights_fragment_maps:Ey,lights_fragment_end:wy,lightprobes_pars_fragment:Ay,logdepthbuf_fragment:Cy,logdepthbuf_pars_fragment:Ry,logdepthbuf_pars_vertex:Py,logdepthbuf_vertex:Iy,map_fragment:Dy,map_pars_fragment:Ly,map_particle_fragment:Uy,map_particle_pars_fragment:Ny,metalnessmap_fragment:Fy,metalnessmap_pars_fragment:Oy,morphinstance_vertex:By,morphcolor_vertex:ky,morphnormal_vertex:zy,morphtarget_pars_vertex:Vy,morphtarget_vertex:Hy,normal_fragment_begin:Gy,normal_fragment_maps:Wy,normal_pars_fragment:Xy,normal_pars_vertex:qy,normal_vertex:Yy,normalmap_pars_fragment:Zy,clearcoat_normal_fragment_begin:Jy,clearcoat_normal_fragment_maps:$y,clearcoat_pars_fragment:Ky,iridescence_pars_fragment:Qy,opaque_fragment:jy,packing:eS,premultiplied_alpha_fragment:tS,project_vertex:nS,dithering_fragment:iS,dithering_pars_fragment:rS,roughnessmap_fragment:sS,roughnessmap_pars_fragment:aS,shadowmap_pars_fragment:oS,shadowmap_pars_vertex:lS,shadowmap_vertex:cS,shadowmask_pars_fragment:uS,skinbase_vertex:hS,skinning_pars_vertex:fS,skinning_vertex:dS,skinnormal_vertex:pS,specularmap_fragment:mS,specularmap_pars_fragment:gS,tonemapping_fragment:_S,tonemapping_pars_fragment:xS,transmission_fragment:vS,transmission_pars_fragment:yS,uv_pars_fragment:SS,uv_pars_vertex:MS,uv_vertex:bS,worldpos_vertex:TS,background_vert:ES,background_frag:wS,backgroundCube_vert:AS,backgroundCube_frag:CS,cube_vert:RS,cube_frag:PS,depth_vert:IS,depth_frag:DS,distance_vert:LS,distance_frag:US,equirect_vert:NS,equirect_frag:FS,linedashed_vert:OS,linedashed_frag:BS,meshbasic_vert:kS,meshbasic_frag:zS,meshlambert_vert:VS,meshlambert_frag:HS,meshmatcap_vert:GS,meshmatcap_frag:WS,meshnormal_vert:XS,meshnormal_frag:qS,meshphong_vert:YS,meshphong_frag:ZS,meshphysical_vert:JS,meshphysical_frag:$S,meshtoon_vert:KS,meshtoon_frag:QS,points_vert:jS,points_frag:eM,shadow_vert:tM,shadow_frag:nM,sprite_vert:iM,sprite_frag:rM},De={common:{diffuse:{value:new Ye(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new at},alphaMap:{value:null},alphaMapTransform:{value:new at},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new at}},envmap:{envMap:{value:null},envMapRotation:{value:new at},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new at}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new at}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new at},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new at},normalScale:{value:new we(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new at},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new at}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new at}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new at}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ye(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new G},probesMax:{value:new G},probesResolution:{value:new G}},points:{diffuse:{value:new Ye(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new at},alphaTest:{value:0},uvTransform:{value:new at}},sprite:{diffuse:{value:new Ye(16777215)},opacity:{value:1},center:{value:new we(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new at},alphaMap:{value:null},alphaMapTransform:{value:new at},alphaTest:{value:0}}},rr={basic:{uniforms:On([De.common,De.specularmap,De.envmap,De.aomap,De.lightmap,De.fog]),vertexShader:ct.meshbasic_vert,fragmentShader:ct.meshbasic_frag},lambert:{uniforms:On([De.common,De.specularmap,De.envmap,De.aomap,De.lightmap,De.emissivemap,De.bumpmap,De.normalmap,De.displacementmap,De.fog,De.lights,{emissive:{value:new Ye(0)},envMapIntensity:{value:1}}]),vertexShader:ct.meshlambert_vert,fragmentShader:ct.meshlambert_frag},phong:{uniforms:On([De.common,De.specularmap,De.envmap,De.aomap,De.lightmap,De.emissivemap,De.bumpmap,De.normalmap,De.displacementmap,De.fog,De.lights,{emissive:{value:new Ye(0)},specular:{value:new Ye(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:ct.meshphong_vert,fragmentShader:ct.meshphong_frag},standard:{uniforms:On([De.common,De.envmap,De.aomap,De.lightmap,De.emissivemap,De.bumpmap,De.normalmap,De.displacementmap,De.roughnessmap,De.metalnessmap,De.fog,De.lights,{emissive:{value:new Ye(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ct.meshphysical_vert,fragmentShader:ct.meshphysical_frag},toon:{uniforms:On([De.common,De.aomap,De.lightmap,De.emissivemap,De.bumpmap,De.normalmap,De.displacementmap,De.gradientmap,De.fog,De.lights,{emissive:{value:new Ye(0)}}]),vertexShader:ct.meshtoon_vert,fragmentShader:ct.meshtoon_frag},matcap:{uniforms:On([De.common,De.bumpmap,De.normalmap,De.displacementmap,De.fog,{matcap:{value:null}}]),vertexShader:ct.meshmatcap_vert,fragmentShader:ct.meshmatcap_frag},points:{uniforms:On([De.points,De.fog]),vertexShader:ct.points_vert,fragmentShader:ct.points_frag},dashed:{uniforms:On([De.common,De.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ct.linedashed_vert,fragmentShader:ct.linedashed_frag},depth:{uniforms:On([De.common,De.displacementmap]),vertexShader:ct.depth_vert,fragmentShader:ct.depth_frag},normal:{uniforms:On([De.common,De.bumpmap,De.normalmap,De.displacementmap,{opacity:{value:1}}]),vertexShader:ct.meshnormal_vert,fragmentShader:ct.meshnormal_frag},sprite:{uniforms:On([De.sprite,De.fog]),vertexShader:ct.sprite_vert,fragmentShader:ct.sprite_frag},background:{uniforms:{uvTransform:{value:new at},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ct.background_vert,fragmentShader:ct.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new at}},vertexShader:ct.backgroundCube_vert,fragmentShader:ct.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ct.cube_vert,fragmentShader:ct.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ct.equirect_vert,fragmentShader:ct.equirect_frag},distance:{uniforms:On([De.common,De.displacementmap,{referencePosition:{value:new G},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ct.distance_vert,fragmentShader:ct.distance_frag},shadow:{uniforms:On([De.lights,De.fog,{color:{value:new Ye(0)},opacity:{value:1}}]),vertexShader:ct.shadow_vert,fragmentShader:ct.shadow_frag}};rr.physical={uniforms:On([rr.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new at},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new at},clearcoatNormalScale:{value:new we(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new at},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new at},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new at},sheen:{value:0},sheenColor:{value:new Ye(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new at},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new at},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new at},transmissionSamplerSize:{value:new we},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new at},attenuationDistance:{value:0},attenuationColor:{value:new Ye(0)},specularColor:{value:new Ye(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new at},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new at},anisotropyVector:{value:new we},anisotropyMap:{value:null},anisotropyMapTransform:{value:new at}}]),vertexShader:ct.meshphysical_vert,fragmentShader:ct.meshphysical_frag};var qu={r:0,b:0,g:0},sM=new Nt,Pg=new at;Pg.set(-1,0,0,0,1,0,0,0,1);function aM(r,e,t,n,i,s){let a=new Ye(0),o=i===!0?0:1,l,c,u=null,d=0,h=null;function f(S){let M=S.isScene===!0?S.background:null;if(M&&M.isTexture){let x=S.backgroundBlurriness>0;M=e.get(M,x)}return M}function m(S){let M=!1,x=f(S);x===null?p(a,o):x&&x.isColor&&(p(x,1),M=!0);let C=r.xr.getEnvironmentBlendMode();C==="additive"?t.buffers.color.setClear(0,0,0,1,s):C==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,s),(r.autoClear||M)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),r.clear(r.autoClearColor,r.autoClearDepth,r.autoClearStencil))}function _(S,M){let x=f(M);x&&(x.isCubeTexture||x.mapping===$o)?(c===void 0&&(c=new xt(new Ua(1,1,1),new en({name:"BackgroundCubeMaterial",uniforms:Bs(rr.backgroundCube.uniforms),vertexShader:rr.backgroundCube.vertexShader,fragmentShader:rr.backgroundCube.fragmentShader,side:Yn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(C,E,w){this.matrixWorld.copyPosition(w.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=x,c.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(sM.makeRotationFromEuler(M.backgroundRotation)).transpose(),x.isCubeTexture&&x.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(Pg),c.material.toneMapped=_t.getTransfer(x.colorSpace)!==bt,(u!==x||d!==x.version||h!==r.toneMapping)&&(c.material.needsUpdate=!0,u=x,d=x.version,h=r.toneMapping),c.layers.enableAll(),S.unshift(c,c.geometry,c.material,0,0,null)):x&&x.isTexture&&(l===void 0&&(l=new xt(new ln(2,2),new en({name:"BackgroundMaterial",uniforms:Bs(rr.background.uniforms),vertexShader:rr.background.vertexShader,fragmentShader:rr.background.fragmentShader,side:yr,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=x,l.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,l.material.toneMapped=_t.getTransfer(x.colorSpace)!==bt,x.matrixAutoUpdate===!0&&x.updateMatrix(),l.material.uniforms.uvTransform.value.copy(x.matrix),(u!==x||d!==x.version||h!==r.toneMapping)&&(l.material.needsUpdate=!0,u=x,d=x.version,h=r.toneMapping),l.layers.enableAll(),S.unshift(l,l.geometry,l.material,0,0,null))}function p(S,M){S.getRGB(qu,ed(r)),t.buffers.color.setClear(qu.r,qu.g,qu.b,M,s)}function g(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(S,M=1){a.set(S),o=M,p(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(S){o=S,p(a,o)},render:m,addToRenderList:_,dispose:g}}function oM(r,e){let t=r.getParameter(r.MAX_VERTEX_ATTRIBS),n={},i=h(null),s=i,a=!1;function o(A,I,z,H,D){let F=!1,U=d(A,H,z,I);s!==U&&(s=U,c(s.object)),F=f(A,H,z,D),F&&m(A,H,z,D),D!==null&&e.update(D,r.ELEMENT_ARRAY_BUFFER),(F||a)&&(a=!1,x(A,I,z,H),D!==null&&r.bindBuffer(r.ELEMENT_ARRAY_BUFFER,e.get(D).buffer))}function l(){return r.createVertexArray()}function c(A){return r.bindVertexArray(A)}function u(A){return r.deleteVertexArray(A)}function d(A,I,z,H){let D=H.wireframe===!0,F=n[I.id];F===void 0&&(F={},n[I.id]=F);let U=A.isInstancedMesh===!0?A.id:0,Y=F[U];Y===void 0&&(Y={},F[U]=Y);let Q=Y[z.id];Q===void 0&&(Q={},Y[z.id]=Q);let L=Q[D];return L===void 0&&(L=h(l()),Q[D]=L),L}function h(A){let I=[],z=[],H=[];for(let D=0;D<t;D++)I[D]=0,z[D]=0,H[D]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:I,enabledAttributes:z,attributeDivisors:H,object:A,attributes:{},index:null}}function f(A,I,z,H){let D=s.attributes,F=I.attributes,U=0,Y=z.getAttributes();for(let Q in Y)if(Y[Q].location>=0){let se=D[Q],Se=F[Q];if(Se===void 0&&(Q==="instanceMatrix"&&A.instanceMatrix&&(Se=A.instanceMatrix),Q==="instanceColor"&&A.instanceColor&&(Se=A.instanceColor)),se===void 0||se.attribute!==Se||Se&&se.data!==Se.data)return!0;U++}return s.attributesNum!==U||s.index!==H}function m(A,I,z,H){let D={},F=I.attributes,U=0,Y=z.getAttributes();for(let Q in Y)if(Y[Q].location>=0){let se=F[Q];se===void 0&&(Q==="instanceMatrix"&&A.instanceMatrix&&(se=A.instanceMatrix),Q==="instanceColor"&&A.instanceColor&&(se=A.instanceColor));let Se={};Se.attribute=se,se&&se.data&&(Se.data=se.data),D[Q]=Se,U++}s.attributes=D,s.attributesNum=U,s.index=H}function _(){let A=s.newAttributes;for(let I=0,z=A.length;I<z;I++)A[I]=0}function p(A){g(A,0)}function g(A,I){let z=s.newAttributes,H=s.enabledAttributes,D=s.attributeDivisors;z[A]=1,H[A]===0&&(r.enableVertexAttribArray(A),H[A]=1),D[A]!==I&&(r.vertexAttribDivisor(A,I),D[A]=I)}function S(){let A=s.newAttributes,I=s.enabledAttributes;for(let z=0,H=I.length;z<H;z++)I[z]!==A[z]&&(r.disableVertexAttribArray(z),I[z]=0)}function M(A,I,z,H,D,F,U){U===!0?r.vertexAttribIPointer(A,I,z,D,F):r.vertexAttribPointer(A,I,z,H,D,F)}function x(A,I,z,H){_();let D=H.attributes,F=z.getAttributes(),U=I.defaultAttributeValues;for(let Y in F){let Q=F[Y];if(Q.location>=0){let L=D[Y];if(L===void 0&&(Y==="instanceMatrix"&&A.instanceMatrix&&(L=A.instanceMatrix),Y==="instanceColor"&&A.instanceColor&&(L=A.instanceColor)),L!==void 0){let se=L.normalized,Se=L.itemSize,Le=e.get(L);if(Le===void 0)continue;let Oe=Le.buffer,Be=Le.type,ee=Le.bytesPerElement,ce=Be===r.INT||Be===r.UNSIGNED_INT||L.gpuType===ou;if(L.isInterleavedBufferAttribute){let he=L.data,Me=he.stride,ke=L.offset;if(he.isInstancedInterleavedBuffer){for(let Pe=0;Pe<Q.locationSize;Pe++)g(Q.location+Pe,he.meshPerAttribute);A.isInstancedMesh!==!0&&H._maxInstanceCount===void 0&&(H._maxInstanceCount=he.meshPerAttribute*he.count)}else for(let Pe=0;Pe<Q.locationSize;Pe++)p(Q.location+Pe);r.bindBuffer(r.ARRAY_BUFFER,Oe);for(let Pe=0;Pe<Q.locationSize;Pe++)M(Q.location+Pe,Se/Q.locationSize,Be,se,Me*ee,(ke+Se/Q.locationSize*Pe)*ee,ce)}else{if(L.isInstancedBufferAttribute){for(let he=0;he<Q.locationSize;he++)g(Q.location+he,L.meshPerAttribute);A.isInstancedMesh!==!0&&H._maxInstanceCount===void 0&&(H._maxInstanceCount=L.meshPerAttribute*L.count)}else for(let he=0;he<Q.locationSize;he++)p(Q.location+he);r.bindBuffer(r.ARRAY_BUFFER,Oe);for(let he=0;he<Q.locationSize;he++)M(Q.location+he,Se/Q.locationSize,Be,se,Se*ee,Se/Q.locationSize*he*ee,ce)}}else if(U!==void 0){let se=U[Y];if(se!==void 0)switch(se.length){case 2:r.vertexAttrib2fv(Q.location,se);break;case 3:r.vertexAttrib3fv(Q.location,se);break;case 4:r.vertexAttrib4fv(Q.location,se);break;default:r.vertexAttrib1fv(Q.location,se)}}}}S()}function C(){b();for(let A in n){let I=n[A];for(let z in I){let H=I[z];for(let D in H){let F=H[D];for(let U in F)u(F[U].object),delete F[U];delete H[D]}}delete n[A]}}function E(A){if(n[A.id]===void 0)return;let I=n[A.id];for(let z in I){let H=I[z];for(let D in H){let F=H[D];for(let U in F)u(F[U].object),delete F[U];delete H[D]}}delete n[A.id]}function w(A){for(let I in n){let z=n[I];for(let H in z){let D=z[H];if(D[A.id]===void 0)continue;let F=D[A.id];for(let U in F)u(F[U].object),delete F[U];delete D[A.id]}}}function y(A){for(let I in n){let z=n[I],H=A.isInstancedMesh===!0?A.id:0,D=z[H];if(D!==void 0){for(let F in D){let U=D[F];for(let Y in U)u(U[Y].object),delete U[Y];delete D[F]}delete z[H],Object.keys(z).length===0&&delete n[I]}}}function b(){P(),a=!0,s!==i&&(s=i,c(s.object))}function P(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:o,reset:b,resetDefaultState:P,dispose:C,releaseStatesOfGeometry:E,releaseStatesOfObject:y,releaseStatesOfProgram:w,initAttributes:_,enableAttribute:p,disableUnusedAttributes:S}}function lM(r,e,t){let n;function i(l){n=l}function s(l,c){r.drawArrays(n,l,c),t.update(c,n,1)}function a(l,c,u){u!==0&&(r.drawArraysInstanced(n,l,c,u),t.update(c,n,u))}function o(l,c,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,u);let h=0;for(let f=0;f<u;f++)h+=c[f];t.update(h,n,1)}this.setMode=i,this.render=s,this.renderInstances=a,this.renderMultiDraw=o}function cM(r,e,t,n){let i;function s(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){let w=e.get("EXT_texture_filter_anisotropic");i=r.getParameter(w.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function a(w){return!(w!==Ri&&n.convert(w)!==r.getParameter(r.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(w){let y=w===gi&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(w!==ii&&n.convert(w)!==r.getParameter(r.IMPLEMENTATION_COLOR_READ_TYPE)&&w!==Gi&&!y)}function l(w){if(w==="highp"){if(r.getShaderPrecisionFormat(r.VERTEX_SHADER,r.HIGH_FLOAT).precision>0&&r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.HIGH_FLOAT).precision>0)return"highp";w="mediump"}return w==="mediump"&&r.getShaderPrecisionFormat(r.VERTEX_SHADER,r.MEDIUM_FLOAT).precision>0&&r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp",u=l(c);u!==c&&(et("WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);let d=t.logarithmicDepthBuffer===!0,h=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&h===!1&&et("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=r.getParameter(r.MAX_TEXTURE_IMAGE_UNITS),m=r.getParameter(r.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=r.getParameter(r.MAX_TEXTURE_SIZE),p=r.getParameter(r.MAX_CUBE_MAP_TEXTURE_SIZE),g=r.getParameter(r.MAX_VERTEX_ATTRIBS),S=r.getParameter(r.MAX_VERTEX_UNIFORM_VECTORS),M=r.getParameter(r.MAX_VARYING_VECTORS),x=r.getParameter(r.MAX_FRAGMENT_UNIFORM_VECTORS),C=r.getParameter(r.MAX_SAMPLES),E=r.getParameter(r.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:h,maxTextures:f,maxVertexTextures:m,maxTextureSize:_,maxCubemapSize:p,maxAttributes:g,maxVertexUniforms:S,maxVaryings:M,maxFragmentUniforms:x,maxSamples:C,samples:E}}function uM(r){let e=this,t=null,n=0,i=!1,s=!1,a=new $i,o=new at,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,h){let f=d.length!==0||h||n!==0||i;return i=h,n=d.length,f},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(d,h){t=u(d,h,0)},this.setState=function(d,h,f){let m=d.clippingPlanes,_=d.clipIntersection,p=d.clipShadows,g=r.get(d);if(!i||m===null||m.length===0||s&&!p)s?u(null):c();else{let S=s?0:n,M=S*4,x=g.clippingState||null;l.value=x,x=u(m,h,M,f);for(let C=0;C!==M;++C)x[C]=t[C];g.clippingState=x,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=S}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function u(d,h,f,m){let _=d!==null?d.length:0,p=null;if(_!==0){if(p=l.value,m!==!0||p===null){let g=f+_*4,S=h.matrixWorldInverse;o.getNormalMatrix(S),(p===null||p.length<g)&&(p=new Float32Array(g));for(let M=0,x=f;M!==_;++M,x+=4)a.copy(d[M]).applyMatrix4(S,o),a.normal.toArray(p,x),p[x+3]=a.constant}l.value=p,l.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,p}}var ls=4,og=[.125,.215,.35,.446,.526,.582],ks=20,hM=256,rl=new ns,lg=new Ye,rd=null,sd=0,ad=0,od=!1,fM=new G,Wa=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,i=100,s={}){let{size:a=256,position:o=fM}=s;rd=this._renderer.getRenderTarget(),sd=this._renderer.getActiveCubeFace(),ad=this._renderer.getActiveMipmapLevel(),od=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,i,l,o),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=hg(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=ug(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(rd,sd,ad),this._renderer.xr.enabled=od,e.scissorTest=!1,Ha(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===rs||e.mapping===Fs?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),rd=this._renderer.getRenderTarget(),sd=this._renderer.getActiveCubeFace(),ad=this._renderer.getActiveMipmapLevel(),od=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Ot,minFilter:Ot,generateMipmaps:!1,type:gi,format:Ri,colorSpace:Ro,depthBuffer:!1},i=cg(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=cg(e,t,n);let{_lodMax:s}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=dM(s)),this._blurMaterial=mM(s,e,t),this._ggxMaterial=pM(s,e,t)}return i}_compileMaterial(e){let t=new xt(new an,e);this._renderer.compile(t,rl)}_sceneToCubeUV(e,t,n,i,s){let l=new yn(90,1,t,n),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],d=this._renderer,h=d.autoClear,f=d.toneMapping;d.getClearColor(lg),d.toneMapping=Vi,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(i),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new xt(new Ua,new on({name:"PMREM.Background",side:Yn,depthWrite:!1,depthTest:!1})));let _=this._backgroundBox,p=_.material,g=!1,S=e.background;S?S.isColor&&(p.color.copy(S),e.background=null,g=!0):(p.color.copy(lg),g=!0);for(let M=0;M<6;M++){let x=M%3;x===0?(l.up.set(0,c[M],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x+u[M],s.y,s.z)):x===1?(l.up.set(0,0,c[M]),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y+u[M],s.z)):(l.up.set(0,c[M],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y,s.z+u[M]));let C=this._cubeSize;Ha(i,x*C,M>2?C:0,C,C),d.setRenderTarget(i),g&&d.render(_,l),d.render(e,l)}d.toneMapping=f,d.autoClear=h,e.background=S}_textureToCubeUV(e,t){let n=this._renderer,i=e.mapping===rs||e.mapping===Fs;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=hg()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=ug());let s=i?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=s;let o=s.uniforms;o.envMap.value=e;let l=this._cubeSize;Ha(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(a,rl)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let i=this._lodMeshes.length;for(let s=1;s<i;s++)this._applyGGXFilter(e,s-1,s);t.autoClear=n}_applyGGXFilter(e,t,n){let i=this._renderer,s=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let l=a.uniforms,c=n/(this._lodMeshes.length-1),u=t/(this._lodMeshes.length-1),d=Math.sqrt(c*c-u*u),h=0+c*1.25,f=d*h,{_lodMax:m}=this,_=this._sizeLods[n],p=3*_*(n>m-ls?n-m+ls:0),g=4*(this._cubeSize-_);l.envMap.value=e.texture,l.roughness.value=f,l.mipInt.value=m-t,Ha(s,p,g,3*_,2*_),i.setRenderTarget(s),i.render(o,rl),l.envMap.value=s.texture,l.roughness.value=0,l.mipInt.value=m-n,Ha(e,p,g,3*_,2*_),i.setRenderTarget(e),i.render(o,rl)}_blur(e,t,n,i,s){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,i,"latitudinal",s),this._halfBlur(a,e,n,n,i,"longitudinal",s)}_halfBlur(e,t,n,i,s,a,o){let l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&nt("blur direction must be either latitudinal or longitudinal!");let u=3,d=this._lodMeshes[i];d.material=c;let h=c.uniforms,f=this._sizeLods[n]-1,m=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*ks-1),_=s/m,p=isFinite(s)?1+Math.floor(u*_):ks;p>ks&&et(`sigmaRadians, ${s}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${ks}`);let g=[],S=0;for(let w=0;w<ks;++w){let y=w/_,b=Math.exp(-y*y/2);g.push(b),w===0?S+=b:w<p&&(S+=2*b)}for(let w=0;w<g.length;w++)g[w]=g[w]/S;h.envMap.value=e.texture,h.samples.value=p,h.weights.value=g,h.latitudinal.value=a==="latitudinal",o&&(h.poleAxis.value=o);let{_lodMax:M}=this;h.dTheta.value=m,h.mipInt.value=M-n;let x=this._sizeLods[i],C=3*x*(i>M-ls?i-M+ls:0),E=4*(this._cubeSize-x);Ha(t,C,E,3*x,2*x),l.setRenderTarget(t),l.render(d,rl)}};function dM(r){let e=[],t=[],n=[],i=r,s=r-ls+1+og.length;for(let a=0;a<s;a++){let o=Math.pow(2,i);e.push(o);let l=1/o;a>r-ls?l=og[a-r+ls-1]:a===0&&(l=0),t.push(l);let c=1/(o-2),u=-c,d=1+c,h=[u,u,d,u,d,d,u,u,d,d,u,d],f=6,m=6,_=3,p=2,g=1,S=new Float32Array(_*m*f),M=new Float32Array(p*m*f),x=new Float32Array(g*m*f);for(let E=0;E<f;E++){let w=E%3*2/3-1,y=E>2?0:-1,b=[w,y,0,w+2/3,y,0,w+2/3,y+1,0,w,y,0,w+2/3,y+1,0,w,y+1,0];S.set(b,_*m*E),M.set(h,p*m*E);let P=[E,E,E,E,E,E];x.set(P,g*m*E)}let C=new an;C.setAttribute("position",new sn(S,_)),C.setAttribute("uv",new sn(M,p)),C.setAttribute("faceIndex",new sn(x,g)),n.push(new xt(C,null)),i>ls&&i--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function cg(r,e,t){let n=new bn(r,e,t);return n.texture.mapping=$o,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Ha(r,e,t,n,i){r.viewport.set(e,t,n,i),r.scissor.set(e,t,n,i)}function pM(r,e,t){return new en({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:hM,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${r}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:$u(),fragmentShader:`

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
		`,blending:nr,depthTest:!1,depthWrite:!1})}function mM(r,e,t){let n=new Float32Array(ks),i=new G(0,1,0);return new en({name:"SphericalGaussianBlur",defines:{n:ks,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${r}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:$u(),fragmentShader:`

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
		`,blending:nr,depthTest:!1,depthWrite:!1})}function ug(){return new en({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:$u(),fragmentShader:`

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
		`,blending:nr,depthTest:!1,depthWrite:!1})}function hg(){return new en({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:$u(),fragmentShader:`

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
	`}var Zu=class extends bn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new Oo(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},i=new Ua(5,5,5),s=new en({name:"CubemapFromEquirect",uniforms:Bs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Yn,blending:nr});s.uniforms.tEquirect.value=t;let a=new xt(i,s),o=t.minFilter;return t.minFilter===ss&&(t.minFilter=Ot),new nu(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){let s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,i);e.setRenderTarget(s)}};function gM(r){let e=new WeakMap,t=new WeakMap,n=null;function i(h,f=!1){return h==null?null:f?a(h):s(h)}function s(h){if(h&&h.isTexture){let f=h.mapping;if(f===ru||f===su)if(e.has(h)){let m=e.get(h).texture;return o(m,h.mapping)}else{let m=h.image;if(m&&m.height>0){let _=new Zu(m.height);return _.fromEquirectangularTexture(r,h),e.set(h,_),h.addEventListener("dispose",c),o(_.texture,h.mapping)}else return null}}return h}function a(h){if(h&&h.isTexture){let f=h.mapping,m=f===ru||f===su,_=f===rs||f===Fs;if(m||_){let p=t.get(h),g=p!==void 0?p.texture.pmremVersion:0;if(h.isRenderTargetTexture&&h.pmremVersion!==g)return n===null&&(n=new Wa(r)),p=m?n.fromEquirectangular(h,p):n.fromCubemap(h,p),p.texture.pmremVersion=h.pmremVersion,t.set(h,p),p.texture;if(p!==void 0)return p.texture;{let S=h.image;return m&&S&&S.height>0||_&&S&&l(S)?(n===null&&(n=new Wa(r)),p=m?n.fromEquirectangular(h):n.fromCubemap(h),p.texture.pmremVersion=h.pmremVersion,t.set(h,p),h.addEventListener("dispose",u),p.texture):null}}}return h}function o(h,f){return f===ru?h.mapping=rs:f===su&&(h.mapping=Fs),h}function l(h){let f=0,m=6;for(let _=0;_<m;_++)h[_]!==void 0&&f++;return f===m}function c(h){let f=h.target;f.removeEventListener("dispose",c);let m=e.get(f);m!==void 0&&(e.delete(f),m.dispose())}function u(h){let f=h.target;f.removeEventListener("dispose",u);let m=t.get(f);m!==void 0&&(t.delete(f),m.dispose())}function d(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:d}}function _M(r){let e={};function t(n){if(e[n]!==void 0)return e[n];let i=r.getExtension(n);return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){let i=t(n);return i===null&&wc("WebGLRenderer: "+n+" extension not supported."),i}}}function xM(r,e,t,n){let i={},s=new WeakMap;function a(d){let h=d.target;h.index!==null&&e.remove(h.index);for(let m in h.attributes)e.remove(h.attributes[m]);h.removeEventListener("dispose",a),delete i[h.id];let f=s.get(h);f&&(e.remove(f),s.delete(h)),n.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,t.memory.geometries--}function o(d,h){return i[h.id]===!0||(h.addEventListener("dispose",a),i[h.id]=!0,t.memory.geometries++),h}function l(d){let h=d.attributes;for(let f in h)e.update(h[f],r.ARRAY_BUFFER)}function c(d){let h=[],f=d.index,m=d.attributes.position,_=0;if(m===void 0)return;if(f!==null){let S=f.array;_=f.version;for(let M=0,x=S.length;M<x;M+=3){let C=S[M+0],E=S[M+1],w=S[M+2];h.push(C,E,E,w,w,C)}}else{let S=m.array;_=m.version;for(let M=0,x=S.length/3-1;M<x;M+=3){let C=M+0,E=M+1,w=M+2;h.push(C,E,E,w,w,C)}}let p=new(m.count>=65535?Uo:Lo)(h,1);p.version=_;let g=s.get(d);g&&e.remove(g),s.set(d,p)}function u(d){let h=s.get(d);if(h){let f=d.index;f!==null&&h.version<f.version&&c(d)}else c(d);return s.get(d)}return{get:o,update:l,getWireframeAttribute:u}}function vM(r,e,t){let n;function i(d){n=d}let s,a;function o(d){s=d.type,a=d.bytesPerElement}function l(d,h){r.drawElements(n,h,s,d*a),t.update(h,n,1)}function c(d,h,f){f!==0&&(r.drawElementsInstanced(n,h,s,d*a,f),t.update(h,n,f))}function u(d,h,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,h,0,s,d,0,f);let _=0;for(let p=0;p<f;p++)_+=h[p];t.update(_,n,1)}this.setMode=i,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=u}function yM(r){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,a,o){switch(t.calls++,a){case r.TRIANGLES:t.triangles+=o*(s/3);break;case r.LINES:t.lines+=o*(s/2);break;case r.LINE_STRIP:t.lines+=o*(s-1);break;case r.LINE_LOOP:t.lines+=o*s;break;case r.POINTS:t.points+=o*s;break;default:nt("WebGLInfo: Unknown draw mode:",a);break}}function i(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function SM(r,e,t){let n=new WeakMap,i=new Gt;function s(a,o,l){let c=a.morphTargetInfluences,u=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=u!==void 0?u.length:0,h=n.get(o);if(h===void 0||h.count!==d){let b=function(){w.dispose(),n.delete(o),o.removeEventListener("dispose",b)};h!==void 0&&h.texture.dispose();let f=o.morphAttributes.position!==void 0,m=o.morphAttributes.normal!==void 0,_=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],g=o.morphAttributes.normal||[],S=o.morphAttributes.color||[],M=0;f===!0&&(M=1),m===!0&&(M=2),_===!0&&(M=3);let x=o.attributes.position.count*M,C=1;x>e.maxTextureSize&&(C=Math.ceil(x/e.maxTextureSize),x=e.maxTextureSize);let E=new Float32Array(x*C*4*d),w=new Io(E,x,C,d);w.type=Gi,w.needsUpdate=!0;let y=M*4;for(let P=0;P<d;P++){let A=p[P],I=g[P],z=S[P],H=x*C*4*P;for(let D=0;D<A.count;D++){let F=D*y;f===!0&&(i.fromBufferAttribute(A,D),E[H+F+0]=i.x,E[H+F+1]=i.y,E[H+F+2]=i.z,E[H+F+3]=0),m===!0&&(i.fromBufferAttribute(I,D),E[H+F+4]=i.x,E[H+F+5]=i.y,E[H+F+6]=i.z,E[H+F+7]=0),_===!0&&(i.fromBufferAttribute(z,D),E[H+F+8]=i.x,E[H+F+9]=i.y,E[H+F+10]=i.z,E[H+F+11]=z.itemSize===4?i.w:1)}}h={count:d,texture:w,size:new we(x,C)},n.set(o,h),o.addEventListener("dispose",b)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(r,"morphTexture",a.morphTexture,t);else{let f=0;for(let _=0;_<c.length;_++)f+=c[_];let m=o.morphTargetsRelative?1:1-f;l.getUniforms().setValue(r,"morphTargetBaseInfluence",m),l.getUniforms().setValue(r,"morphTargetInfluences",c)}l.getUniforms().setValue(r,"morphTargetsTexture",h.texture,t),l.getUniforms().setValue(r,"morphTargetsTextureSize",h.size)}return{update:s}}function MM(r,e,t,n,i){let s=new WeakMap;function a(c){let u=i.render.frame,d=c.geometry,h=e.get(c,d);if(s.get(h)!==u&&(e.update(h),s.set(h,u)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),s.get(c)!==u&&(t.update(c.instanceMatrix,r.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,r.ARRAY_BUFFER),s.set(c,u))),c.isSkinnedMesh){let f=c.skeleton;s.get(f)!==u&&(f.update(),s.set(f,u))}return h}function o(){s=new WeakMap}function l(c){let u=c.target;u.removeEventListener("dispose",l),n.releaseStatesOfObject(u),t.remove(u.instanceMatrix),u.instanceColor!==null&&t.remove(u.instanceColor)}return{update:a,dispose:o}}var bM={[Ff]:"LINEAR_TONE_MAPPING",[Of]:"REINHARD_TONE_MAPPING",[Bf]:"CINEON_TONE_MAPPING",[Jo]:"ACES_FILMIC_TONE_MAPPING",[zf]:"AGX_TONE_MAPPING",[Vf]:"NEUTRAL_TONE_MAPPING",[kf]:"CUSTOM_TONE_MAPPING"};function TM(r,e,t,n,i){let s=new bn(e,t,{type:r,depthBuffer:n,stencilBuffer:i,depthTexture:n?new br(e,t):void 0}),a=new bn(e,t,{type:gi,depthBuffer:!1,stencilBuffer:!1}),o=new an;o.setAttribute("position",new Sn([-1,3,0,-1,-1,0,3,-1,0],3)),o.setAttribute("uv",new Sn([0,2,0,0,2,0],2));let l=new Vc({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),c=new xt(o,l),u=new ns(-1,1,1,-1,0,1),d=null,h=null,f=!1,m,_=null,p=[],g=!1;this.setSize=function(S,M){s.setSize(S,M),a.setSize(S,M);for(let x=0;x<p.length;x++){let C=p[x];C.setSize&&C.setSize(S,M)}},this.setEffects=function(S){p=S,g=p.length>0&&p[0].isRenderPass===!0;let M=s.width,x=s.height;for(let C=0;C<p.length;C++){let E=p[C];E.setSize&&E.setSize(M,x)}},this.begin=function(S,M){if(f||S.toneMapping===Vi&&p.length===0)return!1;if(_=M,M!==null){let x=M.width,C=M.height;(s.width!==x||s.height!==C)&&this.setSize(x,C)}return g===!1&&S.setRenderTarget(s),m=S.toneMapping,S.toneMapping=Vi,!0},this.hasRenderPass=function(){return g},this.end=function(S,M){S.toneMapping=m,f=!0;let x=s,C=a;for(let E=0;E<p.length;E++){let w=p[E];if(w.enabled!==!1&&(w.render(S,C,x,M),w.needsSwap!==!1)){let y=x;x=C,C=y}}if(d!==S.outputColorSpace||h!==S.toneMapping){d=S.outputColorSpace,h=S.toneMapping,l.defines={},_t.getTransfer(d)===bt&&(l.defines.SRGB_TRANSFER="");let E=bM[h];E&&(l.defines[E]=""),l.needsUpdate=!0}l.uniforms.tDiffuse.value=x.texture,S.setRenderTarget(_),S.render(c,u),_=null,f=!1},this.isCompositing=function(){return f},this.dispose=function(){s.depthTexture&&s.depthTexture.dispose(),s.dispose(),a.dispose(),o.dispose(),l.dispose()}}var Ig=new wn,ud=new br(1,1),Dg=new Io,Lg=new Rc,Ug=new Oo,fg=[],dg=[],pg=new Float32Array(16),mg=new Float32Array(9),gg=new Float32Array(4);function Xa(r,e,t){let n=r[0];if(n<=0||n>0)return r;let i=e*t,s=fg[i];if(s===void 0&&(s=new Float32Array(i),fg[i]=s),e!==0){n.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,r[a].toArray(s,o)}return s}function fn(r,e){if(r.length!==e.length)return!1;for(let t=0,n=r.length;t<n;t++)if(r[t]!==e[t])return!1;return!0}function dn(r,e){for(let t=0,n=e.length;t<n;t++)r[t]=e[t]}function Ku(r,e){let t=dg[e];t===void 0&&(t=new Int32Array(e),dg[e]=t);for(let n=0;n!==e;++n)t[n]=r.allocateTextureUnit();return t}function EM(r,e){let t=this.cache;t[0]!==e&&(r.uniform1f(this.addr,e),t[0]=e)}function wM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(fn(t,e))return;r.uniform2fv(this.addr,e),dn(t,e)}}function AM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(r.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(fn(t,e))return;r.uniform3fv(this.addr,e),dn(t,e)}}function CM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(fn(t,e))return;r.uniform4fv(this.addr,e),dn(t,e)}}function RM(r,e){let t=this.cache,n=e.elements;if(n===void 0){if(fn(t,e))return;r.uniformMatrix2fv(this.addr,!1,e),dn(t,e)}else{if(fn(t,n))return;gg.set(n),r.uniformMatrix2fv(this.addr,!1,gg),dn(t,n)}}function PM(r,e){let t=this.cache,n=e.elements;if(n===void 0){if(fn(t,e))return;r.uniformMatrix3fv(this.addr,!1,e),dn(t,e)}else{if(fn(t,n))return;mg.set(n),r.uniformMatrix3fv(this.addr,!1,mg),dn(t,n)}}function IM(r,e){let t=this.cache,n=e.elements;if(n===void 0){if(fn(t,e))return;r.uniformMatrix4fv(this.addr,!1,e),dn(t,e)}else{if(fn(t,n))return;pg.set(n),r.uniformMatrix4fv(this.addr,!1,pg),dn(t,n)}}function DM(r,e){let t=this.cache;t[0]!==e&&(r.uniform1i(this.addr,e),t[0]=e)}function LM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(fn(t,e))return;r.uniform2iv(this.addr,e),dn(t,e)}}function UM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(fn(t,e))return;r.uniform3iv(this.addr,e),dn(t,e)}}function NM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(fn(t,e))return;r.uniform4iv(this.addr,e),dn(t,e)}}function FM(r,e){let t=this.cache;t[0]!==e&&(r.uniform1ui(this.addr,e),t[0]=e)}function OM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(fn(t,e))return;r.uniform2uiv(this.addr,e),dn(t,e)}}function BM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(fn(t,e))return;r.uniform3uiv(this.addr,e),dn(t,e)}}function kM(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(fn(t,e))return;r.uniform4uiv(this.addr,e),dn(t,e)}}function zM(r,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i);let s;this.type===r.SAMPLER_2D_SHADOW?(ud.compareFunction=t.isReversedDepthBuffer()?Xu:Wu,s=ud):s=Ig,t.setTexture2D(e||s,i)}function VM(r,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||Lg,i)}function HM(r,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTextureCube(e||Ug,i)}function GM(r,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||Dg,i)}function WM(r){switch(r){case 5126:return EM;case 35664:return wM;case 35665:return AM;case 35666:return CM;case 35674:return RM;case 35675:return PM;case 35676:return IM;case 5124:case 35670:return DM;case 35667:case 35671:return LM;case 35668:case 35672:return UM;case 35669:case 35673:return NM;case 5125:return FM;case 36294:return OM;case 36295:return BM;case 36296:return kM;case 35678:case 36198:case 36298:case 36306:case 35682:return zM;case 35679:case 36299:case 36307:return VM;case 35680:case 36300:case 36308:case 36293:return HM;case 36289:case 36303:case 36311:case 36292:return GM}}function XM(r,e){r.uniform1fv(this.addr,e)}function qM(r,e){let t=Xa(e,this.size,2);r.uniform2fv(this.addr,t)}function YM(r,e){let t=Xa(e,this.size,3);r.uniform3fv(this.addr,t)}function ZM(r,e){let t=Xa(e,this.size,4);r.uniform4fv(this.addr,t)}function JM(r,e){let t=Xa(e,this.size,4);r.uniformMatrix2fv(this.addr,!1,t)}function $M(r,e){let t=Xa(e,this.size,9);r.uniformMatrix3fv(this.addr,!1,t)}function KM(r,e){let t=Xa(e,this.size,16);r.uniformMatrix4fv(this.addr,!1,t)}function QM(r,e){r.uniform1iv(this.addr,e)}function jM(r,e){r.uniform2iv(this.addr,e)}function eb(r,e){r.uniform3iv(this.addr,e)}function tb(r,e){r.uniform4iv(this.addr,e)}function nb(r,e){r.uniform1uiv(this.addr,e)}function ib(r,e){r.uniform2uiv(this.addr,e)}function rb(r,e){r.uniform3uiv(this.addr,e)}function sb(r,e){r.uniform4uiv(this.addr,e)}function ab(r,e,t){let n=this.cache,i=e.length,s=Ku(t,i);fn(n,s)||(r.uniform1iv(this.addr,s),dn(n,s));let a;this.type===r.SAMPLER_2D_SHADOW?a=ud:a=Ig;for(let o=0;o!==i;++o)t.setTexture2D(e[o]||a,s[o])}function ob(r,e,t){let n=this.cache,i=e.length,s=Ku(t,i);fn(n,s)||(r.uniform1iv(this.addr,s),dn(n,s));for(let a=0;a!==i;++a)t.setTexture3D(e[a]||Lg,s[a])}function lb(r,e,t){let n=this.cache,i=e.length,s=Ku(t,i);fn(n,s)||(r.uniform1iv(this.addr,s),dn(n,s));for(let a=0;a!==i;++a)t.setTextureCube(e[a]||Ug,s[a])}function cb(r,e,t){let n=this.cache,i=e.length,s=Ku(t,i);fn(n,s)||(r.uniform1iv(this.addr,s),dn(n,s));for(let a=0;a!==i;++a)t.setTexture2DArray(e[a]||Dg,s[a])}function ub(r){switch(r){case 5126:return XM;case 35664:return qM;case 35665:return YM;case 35666:return ZM;case 35674:return JM;case 35675:return $M;case 35676:return KM;case 5124:case 35670:return QM;case 35667:case 35671:return jM;case 35668:case 35672:return eb;case 35669:case 35673:return tb;case 5125:return nb;case 36294:return ib;case 36295:return rb;case 36296:return sb;case 35678:case 36198:case 36298:case 36306:case 35682:return ab;case 35679:case 36299:case 36307:return ob;case 35680:case 36300:case 36308:case 36293:return lb;case 36289:case 36303:case 36311:case 36292:return cb}}var hd=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=WM(t.type)}},fd=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=ub(t.type)}},dd=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let i=this.seq;for(let s=0,a=i.length;s!==a;++s){let o=i[s];o.setValue(e,t[o.id],n)}}},ld=/(\w+)(\])?(\[|\.)?/g;function _g(r,e){r.seq.push(e),r.map[e.id]=e}function hb(r,e,t){let n=r.name,i=n.length;for(ld.lastIndex=0;;){let s=ld.exec(n),a=ld.lastIndex,o=s[1],l=s[2]==="]",c=s[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===i){_g(t,c===void 0?new hd(o,r,e):new fd(o,r,e));break}else{let d=t.map[o];d===void 0&&(d=new dd(o),_g(t,d)),t=d}}}var Ga=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){let o=e.getActiveUniform(t,a),l=e.getUniformLocation(t,o.name);hb(o,l,this)}let i=[],s=[];for(let a of this.seq)a.type===e.SAMPLER_2D_SHADOW||a.type===e.SAMPLER_CUBE_SHADOW||a.type===e.SAMPLER_2D_ARRAY_SHADOW?i.push(a):s.push(a);i.length>0&&(this.seq=i.concat(s))}setValue(e,t,n,i){let s=this.map[t];s!==void 0&&s.setValue(e,n,i)}setOptional(e,t,n){let i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let s=0,a=t.length;s!==a;++s){let o=t[s],l=n[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,i)}}static seqWithValue(e,t){let n=[];for(let i=0,s=e.length;i!==s;++i){let a=e[i];a.id in t&&n.push(a)}return n}};function xg(r,e,t){let n=r.createShader(e);return r.shaderSource(n,t),r.compileShader(n),n}var fb=37297,db=0;function pb(r,e){let t=r.split(`
`),n=[],i=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let a=i;a<s;a++){let o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}var vg=new at;function mb(r){_t._getMatrix(vg,_t.workingColorSpace,r);let e=`mat3( ${vg.elements.map(t=>t.toFixed(4))} )`;switch(_t.getTransfer(r)){case Po:return[e,"LinearTransferOETF"];case bt:return[e,"sRGBTransferOETF"];default:return et("WebGLProgram: Unsupported color space: ",r),[e,"LinearTransferOETF"]}}function yg(r,e,t){let n=r.getShaderParameter(e,r.COMPILE_STATUS),s=(r.getShaderInfoLog(e)||"").trim();if(n&&s==="")return"";let a=/ERROR: 0:(\d+)/.exec(s);if(a){let o=parseInt(a[1]);return t.toUpperCase()+`

`+s+`

`+pb(r.getShaderSource(e),o)}else return s}function gb(r,e){let t=mb(e);return[`vec4 ${r}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}var _b={[Ff]:"Linear",[Of]:"Reinhard",[Bf]:"Cineon",[Jo]:"ACESFilmic",[zf]:"AgX",[Vf]:"Neutral",[kf]:"Custom"};function xb(r,e){let t=_b[e];return t===void 0?(et("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+r+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+r+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var Yu=new G;function vb(){_t.getLuminanceCoefficients(Yu);let r=Yu.x.toFixed(4),e=Yu.y.toFixed(4),t=Yu.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${r}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function yb(r){return[r.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",r.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(al).join(`
`)}function Sb(r){let e=[];for(let t in r){let n=r[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Mb(r,e){let t={},n=r.getProgramParameter(e,r.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){let s=r.getActiveAttrib(e,i),a=s.name,o=1;s.type===r.FLOAT_MAT2&&(o=2),s.type===r.FLOAT_MAT3&&(o=3),s.type===r.FLOAT_MAT4&&(o=4),t[a]={type:s.type,location:r.getAttribLocation(e,a),locationSize:o}}return t}function al(r){return r!==""}function Sg(r,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return r.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Mg(r,e){return r.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var bb=/^[ \t]*#include +<([\w\d./]+)>/gm;function pd(r){return r.replace(bb,Eb)}var Tb=new Map;function Eb(r,e){let t=ct[e];if(t===void 0){let n=Tb.get(e);if(n!==void 0)t=ct[n],et('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return pd(t)}var wb=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function bg(r){return r.replace(wb,Ab)}function Ab(r,e,t,n){let i="";for(let s=parseInt(e);s<parseInt(t);s++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return i}function Tg(r){let e=`precision ${r.precision} float;
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
#define LOW_PRECISION`),e}var Cb={[Zo]:"SHADOWMAP_TYPE_PCF",[ka]:"SHADOWMAP_TYPE_VSM"};function Rb(r){return Cb[r.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var Pb={[rs]:"ENVMAP_TYPE_CUBE",[Fs]:"ENVMAP_TYPE_CUBE",[$o]:"ENVMAP_TYPE_CUBE_UV"};function Ib(r){return r.envMap===!1?"ENVMAP_TYPE_CUBE":Pb[r.envMapMode]||"ENVMAP_TYPE_CUBE"}var Db={[Fs]:"ENVMAP_MODE_REFRACTION"};function Lb(r){return r.envMap===!1?"ENVMAP_MODE_REFLECTION":Db[r.envMapMode]||"ENVMAP_MODE_REFLECTION"}var Ub={[Nf]:"ENVMAP_BLENDING_MULTIPLY",[km]:"ENVMAP_BLENDING_MIX",[zm]:"ENVMAP_BLENDING_ADD"};function Nb(r){return r.envMap===!1?"ENVMAP_BLENDING_NONE":Ub[r.combine]||"ENVMAP_BLENDING_NONE"}function Fb(r){let e=r.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function Ob(r,e,t,n){let i=r.getContext(),s=t.defines,a=t.vertexShader,o=t.fragmentShader,l=Rb(t),c=Ib(t),u=Lb(t),d=Nb(t),h=Fb(t),f=yb(t),m=Sb(s),_=i.createProgram(),p,g,S=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(al).join(`
`),p.length>0&&(p+=`
`),g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(al).join(`
`),g.length>0&&(g+=`
`)):(p=[Tg(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(al).join(`
`),g=[Tg(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+d:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Vi?"#define TONE_MAPPING":"",t.toneMapping!==Vi?ct.tonemapping_pars_fragment:"",t.toneMapping!==Vi?xb("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",ct.colorspace_pars_fragment,gb("linearToOutputTexel",t.outputColorSpace),vb(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(al).join(`
`)),a=pd(a),a=Sg(a,t),a=Mg(a,t),o=pd(o),o=Sg(o,t),o=Mg(o,t),a=bg(a),o=bg(o),t.isRawShaderMaterial!==!0&&(S=`#version 300 es
`,p=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,g=["#define varying in",t.glslVersion===$f?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===$f?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+g);let M=S+p+a,x=S+g+o,C=xg(i,i.VERTEX_SHADER,M),E=xg(i,i.FRAGMENT_SHADER,x);i.attachShader(_,C),i.attachShader(_,E),t.index0AttributeName!==void 0?i.bindAttribLocation(_,0,t.index0AttributeName):t.morphTargets===!0&&i.bindAttribLocation(_,0,"position"),i.linkProgram(_);function w(A){if(r.debug.checkShaderErrors){let I=i.getProgramInfoLog(_)||"",z=i.getShaderInfoLog(C)||"",H=i.getShaderInfoLog(E)||"",D=I.trim(),F=z.trim(),U=H.trim(),Y=!0,Q=!0;if(i.getProgramParameter(_,i.LINK_STATUS)===!1)if(Y=!1,typeof r.debug.onShaderError=="function")r.debug.onShaderError(i,_,C,E);else{let L=yg(i,C,"vertex"),se=yg(i,E,"fragment");nt("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(_,i.VALIDATE_STATUS)+`

Material Name: `+A.name+`
Material Type: `+A.type+`

Program Info Log: `+D+`
`+L+`
`+se)}else D!==""?et("WebGLProgram: Program Info Log:",D):(F===""||U==="")&&(Q=!1);Q&&(A.diagnostics={runnable:Y,programLog:D,vertexShader:{log:F,prefix:p},fragmentShader:{log:U,prefix:g}})}i.deleteShader(C),i.deleteShader(E),y=new Ga(i,_),b=Mb(i,_)}let y;this.getUniforms=function(){return y===void 0&&w(this),y};let b;this.getAttributes=function(){return b===void 0&&w(this),b};let P=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return P===!1&&(P=i.getProgramParameter(_,fb)),P},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=db++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=C,this.fragmentShader=E,this}var Bb=0,md=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let t=e.vertexShader,n=e.fragmentShader,i=this._getShaderStage(t),s=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(i)===!1&&(a.add(i),i.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new gd(e),t.set(e,n)),n}},gd=class{constructor(e){this.id=Bb++,this.code=e,this.usedTimes=0}};function kb(r){return r===os||r===nl||r===il}function zb(r,e,t,n,i,s){let a=new Do,o=new md,l=new Set,c=[],u=new Map,d=n.logarithmicDepthBuffer,h=n.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(y){return l.add(y),y===0?"uv":`uv${y}`}function _(y,b,P,A,I,z){let H=A.fog,D=I.geometry,F=y.isMeshStandardMaterial||y.isMeshLambertMaterial||y.isMeshPhongMaterial?A.environment:null,U=y.isMeshStandardMaterial||y.isMeshLambertMaterial&&!y.envMap||y.isMeshPhongMaterial&&!y.envMap,Y=e.get(y.envMap||F,U),Q=Y&&Y.mapping===$o?Y.image.height:null,L=f[y.type];y.precision!==null&&(h=n.getMaxPrecision(y.precision),h!==y.precision&&et("WebGLProgram.getParameters:",y.precision,"not supported, using",h,"instead."));let se=D.morphAttributes.position||D.morphAttributes.normal||D.morphAttributes.color,Se=se!==void 0?se.length:0,Le=0;D.morphAttributes.position!==void 0&&(Le=1),D.morphAttributes.normal!==void 0&&(Le=2),D.morphAttributes.color!==void 0&&(Le=3);let Oe,Be,ee,ce;if(L){let ye=rr[L];Oe=ye.vertexShader,Be=ye.fragmentShader}else Oe=y.vertexShader,Be=y.fragmentShader,o.update(y),ee=o.getVertexShaderID(y),ce=o.getFragmentShaderID(y);let he=r.getRenderTarget(),Me=r.state.buffers.depth.getReversed(),ke=I.isInstancedMesh===!0,Pe=I.isBatchedMesh===!0,qe=!!y.map,be=!!y.matcap,j=!!Y,oe=!!y.aoMap,ie=!!y.lightMap,B=!!y.bumpMap,me=!!y.normalMap,We=!!y.displacementMap,N=!!y.emissiveMap,Ne=!!y.metalnessMap,J=!!y.roughnessMap,le=y.anisotropy>0,ae=y.clearcoat>0,Fe=y.dispersion>0,R=y.iridescence>0,v=y.sheen>0,V=y.transmission>0,K=le&&!!y.anisotropyMap,re=ae&&!!y.clearcoatMap,ue=ae&&!!y.clearcoatNormalMap,O=ae&&!!y.clearcoatRoughnessMap,Z=R&&!!y.iridescenceMap,te=R&&!!y.iridescenceThicknessMap,Ee=v&&!!y.sheenColorMap,Ae=v&&!!y.sheenRoughnessMap,xe=!!y.specularMap,ge=!!y.specularColorMap,Te=!!y.specularIntensityMap,je=V&&!!y.transmissionMap,rt=V&&!!y.thicknessMap,k=!!y.gradientMap,_e=!!y.alphaMap,ne=y.alphaTest>0,Re=!!y.alphaHash,ve=!!y.extensions,fe=Vi;y.toneMapped&&(he===null||he.isXRRenderTarget===!0)&&(fe=r.toneMapping);let pe={shaderID:L,shaderType:y.type,shaderName:y.name,vertexShader:Oe,fragmentShader:Be,defines:y.defines,customVertexShaderID:ee,customFragmentShaderID:ce,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:h,batching:Pe,batchingColor:Pe&&I._colorsTexture!==null,instancing:ke,instancingColor:ke&&I.instanceColor!==null,instancingMorph:ke&&I.morphTexture!==null,outputColorSpace:he===null?r.outputColorSpace:he.isXRRenderTarget===!0?he.texture.colorSpace:_t.workingColorSpace,alphaToCoverage:!!y.alphaToCoverage,map:qe,matcap:be,envMap:j,envMapMode:j&&Y.mapping,envMapCubeUVHeight:Q,aoMap:oe,lightMap:ie,bumpMap:B,normalMap:me,displacementMap:We,emissiveMap:N,normalMapObjectSpace:me&&y.normalMapType===Gm,normalMapTangentSpace:me&&y.normalMapType===Gu,packedNormalMap:me&&y.normalMapType===Gu&&kb(y.normalMap.format),metalnessMap:Ne,roughnessMap:J,anisotropy:le,anisotropyMap:K,clearcoat:ae,clearcoatMap:re,clearcoatNormalMap:ue,clearcoatRoughnessMap:O,dispersion:Fe,iridescence:R,iridescenceMap:Z,iridescenceThicknessMap:te,sheen:v,sheenColorMap:Ee,sheenRoughnessMap:Ae,specularMap:xe,specularColorMap:ge,specularIntensityMap:Te,transmission:V,transmissionMap:je,thicknessMap:rt,gradientMap:k,opaque:y.transparent===!1&&y.blending===Rs&&y.alphaToCoverage===!1,alphaMap:_e,alphaTest:ne,alphaHash:Re,combine:y.combine,mapUv:qe&&m(y.map.channel),aoMapUv:oe&&m(y.aoMap.channel),lightMapUv:ie&&m(y.lightMap.channel),bumpMapUv:B&&m(y.bumpMap.channel),normalMapUv:me&&m(y.normalMap.channel),displacementMapUv:We&&m(y.displacementMap.channel),emissiveMapUv:N&&m(y.emissiveMap.channel),metalnessMapUv:Ne&&m(y.metalnessMap.channel),roughnessMapUv:J&&m(y.roughnessMap.channel),anisotropyMapUv:K&&m(y.anisotropyMap.channel),clearcoatMapUv:re&&m(y.clearcoatMap.channel),clearcoatNormalMapUv:ue&&m(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:O&&m(y.clearcoatRoughnessMap.channel),iridescenceMapUv:Z&&m(y.iridescenceMap.channel),iridescenceThicknessMapUv:te&&m(y.iridescenceThicknessMap.channel),sheenColorMapUv:Ee&&m(y.sheenColorMap.channel),sheenRoughnessMapUv:Ae&&m(y.sheenRoughnessMap.channel),specularMapUv:xe&&m(y.specularMap.channel),specularColorMapUv:ge&&m(y.specularColorMap.channel),specularIntensityMapUv:Te&&m(y.specularIntensityMap.channel),transmissionMapUv:je&&m(y.transmissionMap.channel),thicknessMapUv:rt&&m(y.thicknessMap.channel),alphaMapUv:_e&&m(y.alphaMap.channel),vertexTangents:!!D.attributes.tangent&&(me||le),vertexNormals:!!D.attributes.normal,vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!D.attributes.color&&D.attributes.color.itemSize===4,pointsUvs:I.isPoints===!0&&!!D.attributes.uv&&(qe||_e),fog:!!H,useFog:y.fog===!0,fogExp2:!!H&&H.isFogExp2,flatShading:y.wireframe===!1&&(y.flatShading===!0||D.attributes.normal===void 0&&me===!1&&(y.isMeshLambertMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isMeshPhysicalMaterial)),sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:Me,skinning:I.isSkinnedMesh===!0,morphTargets:D.morphAttributes.position!==void 0,morphNormals:D.morphAttributes.normal!==void 0,morphColors:D.morphAttributes.color!==void 0,morphTargetsCount:Se,morphTextureStride:Le,numDirLights:b.directional.length,numPointLights:b.point.length,numSpotLights:b.spot.length,numSpotLightMaps:b.spotLightMap.length,numRectAreaLights:b.rectArea.length,numHemiLights:b.hemi.length,numDirLightShadows:b.directionalShadowMap.length,numPointLightShadows:b.pointShadowMap.length,numSpotLightShadows:b.spotShadowMap.length,numSpotLightShadowsWithMaps:b.numSpotLightShadowsWithMaps,numLightProbes:b.numLightProbes,numLightProbeGrids:z.length,numClippingPlanes:s.numPlanes,numClipIntersection:s.numIntersection,dithering:y.dithering,shadowMapEnabled:r.shadowMap.enabled&&P.length>0,shadowMapType:r.shadowMap.type,toneMapping:fe,decodeVideoTexture:qe&&y.map.isVideoTexture===!0&&_t.getTransfer(y.map.colorSpace)===bt,decodeVideoTextureEmissive:N&&y.emissiveMap.isVideoTexture===!0&&_t.getTransfer(y.emissiveMap.colorSpace)===bt,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===Bt,flipSided:y.side===Yn,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:ve&&y.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ve&&y.extensions.multiDraw===!0||Pe)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return pe.vertexUv1s=l.has(1),pe.vertexUv2s=l.has(2),pe.vertexUv3s=l.has(3),l.clear(),pe}function p(y){let b=[];if(y.shaderID?b.push(y.shaderID):(b.push(y.customVertexShaderID),b.push(y.customFragmentShaderID)),y.defines!==void 0)for(let P in y.defines)b.push(P),b.push(y.defines[P]);return y.isRawShaderMaterial===!1&&(g(b,y),S(b,y),b.push(r.outputColorSpace)),b.push(y.customProgramCacheKey),b.join()}function g(y,b){y.push(b.precision),y.push(b.outputColorSpace),y.push(b.envMapMode),y.push(b.envMapCubeUVHeight),y.push(b.mapUv),y.push(b.alphaMapUv),y.push(b.lightMapUv),y.push(b.aoMapUv),y.push(b.bumpMapUv),y.push(b.normalMapUv),y.push(b.displacementMapUv),y.push(b.emissiveMapUv),y.push(b.metalnessMapUv),y.push(b.roughnessMapUv),y.push(b.anisotropyMapUv),y.push(b.clearcoatMapUv),y.push(b.clearcoatNormalMapUv),y.push(b.clearcoatRoughnessMapUv),y.push(b.iridescenceMapUv),y.push(b.iridescenceThicknessMapUv),y.push(b.sheenColorMapUv),y.push(b.sheenRoughnessMapUv),y.push(b.specularMapUv),y.push(b.specularColorMapUv),y.push(b.specularIntensityMapUv),y.push(b.transmissionMapUv),y.push(b.thicknessMapUv),y.push(b.combine),y.push(b.fogExp2),y.push(b.sizeAttenuation),y.push(b.morphTargetsCount),y.push(b.morphAttributeCount),y.push(b.numDirLights),y.push(b.numPointLights),y.push(b.numSpotLights),y.push(b.numSpotLightMaps),y.push(b.numHemiLights),y.push(b.numRectAreaLights),y.push(b.numDirLightShadows),y.push(b.numPointLightShadows),y.push(b.numSpotLightShadows),y.push(b.numSpotLightShadowsWithMaps),y.push(b.numLightProbes),y.push(b.shadowMapType),y.push(b.toneMapping),y.push(b.numClippingPlanes),y.push(b.numClipIntersection),y.push(b.depthPacking)}function S(y,b){a.disableAll(),b.instancing&&a.enable(0),b.instancingColor&&a.enable(1),b.instancingMorph&&a.enable(2),b.matcap&&a.enable(3),b.envMap&&a.enable(4),b.normalMapObjectSpace&&a.enable(5),b.normalMapTangentSpace&&a.enable(6),b.clearcoat&&a.enable(7),b.iridescence&&a.enable(8),b.alphaTest&&a.enable(9),b.vertexColors&&a.enable(10),b.vertexAlphas&&a.enable(11),b.vertexUv1s&&a.enable(12),b.vertexUv2s&&a.enable(13),b.vertexUv3s&&a.enable(14),b.vertexTangents&&a.enable(15),b.anisotropy&&a.enable(16),b.alphaHash&&a.enable(17),b.batching&&a.enable(18),b.dispersion&&a.enable(19),b.batchingColor&&a.enable(20),b.gradientMap&&a.enable(21),b.packedNormalMap&&a.enable(22),b.vertexNormals&&a.enable(23),y.push(a.mask),a.disableAll(),b.fog&&a.enable(0),b.useFog&&a.enable(1),b.flatShading&&a.enable(2),b.logarithmicDepthBuffer&&a.enable(3),b.reversedDepthBuffer&&a.enable(4),b.skinning&&a.enable(5),b.morphTargets&&a.enable(6),b.morphNormals&&a.enable(7),b.morphColors&&a.enable(8),b.premultipliedAlpha&&a.enable(9),b.shadowMapEnabled&&a.enable(10),b.doubleSided&&a.enable(11),b.flipSided&&a.enable(12),b.useDepthPacking&&a.enable(13),b.dithering&&a.enable(14),b.transmission&&a.enable(15),b.sheen&&a.enable(16),b.opaque&&a.enable(17),b.pointsUvs&&a.enable(18),b.decodeVideoTexture&&a.enable(19),b.decodeVideoTextureEmissive&&a.enable(20),b.alphaToCoverage&&a.enable(21),b.numLightProbeGrids>0&&a.enable(22),y.push(a.mask)}function M(y){let b=f[y.type],P;if(b){let A=rr[b];P=sg.clone(A.uniforms)}else P=y.uniforms;return P}function x(y,b){let P=u.get(b);return P!==void 0?++P.usedTimes:(P=new Ob(r,b,y,i),c.push(P),u.set(b,P)),P}function C(y){if(--y.usedTimes===0){let b=c.indexOf(y);c[b]=c[c.length-1],c.pop(),u.delete(y.cacheKey),y.destroy()}}function E(y){o.remove(y)}function w(){o.dispose()}return{getParameters:_,getProgramCacheKey:p,getUniforms:M,acquireProgram:x,releaseProgram:C,releaseShaderCache:E,programs:c,dispose:w}}function Vb(){let r=new WeakMap;function e(a){return r.has(a)}function t(a){let o=r.get(a);return o===void 0&&(o={},r.set(a,o)),o}function n(a){r.delete(a)}function i(a,o,l){r.get(a)[o]=l}function s(){r=new WeakMap}return{has:e,get:t,remove:n,update:i,dispose:s}}function Hb(r,e){return r.groupOrder!==e.groupOrder?r.groupOrder-e.groupOrder:r.renderOrder!==e.renderOrder?r.renderOrder-e.renderOrder:r.material.id!==e.material.id?r.material.id-e.material.id:r.materialVariant!==e.materialVariant?r.materialVariant-e.materialVariant:r.z!==e.z?r.z-e.z:r.id-e.id}function Eg(r,e){return r.groupOrder!==e.groupOrder?r.groupOrder-e.groupOrder:r.renderOrder!==e.renderOrder?r.renderOrder-e.renderOrder:r.z!==e.z?e.z-r.z:r.id-e.id}function wg(){let r=[],e=0,t=[],n=[],i=[];function s(){e=0,t.length=0,n.length=0,i.length=0}function a(h){let f=0;return h.isInstancedMesh&&(f+=2),h.isSkinnedMesh&&(f+=1),f}function o(h,f,m,_,p,g){let S=r[e];return S===void 0?(S={id:h.id,object:h,geometry:f,material:m,materialVariant:a(h),groupOrder:_,renderOrder:h.renderOrder,z:p,group:g},r[e]=S):(S.id=h.id,S.object=h,S.geometry=f,S.material=m,S.materialVariant=a(h),S.groupOrder=_,S.renderOrder=h.renderOrder,S.z=p,S.group=g),e++,S}function l(h,f,m,_,p,g){let S=o(h,f,m,_,p,g);m.transmission>0?n.push(S):m.transparent===!0?i.push(S):t.push(S)}function c(h,f,m,_,p,g){let S=o(h,f,m,_,p,g);m.transmission>0?n.unshift(S):m.transparent===!0?i.unshift(S):t.unshift(S)}function u(h,f){t.length>1&&t.sort(h||Hb),n.length>1&&n.sort(f||Eg),i.length>1&&i.sort(f||Eg)}function d(){for(let h=e,f=r.length;h<f;h++){let m=r[h];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:n,transparent:i,init:s,push:l,unshift:c,finish:d,sort:u}}function Gb(){let r=new WeakMap;function e(n,i){let s=r.get(n),a;return s===void 0?(a=new wg,r.set(n,[a])):i>=s.length?(a=new wg,s.push(a)):a=s[i],a}function t(){r=new WeakMap}return{get:e,dispose:t}}function Wb(){let r={};return{get:function(e){if(r[e.id]!==void 0)return r[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new G,color:new Ye};break;case"SpotLight":t={position:new G,direction:new G,color:new Ye,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new G,color:new Ye,distance:0,decay:0};break;case"HemisphereLight":t={direction:new G,skyColor:new Ye,groundColor:new Ye};break;case"RectAreaLight":t={color:new Ye,position:new G,halfWidth:new G,halfHeight:new G};break}return r[e.id]=t,t}}}function Xb(){let r={};return{get:function(e){if(r[e.id]!==void 0)return r[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new we,shadowCameraNear:1,shadowCameraFar:1e3};break}return r[e.id]=t,t}}}var qb=0;function Yb(r,e){return(e.castShadow?2:0)-(r.castShadow?2:0)+(e.map?1:0)-(r.map?1:0)}function Zb(r){let e=new Wb,t=Xb(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new G);let i=new G,s=new Nt,a=new Nt;function o(c){let u=0,d=0,h=0;for(let b=0;b<9;b++)n.probe[b].set(0,0,0);let f=0,m=0,_=0,p=0,g=0,S=0,M=0,x=0,C=0,E=0,w=0;c.sort(Yb);for(let b=0,P=c.length;b<P;b++){let A=c[b],I=A.color,z=A.intensity,H=A.distance,D=null;if(A.shadow&&A.shadow.map&&(A.shadow.map.texture.format===os?D=A.shadow.map.texture:D=A.shadow.map.depthTexture||A.shadow.map.texture),A.isAmbientLight)u+=I.r*z,d+=I.g*z,h+=I.b*z;else if(A.isLightProbe){for(let F=0;F<9;F++)n.probe[F].addScaledVector(A.sh.coefficients[F],z);w++}else if(A.isDirectionalLight){let F=e.get(A);if(F.color.copy(A.color).multiplyScalar(A.intensity),A.castShadow){let U=A.shadow,Y=t.get(A);Y.shadowIntensity=U.intensity,Y.shadowBias=U.bias,Y.shadowNormalBias=U.normalBias,Y.shadowRadius=U.radius,Y.shadowMapSize=U.mapSize,n.directionalShadow[f]=Y,n.directionalShadowMap[f]=D,n.directionalShadowMatrix[f]=A.shadow.matrix,S++}n.directional[f]=F,f++}else if(A.isSpotLight){let F=e.get(A);F.position.setFromMatrixPosition(A.matrixWorld),F.color.copy(I).multiplyScalar(z),F.distance=H,F.coneCos=Math.cos(A.angle),F.penumbraCos=Math.cos(A.angle*(1-A.penumbra)),F.decay=A.decay,n.spot[_]=F;let U=A.shadow;if(A.map&&(n.spotLightMap[C]=A.map,C++,U.updateMatrices(A),A.castShadow&&E++),n.spotLightMatrix[_]=U.matrix,A.castShadow){let Y=t.get(A);Y.shadowIntensity=U.intensity,Y.shadowBias=U.bias,Y.shadowNormalBias=U.normalBias,Y.shadowRadius=U.radius,Y.shadowMapSize=U.mapSize,n.spotShadow[_]=Y,n.spotShadowMap[_]=D,x++}_++}else if(A.isRectAreaLight){let F=e.get(A);F.color.copy(I).multiplyScalar(z),F.halfWidth.set(A.width*.5,0,0),F.halfHeight.set(0,A.height*.5,0),n.rectArea[p]=F,p++}else if(A.isPointLight){let F=e.get(A);if(F.color.copy(A.color).multiplyScalar(A.intensity),F.distance=A.distance,F.decay=A.decay,A.castShadow){let U=A.shadow,Y=t.get(A);Y.shadowIntensity=U.intensity,Y.shadowBias=U.bias,Y.shadowNormalBias=U.normalBias,Y.shadowRadius=U.radius,Y.shadowMapSize=U.mapSize,Y.shadowCameraNear=U.camera.near,Y.shadowCameraFar=U.camera.far,n.pointShadow[m]=Y,n.pointShadowMap[m]=D,n.pointShadowMatrix[m]=A.shadow.matrix,M++}n.point[m]=F,m++}else if(A.isHemisphereLight){let F=e.get(A);F.skyColor.copy(A.color).multiplyScalar(z),F.groundColor.copy(A.groundColor).multiplyScalar(z),n.hemi[g]=F,g++}}p>0&&(r.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=De.LTC_FLOAT_1,n.rectAreaLTC2=De.LTC_FLOAT_2):(n.rectAreaLTC1=De.LTC_HALF_1,n.rectAreaLTC2=De.LTC_HALF_2)),n.ambient[0]=u,n.ambient[1]=d,n.ambient[2]=h;let y=n.hash;(y.directionalLength!==f||y.pointLength!==m||y.spotLength!==_||y.rectAreaLength!==p||y.hemiLength!==g||y.numDirectionalShadows!==S||y.numPointShadows!==M||y.numSpotShadows!==x||y.numSpotMaps!==C||y.numLightProbes!==w)&&(n.directional.length=f,n.spot.length=_,n.rectArea.length=p,n.point.length=m,n.hemi.length=g,n.directionalShadow.length=S,n.directionalShadowMap.length=S,n.pointShadow.length=M,n.pointShadowMap.length=M,n.spotShadow.length=x,n.spotShadowMap.length=x,n.directionalShadowMatrix.length=S,n.pointShadowMatrix.length=M,n.spotLightMatrix.length=x+C-E,n.spotLightMap.length=C,n.numSpotLightShadowsWithMaps=E,n.numLightProbes=w,y.directionalLength=f,y.pointLength=m,y.spotLength=_,y.rectAreaLength=p,y.hemiLength=g,y.numDirectionalShadows=S,y.numPointShadows=M,y.numSpotShadows=x,y.numSpotMaps=C,y.numLightProbes=w,n.version=qb++)}function l(c,u){let d=0,h=0,f=0,m=0,_=0,p=u.matrixWorldInverse;for(let g=0,S=c.length;g<S;g++){let M=c[g];if(M.isDirectionalLight){let x=n.directional[d];x.direction.setFromMatrixPosition(M.matrixWorld),i.setFromMatrixPosition(M.target.matrixWorld),x.direction.sub(i),x.direction.transformDirection(p),d++}else if(M.isSpotLight){let x=n.spot[f];x.position.setFromMatrixPosition(M.matrixWorld),x.position.applyMatrix4(p),x.direction.setFromMatrixPosition(M.matrixWorld),i.setFromMatrixPosition(M.target.matrixWorld),x.direction.sub(i),x.direction.transformDirection(p),f++}else if(M.isRectAreaLight){let x=n.rectArea[m];x.position.setFromMatrixPosition(M.matrixWorld),x.position.applyMatrix4(p),a.identity(),s.copy(M.matrixWorld),s.premultiply(p),a.extractRotation(s),x.halfWidth.set(M.width*.5,0,0),x.halfHeight.set(0,M.height*.5,0),x.halfWidth.applyMatrix4(a),x.halfHeight.applyMatrix4(a),m++}else if(M.isPointLight){let x=n.point[h];x.position.setFromMatrixPosition(M.matrixWorld),x.position.applyMatrix4(p),h++}else if(M.isHemisphereLight){let x=n.hemi[_];x.direction.setFromMatrixPosition(M.matrixWorld),x.direction.transformDirection(p),_++}}}return{setup:o,setupView:l,state:n}}function Ag(r){let e=new Zb(r),t=[],n=[],i=[];function s(h){d.camera=h,t.length=0,n.length=0,i.length=0}function a(h){t.push(h)}function o(h){n.push(h)}function l(h){i.push(h)}function c(){e.setup(t)}function u(h){e.setupView(t,h)}let d={lightsArray:t,shadowsArray:n,lightProbeGridArray:i,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:s,state:d,setupLights:c,setupLightsView:u,pushLight:a,pushShadow:o,pushLightProbeGrid:l}}function Jb(r){let e=new WeakMap;function t(i,s=0){let a=e.get(i),o;return a===void 0?(o=new Ag(r),e.set(i,[o])):s>=a.length?(o=new Ag(r),a.push(o)):o=a[s],o}function n(){e=new WeakMap}return{get:t,dispose:n}}var $b=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Kb=`uniform sampler2D shadow_pass;
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
}`,Qb=[new G(1,0,0),new G(-1,0,0),new G(0,1,0),new G(0,-1,0),new G(0,0,1),new G(0,0,-1)],jb=[new G(0,-1,0),new G(0,-1,0),new G(0,0,1),new G(0,0,-1),new G(0,-1,0),new G(0,-1,0)],Cg=new Nt,sl=new G,cd=new G;function e1(r,e,t){let n=new La,i=new we,s=new we,a=new Gt,o=new Gc,l=new Wc,c={},u=t.maxTextureSize,d={[yr]:Yn,[Yn]:yr,[Bt]:Bt},h=new en({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new we},radius:{value:4}},vertexShader:$b,fragmentShader:Kb}),f=h.clone();f.defines.HORIZONTAL_PASS=1;let m=new an;m.setAttribute("position",new sn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new xt(m,h),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Zo;let g=this.type;this.render=function(E,w,y){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||E.length===0)return;this.type===ym&&(et("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Zo);let b=r.getRenderTarget(),P=r.getActiveCubeFace(),A=r.getActiveMipmapLevel(),I=r.state;I.setBlending(nr),I.buffers.depth.getReversed()===!0?I.buffers.color.setClear(0,0,0,0):I.buffers.color.setClear(1,1,1,1),I.buffers.depth.setTest(!0),I.setScissorTest(!1);let z=g!==this.type;z&&w.traverse(function(H){H.material&&(Array.isArray(H.material)?H.material.forEach(D=>D.needsUpdate=!0):H.material.needsUpdate=!0)});for(let H=0,D=E.length;H<D;H++){let F=E[H],U=F.shadow;if(U===void 0){et("WebGLShadowMap:",F,"has no shadow.");continue}if(U.autoUpdate===!1&&U.needsUpdate===!1)continue;i.copy(U.mapSize);let Y=U.getFrameExtents();i.multiply(Y),s.copy(U.mapSize),(i.x>u||i.y>u)&&(i.x>u&&(s.x=Math.floor(u/Y.x),i.x=s.x*Y.x,U.mapSize.x=s.x),i.y>u&&(s.y=Math.floor(u/Y.y),i.y=s.y*Y.y,U.mapSize.y=s.y));let Q=r.state.buffers.depth.getReversed();if(U.camera._reversedDepth=Q,U.map===null||z===!0){if(U.map!==null&&(U.map.depthTexture!==null&&(U.map.depthTexture.dispose(),U.map.depthTexture=null),U.map.dispose()),this.type===ka){if(F.isPointLight){et("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}U.map=new bn(i.x,i.y,{format:os,type:gi,minFilter:Ot,magFilter:Ot,generateMipmaps:!1}),U.map.texture.name=F.name+".shadowMap",U.map.depthTexture=new br(i.x,i.y,Gi),U.map.depthTexture.name=F.name+".shadowMapDepth",U.map.depthTexture.format=Qi,U.map.depthTexture.compareFunction=null,U.map.depthTexture.minFilter=Mn,U.map.depthTexture.magFilter=Mn}else F.isPointLight?(U.map=new Zu(i.x),U.map.depthTexture=new Uc(i.x,Hi)):(U.map=new bn(i.x,i.y),U.map.depthTexture=new br(i.x,i.y,Hi)),U.map.depthTexture.name=F.name+".shadowMap",U.map.depthTexture.format=Qi,this.type===Zo?(U.map.depthTexture.compareFunction=Q?Xu:Wu,U.map.depthTexture.minFilter=Ot,U.map.depthTexture.magFilter=Ot):(U.map.depthTexture.compareFunction=null,U.map.depthTexture.minFilter=Mn,U.map.depthTexture.magFilter=Mn);U.camera.updateProjectionMatrix()}let L=U.map.isWebGLCubeRenderTarget?6:1;for(let se=0;se<L;se++){if(U.map.isWebGLCubeRenderTarget)r.setRenderTarget(U.map,se),r.clear();else{se===0&&(r.setRenderTarget(U.map),r.clear());let Se=U.getViewport(se);a.set(s.x*Se.x,s.y*Se.y,s.x*Se.z,s.y*Se.w),I.viewport(a)}if(F.isPointLight){let Se=U.camera,Le=U.matrix,Oe=F.distance||Se.far;Oe!==Se.far&&(Se.far=Oe,Se.updateProjectionMatrix()),sl.setFromMatrixPosition(F.matrixWorld),Se.position.copy(sl),cd.copy(Se.position),cd.add(Qb[se]),Se.up.copy(jb[se]),Se.lookAt(cd),Se.updateMatrixWorld(),Le.makeTranslation(-sl.x,-sl.y,-sl.z),Cg.multiplyMatrices(Se.projectionMatrix,Se.matrixWorldInverse),U._frustum.setFromProjectionMatrix(Cg,Se.coordinateSystem,Se.reversedDepth)}else U.updateMatrices(F);n=U.getFrustum(),x(w,y,U.camera,F,this.type)}U.isPointLightShadow!==!0&&this.type===ka&&S(U,y),U.needsUpdate=!1}g=this.type,p.needsUpdate=!1,r.setRenderTarget(b,P,A)};function S(E,w){let y=e.update(_);h.defines.VSM_SAMPLES!==E.blurSamples&&(h.defines.VSM_SAMPLES=E.blurSamples,f.defines.VSM_SAMPLES=E.blurSamples,h.needsUpdate=!0,f.needsUpdate=!0),E.mapPass===null&&(E.mapPass=new bn(i.x,i.y,{format:os,type:gi})),h.uniforms.shadow_pass.value=E.map.depthTexture,h.uniforms.resolution.value=E.mapSize,h.uniforms.radius.value=E.radius,r.setRenderTarget(E.mapPass),r.clear(),r.renderBufferDirect(w,null,y,h,_,null),f.uniforms.shadow_pass.value=E.mapPass.texture,f.uniforms.resolution.value=E.mapSize,f.uniforms.radius.value=E.radius,r.setRenderTarget(E.map),r.clear(),r.renderBufferDirect(w,null,y,f,_,null)}function M(E,w,y,b){let P=null,A=y.isPointLight===!0?E.customDistanceMaterial:E.customDepthMaterial;if(A!==void 0)P=A;else if(P=y.isPointLight===!0?l:o,r.localClippingEnabled&&w.clipShadows===!0&&Array.isArray(w.clippingPlanes)&&w.clippingPlanes.length!==0||w.displacementMap&&w.displacementScale!==0||w.alphaMap&&w.alphaTest>0||w.map&&w.alphaTest>0||w.alphaToCoverage===!0){let I=P.uuid,z=w.uuid,H=c[I];H===void 0&&(H={},c[I]=H);let D=H[z];D===void 0&&(D=P.clone(),H[z]=D,w.addEventListener("dispose",C)),P=D}if(P.visible=w.visible,P.wireframe=w.wireframe,b===ka?P.side=w.shadowSide!==null?w.shadowSide:w.side:P.side=w.shadowSide!==null?w.shadowSide:d[w.side],P.alphaMap=w.alphaMap,P.alphaTest=w.alphaToCoverage===!0?.5:w.alphaTest,P.map=w.map,P.clipShadows=w.clipShadows,P.clippingPlanes=w.clippingPlanes,P.clipIntersection=w.clipIntersection,P.displacementMap=w.displacementMap,P.displacementScale=w.displacementScale,P.displacementBias=w.displacementBias,P.wireframeLinewidth=w.wireframeLinewidth,P.linewidth=w.linewidth,y.isPointLight===!0&&P.isMeshDistanceMaterial===!0){let I=r.properties.get(P);I.light=y}return P}function x(E,w,y,b,P){if(E.visible===!1)return;if(E.layers.test(w.layers)&&(E.isMesh||E.isLine||E.isPoints)&&(E.castShadow||E.receiveShadow&&P===ka)&&(!E.frustumCulled||n.intersectsObject(E))){E.modelViewMatrix.multiplyMatrices(y.matrixWorldInverse,E.matrixWorld);let z=e.update(E),H=E.material;if(Array.isArray(H)){let D=z.groups;for(let F=0,U=D.length;F<U;F++){let Y=D[F],Q=H[Y.materialIndex];if(Q&&Q.visible){let L=M(E,Q,b,P);E.onBeforeShadow(r,E,w,y,z,L,Y),r.renderBufferDirect(y,null,z,L,E,Y),E.onAfterShadow(r,E,w,y,z,L,Y)}}}else if(H.visible){let D=M(E,H,b,P);E.onBeforeShadow(r,E,w,y,z,D,null),r.renderBufferDirect(y,null,z,D,E,null),E.onAfterShadow(r,E,w,y,z,D,null)}}let I=E.children;for(let z=0,H=I.length;z<H;z++)x(I[z],w,y,b,P)}function C(E){E.target.removeEventListener("dispose",C);for(let y in c){let b=c[y],P=E.target.uuid;P in b&&(b[P].dispose(),delete b[P])}}}function t1(r,e){function t(){let k=!1,_e=new Gt,ne=null,Re=new Gt(0,0,0,0);return{setMask:function(ve){ne!==ve&&!k&&(r.colorMask(ve,ve,ve,ve),ne=ve)},setLocked:function(ve){k=ve},setClear:function(ve,fe,pe,ye,Ke){Ke===!0&&(ve*=ye,fe*=ye,pe*=ye),_e.set(ve,fe,pe,ye),Re.equals(_e)===!1&&(r.clearColor(ve,fe,pe,ye),Re.copy(_e))},reset:function(){k=!1,ne=null,Re.set(-1,0,0,0)}}}function n(){let k=!1,_e=!1,ne=null,Re=null,ve=null;return{setReversed:function(fe){if(_e!==fe){let pe=e.get("EXT_clip_control");fe?pe.clipControlEXT(pe.LOWER_LEFT_EXT,pe.ZERO_TO_ONE_EXT):pe.clipControlEXT(pe.LOWER_LEFT_EXT,pe.NEGATIVE_ONE_TO_ONE_EXT),_e=fe;let ye=ve;ve=null,this.setClear(ye)}},getReversed:function(){return _e},setTest:function(fe){fe?he(r.DEPTH_TEST):Me(r.DEPTH_TEST)},setMask:function(fe){ne!==fe&&!k&&(r.depthMask(fe),ne=fe)},setFunc:function(fe){if(_e&&(fe=jm[fe]),Re!==fe){switch(fe){case gc:r.depthFunc(r.NEVER);break;case _c:r.depthFunc(r.ALWAYS);break;case xc:r.depthFunc(r.LESS);break;case Ps:r.depthFunc(r.LEQUAL);break;case vc:r.depthFunc(r.EQUAL);break;case yc:r.depthFunc(r.GEQUAL);break;case Sc:r.depthFunc(r.GREATER);break;case Mc:r.depthFunc(r.NOTEQUAL);break;default:r.depthFunc(r.LEQUAL)}Re=fe}},setLocked:function(fe){k=fe},setClear:function(fe){ve!==fe&&(ve=fe,_e&&(fe=1-fe),r.clearDepth(fe))},reset:function(){k=!1,ne=null,Re=null,ve=null,_e=!1}}}function i(){let k=!1,_e=null,ne=null,Re=null,ve=null,fe=null,pe=null,ye=null,Ke=null;return{setTest:function(de){k||(de?he(r.STENCIL_TEST):Me(r.STENCIL_TEST))},setMask:function(de){_e!==de&&!k&&(r.stencilMask(de),_e=de)},setFunc:function(de,Ze,Ve){(ne!==de||Re!==Ze||ve!==Ve)&&(r.stencilFunc(de,Ze,Ve),ne=de,Re=Ze,ve=Ve)},setOp:function(de,Ze,Ve){(fe!==de||pe!==Ze||ye!==Ve)&&(r.stencilOp(de,Ze,Ve),fe=de,pe=Ze,ye=Ve)},setLocked:function(de){k=de},setClear:function(de){Ke!==de&&(r.clearStencil(de),Ke=de)},reset:function(){k=!1,_e=null,ne=null,Re=null,ve=null,fe=null,pe=null,ye=null,Ke=null}}}let s=new t,a=new n,o=new i,l=new WeakMap,c=new WeakMap,u={},d={},h={},f=new WeakMap,m=[],_=null,p=!1,g=null,S=null,M=null,x=null,C=null,E=null,w=null,y=new Ye(0,0,0),b=0,P=!1,A=null,I=null,z=null,H=null,D=null,F=r.getParameter(r.MAX_COMBINED_TEXTURE_IMAGE_UNITS),U=!1,Y=0,Q=r.getParameter(r.VERSION);Q.indexOf("WebGL")!==-1?(Y=parseFloat(/^WebGL (\d)/.exec(Q)[1]),U=Y>=1):Q.indexOf("OpenGL ES")!==-1&&(Y=parseFloat(/^OpenGL ES (\d)/.exec(Q)[1]),U=Y>=2);let L=null,se={},Se=r.getParameter(r.SCISSOR_BOX),Le=r.getParameter(r.VIEWPORT),Oe=new Gt().fromArray(Se),Be=new Gt().fromArray(Le);function ee(k,_e,ne,Re){let ve=new Uint8Array(4),fe=r.createTexture();r.bindTexture(k,fe),r.texParameteri(k,r.TEXTURE_MIN_FILTER,r.NEAREST),r.texParameteri(k,r.TEXTURE_MAG_FILTER,r.NEAREST);for(let pe=0;pe<ne;pe++)k===r.TEXTURE_3D||k===r.TEXTURE_2D_ARRAY?r.texImage3D(_e,0,r.RGBA,1,1,Re,0,r.RGBA,r.UNSIGNED_BYTE,ve):r.texImage2D(_e+pe,0,r.RGBA,1,1,0,r.RGBA,r.UNSIGNED_BYTE,ve);return fe}let ce={};ce[r.TEXTURE_2D]=ee(r.TEXTURE_2D,r.TEXTURE_2D,1),ce[r.TEXTURE_CUBE_MAP]=ee(r.TEXTURE_CUBE_MAP,r.TEXTURE_CUBE_MAP_POSITIVE_X,6),ce[r.TEXTURE_2D_ARRAY]=ee(r.TEXTURE_2D_ARRAY,r.TEXTURE_2D_ARRAY,1,1),ce[r.TEXTURE_3D]=ee(r.TEXTURE_3D,r.TEXTURE_3D,1,1),s.setClear(0,0,0,1),a.setClear(1),o.setClear(0),he(r.DEPTH_TEST),a.setFunc(Ps),B(!1),me(If),he(r.CULL_FACE),oe(nr);function he(k){u[k]!==!0&&(r.enable(k),u[k]=!0)}function Me(k){u[k]!==!1&&(r.disable(k),u[k]=!1)}function ke(k,_e){return h[k]!==_e?(r.bindFramebuffer(k,_e),h[k]=_e,k===r.DRAW_FRAMEBUFFER&&(h[r.FRAMEBUFFER]=_e),k===r.FRAMEBUFFER&&(h[r.DRAW_FRAMEBUFFER]=_e),!0):!1}function Pe(k,_e){let ne=m,Re=!1;if(k){ne=f.get(_e),ne===void 0&&(ne=[],f.set(_e,ne));let ve=k.textures;if(ne.length!==ve.length||ne[0]!==r.COLOR_ATTACHMENT0){for(let fe=0,pe=ve.length;fe<pe;fe++)ne[fe]=r.COLOR_ATTACHMENT0+fe;ne.length=ve.length,Re=!0}}else ne[0]!==r.BACK&&(ne[0]=r.BACK,Re=!0);Re&&r.drawBuffers(ne)}function qe(k){return _!==k?(r.useProgram(k),_=k,!0):!1}let be={[Jr]:r.FUNC_ADD,[Mm]:r.FUNC_SUBTRACT,[bm]:r.FUNC_REVERSE_SUBTRACT};be[Tm]=r.MIN,be[Em]=r.MAX;let j={[wm]:r.ZERO,[Am]:r.ONE,[Cm]:r.SRC_COLOR,[pc]:r.SRC_ALPHA,[Um]:r.SRC_ALPHA_SATURATE,[Dm]:r.DST_COLOR,[Pm]:r.DST_ALPHA,[Rm]:r.ONE_MINUS_SRC_COLOR,[mc]:r.ONE_MINUS_SRC_ALPHA,[Lm]:r.ONE_MINUS_DST_COLOR,[Im]:r.ONE_MINUS_DST_ALPHA,[Nm]:r.CONSTANT_COLOR,[Fm]:r.ONE_MINUS_CONSTANT_COLOR,[Om]:r.CONSTANT_ALPHA,[Bm]:r.ONE_MINUS_CONSTANT_ALPHA};function oe(k,_e,ne,Re,ve,fe,pe,ye,Ke,de){if(k===nr){p===!0&&(Me(r.BLEND),p=!1);return}if(p===!1&&(he(r.BLEND),p=!0),k!==Sm){if(k!==g||de!==P){if((S!==Jr||C!==Jr)&&(r.blendEquation(r.FUNC_ADD),S=Jr,C=Jr),de)switch(k){case Rs:r.blendFuncSeparate(r.ONE,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA);break;case Df:r.blendFunc(r.ONE,r.ONE);break;case Lf:r.blendFuncSeparate(r.ZERO,r.ONE_MINUS_SRC_COLOR,r.ZERO,r.ONE);break;case Uf:r.blendFuncSeparate(r.DST_COLOR,r.ONE_MINUS_SRC_ALPHA,r.ZERO,r.ONE);break;default:nt("WebGLState: Invalid blending: ",k);break}else switch(k){case Rs:r.blendFuncSeparate(r.SRC_ALPHA,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA);break;case Df:r.blendFuncSeparate(r.SRC_ALPHA,r.ONE,r.ONE,r.ONE);break;case Lf:nt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Uf:nt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:nt("WebGLState: Invalid blending: ",k);break}M=null,x=null,E=null,w=null,y.set(0,0,0),b=0,g=k,P=de}return}ve=ve||_e,fe=fe||ne,pe=pe||Re,(_e!==S||ve!==C)&&(r.blendEquationSeparate(be[_e],be[ve]),S=_e,C=ve),(ne!==M||Re!==x||fe!==E||pe!==w)&&(r.blendFuncSeparate(j[ne],j[Re],j[fe],j[pe]),M=ne,x=Re,E=fe,w=pe),(ye.equals(y)===!1||Ke!==b)&&(r.blendColor(ye.r,ye.g,ye.b,Ke),y.copy(ye),b=Ke),g=k,P=!1}function ie(k,_e){k.side===Bt?Me(r.CULL_FACE):he(r.CULL_FACE);let ne=k.side===Yn;_e&&(ne=!ne),B(ne),k.blending===Rs&&k.transparent===!1?oe(nr):oe(k.blending,k.blendEquation,k.blendSrc,k.blendDst,k.blendEquationAlpha,k.blendSrcAlpha,k.blendDstAlpha,k.blendColor,k.blendAlpha,k.premultipliedAlpha),a.setFunc(k.depthFunc),a.setTest(k.depthTest),a.setMask(k.depthWrite),s.setMask(k.colorWrite);let Re=k.stencilWrite;o.setTest(Re),Re&&(o.setMask(k.stencilWriteMask),o.setFunc(k.stencilFunc,k.stencilRef,k.stencilFuncMask),o.setOp(k.stencilFail,k.stencilZFail,k.stencilZPass)),N(k.polygonOffset,k.polygonOffsetFactor,k.polygonOffsetUnits),k.alphaToCoverage===!0?he(r.SAMPLE_ALPHA_TO_COVERAGE):Me(r.SAMPLE_ALPHA_TO_COVERAGE)}function B(k){A!==k&&(k?r.frontFace(r.CW):r.frontFace(r.CCW),A=k)}function me(k){k!==xm?(he(r.CULL_FACE),k!==I&&(k===If?r.cullFace(r.BACK):k===vm?r.cullFace(r.FRONT):r.cullFace(r.FRONT_AND_BACK))):Me(r.CULL_FACE),I=k}function We(k){k!==z&&(U&&r.lineWidth(k),z=k)}function N(k,_e,ne){k?(he(r.POLYGON_OFFSET_FILL),(H!==_e||D!==ne)&&(H=_e,D=ne,a.getReversed()&&(_e=-_e),r.polygonOffset(_e,ne))):Me(r.POLYGON_OFFSET_FILL)}function Ne(k){k?he(r.SCISSOR_TEST):Me(r.SCISSOR_TEST)}function J(k){k===void 0&&(k=r.TEXTURE0+F-1),L!==k&&(r.activeTexture(k),L=k)}function le(k,_e,ne){ne===void 0&&(L===null?ne=r.TEXTURE0+F-1:ne=L);let Re=se[ne];Re===void 0&&(Re={type:void 0,texture:void 0},se[ne]=Re),(Re.type!==k||Re.texture!==_e)&&(L!==ne&&(r.activeTexture(ne),L=ne),r.bindTexture(k,_e||ce[k]),Re.type=k,Re.texture=_e)}function ae(){let k=se[L];k!==void 0&&k.type!==void 0&&(r.bindTexture(k.type,null),k.type=void 0,k.texture=void 0)}function Fe(){try{r.compressedTexImage2D(...arguments)}catch(k){nt("WebGLState:",k)}}function R(){try{r.compressedTexImage3D(...arguments)}catch(k){nt("WebGLState:",k)}}function v(){try{r.texSubImage2D(...arguments)}catch(k){nt("WebGLState:",k)}}function V(){try{r.texSubImage3D(...arguments)}catch(k){nt("WebGLState:",k)}}function K(){try{r.compressedTexSubImage2D(...arguments)}catch(k){nt("WebGLState:",k)}}function re(){try{r.compressedTexSubImage3D(...arguments)}catch(k){nt("WebGLState:",k)}}function ue(){try{r.texStorage2D(...arguments)}catch(k){nt("WebGLState:",k)}}function O(){try{r.texStorage3D(...arguments)}catch(k){nt("WebGLState:",k)}}function Z(){try{r.texImage2D(...arguments)}catch(k){nt("WebGLState:",k)}}function te(){try{r.texImage3D(...arguments)}catch(k){nt("WebGLState:",k)}}function Ee(k){return d[k]!==void 0?d[k]:r.getParameter(k)}function Ae(k,_e){d[k]!==_e&&(r.pixelStorei(k,_e),d[k]=_e)}function xe(k){Oe.equals(k)===!1&&(r.scissor(k.x,k.y,k.z,k.w),Oe.copy(k))}function ge(k){Be.equals(k)===!1&&(r.viewport(k.x,k.y,k.z,k.w),Be.copy(k))}function Te(k,_e){let ne=c.get(_e);ne===void 0&&(ne=new WeakMap,c.set(_e,ne));let Re=ne.get(k);Re===void 0&&(Re=r.getUniformBlockIndex(_e,k.name),ne.set(k,Re))}function je(k,_e){let Re=c.get(_e).get(k);l.get(_e)!==Re&&(r.uniformBlockBinding(_e,Re,k.__bindingPointIndex),l.set(_e,Re))}function rt(){r.disable(r.BLEND),r.disable(r.CULL_FACE),r.disable(r.DEPTH_TEST),r.disable(r.POLYGON_OFFSET_FILL),r.disable(r.SCISSOR_TEST),r.disable(r.STENCIL_TEST),r.disable(r.SAMPLE_ALPHA_TO_COVERAGE),r.blendEquation(r.FUNC_ADD),r.blendFunc(r.ONE,r.ZERO),r.blendFuncSeparate(r.ONE,r.ZERO,r.ONE,r.ZERO),r.blendColor(0,0,0,0),r.colorMask(!0,!0,!0,!0),r.clearColor(0,0,0,0),r.depthMask(!0),r.depthFunc(r.LESS),a.setReversed(!1),r.clearDepth(1),r.stencilMask(4294967295),r.stencilFunc(r.ALWAYS,0,4294967295),r.stencilOp(r.KEEP,r.KEEP,r.KEEP),r.clearStencil(0),r.cullFace(r.BACK),r.frontFace(r.CCW),r.polygonOffset(0,0),r.activeTexture(r.TEXTURE0),r.bindFramebuffer(r.FRAMEBUFFER,null),r.bindFramebuffer(r.DRAW_FRAMEBUFFER,null),r.bindFramebuffer(r.READ_FRAMEBUFFER,null),r.useProgram(null),r.lineWidth(1),r.scissor(0,0,r.canvas.width,r.canvas.height),r.viewport(0,0,r.canvas.width,r.canvas.height),r.pixelStorei(r.PACK_ALIGNMENT,4),r.pixelStorei(r.UNPACK_ALIGNMENT,4),r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,!1),r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),r.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,r.BROWSER_DEFAULT_WEBGL),r.pixelStorei(r.PACK_ROW_LENGTH,0),r.pixelStorei(r.PACK_SKIP_PIXELS,0),r.pixelStorei(r.PACK_SKIP_ROWS,0),r.pixelStorei(r.UNPACK_ROW_LENGTH,0),r.pixelStorei(r.UNPACK_IMAGE_HEIGHT,0),r.pixelStorei(r.UNPACK_SKIP_PIXELS,0),r.pixelStorei(r.UNPACK_SKIP_ROWS,0),r.pixelStorei(r.UNPACK_SKIP_IMAGES,0),u={},d={},L=null,se={},h={},f=new WeakMap,m=[],_=null,p=!1,g=null,S=null,M=null,x=null,C=null,E=null,w=null,y=new Ye(0,0,0),b=0,P=!1,A=null,I=null,z=null,H=null,D=null,Oe.set(0,0,r.canvas.width,r.canvas.height),Be.set(0,0,r.canvas.width,r.canvas.height),s.reset(),a.reset(),o.reset()}return{buffers:{color:s,depth:a,stencil:o},enable:he,disable:Me,bindFramebuffer:ke,drawBuffers:Pe,useProgram:qe,setBlending:oe,setMaterial:ie,setFlipSided:B,setCullFace:me,setLineWidth:We,setPolygonOffset:N,setScissorTest:Ne,activeTexture:J,bindTexture:le,unbindTexture:ae,compressedTexImage2D:Fe,compressedTexImage3D:R,texImage2D:Z,texImage3D:te,pixelStorei:Ae,getParameter:Ee,updateUBOMapping:Te,uniformBlockBinding:je,texStorage2D:ue,texStorage3D:O,texSubImage2D:v,texSubImage3D:V,compressedTexSubImage2D:K,compressedTexSubImage3D:re,scissor:xe,viewport:ge,reset:rt}}function n1(r,e,t,n,i,s,a){let o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new we,u=new WeakMap,d=new Set,h,f=new WeakMap,m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(R,v){return m?new OffscreenCanvas(R,v):Ca("canvas")}function p(R,v,V){let K=1,re=Fe(R);if((re.width>V||re.height>V)&&(K=V/Math.max(re.width,re.height)),K<1)if(typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&R instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&R instanceof ImageBitmap||typeof VideoFrame<"u"&&R instanceof VideoFrame){let ue=Math.floor(K*re.width),O=Math.floor(K*re.height);h===void 0&&(h=_(ue,O));let Z=v?_(ue,O):h;return Z.width=ue,Z.height=O,Z.getContext("2d").drawImage(R,0,0,ue,O),et("WebGLRenderer: Texture has been resized from ("+re.width+"x"+re.height+") to ("+ue+"x"+O+")."),Z}else return"data"in R&&et("WebGLRenderer: Image in DataTexture is too big ("+re.width+"x"+re.height+")."),R;return R}function g(R){return R.generateMipmaps}function S(R){r.generateMipmap(R)}function M(R){return R.isWebGLCubeRenderTarget?r.TEXTURE_CUBE_MAP:R.isWebGL3DRenderTarget?r.TEXTURE_3D:R.isWebGLArrayRenderTarget||R.isCompressedArrayTexture?r.TEXTURE_2D_ARRAY:r.TEXTURE_2D}function x(R,v,V,K,re,ue=!1){if(R!==null){if(r[R]!==void 0)return r[R];et("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+R+"'")}let O;K&&(O=e.get("EXT_texture_norm16"),O||et("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let Z=v;if(v===r.RED&&(V===r.FLOAT&&(Z=r.R32F),V===r.HALF_FLOAT&&(Z=r.R16F),V===r.UNSIGNED_BYTE&&(Z=r.R8),V===r.UNSIGNED_SHORT&&O&&(Z=O.R16_EXT),V===r.SHORT&&O&&(Z=O.R16_SNORM_EXT)),v===r.RED_INTEGER&&(V===r.UNSIGNED_BYTE&&(Z=r.R8UI),V===r.UNSIGNED_SHORT&&(Z=r.R16UI),V===r.UNSIGNED_INT&&(Z=r.R32UI),V===r.BYTE&&(Z=r.R8I),V===r.SHORT&&(Z=r.R16I),V===r.INT&&(Z=r.R32I)),v===r.RG&&(V===r.FLOAT&&(Z=r.RG32F),V===r.HALF_FLOAT&&(Z=r.RG16F),V===r.UNSIGNED_BYTE&&(Z=r.RG8),V===r.UNSIGNED_SHORT&&O&&(Z=O.RG16_EXT),V===r.SHORT&&O&&(Z=O.RG16_SNORM_EXT)),v===r.RG_INTEGER&&(V===r.UNSIGNED_BYTE&&(Z=r.RG8UI),V===r.UNSIGNED_SHORT&&(Z=r.RG16UI),V===r.UNSIGNED_INT&&(Z=r.RG32UI),V===r.BYTE&&(Z=r.RG8I),V===r.SHORT&&(Z=r.RG16I),V===r.INT&&(Z=r.RG32I)),v===r.RGB_INTEGER&&(V===r.UNSIGNED_BYTE&&(Z=r.RGB8UI),V===r.UNSIGNED_SHORT&&(Z=r.RGB16UI),V===r.UNSIGNED_INT&&(Z=r.RGB32UI),V===r.BYTE&&(Z=r.RGB8I),V===r.SHORT&&(Z=r.RGB16I),V===r.INT&&(Z=r.RGB32I)),v===r.RGBA_INTEGER&&(V===r.UNSIGNED_BYTE&&(Z=r.RGBA8UI),V===r.UNSIGNED_SHORT&&(Z=r.RGBA16UI),V===r.UNSIGNED_INT&&(Z=r.RGBA32UI),V===r.BYTE&&(Z=r.RGBA8I),V===r.SHORT&&(Z=r.RGBA16I),V===r.INT&&(Z=r.RGBA32I)),v===r.RGB&&(V===r.UNSIGNED_SHORT&&O&&(Z=O.RGB16_EXT),V===r.SHORT&&O&&(Z=O.RGB16_SNORM_EXT),V===r.UNSIGNED_INT_5_9_9_9_REV&&(Z=r.RGB9_E5),V===r.UNSIGNED_INT_10F_11F_11F_REV&&(Z=r.R11F_G11F_B10F)),v===r.RGBA){let te=ue?Po:_t.getTransfer(re);V===r.FLOAT&&(Z=r.RGBA32F),V===r.HALF_FLOAT&&(Z=r.RGBA16F),V===r.UNSIGNED_BYTE&&(Z=te===bt?r.SRGB8_ALPHA8:r.RGBA8),V===r.UNSIGNED_SHORT&&O&&(Z=O.RGBA16_EXT),V===r.SHORT&&O&&(Z=O.RGBA16_SNORM_EXT),V===r.UNSIGNED_SHORT_4_4_4_4&&(Z=r.RGBA4),V===r.UNSIGNED_SHORT_5_5_5_1&&(Z=r.RGB5_A1)}return(Z===r.R16F||Z===r.R32F||Z===r.RG16F||Z===r.RG32F||Z===r.RGBA16F||Z===r.RGBA32F)&&e.get("EXT_color_buffer_float"),Z}function C(R,v){let V;return R?v===null||v===Hi||v===Va?V=r.DEPTH24_STENCIL8:v===Gi?V=r.DEPTH32F_STENCIL8:v===za&&(V=r.DEPTH24_STENCIL8,et("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):v===null||v===Hi||v===Va?V=r.DEPTH_COMPONENT24:v===Gi?V=r.DEPTH_COMPONENT32F:v===za&&(V=r.DEPTH_COMPONENT16),V}function E(R,v){return g(R)===!0||R.isFramebufferTexture&&R.minFilter!==Mn&&R.minFilter!==Ot?Math.log2(Math.max(v.width,v.height))+1:R.mipmaps!==void 0&&R.mipmaps.length>0?R.mipmaps.length:R.isCompressedTexture&&Array.isArray(R.image)?v.mipmaps.length:1}function w(R){let v=R.target;v.removeEventListener("dispose",w),b(v),v.isVideoTexture&&u.delete(v),v.isHTMLTexture&&d.delete(v)}function y(R){let v=R.target;v.removeEventListener("dispose",y),A(v)}function b(R){let v=n.get(R);if(v.__webglInit===void 0)return;let V=R.source,K=f.get(V);if(K){let re=K[v.__cacheKey];re.usedTimes--,re.usedTimes===0&&P(R),Object.keys(K).length===0&&f.delete(V)}n.remove(R)}function P(R){let v=n.get(R);r.deleteTexture(v.__webglTexture);let V=R.source,K=f.get(V);delete K[v.__cacheKey],a.memory.textures--}function A(R){let v=n.get(R);if(R.depthTexture&&(R.depthTexture.dispose(),n.remove(R.depthTexture)),R.isWebGLCubeRenderTarget)for(let K=0;K<6;K++){if(Array.isArray(v.__webglFramebuffer[K]))for(let re=0;re<v.__webglFramebuffer[K].length;re++)r.deleteFramebuffer(v.__webglFramebuffer[K][re]);else r.deleteFramebuffer(v.__webglFramebuffer[K]);v.__webglDepthbuffer&&r.deleteRenderbuffer(v.__webglDepthbuffer[K])}else{if(Array.isArray(v.__webglFramebuffer))for(let K=0;K<v.__webglFramebuffer.length;K++)r.deleteFramebuffer(v.__webglFramebuffer[K]);else r.deleteFramebuffer(v.__webglFramebuffer);if(v.__webglDepthbuffer&&r.deleteRenderbuffer(v.__webglDepthbuffer),v.__webglMultisampledFramebuffer&&r.deleteFramebuffer(v.__webglMultisampledFramebuffer),v.__webglColorRenderbuffer)for(let K=0;K<v.__webglColorRenderbuffer.length;K++)v.__webglColorRenderbuffer[K]&&r.deleteRenderbuffer(v.__webglColorRenderbuffer[K]);v.__webglDepthRenderbuffer&&r.deleteRenderbuffer(v.__webglDepthRenderbuffer)}let V=R.textures;for(let K=0,re=V.length;K<re;K++){let ue=n.get(V[K]);ue.__webglTexture&&(r.deleteTexture(ue.__webglTexture),a.memory.textures--),n.remove(V[K])}n.remove(R)}let I=0;function z(){I=0}function H(){return I}function D(R){I=R}function F(){let R=I;return R>=i.maxTextures&&et("WebGLTextures: Trying to use "+R+" texture units while this GPU supports only "+i.maxTextures),I+=1,R}function U(R){let v=[];return v.push(R.wrapS),v.push(R.wrapT),v.push(R.wrapR||0),v.push(R.magFilter),v.push(R.minFilter),v.push(R.anisotropy),v.push(R.internalFormat),v.push(R.format),v.push(R.type),v.push(R.generateMipmaps),v.push(R.premultiplyAlpha),v.push(R.flipY),v.push(R.unpackAlignment),v.push(R.colorSpace),v.join()}function Y(R,v){let V=n.get(R);if(R.isVideoTexture&&le(R),R.isRenderTargetTexture===!1&&R.isExternalTexture!==!0&&R.version>0&&V.__version!==R.version){let K=R.image;if(K===null)et("WebGLRenderer: Texture marked for update but no image data found.");else if(K.complete===!1)et("WebGLRenderer: Texture marked for update but image is incomplete");else{Me(V,R,v);return}}else R.isExternalTexture&&(V.__webglTexture=R.sourceTexture?R.sourceTexture:null);t.bindTexture(r.TEXTURE_2D,V.__webglTexture,r.TEXTURE0+v)}function Q(R,v){let V=n.get(R);if(R.isRenderTargetTexture===!1&&R.version>0&&V.__version!==R.version){Me(V,R,v);return}else R.isExternalTexture&&(V.__webglTexture=R.sourceTexture?R.sourceTexture:null);t.bindTexture(r.TEXTURE_2D_ARRAY,V.__webglTexture,r.TEXTURE0+v)}function L(R,v){let V=n.get(R);if(R.isRenderTargetTexture===!1&&R.version>0&&V.__version!==R.version){Me(V,R,v);return}t.bindTexture(r.TEXTURE_3D,V.__webglTexture,r.TEXTURE0+v)}function se(R,v){let V=n.get(R);if(R.isCubeDepthTexture!==!0&&R.version>0&&V.__version!==R.version){ke(V,R,v);return}t.bindTexture(r.TEXTURE_CUBE_MAP,V.__webglTexture,r.TEXTURE0+v)}let Se={[bc]:r.REPEAT,[Ki]:r.CLAMP_TO_EDGE,[Tc]:r.MIRRORED_REPEAT},Le={[Mn]:r.NEAREST,[Vm]:r.NEAREST_MIPMAP_NEAREST,[Ko]:r.NEAREST_MIPMAP_LINEAR,[Ot]:r.LINEAR,[au]:r.LINEAR_MIPMAP_NEAREST,[ss]:r.LINEAR_MIPMAP_LINEAR},Oe={[Wm]:r.NEVER,[Jm]:r.ALWAYS,[Xm]:r.LESS,[Wu]:r.LEQUAL,[qm]:r.EQUAL,[Xu]:r.GEQUAL,[Ym]:r.GREATER,[Zm]:r.NOTEQUAL};function Be(R,v){if(v.type===Gi&&e.has("OES_texture_float_linear")===!1&&(v.magFilter===Ot||v.magFilter===au||v.magFilter===Ko||v.magFilter===ss||v.minFilter===Ot||v.minFilter===au||v.minFilter===Ko||v.minFilter===ss)&&et("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),r.texParameteri(R,r.TEXTURE_WRAP_S,Se[v.wrapS]),r.texParameteri(R,r.TEXTURE_WRAP_T,Se[v.wrapT]),(R===r.TEXTURE_3D||R===r.TEXTURE_2D_ARRAY)&&r.texParameteri(R,r.TEXTURE_WRAP_R,Se[v.wrapR]),r.texParameteri(R,r.TEXTURE_MAG_FILTER,Le[v.magFilter]),r.texParameteri(R,r.TEXTURE_MIN_FILTER,Le[v.minFilter]),v.compareFunction&&(r.texParameteri(R,r.TEXTURE_COMPARE_MODE,r.COMPARE_REF_TO_TEXTURE),r.texParameteri(R,r.TEXTURE_COMPARE_FUNC,Oe[v.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(v.magFilter===Mn||v.minFilter!==Ko&&v.minFilter!==ss||v.type===Gi&&e.has("OES_texture_float_linear")===!1)return;if(v.anisotropy>1||n.get(v).__currentAnisotropy){let V=e.get("EXT_texture_filter_anisotropic");r.texParameterf(R,V.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,i.getMaxAnisotropy())),n.get(v).__currentAnisotropy=v.anisotropy}}}function ee(R,v){let V=!1;R.__webglInit===void 0&&(R.__webglInit=!0,v.addEventListener("dispose",w));let K=v.source,re=f.get(K);re===void 0&&(re={},f.set(K,re));let ue=U(v);if(ue!==R.__cacheKey){re[ue]===void 0&&(re[ue]={texture:r.createTexture(),usedTimes:0},a.memory.textures++,V=!0),re[ue].usedTimes++;let O=re[R.__cacheKey];O!==void 0&&(re[R.__cacheKey].usedTimes--,O.usedTimes===0&&P(v)),R.__cacheKey=ue,R.__webglTexture=re[ue].texture}return V}function ce(R,v,V){return Math.floor(Math.floor(R/V)/v)}function he(R,v,V,K){let ue=R.updateRanges;if(ue.length===0)t.texSubImage2D(r.TEXTURE_2D,0,0,0,v.width,v.height,V,K,v.data);else{ue.sort((Ae,xe)=>Ae.start-xe.start);let O=0;for(let Ae=1;Ae<ue.length;Ae++){let xe=ue[O],ge=ue[Ae],Te=xe.start+xe.count,je=ce(ge.start,v.width,4),rt=ce(xe.start,v.width,4);ge.start<=Te+1&&je===rt&&ce(ge.start+ge.count-1,v.width,4)===je?xe.count=Math.max(xe.count,ge.start+ge.count-xe.start):(++O,ue[O]=ge)}ue.length=O+1;let Z=t.getParameter(r.UNPACK_ROW_LENGTH),te=t.getParameter(r.UNPACK_SKIP_PIXELS),Ee=t.getParameter(r.UNPACK_SKIP_ROWS);t.pixelStorei(r.UNPACK_ROW_LENGTH,v.width);for(let Ae=0,xe=ue.length;Ae<xe;Ae++){let ge=ue[Ae],Te=Math.floor(ge.start/4),je=Math.ceil(ge.count/4),rt=Te%v.width,k=Math.floor(Te/v.width),_e=je,ne=1;t.pixelStorei(r.UNPACK_SKIP_PIXELS,rt),t.pixelStorei(r.UNPACK_SKIP_ROWS,k),t.texSubImage2D(r.TEXTURE_2D,0,rt,k,_e,ne,V,K,v.data)}R.clearUpdateRanges(),t.pixelStorei(r.UNPACK_ROW_LENGTH,Z),t.pixelStorei(r.UNPACK_SKIP_PIXELS,te),t.pixelStorei(r.UNPACK_SKIP_ROWS,Ee)}}function Me(R,v,V){let K=r.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&(K=r.TEXTURE_2D_ARRAY),v.isData3DTexture&&(K=r.TEXTURE_3D);let re=ee(R,v),ue=v.source;t.bindTexture(K,R.__webglTexture,r.TEXTURE0+V);let O=n.get(ue);if(ue.version!==O.__version||re===!0){if(t.activeTexture(r.TEXTURE0+V),(typeof ImageBitmap<"u"&&v.image instanceof ImageBitmap)===!1){let ne=_t.getPrimaries(_t.workingColorSpace),Re=v.colorSpace===Er?null:_t.getPrimaries(v.colorSpace),ve=v.colorSpace===Er||ne===Re?r.NONE:r.BROWSER_DEFAULT_WEBGL;t.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,v.flipY),t.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),t.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,ve)}t.pixelStorei(r.UNPACK_ALIGNMENT,v.unpackAlignment);let te=p(v.image,!1,i.maxTextureSize);te=ae(v,te);let Ee=s.convert(v.format,v.colorSpace),Ae=s.convert(v.type),xe=x(v.internalFormat,Ee,Ae,v.normalized,v.colorSpace,v.isVideoTexture);Be(K,v);let ge,Te=v.mipmaps,je=v.isVideoTexture!==!0,rt=O.__version===void 0||re===!0,k=ue.dataReady,_e=E(v,te);if(v.isDepthTexture)xe=C(v.format===as,v.type),rt&&(je?t.texStorage2D(r.TEXTURE_2D,1,xe,te.width,te.height):t.texImage2D(r.TEXTURE_2D,0,xe,te.width,te.height,0,Ee,Ae,null));else if(v.isDataTexture)if(Te.length>0){je&&rt&&t.texStorage2D(r.TEXTURE_2D,_e,xe,Te[0].width,Te[0].height);for(let ne=0,Re=Te.length;ne<Re;ne++)ge=Te[ne],je?k&&t.texSubImage2D(r.TEXTURE_2D,ne,0,0,ge.width,ge.height,Ee,Ae,ge.data):t.texImage2D(r.TEXTURE_2D,ne,xe,ge.width,ge.height,0,Ee,Ae,ge.data);v.generateMipmaps=!1}else je?(rt&&t.texStorage2D(r.TEXTURE_2D,_e,xe,te.width,te.height),k&&he(v,te,Ee,Ae)):t.texImage2D(r.TEXTURE_2D,0,xe,te.width,te.height,0,Ee,Ae,te.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){je&&rt&&t.texStorage3D(r.TEXTURE_2D_ARRAY,_e,xe,Te[0].width,Te[0].height,te.depth);for(let ne=0,Re=Te.length;ne<Re;ne++)if(ge=Te[ne],v.format!==Ri)if(Ee!==null)if(je){if(k)if(v.layerUpdates.size>0){let ve=id(ge.width,ge.height,v.format,v.type);for(let fe of v.layerUpdates){let pe=ge.data.subarray(fe*ve/ge.data.BYTES_PER_ELEMENT,(fe+1)*ve/ge.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(r.TEXTURE_2D_ARRAY,ne,0,0,fe,ge.width,ge.height,1,Ee,pe)}v.clearLayerUpdates()}else t.compressedTexSubImage3D(r.TEXTURE_2D_ARRAY,ne,0,0,0,ge.width,ge.height,te.depth,Ee,ge.data)}else t.compressedTexImage3D(r.TEXTURE_2D_ARRAY,ne,xe,ge.width,ge.height,te.depth,0,ge.data,0,0);else et("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else je?k&&t.texSubImage3D(r.TEXTURE_2D_ARRAY,ne,0,0,0,ge.width,ge.height,te.depth,Ee,Ae,ge.data):t.texImage3D(r.TEXTURE_2D_ARRAY,ne,xe,ge.width,ge.height,te.depth,0,Ee,Ae,ge.data)}else{je&&rt&&t.texStorage2D(r.TEXTURE_2D,_e,xe,Te[0].width,Te[0].height);for(let ne=0,Re=Te.length;ne<Re;ne++)ge=Te[ne],v.format!==Ri?Ee!==null?je?k&&t.compressedTexSubImage2D(r.TEXTURE_2D,ne,0,0,ge.width,ge.height,Ee,ge.data):t.compressedTexImage2D(r.TEXTURE_2D,ne,xe,ge.width,ge.height,0,ge.data):et("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):je?k&&t.texSubImage2D(r.TEXTURE_2D,ne,0,0,ge.width,ge.height,Ee,Ae,ge.data):t.texImage2D(r.TEXTURE_2D,ne,xe,ge.width,ge.height,0,Ee,Ae,ge.data)}else if(v.isDataArrayTexture)if(je){if(rt&&t.texStorage3D(r.TEXTURE_2D_ARRAY,_e,xe,te.width,te.height,te.depth),k)if(v.layerUpdates.size>0){let ne=id(te.width,te.height,v.format,v.type);for(let Re of v.layerUpdates){let ve=te.data.subarray(Re*ne/te.data.BYTES_PER_ELEMENT,(Re+1)*ne/te.data.BYTES_PER_ELEMENT);t.texSubImage3D(r.TEXTURE_2D_ARRAY,0,0,0,Re,te.width,te.height,1,Ee,Ae,ve)}v.clearLayerUpdates()}else t.texSubImage3D(r.TEXTURE_2D_ARRAY,0,0,0,0,te.width,te.height,te.depth,Ee,Ae,te.data)}else t.texImage3D(r.TEXTURE_2D_ARRAY,0,xe,te.width,te.height,te.depth,0,Ee,Ae,te.data);else if(v.isData3DTexture)je?(rt&&t.texStorage3D(r.TEXTURE_3D,_e,xe,te.width,te.height,te.depth),k&&t.texSubImage3D(r.TEXTURE_3D,0,0,0,0,te.width,te.height,te.depth,Ee,Ae,te.data)):t.texImage3D(r.TEXTURE_3D,0,xe,te.width,te.height,te.depth,0,Ee,Ae,te.data);else if(v.isFramebufferTexture){if(rt)if(je)t.texStorage2D(r.TEXTURE_2D,_e,xe,te.width,te.height);else{let ne=te.width,Re=te.height;for(let ve=0;ve<_e;ve++)t.texImage2D(r.TEXTURE_2D,ve,xe,ne,Re,0,Ee,Ae,null),ne>>=1,Re>>=1}}else if(v.isHTMLTexture){if("texElementImage2D"in r){let ne=r.canvas;if(ne.hasAttribute("layoutsubtree")||ne.setAttribute("layoutsubtree","true"),te.parentNode!==ne){ne.appendChild(te),d.add(v),ne.onpaint=ye=>{let Ke=ye.changedElements;for(let de of d)Ke.includes(de.image)&&(de.needsUpdate=!0)},ne.requestPaint();return}let Re=0,ve=r.RGBA,fe=r.RGBA,pe=r.UNSIGNED_BYTE;r.texElementImage2D(r.TEXTURE_2D,Re,ve,fe,pe,te),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE)}}else if(Te.length>0){if(je&&rt){let ne=Fe(Te[0]);t.texStorage2D(r.TEXTURE_2D,_e,xe,ne.width,ne.height)}for(let ne=0,Re=Te.length;ne<Re;ne++)ge=Te[ne],je?k&&t.texSubImage2D(r.TEXTURE_2D,ne,0,0,Ee,Ae,ge):t.texImage2D(r.TEXTURE_2D,ne,xe,Ee,Ae,ge);v.generateMipmaps=!1}else if(je){if(rt){let ne=Fe(te);t.texStorage2D(r.TEXTURE_2D,_e,xe,ne.width,ne.height)}k&&t.texSubImage2D(r.TEXTURE_2D,0,0,0,Ee,Ae,te)}else t.texImage2D(r.TEXTURE_2D,0,xe,Ee,Ae,te);g(v)&&S(K),O.__version=ue.version,v.onUpdate&&v.onUpdate(v)}R.__version=v.version}function ke(R,v,V){if(v.image.length!==6)return;let K=ee(R,v),re=v.source;t.bindTexture(r.TEXTURE_CUBE_MAP,R.__webglTexture,r.TEXTURE0+V);let ue=n.get(re);if(re.version!==ue.__version||K===!0){t.activeTexture(r.TEXTURE0+V);let O=_t.getPrimaries(_t.workingColorSpace),Z=v.colorSpace===Er?null:_t.getPrimaries(v.colorSpace),te=v.colorSpace===Er||O===Z?r.NONE:r.BROWSER_DEFAULT_WEBGL;t.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,v.flipY),t.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),t.pixelStorei(r.UNPACK_ALIGNMENT,v.unpackAlignment),t.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,te);let Ee=v.isCompressedTexture||v.image[0].isCompressedTexture,Ae=v.image[0]&&v.image[0].isDataTexture,xe=[];for(let fe=0;fe<6;fe++)!Ee&&!Ae?xe[fe]=p(v.image[fe],!0,i.maxCubemapSize):xe[fe]=Ae?v.image[fe].image:v.image[fe],xe[fe]=ae(v,xe[fe]);let ge=xe[0],Te=s.convert(v.format,v.colorSpace),je=s.convert(v.type),rt=x(v.internalFormat,Te,je,v.normalized,v.colorSpace),k=v.isVideoTexture!==!0,_e=ue.__version===void 0||K===!0,ne=re.dataReady,Re=E(v,ge);Be(r.TEXTURE_CUBE_MAP,v);let ve;if(Ee){k&&_e&&t.texStorage2D(r.TEXTURE_CUBE_MAP,Re,rt,ge.width,ge.height);for(let fe=0;fe<6;fe++){ve=xe[fe].mipmaps;for(let pe=0;pe<ve.length;pe++){let ye=ve[pe];v.format!==Ri?Te!==null?k?ne&&t.compressedTexSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+fe,pe,0,0,ye.width,ye.height,Te,ye.data):t.compressedTexImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+fe,pe,rt,ye.width,ye.height,0,ye.data):et("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):k?ne&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+fe,pe,0,0,ye.width,ye.height,Te,je,ye.data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+fe,pe,rt,ye.width,ye.height,0,Te,je,ye.data)}}}else{if(ve=v.mipmaps,k&&_e){ve.length>0&&Re++;let fe=Fe(xe[0]);t.texStorage2D(r.TEXTURE_CUBE_MAP,Re,rt,fe.width,fe.height)}for(let fe=0;fe<6;fe++)if(Ae){k?ne&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0,0,0,xe[fe].width,xe[fe].height,Te,je,xe[fe].data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0,rt,xe[fe].width,xe[fe].height,0,Te,je,xe[fe].data);for(let pe=0;pe<ve.length;pe++){let Ke=ve[pe].image[fe].image;k?ne&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+fe,pe+1,0,0,Ke.width,Ke.height,Te,je,Ke.data):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+fe,pe+1,rt,Ke.width,Ke.height,0,Te,je,Ke.data)}}else{k?ne&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0,0,0,Te,je,xe[fe]):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0,rt,Te,je,xe[fe]);for(let pe=0;pe<ve.length;pe++){let ye=ve[pe];k?ne&&t.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+fe,pe+1,0,0,Te,je,ye.image[fe]):t.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+fe,pe+1,rt,Te,je,ye.image[fe])}}}g(v)&&S(r.TEXTURE_CUBE_MAP),ue.__version=re.version,v.onUpdate&&v.onUpdate(v)}R.__version=v.version}function Pe(R,v,V,K,re,ue){let O=s.convert(V.format,V.colorSpace),Z=s.convert(V.type),te=x(V.internalFormat,O,Z,V.normalized,V.colorSpace),Ee=n.get(v),Ae=n.get(V);if(Ae.__renderTarget=v,!Ee.__hasExternalTextures){let xe=Math.max(1,v.width>>ue),ge=Math.max(1,v.height>>ue);re===r.TEXTURE_3D||re===r.TEXTURE_2D_ARRAY?t.texImage3D(re,ue,te,xe,ge,v.depth,0,O,Z,null):t.texImage2D(re,ue,te,xe,ge,0,O,Z,null)}t.bindFramebuffer(r.FRAMEBUFFER,R),J(v)?o.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,K,re,Ae.__webglTexture,0,Ne(v)):(re===r.TEXTURE_2D||re>=r.TEXTURE_CUBE_MAP_POSITIVE_X&&re<=r.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&r.framebufferTexture2D(r.FRAMEBUFFER,K,re,Ae.__webglTexture,ue),t.bindFramebuffer(r.FRAMEBUFFER,null)}function qe(R,v,V){if(r.bindRenderbuffer(r.RENDERBUFFER,R),v.depthBuffer){let K=v.depthTexture,re=K&&K.isDepthTexture?K.type:null,ue=C(v.stencilBuffer,re),O=v.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT;J(v)?o.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,Ne(v),ue,v.width,v.height):V?r.renderbufferStorageMultisample(r.RENDERBUFFER,Ne(v),ue,v.width,v.height):r.renderbufferStorage(r.RENDERBUFFER,ue,v.width,v.height),r.framebufferRenderbuffer(r.FRAMEBUFFER,O,r.RENDERBUFFER,R)}else{let K=v.textures;for(let re=0;re<K.length;re++){let ue=K[re],O=s.convert(ue.format,ue.colorSpace),Z=s.convert(ue.type),te=x(ue.internalFormat,O,Z,ue.normalized,ue.colorSpace);J(v)?o.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,Ne(v),te,v.width,v.height):V?r.renderbufferStorageMultisample(r.RENDERBUFFER,Ne(v),te,v.width,v.height):r.renderbufferStorage(r.RENDERBUFFER,te,v.width,v.height)}}r.bindRenderbuffer(r.RENDERBUFFER,null)}function be(R,v,V){let K=v.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(r.FRAMEBUFFER,R),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let re=n.get(v.depthTexture);if(re.__renderTarget=v,(!re.__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),K){if(re.__webglInit===void 0&&(re.__webglInit=!0,v.depthTexture.addEventListener("dispose",w)),re.__webglTexture===void 0){re.__webglTexture=r.createTexture(),t.bindTexture(r.TEXTURE_CUBE_MAP,re.__webglTexture),Be(r.TEXTURE_CUBE_MAP,v.depthTexture);let Ee=s.convert(v.depthTexture.format),Ae=s.convert(v.depthTexture.type),xe;v.depthTexture.format===Qi?xe=r.DEPTH_COMPONENT24:v.depthTexture.format===as&&(xe=r.DEPTH24_STENCIL8);for(let ge=0;ge<6;ge++)r.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ge,0,xe,v.width,v.height,0,Ee,Ae,null)}}else Y(v.depthTexture,0);let ue=re.__webglTexture,O=Ne(v),Z=K?r.TEXTURE_CUBE_MAP_POSITIVE_X+V:r.TEXTURE_2D,te=v.depthTexture.format===as?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT;if(v.depthTexture.format===Qi)J(v)?o.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,te,Z,ue,0,O):r.framebufferTexture2D(r.FRAMEBUFFER,te,Z,ue,0);else if(v.depthTexture.format===as)J(v)?o.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,te,Z,ue,0,O):r.framebufferTexture2D(r.FRAMEBUFFER,te,Z,ue,0);else throw new Error("Unknown depthTexture format")}function j(R){let v=n.get(R),V=R.isWebGLCubeRenderTarget===!0;if(v.__boundDepthTexture!==R.depthTexture){let K=R.depthTexture;if(v.__depthDisposeCallback&&v.__depthDisposeCallback(),K){let re=()=>{delete v.__boundDepthTexture,delete v.__depthDisposeCallback,K.removeEventListener("dispose",re)};K.addEventListener("dispose",re),v.__depthDisposeCallback=re}v.__boundDepthTexture=K}if(R.depthTexture&&!v.__autoAllocateDepthBuffer)if(V)for(let K=0;K<6;K++)be(v.__webglFramebuffer[K],R,K);else{let K=R.texture.mipmaps;K&&K.length>0?be(v.__webglFramebuffer[0],R,0):be(v.__webglFramebuffer,R,0)}else if(V){v.__webglDepthbuffer=[];for(let K=0;K<6;K++)if(t.bindFramebuffer(r.FRAMEBUFFER,v.__webglFramebuffer[K]),v.__webglDepthbuffer[K]===void 0)v.__webglDepthbuffer[K]=r.createRenderbuffer(),qe(v.__webglDepthbuffer[K],R,!1);else{let re=R.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,ue=v.__webglDepthbuffer[K];r.bindRenderbuffer(r.RENDERBUFFER,ue),r.framebufferRenderbuffer(r.FRAMEBUFFER,re,r.RENDERBUFFER,ue)}}else{let K=R.texture.mipmaps;if(K&&K.length>0?t.bindFramebuffer(r.FRAMEBUFFER,v.__webglFramebuffer[0]):t.bindFramebuffer(r.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer===void 0)v.__webglDepthbuffer=r.createRenderbuffer(),qe(v.__webglDepthbuffer,R,!1);else{let re=R.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,ue=v.__webglDepthbuffer;r.bindRenderbuffer(r.RENDERBUFFER,ue),r.framebufferRenderbuffer(r.FRAMEBUFFER,re,r.RENDERBUFFER,ue)}}t.bindFramebuffer(r.FRAMEBUFFER,null)}function oe(R,v,V){let K=n.get(R);v!==void 0&&Pe(K.__webglFramebuffer,R,R.texture,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,0),V!==void 0&&j(R)}function ie(R){let v=R.texture,V=n.get(R),K=n.get(v);R.addEventListener("dispose",y);let re=R.textures,ue=R.isWebGLCubeRenderTarget===!0,O=re.length>1;if(O||(K.__webglTexture===void 0&&(K.__webglTexture=r.createTexture()),K.__version=v.version,a.memory.textures++),ue){V.__webglFramebuffer=[];for(let Z=0;Z<6;Z++)if(v.mipmaps&&v.mipmaps.length>0){V.__webglFramebuffer[Z]=[];for(let te=0;te<v.mipmaps.length;te++)V.__webglFramebuffer[Z][te]=r.createFramebuffer()}else V.__webglFramebuffer[Z]=r.createFramebuffer()}else{if(v.mipmaps&&v.mipmaps.length>0){V.__webglFramebuffer=[];for(let Z=0;Z<v.mipmaps.length;Z++)V.__webglFramebuffer[Z]=r.createFramebuffer()}else V.__webglFramebuffer=r.createFramebuffer();if(O)for(let Z=0,te=re.length;Z<te;Z++){let Ee=n.get(re[Z]);Ee.__webglTexture===void 0&&(Ee.__webglTexture=r.createTexture(),a.memory.textures++)}if(R.samples>0&&J(R)===!1){V.__webglMultisampledFramebuffer=r.createFramebuffer(),V.__webglColorRenderbuffer=[],t.bindFramebuffer(r.FRAMEBUFFER,V.__webglMultisampledFramebuffer);for(let Z=0;Z<re.length;Z++){let te=re[Z];V.__webglColorRenderbuffer[Z]=r.createRenderbuffer(),r.bindRenderbuffer(r.RENDERBUFFER,V.__webglColorRenderbuffer[Z]);let Ee=s.convert(te.format,te.colorSpace),Ae=s.convert(te.type),xe=x(te.internalFormat,Ee,Ae,te.normalized,te.colorSpace,R.isXRRenderTarget===!0),ge=Ne(R);r.renderbufferStorageMultisample(r.RENDERBUFFER,ge,xe,R.width,R.height),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+Z,r.RENDERBUFFER,V.__webglColorRenderbuffer[Z])}r.bindRenderbuffer(r.RENDERBUFFER,null),R.depthBuffer&&(V.__webglDepthRenderbuffer=r.createRenderbuffer(),qe(V.__webglDepthRenderbuffer,R,!0)),t.bindFramebuffer(r.FRAMEBUFFER,null)}}if(ue){t.bindTexture(r.TEXTURE_CUBE_MAP,K.__webglTexture),Be(r.TEXTURE_CUBE_MAP,v);for(let Z=0;Z<6;Z++)if(v.mipmaps&&v.mipmaps.length>0)for(let te=0;te<v.mipmaps.length;te++)Pe(V.__webglFramebuffer[Z][te],R,v,r.COLOR_ATTACHMENT0,r.TEXTURE_CUBE_MAP_POSITIVE_X+Z,te);else Pe(V.__webglFramebuffer[Z],R,v,r.COLOR_ATTACHMENT0,r.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0);g(v)&&S(r.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(O){for(let Z=0,te=re.length;Z<te;Z++){let Ee=re[Z],Ae=n.get(Ee),xe=r.TEXTURE_2D;(R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(xe=R.isWebGL3DRenderTarget?r.TEXTURE_3D:r.TEXTURE_2D_ARRAY),t.bindTexture(xe,Ae.__webglTexture),Be(xe,Ee),Pe(V.__webglFramebuffer,R,Ee,r.COLOR_ATTACHMENT0+Z,xe,0),g(Ee)&&S(xe)}t.unbindTexture()}else{let Z=r.TEXTURE_2D;if((R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(Z=R.isWebGL3DRenderTarget?r.TEXTURE_3D:r.TEXTURE_2D_ARRAY),t.bindTexture(Z,K.__webglTexture),Be(Z,v),v.mipmaps&&v.mipmaps.length>0)for(let te=0;te<v.mipmaps.length;te++)Pe(V.__webglFramebuffer[te],R,v,r.COLOR_ATTACHMENT0,Z,te);else Pe(V.__webglFramebuffer,R,v,r.COLOR_ATTACHMENT0,Z,0);g(v)&&S(Z),t.unbindTexture()}R.depthBuffer&&j(R)}function B(R){let v=R.textures;for(let V=0,K=v.length;V<K;V++){let re=v[V];if(g(re)){let ue=M(R),O=n.get(re).__webglTexture;t.bindTexture(ue,O),S(ue),t.unbindTexture()}}}let me=[],We=[];function N(R){if(R.samples>0){if(J(R)===!1){let v=R.textures,V=R.width,K=R.height,re=r.COLOR_BUFFER_BIT,ue=R.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,O=n.get(R),Z=v.length>1;if(Z)for(let Ee=0;Ee<v.length;Ee++)t.bindFramebuffer(r.FRAMEBUFFER,O.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+Ee,r.RENDERBUFFER,null),t.bindFramebuffer(r.FRAMEBUFFER,O.__webglFramebuffer),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0+Ee,r.TEXTURE_2D,null,0);t.bindFramebuffer(r.READ_FRAMEBUFFER,O.__webglMultisampledFramebuffer);let te=R.texture.mipmaps;te&&te.length>0?t.bindFramebuffer(r.DRAW_FRAMEBUFFER,O.__webglFramebuffer[0]):t.bindFramebuffer(r.DRAW_FRAMEBUFFER,O.__webglFramebuffer);for(let Ee=0;Ee<v.length;Ee++){if(R.resolveDepthBuffer&&(R.depthBuffer&&(re|=r.DEPTH_BUFFER_BIT),R.stencilBuffer&&R.resolveStencilBuffer&&(re|=r.STENCIL_BUFFER_BIT)),Z){r.framebufferRenderbuffer(r.READ_FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.RENDERBUFFER,O.__webglColorRenderbuffer[Ee]);let Ae=n.get(v[Ee]).__webglTexture;r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,Ae,0)}r.blitFramebuffer(0,0,V,K,0,0,V,K,re,r.NEAREST),l===!0&&(me.length=0,We.length=0,me.push(r.COLOR_ATTACHMENT0+Ee),R.depthBuffer&&R.resolveDepthBuffer===!1&&(me.push(ue),We.push(ue),r.invalidateFramebuffer(r.DRAW_FRAMEBUFFER,We)),r.invalidateFramebuffer(r.READ_FRAMEBUFFER,me))}if(t.bindFramebuffer(r.READ_FRAMEBUFFER,null),t.bindFramebuffer(r.DRAW_FRAMEBUFFER,null),Z)for(let Ee=0;Ee<v.length;Ee++){t.bindFramebuffer(r.FRAMEBUFFER,O.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+Ee,r.RENDERBUFFER,O.__webglColorRenderbuffer[Ee]);let Ae=n.get(v[Ee]).__webglTexture;t.bindFramebuffer(r.FRAMEBUFFER,O.__webglFramebuffer),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0+Ee,r.TEXTURE_2D,Ae,0)}t.bindFramebuffer(r.DRAW_FRAMEBUFFER,O.__webglMultisampledFramebuffer)}else if(R.depthBuffer&&R.resolveDepthBuffer===!1&&l){let v=R.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT;r.invalidateFramebuffer(r.DRAW_FRAMEBUFFER,[v])}}}function Ne(R){return Math.min(i.maxSamples,R.samples)}function J(R){let v=n.get(R);return R.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function le(R){let v=a.render.frame;u.get(R)!==v&&(u.set(R,v),R.update())}function ae(R,v){let V=R.colorSpace,K=R.format,re=R.type;return R.isCompressedTexture===!0||R.isVideoTexture===!0||V!==Ro&&V!==Er&&(_t.getTransfer(V)===bt?(K!==Ri||re!==ii)&&et("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):nt("WebGLTextures: Unsupported texture color space:",V)),v}function Fe(R){return typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement?(c.width=R.naturalWidth||R.width,c.height=R.naturalHeight||R.height):typeof VideoFrame<"u"&&R instanceof VideoFrame?(c.width=R.displayWidth,c.height=R.displayHeight):(c.width=R.width,c.height=R.height),c}this.allocateTextureUnit=F,this.resetTextureUnits=z,this.getTextureUnits=H,this.setTextureUnits=D,this.setTexture2D=Y,this.setTexture2DArray=Q,this.setTexture3D=L,this.setTextureCube=se,this.rebindTextures=oe,this.setupRenderTarget=ie,this.updateRenderTargetMipmap=B,this.updateMultisampleRenderTarget=N,this.setupDepthRenderbuffer=j,this.setupFrameBufferTexture=Pe,this.useMultisampledRTT=J,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function i1(r,e){function t(n,i=Er){let s,a=_t.getTransfer(i);if(n===ii)return r.UNSIGNED_BYTE;if(n===lu)return r.UNSIGNED_SHORT_4_4_4_4;if(n===cu)return r.UNSIGNED_SHORT_5_5_5_1;if(n===Xf)return r.UNSIGNED_INT_5_9_9_9_REV;if(n===qf)return r.UNSIGNED_INT_10F_11F_11F_REV;if(n===Gf)return r.BYTE;if(n===Wf)return r.SHORT;if(n===za)return r.UNSIGNED_SHORT;if(n===ou)return r.INT;if(n===Hi)return r.UNSIGNED_INT;if(n===Gi)return r.FLOAT;if(n===gi)return r.HALF_FLOAT;if(n===Yf)return r.ALPHA;if(n===Zf)return r.RGB;if(n===Ri)return r.RGBA;if(n===Qi)return r.DEPTH_COMPONENT;if(n===as)return r.DEPTH_STENCIL;if(n===Jf)return r.RED;if(n===uu)return r.RED_INTEGER;if(n===os)return r.RG;if(n===hu)return r.RG_INTEGER;if(n===fu)return r.RGBA_INTEGER;if(n===Qo||n===jo||n===el||n===tl)if(a===bt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===Qo)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===jo)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===el)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===tl)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===Qo)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===jo)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===el)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===tl)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===du||n===pu||n===mu||n===gu)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===du)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===pu)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===mu)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===gu)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===_u||n===xu||n===vu||n===yu||n===Su||n===nl||n===Mu)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(n===_u||n===xu)return a===bt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===vu)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC;if(n===yu)return s.COMPRESSED_R11_EAC;if(n===Su)return s.COMPRESSED_SIGNED_R11_EAC;if(n===nl)return s.COMPRESSED_RG11_EAC;if(n===Mu)return s.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===bu||n===Tu||n===Eu||n===wu||n===Au||n===Cu||n===Ru||n===Pu||n===Iu||n===Du||n===Lu||n===Uu||n===Nu||n===Fu)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(n===bu)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Tu)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Eu)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===wu)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Au)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Cu)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Ru)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Pu)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Iu)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Du)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Lu)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Uu)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Nu)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Fu)return a===bt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Ou||n===Bu||n===ku)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(n===Ou)return a===bt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Bu)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===ku)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===zu||n===Vu||n===il||n===Hu)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(n===zu)return s.COMPRESSED_RED_RGTC1_EXT;if(n===Vu)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===il)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Hu)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Va?r.UNSIGNED_INT_24_8:r[n]!==void 0?r[n]:null}return{convert:t}}var r1=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,s1=`
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

}`,_d=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Bo(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new en({vertexShader:r1,fragmentShader:s1,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new xt(new ln(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},xd=class extends ji{constructor(e,t){super();let n=this,i=null,s=1,a=null,o="local-floor",l=1,c=null,u=null,d=null,h=null,f=null,m=null,_=typeof XRWebGLBinding<"u",p=new _d,g={},S=t.getContextAttributes(),M=null,x=null,C=[],E=[],w=new we,y=null,b=new yn;b.viewport=new Gt;let P=new yn;P.viewport=new Gt;let A=[b,P],I=new iu,z=null,H=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(ee){let ce=C[ee];return ce===void 0&&(ce=new Da,C[ee]=ce),ce.getTargetRaySpace()},this.getControllerGrip=function(ee){let ce=C[ee];return ce===void 0&&(ce=new Da,C[ee]=ce),ce.getGripSpace()},this.getHand=function(ee){let ce=C[ee];return ce===void 0&&(ce=new Da,C[ee]=ce),ce.getHandSpace()};function D(ee){let ce=E.indexOf(ee.inputSource);if(ce===-1)return;let he=C[ce];he!==void 0&&(he.update(ee.inputSource,ee.frame,c||a),he.dispatchEvent({type:ee.type,data:ee.inputSource}))}function F(){i.removeEventListener("select",D),i.removeEventListener("selectstart",D),i.removeEventListener("selectend",D),i.removeEventListener("squeeze",D),i.removeEventListener("squeezestart",D),i.removeEventListener("squeezeend",D),i.removeEventListener("end",F),i.removeEventListener("inputsourceschange",U);for(let ee=0;ee<C.length;ee++){let ce=E[ee];ce!==null&&(E[ee]=null,C[ee].disconnect(ce))}z=null,H=null,p.reset();for(let ee in g)delete g[ee];e.setRenderTarget(M),f=null,h=null,d=null,i=null,x=null,Be.stop(),n.isPresenting=!1,e.setPixelRatio(y),e.setSize(w.width,w.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(ee){s=ee,n.isPresenting===!0&&et("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(ee){o=ee,n.isPresenting===!0&&et("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(ee){c=ee},this.getBaseLayer=function(){return h!==null?h:f},this.getBinding=function(){return d===null&&_&&(d=new XRWebGLBinding(i,t)),d},this.getFrame=function(){return m},this.getSession=function(){return i},this.setSession=async function(ee){if(i=ee,i!==null){if(M=e.getRenderTarget(),i.addEventListener("select",D),i.addEventListener("selectstart",D),i.addEventListener("selectend",D),i.addEventListener("squeeze",D),i.addEventListener("squeezestart",D),i.addEventListener("squeezeend",D),i.addEventListener("end",F),i.addEventListener("inputsourceschange",U),S.xrCompatible!==!0&&await t.makeXRCompatible(),y=e.getPixelRatio(),e.getSize(w),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let he=null,Me=null,ke=null;S.depth&&(ke=S.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,he=S.stencil?as:Qi,Me=S.stencil?Va:Hi);let Pe={colorFormat:t.RGBA8,depthFormat:ke,scaleFactor:s};d=this.getBinding(),h=d.createProjectionLayer(Pe),i.updateRenderState({layers:[h]}),e.setPixelRatio(1),e.setSize(h.textureWidth,h.textureHeight,!1),x=new bn(h.textureWidth,h.textureHeight,{format:Ri,type:ii,depthTexture:new br(h.textureWidth,h.textureHeight,Me,void 0,void 0,void 0,void 0,void 0,void 0,he),stencilBuffer:S.stencil,colorSpace:e.outputColorSpace,samples:S.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}else{let he={antialias:S.antialias,alpha:!0,depth:S.depth,stencil:S.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(i,t,he),i.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),x=new bn(f.framebufferWidth,f.framebufferHeight,{format:Ri,type:ii,colorSpace:e.outputColorSpace,stencilBuffer:S.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}x.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await i.requestReferenceSpace(o),Be.setContext(i),Be.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function U(ee){for(let ce=0;ce<ee.removed.length;ce++){let he=ee.removed[ce],Me=E.indexOf(he);Me>=0&&(E[Me]=null,C[Me].disconnect(he))}for(let ce=0;ce<ee.added.length;ce++){let he=ee.added[ce],Me=E.indexOf(he);if(Me===-1){for(let Pe=0;Pe<C.length;Pe++)if(Pe>=E.length){E.push(he),Me=Pe;break}else if(E[Pe]===null){E[Pe]=he,Me=Pe;break}if(Me===-1)break}let ke=C[Me];ke&&ke.connect(he)}}let Y=new G,Q=new G;function L(ee,ce,he){Y.setFromMatrixPosition(ce.matrixWorld),Q.setFromMatrixPosition(he.matrixWorld);let Me=Y.distanceTo(Q),ke=ce.projectionMatrix.elements,Pe=he.projectionMatrix.elements,qe=ke[14]/(ke[10]-1),be=ke[14]/(ke[10]+1),j=(ke[9]+1)/ke[5],oe=(ke[9]-1)/ke[5],ie=(ke[8]-1)/ke[0],B=(Pe[8]+1)/Pe[0],me=qe*ie,We=qe*B,N=Me/(-ie+B),Ne=N*-ie;if(ce.matrixWorld.decompose(ee.position,ee.quaternion,ee.scale),ee.translateX(Ne),ee.translateZ(N),ee.matrixWorld.compose(ee.position,ee.quaternion,ee.scale),ee.matrixWorldInverse.copy(ee.matrixWorld).invert(),ke[10]===-1)ee.projectionMatrix.copy(ce.projectionMatrix),ee.projectionMatrixInverse.copy(ce.projectionMatrixInverse);else{let J=qe+N,le=be+N,ae=me-Ne,Fe=We+(Me-Ne),R=j*be/le*J,v=oe*be/le*J;ee.projectionMatrix.makePerspective(ae,Fe,R,v,J,le),ee.projectionMatrixInverse.copy(ee.projectionMatrix).invert()}}function se(ee,ce){ce===null?ee.matrixWorld.copy(ee.matrix):ee.matrixWorld.multiplyMatrices(ce.matrixWorld,ee.matrix),ee.matrixWorldInverse.copy(ee.matrixWorld).invert()}this.updateCamera=function(ee){if(i===null)return;let ce=ee.near,he=ee.far;p.texture!==null&&(p.depthNear>0&&(ce=p.depthNear),p.depthFar>0&&(he=p.depthFar)),I.near=P.near=b.near=ce,I.far=P.far=b.far=he,(z!==I.near||H!==I.far)&&(i.updateRenderState({depthNear:I.near,depthFar:I.far}),z=I.near,H=I.far),I.layers.mask=ee.layers.mask|6,b.layers.mask=I.layers.mask&-5,P.layers.mask=I.layers.mask&-3;let Me=ee.parent,ke=I.cameras;se(I,Me);for(let Pe=0;Pe<ke.length;Pe++)se(ke[Pe],Me);ke.length===2?L(I,b,P):I.projectionMatrix.copy(b.projectionMatrix),Se(ee,I,Me)};function Se(ee,ce,he){he===null?ee.matrix.copy(ce.matrixWorld):(ee.matrix.copy(he.matrixWorld),ee.matrix.invert(),ee.matrix.multiply(ce.matrixWorld)),ee.matrix.decompose(ee.position,ee.quaternion,ee.scale),ee.updateMatrixWorld(!0),ee.projectionMatrix.copy(ce.projectionMatrix),ee.projectionMatrixInverse.copy(ce.projectionMatrixInverse),ee.isPerspectiveCamera&&(ee.fov=Pa*2*Math.atan(1/ee.projectionMatrix.elements[5]),ee.zoom=1)}this.getCamera=function(){return I},this.getFoveation=function(){if(!(h===null&&f===null))return l},this.setFoveation=function(ee){l=ee,h!==null&&(h.fixedFoveation=ee),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=ee)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(I)},this.getCameraTexture=function(ee){return g[ee]};let Le=null;function Oe(ee,ce){if(u=ce.getViewerPose(c||a),m=ce,u!==null){let he=u.views;f!==null&&(e.setRenderTargetFramebuffer(x,f.framebuffer),e.setRenderTarget(x));let Me=!1;he.length!==I.cameras.length&&(I.cameras.length=0,Me=!0);for(let be=0;be<he.length;be++){let j=he[be],oe=null;if(f!==null)oe=f.getViewport(j);else{let B=d.getViewSubImage(h,j);oe=B.viewport,be===0&&(e.setRenderTargetTextures(x,B.colorTexture,B.depthStencilTexture),e.setRenderTarget(x))}let ie=A[be];ie===void 0&&(ie=new yn,ie.layers.enable(be),ie.viewport=new Gt,A[be]=ie),ie.matrix.fromArray(j.transform.matrix),ie.matrix.decompose(ie.position,ie.quaternion,ie.scale),ie.projectionMatrix.fromArray(j.projectionMatrix),ie.projectionMatrixInverse.copy(ie.projectionMatrix).invert(),ie.viewport.set(oe.x,oe.y,oe.width,oe.height),be===0&&(I.matrix.copy(ie.matrix),I.matrix.decompose(I.position,I.quaternion,I.scale)),Me===!0&&I.cameras.push(ie)}let ke=i.enabledFeatures;if(ke&&ke.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&_){d=n.getBinding();let be=d.getDepthInformation(he[0]);be&&be.isValid&&be.texture&&p.init(be,i.renderState)}if(ke&&ke.includes("camera-access")&&_){e.state.unbindTexture(),d=n.getBinding();for(let be=0;be<he.length;be++){let j=he[be].camera;if(j){let oe=g[j];oe||(oe=new Bo,g[j]=oe);let ie=d.getCameraImage(j);oe.sourceTexture=ie}}}}for(let he=0;he<C.length;he++){let Me=E[he],ke=C[he];Me!==null&&ke!==void 0&&ke.update(Me,ce,c||a)}Le&&Le(ee,ce),ce.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ce}),m=null}let Be=new Rg;Be.setAnimationLoop(Oe),this.setAnimationLoop=function(ee){Le=ee},this.dispose=function(){}}},a1=new Nt,Ng=new at;Ng.set(-1,0,0,0,1,0,0,0,1);function o1(r,e){function t(p,g){p.matrixAutoUpdate===!0&&p.updateMatrix(),g.value.copy(p.matrix)}function n(p,g){g.color.getRGB(p.fogColor.value,ed(r)),g.isFog?(p.fogNear.value=g.near,p.fogFar.value=g.far):g.isFogExp2&&(p.fogDensity.value=g.density)}function i(p,g,S,M,x){g.isNodeMaterial?g.uniformsNeedUpdate=!1:g.isMeshBasicMaterial?s(p,g):g.isMeshLambertMaterial?(s(p,g),g.envMap&&(p.envMapIntensity.value=g.envMapIntensity)):g.isMeshToonMaterial?(s(p,g),d(p,g)):g.isMeshPhongMaterial?(s(p,g),u(p,g),g.envMap&&(p.envMapIntensity.value=g.envMapIntensity)):g.isMeshStandardMaterial?(s(p,g),h(p,g),g.isMeshPhysicalMaterial&&f(p,g,x)):g.isMeshMatcapMaterial?(s(p,g),m(p,g)):g.isMeshDepthMaterial?s(p,g):g.isMeshDistanceMaterial?(s(p,g),_(p,g)):g.isMeshNormalMaterial?s(p,g):g.isLineBasicMaterial?(a(p,g),g.isLineDashedMaterial&&o(p,g)):g.isPointsMaterial?l(p,g,S,M):g.isSpriteMaterial?c(p,g):g.isShadowMaterial?(p.color.value.copy(g.color),p.opacity.value=g.opacity):g.isShaderMaterial&&(g.uniformsNeedUpdate=!1)}function s(p,g){p.opacity.value=g.opacity,g.color&&p.diffuse.value.copy(g.color),g.emissive&&p.emissive.value.copy(g.emissive).multiplyScalar(g.emissiveIntensity),g.map&&(p.map.value=g.map,t(g.map,p.mapTransform)),g.alphaMap&&(p.alphaMap.value=g.alphaMap,t(g.alphaMap,p.alphaMapTransform)),g.bumpMap&&(p.bumpMap.value=g.bumpMap,t(g.bumpMap,p.bumpMapTransform),p.bumpScale.value=g.bumpScale,g.side===Yn&&(p.bumpScale.value*=-1)),g.normalMap&&(p.normalMap.value=g.normalMap,t(g.normalMap,p.normalMapTransform),p.normalScale.value.copy(g.normalScale),g.side===Yn&&p.normalScale.value.negate()),g.displacementMap&&(p.displacementMap.value=g.displacementMap,t(g.displacementMap,p.displacementMapTransform),p.displacementScale.value=g.displacementScale,p.displacementBias.value=g.displacementBias),g.emissiveMap&&(p.emissiveMap.value=g.emissiveMap,t(g.emissiveMap,p.emissiveMapTransform)),g.specularMap&&(p.specularMap.value=g.specularMap,t(g.specularMap,p.specularMapTransform)),g.alphaTest>0&&(p.alphaTest.value=g.alphaTest);let S=e.get(g),M=S.envMap,x=S.envMapRotation;M&&(p.envMap.value=M,p.envMapRotation.value.setFromMatrix4(a1.makeRotationFromEuler(x)).transpose(),M.isCubeTexture&&M.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(Ng),p.reflectivity.value=g.reflectivity,p.ior.value=g.ior,p.refractionRatio.value=g.refractionRatio),g.lightMap&&(p.lightMap.value=g.lightMap,p.lightMapIntensity.value=g.lightMapIntensity,t(g.lightMap,p.lightMapTransform)),g.aoMap&&(p.aoMap.value=g.aoMap,p.aoMapIntensity.value=g.aoMapIntensity,t(g.aoMap,p.aoMapTransform))}function a(p,g){p.diffuse.value.copy(g.color),p.opacity.value=g.opacity,g.map&&(p.map.value=g.map,t(g.map,p.mapTransform))}function o(p,g){p.dashSize.value=g.dashSize,p.totalSize.value=g.dashSize+g.gapSize,p.scale.value=g.scale}function l(p,g,S,M){p.diffuse.value.copy(g.color),p.opacity.value=g.opacity,p.size.value=g.size*S,p.scale.value=M*.5,g.map&&(p.map.value=g.map,t(g.map,p.uvTransform)),g.alphaMap&&(p.alphaMap.value=g.alphaMap,t(g.alphaMap,p.alphaMapTransform)),g.alphaTest>0&&(p.alphaTest.value=g.alphaTest)}function c(p,g){p.diffuse.value.copy(g.color),p.opacity.value=g.opacity,p.rotation.value=g.rotation,g.map&&(p.map.value=g.map,t(g.map,p.mapTransform)),g.alphaMap&&(p.alphaMap.value=g.alphaMap,t(g.alphaMap,p.alphaMapTransform)),g.alphaTest>0&&(p.alphaTest.value=g.alphaTest)}function u(p,g){p.specular.value.copy(g.specular),p.shininess.value=Math.max(g.shininess,1e-4)}function d(p,g){g.gradientMap&&(p.gradientMap.value=g.gradientMap)}function h(p,g){p.metalness.value=g.metalness,g.metalnessMap&&(p.metalnessMap.value=g.metalnessMap,t(g.metalnessMap,p.metalnessMapTransform)),p.roughness.value=g.roughness,g.roughnessMap&&(p.roughnessMap.value=g.roughnessMap,t(g.roughnessMap,p.roughnessMapTransform)),g.envMap&&(p.envMapIntensity.value=g.envMapIntensity)}function f(p,g,S){p.ior.value=g.ior,g.sheen>0&&(p.sheenColor.value.copy(g.sheenColor).multiplyScalar(g.sheen),p.sheenRoughness.value=g.sheenRoughness,g.sheenColorMap&&(p.sheenColorMap.value=g.sheenColorMap,t(g.sheenColorMap,p.sheenColorMapTransform)),g.sheenRoughnessMap&&(p.sheenRoughnessMap.value=g.sheenRoughnessMap,t(g.sheenRoughnessMap,p.sheenRoughnessMapTransform))),g.clearcoat>0&&(p.clearcoat.value=g.clearcoat,p.clearcoatRoughness.value=g.clearcoatRoughness,g.clearcoatMap&&(p.clearcoatMap.value=g.clearcoatMap,t(g.clearcoatMap,p.clearcoatMapTransform)),g.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=g.clearcoatRoughnessMap,t(g.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),g.clearcoatNormalMap&&(p.clearcoatNormalMap.value=g.clearcoatNormalMap,t(g.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(g.clearcoatNormalScale),g.side===Yn&&p.clearcoatNormalScale.value.negate())),g.dispersion>0&&(p.dispersion.value=g.dispersion),g.iridescence>0&&(p.iridescence.value=g.iridescence,p.iridescenceIOR.value=g.iridescenceIOR,p.iridescenceThicknessMinimum.value=g.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=g.iridescenceThicknessRange[1],g.iridescenceMap&&(p.iridescenceMap.value=g.iridescenceMap,t(g.iridescenceMap,p.iridescenceMapTransform)),g.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=g.iridescenceThicknessMap,t(g.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),g.transmission>0&&(p.transmission.value=g.transmission,p.transmissionSamplerMap.value=S.texture,p.transmissionSamplerSize.value.set(S.width,S.height),g.transmissionMap&&(p.transmissionMap.value=g.transmissionMap,t(g.transmissionMap,p.transmissionMapTransform)),p.thickness.value=g.thickness,g.thicknessMap&&(p.thicknessMap.value=g.thicknessMap,t(g.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=g.attenuationDistance,p.attenuationColor.value.copy(g.attenuationColor)),g.anisotropy>0&&(p.anisotropyVector.value.set(g.anisotropy*Math.cos(g.anisotropyRotation),g.anisotropy*Math.sin(g.anisotropyRotation)),g.anisotropyMap&&(p.anisotropyMap.value=g.anisotropyMap,t(g.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=g.specularIntensity,p.specularColor.value.copy(g.specularColor),g.specularColorMap&&(p.specularColorMap.value=g.specularColorMap,t(g.specularColorMap,p.specularColorMapTransform)),g.specularIntensityMap&&(p.specularIntensityMap.value=g.specularIntensityMap,t(g.specularIntensityMap,p.specularIntensityMapTransform))}function m(p,g){g.matcap&&(p.matcap.value=g.matcap)}function _(p,g){let S=e.get(g).light;p.referencePosition.value.setFromMatrixPosition(S.matrixWorld),p.nearDistance.value=S.shadow.camera.near,p.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function l1(r,e,t,n){let i={},s={},a=[],o=r.getParameter(r.MAX_UNIFORM_BUFFER_BINDINGS);function l(S,M){let x=M.program;n.uniformBlockBinding(S,x)}function c(S,M){let x=i[S.id];x===void 0&&(m(S),x=u(S),i[S.id]=x,S.addEventListener("dispose",p));let C=M.program;n.updateUBOMapping(S,C);let E=e.render.frame;s[S.id]!==E&&(h(S),s[S.id]=E)}function u(S){let M=d();S.__bindingPointIndex=M;let x=r.createBuffer(),C=S.__size,E=S.usage;return r.bindBuffer(r.UNIFORM_BUFFER,x),r.bufferData(r.UNIFORM_BUFFER,C,E),r.bindBuffer(r.UNIFORM_BUFFER,null),r.bindBufferBase(r.UNIFORM_BUFFER,M,x),x}function d(){for(let S=0;S<o;S++)if(a.indexOf(S)===-1)return a.push(S),S;return nt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(S){let M=i[S.id],x=S.uniforms,C=S.__cache;r.bindBuffer(r.UNIFORM_BUFFER,M);for(let E=0,w=x.length;E<w;E++){let y=Array.isArray(x[E])?x[E]:[x[E]];for(let b=0,P=y.length;b<P;b++){let A=y[b];if(f(A,E,b,C)===!0){let I=A.__offset,z=Array.isArray(A.value)?A.value:[A.value],H=0;for(let D=0;D<z.length;D++){let F=z[D],U=_(F);typeof F=="number"||typeof F=="boolean"?(A.__data[0]=F,r.bufferSubData(r.UNIFORM_BUFFER,I+H,A.__data)):F.isMatrix3?(A.__data[0]=F.elements[0],A.__data[1]=F.elements[1],A.__data[2]=F.elements[2],A.__data[3]=0,A.__data[4]=F.elements[3],A.__data[5]=F.elements[4],A.__data[6]=F.elements[5],A.__data[7]=0,A.__data[8]=F.elements[6],A.__data[9]=F.elements[7],A.__data[10]=F.elements[8],A.__data[11]=0):ArrayBuffer.isView(F)?A.__data.set(new F.constructor(F.buffer,F.byteOffset,A.__data.length)):(F.toArray(A.__data,H),H+=U.storage/Float32Array.BYTES_PER_ELEMENT)}r.bufferSubData(r.UNIFORM_BUFFER,I,A.__data)}}}r.bindBuffer(r.UNIFORM_BUFFER,null)}function f(S,M,x,C){let E=S.value,w=M+"_"+x;if(C[w]===void 0)return typeof E=="number"||typeof E=="boolean"?C[w]=E:ArrayBuffer.isView(E)?C[w]=E.slice():C[w]=E.clone(),!0;{let y=C[w];if(typeof E=="number"||typeof E=="boolean"){if(y!==E)return C[w]=E,!0}else{if(ArrayBuffer.isView(E))return!0;if(y.equals(E)===!1)return y.copy(E),!0}}return!1}function m(S){let M=S.uniforms,x=0,C=16;for(let w=0,y=M.length;w<y;w++){let b=Array.isArray(M[w])?M[w]:[M[w]];for(let P=0,A=b.length;P<A;P++){let I=b[P],z=Array.isArray(I.value)?I.value:[I.value];for(let H=0,D=z.length;H<D;H++){let F=z[H],U=_(F),Y=x%C,Q=Y%U.boundary,L=Y+Q;x+=Q,L!==0&&C-L<U.storage&&(x+=C-L),I.__data=new Float32Array(U.storage/Float32Array.BYTES_PER_ELEMENT),I.__offset=x,x+=U.storage}}}let E=x%C;return E>0&&(x+=C-E),S.__size=x,S.__cache={},this}function _(S){let M={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(M.boundary=4,M.storage=4):S.isVector2?(M.boundary=8,M.storage=8):S.isVector3||S.isColor?(M.boundary=16,M.storage=12):S.isVector4?(M.boundary=16,M.storage=16):S.isMatrix3?(M.boundary=48,M.storage=48):S.isMatrix4?(M.boundary=64,M.storage=64):S.isTexture?et("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(S)?(M.boundary=16,M.storage=S.byteLength):et("WebGLRenderer: Unsupported uniform value type.",S),M}function p(S){let M=S.target;M.removeEventListener("dispose",p);let x=a.indexOf(M.__bindingPointIndex);a.splice(x,1),r.deleteBuffer(i[M.id]),delete i[M.id],delete s[M.id]}function g(){for(let S in i)r.deleteBuffer(i[S]);a=[],i={},s={}}return{bind:l,update:c,dispose:g}}var c1=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),ir=null;function u1(){return ir===null&&(ir=new Pc(c1,16,16,os,gi),ir.name="DFG_LUT",ir.minFilter=Ot,ir.magFilter=Ot,ir.wrapS=Ki,ir.wrapT=Ki,ir.generateMipmaps=!1,ir.needsUpdate=!0),ir}var Ju=class{constructor(e={}){let{canvas:t=$m(),context:n=null,depth:i=!0,stencil:s=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:h=!1,outputBufferType:f=ii}=e;this.isWebGLRenderer=!0;let m;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=n.getContextAttributes().alpha}else m=a;let _=f,p=new Set([fu,hu,uu]),g=new Set([ii,Hi,za,Va,lu,cu]),S=new Uint32Array(4),M=new Int32Array(4),x=new G,C=null,E=null,w=[],y=[],b=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Vi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let P=this,A=!1,I=null;this._outputColorSpace=Vt;let z=0,H=0,D=null,F=-1,U=null,Y=new Gt,Q=new Gt,L=null,se=new Ye(0),Se=0,Le=t.width,Oe=t.height,Be=1,ee=null,ce=null,he=new Gt(0,0,Le,Oe),Me=new Gt(0,0,Le,Oe),ke=!1,Pe=new La,qe=!1,be=!1,j=new Nt,oe=new G,ie=new Gt,B={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},me=!1;function We(){return D===null?Be:1}let N=n;function Ne(T,W){return t.getContext(T,W)}try{let T={alpha:!0,depth:i,stencil:s,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${"184"}`),t.addEventListener("webglcontextlost",fe,!1),t.addEventListener("webglcontextrestored",pe,!1),t.addEventListener("webglcontextcreationerror",ye,!1),N===null){let W="webgl2";if(N=Ne(W,T),N===null)throw Ne(W)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(T){throw nt("WebGLRenderer: "+T.message),T}let J,le,ae,Fe,R,v,V,K,re,ue,O,Z,te,Ee,Ae,xe,ge,Te,je,rt,k,_e,ne;function Re(){J=new _M(N),J.init(),k=new i1(N,J),le=new cM(N,J,e,k),ae=new t1(N,J),le.reversedDepthBuffer&&h&&ae.buffers.depth.setReversed(!0),Fe=new yM(N),R=new Vb,v=new n1(N,J,ae,R,le,k,Fe),V=new gM(P),K=new Tv(N),_e=new oM(N,K),re=new xM(N,K,Fe,_e),ue=new MM(N,re,K,_e,Fe),Te=new SM(N,le,v),Ae=new uM(R),O=new zb(P,V,J,le,_e,Ae),Z=new o1(P,R),te=new Gb,Ee=new Jb(J),ge=new aM(P,V,ae,ue,m,l),xe=new e1(P,ue,le),ne=new l1(N,Fe,le,ae),je=new lM(N,J,Fe),rt=new vM(N,J,Fe),Fe.programs=O.programs,P.capabilities=le,P.extensions=J,P.properties=R,P.renderLists=te,P.shadowMap=xe,P.state=ae,P.info=Fe}Re(),_!==ii&&(b=new TM(_,t.width,t.height,i,s));let ve=new xd(P,N);this.xr=ve,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){let T=J.get("WEBGL_lose_context");T&&T.loseContext()},this.forceContextRestore=function(){let T=J.get("WEBGL_lose_context");T&&T.restoreContext()},this.getPixelRatio=function(){return Be},this.setPixelRatio=function(T){T!==void 0&&(Be=T,this.setSize(Le,Oe,!1))},this.getSize=function(T){return T.set(Le,Oe)},this.setSize=function(T,W,$=!0){if(ve.isPresenting){et("WebGLRenderer: Can't change size while VR device is presenting.");return}Le=T,Oe=W,t.width=Math.floor(T*Be),t.height=Math.floor(W*Be),$===!0&&(t.style.width=T+"px",t.style.height=W+"px"),b!==null&&b.setSize(t.width,t.height),this.setViewport(0,0,T,W)},this.getDrawingBufferSize=function(T){return T.set(Le*Be,Oe*Be).floor()},this.setDrawingBufferSize=function(T,W,$){Le=T,Oe=W,Be=$,t.width=Math.floor(T*$),t.height=Math.floor(W*$),this.setViewport(0,0,T,W)},this.setEffects=function(T){if(_===ii){nt("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(T){for(let W=0;W<T.length;W++)if(T[W].isOutputPass===!0){et("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}b.setEffects(T||[])},this.getCurrentViewport=function(T){return T.copy(Y)},this.getViewport=function(T){return T.copy(he)},this.setViewport=function(T,W,$,X){T.isVector4?he.set(T.x,T.y,T.z,T.w):he.set(T,W,$,X),ae.viewport(Y.copy(he).multiplyScalar(Be).round())},this.getScissor=function(T){return T.copy(Me)},this.setScissor=function(T,W,$,X){T.isVector4?Me.set(T.x,T.y,T.z,T.w):Me.set(T,W,$,X),ae.scissor(Q.copy(Me).multiplyScalar(Be).round())},this.getScissorTest=function(){return ke},this.setScissorTest=function(T){ae.setScissorTest(ke=T)},this.setOpaqueSort=function(T){ee=T},this.setTransparentSort=function(T){ce=T},this.getClearColor=function(T){return T.copy(ge.getClearColor())},this.setClearColor=function(){ge.setClearColor(...arguments)},this.getClearAlpha=function(){return ge.getClearAlpha()},this.setClearAlpha=function(){ge.setClearAlpha(...arguments)},this.clear=function(T=!0,W=!0,$=!0){let X=0;if(T){let q=!1;if(D!==null){let Ce=D.texture.format;q=p.has(Ce)}if(q){let Ce=D.texture.type,Ie=g.has(Ce),Ue=ge.getClearColor(),Xe=ge.getClearAlpha(),$e=Ue.r,ot=Ue.g,ht=Ue.b;Ie?(S[0]=$e,S[1]=ot,S[2]=ht,S[3]=Xe,N.clearBufferuiv(N.COLOR,0,S)):(M[0]=$e,M[1]=ot,M[2]=ht,M[3]=Xe,N.clearBufferiv(N.COLOR,0,M))}else X|=N.COLOR_BUFFER_BIT}W&&(X|=N.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),$&&(X|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),X!==0&&N.clear(X)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(T){T.setRenderer(this),I=T},this.dispose=function(){t.removeEventListener("webglcontextlost",fe,!1),t.removeEventListener("webglcontextrestored",pe,!1),t.removeEventListener("webglcontextcreationerror",ye,!1),ge.dispose(),te.dispose(),Ee.dispose(),R.dispose(),V.dispose(),ue.dispose(),_e.dispose(),ne.dispose(),O.dispose(),ve.dispose(),ve.removeEventListener("sessionstart",tt),ve.removeEventListener("sessionend",ut),gt.stop()};function fe(T){T.preventDefault(),Kf("WebGLRenderer: Context Lost."),A=!0}function pe(){Kf("WebGLRenderer: Context Restored."),A=!1;let T=Fe.autoReset,W=xe.enabled,$=xe.autoUpdate,X=xe.needsUpdate,q=xe.type;Re(),Fe.autoReset=T,xe.enabled=W,xe.autoUpdate=$,xe.needsUpdate=X,xe.type=q}function ye(T){nt("WebGLRenderer: A WebGL context could not be created. Reason: ",T.statusMessage)}function Ke(T){let W=T.target;W.removeEventListener("dispose",Ke),de(W)}function de(T){Ze(T),R.remove(T)}function Ze(T){let W=R.get(T).programs;W!==void 0&&(W.forEach(function($){O.releaseProgram($)}),T.isShaderMaterial&&O.releaseShaderCache(T))}this.renderBufferDirect=function(T,W,$,X,q,Ce){W===null&&(W=B);let Ie=q.isMesh&&q.matrixWorld.determinant()<0,Ue=_n(T,W,$,X,q);ae.setMaterial(X,Ie);let Xe=$.index,$e=1;if(X.wireframe===!0){if(Xe=re.getWireframeAttribute($),Xe===void 0)return;$e=2}let ot=$.drawRange,ht=$.attributes.position,Qe=ot.start*$e,At=(ot.start+ot.count)*$e;Ce!==null&&(Qe=Math.max(Qe,Ce.start*$e),At=Math.min(At,(Ce.start+Ce.count)*$e)),Xe!==null?(Qe=Math.max(Qe,0),At=Math.min(At,Xe.count)):ht!=null&&(Qe=Math.max(Qe,0),At=Math.min(At,ht.count));let Qt=At-Qe;if(Qt<0||Qt===1/0)return;_e.setup(q,X,Ue,$,Xe);let Yt,Rt=je;if(Xe!==null&&(Yt=K.get(Xe),Rt=rt,Rt.setIndex(Yt)),q.isMesh)X.wireframe===!0?(ae.setLineWidth(X.wireframeLinewidth*We()),Rt.setMode(N.LINES)):Rt.setMode(N.TRIANGLES);else if(q.isLine){let Dn=X.linewidth;Dn===void 0&&(Dn=1),ae.setLineWidth(Dn*We()),q.isLineSegments?Rt.setMode(N.LINES):q.isLineLoop?Rt.setMode(N.LINE_LOOP):Rt.setMode(N.LINE_STRIP)}else q.isPoints?Rt.setMode(N.POINTS):q.isSprite&&Rt.setMode(N.TRIANGLES);if(q.isBatchedMesh)if(J.get("WEBGL_multi_draw"))Rt.renderMultiDraw(q._multiDrawStarts,q._multiDrawCounts,q._multiDrawCount);else{let Dn=q._multiDrawStarts,ze=q._multiDrawCounts,hi=q._multiDrawCount,yt=Xe?K.get(Xe).bytesPerElement:1,Ai=R.get(X).currentProgram.getUniforms();for(let Zi=0;Zi<hi;Zi++)Ai.setValue(N,"_gl_DrawID",Zi),Rt.render(Dn[Zi]/yt,ze[Zi])}else if(q.isInstancedMesh)Rt.renderInstances(Qe,Qt,q.count);else if($.isInstancedBufferGeometry){let Dn=$._maxInstanceCount!==void 0?$._maxInstanceCount:1/0,ze=Math.min($.instanceCount,Dn);Rt.renderInstances(Qe,Qt,ze)}else Rt.render(Qe,Qt)};function Ve(T,W,$){T.transparent===!0&&T.side===Bt&&T.forceSinglePass===!1?(T.side=Yn,T.needsUpdate=!0,gn(T,W,$),T.side=yr,T.needsUpdate=!0,gn(T,W,$),T.side=Bt):gn(T,W,$)}this.compile=function(T,W,$=null){$===null&&($=T),E=Ee.get($),E.init(W),y.push(E),$.traverseVisible(function(q){q.isLight&&q.layers.test(W.layers)&&(E.pushLight(q),q.castShadow&&E.pushShadow(q))}),T!==$&&T.traverseVisible(function(q){q.isLight&&q.layers.test(W.layers)&&(E.pushLight(q),q.castShadow&&E.pushShadow(q))}),E.setupLights();let X=new Set;return T.traverse(function(q){if(!(q.isMesh||q.isPoints||q.isLine||q.isSprite))return;let Ce=q.material;if(Ce)if(Array.isArray(Ce))for(let Ie=0;Ie<Ce.length;Ie++){let Ue=Ce[Ie];Ve(Ue,$,q),X.add(Ue)}else Ve(Ce,$,q),X.add(Ce)}),E=y.pop(),X},this.compileAsync=function(T,W,$=null){let X=this.compile(T,W,$);return new Promise(q=>{function Ce(){if(X.forEach(function(Ie){R.get(Ie).currentProgram.isReady()&&X.delete(Ie)}),X.size===0){q(T);return}setTimeout(Ce,10)}J.get("KHR_parallel_shader_compile")!==null?Ce():setTimeout(Ce,10)})};let Je=null;function it(T){Je&&Je(T)}function tt(){gt.stop()}function ut(){gt.start()}let gt=new Rg;gt.setAnimationLoop(it),typeof self<"u"&&gt.setContext(self),this.setAnimationLoop=function(T){Je=T,ve.setAnimationLoop(T),T===null?gt.stop():gt.start()},ve.addEventListener("sessionstart",tt),ve.addEventListener("sessionend",ut),this.render=function(T,W){if(W!==void 0&&W.isCamera!==!0){nt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(A===!0)return;I!==null&&I.renderStart(T,W);let $=ve.enabled===!0&&ve.isPresenting===!0,X=b!==null&&(D===null||$)&&b.begin(P,D);if(T.matrixWorldAutoUpdate===!0&&T.updateMatrixWorld(),W.parent===null&&W.matrixWorldAutoUpdate===!0&&W.updateMatrixWorld(),ve.enabled===!0&&ve.isPresenting===!0&&(b===null||b.isCompositing()===!1)&&(ve.cameraAutoUpdate===!0&&ve.updateCamera(W),W=ve.getCamera()),T.isScene===!0&&T.onBeforeRender(P,T,W,D),E=Ee.get(T,y.length),E.init(W),E.state.textureUnits=v.getTextureUnits(),y.push(E),j.multiplyMatrices(W.projectionMatrix,W.matrixWorldInverse),Pe.setFromProjectionMatrix(j,zi,W.reversedDepth),be=this.localClippingEnabled,qe=Ae.init(this.clippingPlanes,be),C=te.get(T,w.length),C.init(),w.push(C),ve.enabled===!0&&ve.isPresenting===!0){let Ie=P.xr.getDepthSensingMesh();Ie!==null&&wt(Ie,W,-1/0,P.sortObjects)}wt(T,W,0,P.sortObjects),C.finish(),P.sortObjects===!0&&C.sort(ee,ce),me=ve.enabled===!1||ve.isPresenting===!1||ve.hasDepthSensing()===!1,me&&ge.addToRenderList(C,T),this.info.render.frame++,qe===!0&&Ae.beginShadows();let q=E.state.shadowsArray;if(xe.render(q,T,W),qe===!0&&Ae.endShadows(),this.info.autoReset===!0&&this.info.reset(),(X&&b.hasRenderPass())===!1){let Ie=C.opaque,Ue=C.transmissive;if(E.setupLights(),W.isArrayCamera){let Xe=W.cameras;if(Ue.length>0)for(let $e=0,ot=Xe.length;$e<ot;$e++){let ht=Xe[$e];Mt(Ie,Ue,T,ht)}me&&ge.render(T);for(let $e=0,ot=Xe.length;$e<ot;$e++){let ht=Xe[$e];Ct(C,T,ht,ht.viewport)}}else Ue.length>0&&Mt(Ie,Ue,T,W),me&&ge.render(T),Ct(C,T,W)}D!==null&&H===0&&(v.updateMultisampleRenderTarget(D),v.updateRenderTargetMipmap(D)),X&&b.end(P),T.isScene===!0&&T.onAfterRender(P,T,W),_e.resetDefaultState(),F=-1,U=null,y.pop(),y.length>0?(E=y[y.length-1],v.setTextureUnits(E.state.textureUnits),qe===!0&&Ae.setGlobalState(P.clippingPlanes,E.state.camera)):E=null,w.pop(),w.length>0?C=w[w.length-1]:C=null,I!==null&&I.renderEnd()};function wt(T,W,$,X){if(T.visible===!1)return;if(T.layers.test(W.layers)){if(T.isGroup)$=T.renderOrder;else if(T.isLOD)T.autoUpdate===!0&&T.update(W);else if(T.isLightProbeGrid)E.pushLightProbeGrid(T);else if(T.isLight)E.pushLight(T),T.castShadow&&E.pushShadow(T);else if(T.isSprite){if(!T.frustumCulled||Pe.intersectsSprite(T)){X&&ie.setFromMatrixPosition(T.matrixWorld).applyMatrix4(j);let Ie=ue.update(T),Ue=T.material;Ue.visible&&C.push(T,Ie,Ue,$,ie.z,null)}}else if((T.isMesh||T.isLine||T.isPoints)&&(!T.frustumCulled||Pe.intersectsObject(T))){let Ie=ue.update(T),Ue=T.material;if(X&&(T.boundingSphere!==void 0?(T.boundingSphere===null&&T.computeBoundingSphere(),ie.copy(T.boundingSphere.center)):(Ie.boundingSphere===null&&Ie.computeBoundingSphere(),ie.copy(Ie.boundingSphere.center)),ie.applyMatrix4(T.matrixWorld).applyMatrix4(j)),Array.isArray(Ue)){let Xe=Ie.groups;for(let $e=0,ot=Xe.length;$e<ot;$e++){let ht=Xe[$e],Qe=Ue[ht.materialIndex];Qe&&Qe.visible&&C.push(T,Ie,Qe,$,ie.z,ht)}}else Ue.visible&&C.push(T,Ie,Ue,$,ie.z,null)}}let Ce=T.children;for(let Ie=0,Ue=Ce.length;Ie<Ue;Ie++)wt(Ce[Ie],W,$,X)}function Ct(T,W,$,X){let{opaque:q,transmissive:Ce,transparent:Ie}=T;E.setupLightsView($),qe===!0&&Ae.setGlobalState(P.clippingPlanes,$),X&&ae.viewport(Y.copy(X)),q.length>0&&In(q,W,$),Ce.length>0&&In(Ce,W,$),Ie.length>0&&In(Ie,W,$),ae.buffers.depth.setTest(!0),ae.buffers.depth.setMask(!0),ae.buffers.color.setMask(!0),ae.setPolygonOffset(!1)}function Mt(T,W,$,X){if(($.isScene===!0?$.overrideMaterial:null)!==null)return;if(E.state.transmissionRenderTarget[X.id]===void 0){let Qe=J.has("EXT_color_buffer_half_float")||J.has("EXT_color_buffer_float");E.state.transmissionRenderTarget[X.id]=new bn(1,1,{generateMipmaps:!0,type:Qe?gi:ii,minFilter:ss,samples:Math.max(4,le.samples),stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:_t.workingColorSpace})}let Ce=E.state.transmissionRenderTarget[X.id],Ie=X.viewport||Y;Ce.setSize(Ie.z*P.transmissionResolutionScale,Ie.w*P.transmissionResolutionScale);let Ue=P.getRenderTarget(),Xe=P.getActiveCubeFace(),$e=P.getActiveMipmapLevel();P.setRenderTarget(Ce),P.getClearColor(se),Se=P.getClearAlpha(),Se<1&&P.setClearColor(16777215,.5),P.clear(),me&&ge.render($);let ot=P.toneMapping;P.toneMapping=Vi;let ht=X.viewport;if(X.viewport!==void 0&&(X.viewport=void 0),E.setupLightsView(X),qe===!0&&Ae.setGlobalState(P.clippingPlanes,X),In(T,$,X),v.updateMultisampleRenderTarget(Ce),v.updateRenderTargetMipmap(Ce),J.has("WEBGL_multisampled_render_to_texture")===!1){let Qe=!1;for(let At=0,Qt=W.length;At<Qt;At++){let Yt=W[At],{object:Rt,geometry:Dn,material:ze,group:hi}=Yt;if(ze.side===Bt&&Rt.layers.test(X.layers)){let yt=ze.side;ze.side=Yn,ze.needsUpdate=!0,Lt(Rt,$,X,Dn,ze,hi),ze.side=yt,ze.needsUpdate=!0,Qe=!0}}Qe===!0&&(v.updateMultisampleRenderTarget(Ce),v.updateRenderTargetMipmap(Ce))}P.setRenderTarget(Ue,Xe,$e),P.setClearColor(se,Se),ht!==void 0&&(X.viewport=ht),P.toneMapping=ot}function In(T,W,$){let X=W.isScene===!0?W.overrideMaterial:null;for(let q=0,Ce=T.length;q<Ce;q++){let Ie=T[q],{object:Ue,geometry:Xe,group:$e}=Ie,ot=Ie.material;ot.allowOverride===!0&&X!==null&&(ot=X),Ue.layers.test($.layers)&&Lt(Ue,W,$,Xe,ot,$e)}}function Lt(T,W,$,X,q,Ce){T.onBeforeRender(P,W,$,X,q,Ce),T.modelViewMatrix.multiplyMatrices($.matrixWorldInverse,T.matrixWorld),T.normalMatrix.getNormalMatrix(T.modelViewMatrix),q.onBeforeRender(P,W,$,X,T,Ce),q.transparent===!0&&q.side===Bt&&q.forceSinglePass===!1?(q.side=Yn,q.needsUpdate=!0,P.renderBufferDirect($,W,X,q,T,Ce),q.side=yr,q.needsUpdate=!0,P.renderBufferDirect($,W,X,q,T,Ce),q.side=Bt):P.renderBufferDirect($,W,X,q,T,Ce),T.onAfterRender(P,W,$,X,q,Ce)}function gn(T,W,$){W.isScene!==!0&&(W=B);let X=R.get(T),q=E.state.lights,Ce=E.state.shadowsArray,Ie=q.state.version,Ue=O.getParameters(T,q.state,Ce,W,$,E.state.lightProbeGridArray),Xe=O.getProgramCacheKey(Ue),$e=X.programs;X.environment=T.isMeshStandardMaterial||T.isMeshLambertMaterial||T.isMeshPhongMaterial?W.environment:null,X.fog=W.fog;let ot=T.isMeshStandardMaterial||T.isMeshLambertMaterial&&!T.envMap||T.isMeshPhongMaterial&&!T.envMap;X.envMap=V.get(T.envMap||X.environment,ot),X.envMapRotation=X.environment!==null&&T.envMap===null?W.environmentRotation:T.envMapRotation,$e===void 0&&(T.addEventListener("dispose",Ke),$e=new Map,X.programs=$e);let ht=$e.get(Xe);if(ht!==void 0){if(X.currentProgram===ht&&X.lightsStateVersion===Ie)return nn(T,Ue),ht}else Ue.uniforms=O.getUniforms(T),I!==null&&T.isNodeMaterial&&I.build(T,$,Ue),T.onBeforeCompile(Ue,P),ht=O.acquireProgram(Ue,Xe),$e.set(Xe,ht),X.uniforms=Ue.uniforms;let Qe=X.uniforms;return(!T.isShaderMaterial&&!T.isRawShaderMaterial||T.clipping===!0)&&(Qe.clippingPlanes=Ae.uniform),nn(T,Ue),X.needsLights=ca(T),X.lightsStateVersion=Ie,X.needsLights&&(Qe.ambientLightColor.value=q.state.ambient,Qe.lightProbe.value=q.state.probe,Qe.directionalLights.value=q.state.directional,Qe.directionalLightShadows.value=q.state.directionalShadow,Qe.spotLights.value=q.state.spot,Qe.spotLightShadows.value=q.state.spotShadow,Qe.rectAreaLights.value=q.state.rectArea,Qe.ltc_1.value=q.state.rectAreaLTC1,Qe.ltc_2.value=q.state.rectAreaLTC2,Qe.pointLights.value=q.state.point,Qe.pointLightShadows.value=q.state.pointShadow,Qe.hemisphereLights.value=q.state.hemi,Qe.directionalShadowMatrix.value=q.state.directionalShadowMatrix,Qe.spotLightMatrix.value=q.state.spotLightMatrix,Qe.spotLightMap.value=q.state.spotLightMap,Qe.pointShadowMatrix.value=q.state.pointShadowMatrix),X.lightProbeGrid=E.state.lightProbeGridArray.length>0,X.currentProgram=ht,X.uniformsList=null,ht}function ui(T){if(T.uniformsList===null){let W=T.currentProgram.getUniforms();T.uniformsList=Ga.seqWithValue(W.seq,T.uniforms)}return T.uniformsList}function nn(T,W){let $=R.get(T);$.outputColorSpace=W.outputColorSpace,$.batching=W.batching,$.batchingColor=W.batchingColor,$.instancing=W.instancing,$.instancingColor=W.instancingColor,$.instancingMorph=W.instancingMorph,$.skinning=W.skinning,$.morphTargets=W.morphTargets,$.morphNormals=W.morphNormals,$.morphColors=W.morphColors,$.morphTargetsCount=W.morphTargetsCount,$.numClippingPlanes=W.numClippingPlanes,$.numIntersection=W.numClipIntersection,$.vertexAlphas=W.vertexAlphas,$.vertexTangents=W.vertexTangents,$.toneMapping=W.toneMapping}function hn(T,W){if(T.length===0)return null;if(T.length===1)return T[0].texture!==null?T[0]:null;x.setFromMatrixPosition(W.matrixWorld);for(let $=0,X=T.length;$<X;$++){let q=T[$];if(q.texture!==null&&q.boundingBox.containsPoint(x))return q}return null}function _n(T,W,$,X,q){W.isScene!==!0&&(W=B),v.resetTextureUnits();let Ce=W.fog,Ie=X.isMeshStandardMaterial||X.isMeshLambertMaterial||X.isMeshPhongMaterial?W.environment:null,Ue=D===null?P.outputColorSpace:D.isXRRenderTarget===!0?D.texture.colorSpace:_t.workingColorSpace,Xe=X.isMeshStandardMaterial||X.isMeshLambertMaterial&&!X.envMap||X.isMeshPhongMaterial&&!X.envMap,$e=V.get(X.envMap||Ie,Xe),ot=X.vertexColors===!0&&!!$.attributes.color&&$.attributes.color.itemSize===4,ht=!!$.attributes.tangent&&(!!X.normalMap||X.anisotropy>0),Qe=!!$.morphAttributes.position,At=!!$.morphAttributes.normal,Qt=!!$.morphAttributes.color,Yt=Vi;X.toneMapped&&(D===null||D.isXRRenderTarget===!0)&&(Yt=P.toneMapping);let Rt=$.morphAttributes.position||$.morphAttributes.normal||$.morphAttributes.color,Dn=Rt!==void 0?Rt.length:0,ze=R.get(X),hi=E.state.lights;if(qe===!0&&(be===!0||T!==U)){let Ut=T===U&&X.id===F;Ae.setState(X,T,Ut)}let yt=!1;X.version===ze.__version?(ze.needsLights&&ze.lightsStateVersion!==hi.state.version||ze.outputColorSpace!==Ue||q.isBatchedMesh&&ze.batching===!1||!q.isBatchedMesh&&ze.batching===!0||q.isBatchedMesh&&ze.batchingColor===!0&&q.colorTexture===null||q.isBatchedMesh&&ze.batchingColor===!1&&q.colorTexture!==null||q.isInstancedMesh&&ze.instancing===!1||!q.isInstancedMesh&&ze.instancing===!0||q.isSkinnedMesh&&ze.skinning===!1||!q.isSkinnedMesh&&ze.skinning===!0||q.isInstancedMesh&&ze.instancingColor===!0&&q.instanceColor===null||q.isInstancedMesh&&ze.instancingColor===!1&&q.instanceColor!==null||q.isInstancedMesh&&ze.instancingMorph===!0&&q.morphTexture===null||q.isInstancedMesh&&ze.instancingMorph===!1&&q.morphTexture!==null||ze.envMap!==$e||X.fog===!0&&ze.fog!==Ce||ze.numClippingPlanes!==void 0&&(ze.numClippingPlanes!==Ae.numPlanes||ze.numIntersection!==Ae.numIntersection)||ze.vertexAlphas!==ot||ze.vertexTangents!==ht||ze.morphTargets!==Qe||ze.morphNormals!==At||ze.morphColors!==Qt||ze.toneMapping!==Yt||ze.morphTargetsCount!==Dn||!!ze.lightProbeGrid!=E.state.lightProbeGridArray.length>0)&&(yt=!0):(yt=!0,ze.__version=X.version);let Ai=ze.currentProgram;yt===!0&&(Ai=gn(X,W,q),I&&X.isNodeMaterial&&I.onUpdateProgram(X,Ai,ze));let Zi=!1,kr=!1,ua=!1,Pt=Ai.getUniforms(),jt=ze.uniforms;if(ae.useProgram(Ai.program)&&(Zi=!0,kr=!0,ua=!0),X.id!==F&&(F=X.id,kr=!0),ze.needsLights){let Ut=hn(E.state.lightProbeGridArray,q);ze.lightProbeGrid!==Ut&&(ze.lightProbeGrid=Ut,kr=!0)}if(Zi||U!==T){ae.buffers.depth.getReversed()&&T.reversedDepth!==!0&&(T._reversedDepth=!0,T.updateProjectionMatrix()),Pt.setValue(N,"projectionMatrix",T.projectionMatrix),Pt.setValue(N,"viewMatrix",T.matrixWorldInverse);let Vr=Pt.map.cameraPosition;Vr!==void 0&&Vr.setValue(N,oe.setFromMatrixPosition(T.matrixWorld)),le.logarithmicDepthBuffer&&Pt.setValue(N,"logDepthBufFC",2/(Math.log(T.far+1)/Math.LN2)),(X.isMeshPhongMaterial||X.isMeshToonMaterial||X.isMeshLambertMaterial||X.isMeshBasicMaterial||X.isMeshStandardMaterial||X.isShaderMaterial)&&Pt.setValue(N,"isOrthographic",T.isOrthographicCamera===!0),U!==T&&(U=T,kr=!0,ua=!0)}if(ze.needsLights&&(hi.state.directionalShadowMap.length>0&&Pt.setValue(N,"directionalShadowMap",hi.state.directionalShadowMap,v),hi.state.spotShadowMap.length>0&&Pt.setValue(N,"spotShadowMap",hi.state.spotShadowMap,v),hi.state.pointShadowMap.length>0&&Pt.setValue(N,"pointShadowMap",hi.state.pointShadowMap,v)),q.isSkinnedMesh){Pt.setOptional(N,q,"bindMatrix"),Pt.setOptional(N,q,"bindMatrixInverse");let Ut=q.skeleton;Ut&&(Ut.boneTexture===null&&Ut.computeBoneTexture(),Pt.setValue(N,"boneTexture",Ut.boneTexture,v))}q.isBatchedMesh&&(Pt.setOptional(N,q,"batchingTexture"),Pt.setValue(N,"batchingTexture",q._matricesTexture,v),Pt.setOptional(N,q,"batchingIdTexture"),Pt.setValue(N,"batchingIdTexture",q._indirectTexture,v),Pt.setOptional(N,q,"batchingColorTexture"),q._colorsTexture!==null&&Pt.setValue(N,"batchingColorTexture",q._colorsTexture,v));let zr=$.morphAttributes;if((zr.position!==void 0||zr.normal!==void 0||zr.color!==void 0)&&Te.update(q,$,Ai),(kr||ze.receiveShadow!==q.receiveShadow)&&(ze.receiveShadow=q.receiveShadow,Pt.setValue(N,"receiveShadow",q.receiveShadow)),(X.isMeshStandardMaterial||X.isMeshLambertMaterial||X.isMeshPhongMaterial)&&X.envMap===null&&W.environment!==null&&(jt.envMapIntensity.value=W.environmentIntensity),jt.dfgLUT!==void 0&&(jt.dfgLUT.value=u1()),kr){if(Pt.setValue(N,"toneMappingExposure",P.toneMappingExposure),ze.needsLights&&dr(jt,ua),Ce&&X.fog===!0&&Z.refreshFogUniforms(jt,Ce),Z.refreshMaterialUniforms(jt,X,Be,Oe,E.state.transmissionRenderTarget[T.id]),ze.needsLights&&ze.lightProbeGrid){let Ut=ze.lightProbeGrid;jt.probesSH.value=Ut.texture,jt.probesMin.value.copy(Ut.boundingBox.min),jt.probesMax.value.copy(Ut.boundingBox.max),jt.probesResolution.value.copy(Ut.resolution)}Ga.upload(N,ui(ze),jt,v)}if(X.isShaderMaterial&&X.uniformsNeedUpdate===!0&&(Ga.upload(N,ui(ze),jt,v),X.uniformsNeedUpdate=!1),X.isSpriteMaterial&&Pt.setValue(N,"center",q.center),Pt.setValue(N,"modelViewMatrix",q.modelViewMatrix),Pt.setValue(N,"normalMatrix",q.normalMatrix),Pt.setValue(N,"modelMatrix",q.matrixWorld),X.uniformsGroups!==void 0){let Ut=X.uniformsGroups;for(let Vr=0,ha=Ut.length;Vr<ha;Vr++){let Vp=Ut[Vr];ne.update(Vp,Ai),ne.bind(Vp,Ai)}}return Ai}function dr(T,W){T.ambientLightColor.needsUpdate=W,T.lightProbe.needsUpdate=W,T.directionalLights.needsUpdate=W,T.directionalLightShadows.needsUpdate=W,T.pointLights.needsUpdate=W,T.pointLightShadows.needsUpdate=W,T.spotLights.needsUpdate=W,T.spotLightShadows.needsUpdate=W,T.rectAreaLights.needsUpdate=W,T.hemisphereLights.needsUpdate=W}function ca(T){return T.isMeshLambertMaterial||T.isMeshToonMaterial||T.isMeshPhongMaterial||T.isMeshStandardMaterial||T.isShadowMaterial||T.isShaderMaterial&&T.lights===!0}this.getActiveCubeFace=function(){return z},this.getActiveMipmapLevel=function(){return H},this.getRenderTarget=function(){return D},this.setRenderTargetTextures=function(T,W,$){let X=R.get(T);X.__autoAllocateDepthBuffer=T.resolveDepthBuffer===!1,X.__autoAllocateDepthBuffer===!1&&(X.__useRenderToTexture=!1),R.get(T.texture).__webglTexture=W,R.get(T.depthTexture).__webglTexture=X.__autoAllocateDepthBuffer?void 0:$,X.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(T,W){let $=R.get(T);$.__webglFramebuffer=W,$.__useDefaultFramebuffer=W===void 0};let xn=N.createFramebuffer();this.setRenderTarget=function(T,W=0,$=0){D=T,z=W,H=$;let X=null,q=!1,Ce=!1;if(T){let Ue=R.get(T);if(Ue.__useDefaultFramebuffer!==void 0){ae.bindFramebuffer(N.FRAMEBUFFER,Ue.__webglFramebuffer),Y.copy(T.viewport),Q.copy(T.scissor),L=T.scissorTest,ae.viewport(Y),ae.scissor(Q),ae.setScissorTest(L),F=-1;return}else if(Ue.__webglFramebuffer===void 0)v.setupRenderTarget(T);else if(Ue.__hasExternalTextures)v.rebindTextures(T,R.get(T.texture).__webglTexture,R.get(T.depthTexture).__webglTexture);else if(T.depthBuffer){let ot=T.depthTexture;if(Ue.__boundDepthTexture!==ot){if(ot!==null&&R.has(ot)&&(T.width!==ot.image.width||T.height!==ot.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");v.setupDepthRenderbuffer(T)}}let Xe=T.texture;(Xe.isData3DTexture||Xe.isDataArrayTexture||Xe.isCompressedArrayTexture)&&(Ce=!0);let $e=R.get(T).__webglFramebuffer;T.isWebGLCubeRenderTarget?(Array.isArray($e[W])?X=$e[W][$]:X=$e[W],q=!0):T.samples>0&&v.useMultisampledRTT(T)===!1?X=R.get(T).__webglMultisampledFramebuffer:Array.isArray($e)?X=$e[$]:X=$e,Y.copy(T.viewport),Q.copy(T.scissor),L=T.scissorTest}else Y.copy(he).multiplyScalar(Be).floor(),Q.copy(Me).multiplyScalar(Be).floor(),L=ke;if($!==0&&(X=xn),ae.bindFramebuffer(N.FRAMEBUFFER,X)&&ae.drawBuffers(T,X),ae.viewport(Y),ae.scissor(Q),ae.setScissorTest(L),q){let Ue=R.get(T.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+W,Ue.__webglTexture,$)}else if(Ce){let Ue=W;for(let Xe=0;Xe<T.textures.length;Xe++){let $e=R.get(T.textures[Xe]);N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0+Xe,$e.__webglTexture,$,Ue)}}else if(T!==null&&$!==0){let Ue=R.get(T.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,Ue.__webglTexture,$)}F=-1},this.readRenderTargetPixels=function(T,W,$,X,q,Ce,Ie,Ue=0){if(!(T&&T.isWebGLRenderTarget)){nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Xe=R.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&Ie!==void 0&&(Xe=Xe[Ie]),Xe){ae.bindFramebuffer(N.FRAMEBUFFER,Xe);try{let $e=T.textures[Ue],ot=$e.format,ht=$e.type;if(T.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+Ue),!le.textureFormatReadable(ot)){nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!le.textureTypeReadable(ht)){nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}W>=0&&W<=T.width-X&&$>=0&&$<=T.height-q&&N.readPixels(W,$,X,q,k.convert(ot),k.convert(ht),Ce)}finally{let $e=D!==null?R.get(D).__webglFramebuffer:null;ae.bindFramebuffer(N.FRAMEBUFFER,$e)}}},this.readRenderTargetPixelsAsync=async function(T,W,$,X,q,Ce,Ie,Ue=0){if(!(T&&T.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Xe=R.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&Ie!==void 0&&(Xe=Xe[Ie]),Xe)if(W>=0&&W<=T.width-X&&$>=0&&$<=T.height-q){ae.bindFramebuffer(N.FRAMEBUFFER,Xe);let $e=T.textures[Ue],ot=$e.format,ht=$e.type;if(T.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+Ue),!le.textureFormatReadable(ot))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!le.textureTypeReadable(ht))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let Qe=N.createBuffer();N.bindBuffer(N.PIXEL_PACK_BUFFER,Qe),N.bufferData(N.PIXEL_PACK_BUFFER,Ce.byteLength,N.STREAM_READ),N.readPixels(W,$,X,q,k.convert(ot),k.convert(ht),0);let At=D!==null?R.get(D).__webglFramebuffer:null;ae.bindFramebuffer(N.FRAMEBUFFER,At);let Qt=N.fenceSync(N.SYNC_GPU_COMMANDS_COMPLETE,0);return N.flush(),await Qm(N,Qt,4),N.bindBuffer(N.PIXEL_PACK_BUFFER,Qe),N.getBufferSubData(N.PIXEL_PACK_BUFFER,0,Ce),N.deleteBuffer(Qe),N.deleteSync(Qt),Ce}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(T,W=null,$=0){let X=Math.pow(2,-$),q=Math.floor(T.image.width*X),Ce=Math.floor(T.image.height*X),Ie=W!==null?W.x:0,Ue=W!==null?W.y:0;v.setTexture2D(T,0),N.copyTexSubImage2D(N.TEXTURE_2D,$,0,0,Ie,Ue,q,Ce),ae.unbindTexture()};let Kt=N.createFramebuffer(),wi=N.createFramebuffer();this.copyTextureToTexture=function(T,W,$=null,X=null,q=0,Ce=0){let Ie,Ue,Xe,$e,ot,ht,Qe,At,Qt,Yt=T.isCompressedTexture?T.mipmaps[Ce]:T.image;if($!==null)Ie=$.max.x-$.min.x,Ue=$.max.y-$.min.y,Xe=$.isBox3?$.max.z-$.min.z:1,$e=$.min.x,ot=$.min.y,ht=$.isBox3?$.min.z:0;else{let jt=Math.pow(2,-q);Ie=Math.floor(Yt.width*jt),Ue=Math.floor(Yt.height*jt),T.isDataArrayTexture?Xe=Yt.depth:T.isData3DTexture?Xe=Math.floor(Yt.depth*jt):Xe=1,$e=0,ot=0,ht=0}X!==null?(Qe=X.x,At=X.y,Qt=X.z):(Qe=0,At=0,Qt=0);let Rt=k.convert(W.format),Dn=k.convert(W.type),ze;W.isData3DTexture?(v.setTexture3D(W,0),ze=N.TEXTURE_3D):W.isDataArrayTexture||W.isCompressedArrayTexture?(v.setTexture2DArray(W,0),ze=N.TEXTURE_2D_ARRAY):(v.setTexture2D(W,0),ze=N.TEXTURE_2D),ae.activeTexture(N.TEXTURE0),ae.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,W.flipY),ae.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,W.premultiplyAlpha),ae.pixelStorei(N.UNPACK_ALIGNMENT,W.unpackAlignment);let hi=ae.getParameter(N.UNPACK_ROW_LENGTH),yt=ae.getParameter(N.UNPACK_IMAGE_HEIGHT),Ai=ae.getParameter(N.UNPACK_SKIP_PIXELS),Zi=ae.getParameter(N.UNPACK_SKIP_ROWS),kr=ae.getParameter(N.UNPACK_SKIP_IMAGES);ae.pixelStorei(N.UNPACK_ROW_LENGTH,Yt.width),ae.pixelStorei(N.UNPACK_IMAGE_HEIGHT,Yt.height),ae.pixelStorei(N.UNPACK_SKIP_PIXELS,$e),ae.pixelStorei(N.UNPACK_SKIP_ROWS,ot),ae.pixelStorei(N.UNPACK_SKIP_IMAGES,ht);let ua=T.isDataArrayTexture||T.isData3DTexture,Pt=W.isDataArrayTexture||W.isData3DTexture;if(T.isDepthTexture){let jt=R.get(T),zr=R.get(W),Ut=R.get(jt.__renderTarget),Vr=R.get(zr.__renderTarget);ae.bindFramebuffer(N.READ_FRAMEBUFFER,Ut.__webglFramebuffer),ae.bindFramebuffer(N.DRAW_FRAMEBUFFER,Vr.__webglFramebuffer);for(let ha=0;ha<Xe;ha++)ua&&(N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,R.get(T).__webglTexture,q,ht+ha),N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,R.get(W).__webglTexture,Ce,Qt+ha)),N.blitFramebuffer($e,ot,Ie,Ue,Qe,At,Ie,Ue,N.DEPTH_BUFFER_BIT,N.NEAREST);ae.bindFramebuffer(N.READ_FRAMEBUFFER,null),ae.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else if(q!==0||T.isRenderTargetTexture||R.has(T)){let jt=R.get(T),zr=R.get(W);ae.bindFramebuffer(N.READ_FRAMEBUFFER,Kt),ae.bindFramebuffer(N.DRAW_FRAMEBUFFER,wi);for(let Ut=0;Ut<Xe;Ut++)ua?N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,jt.__webglTexture,q,ht+Ut):N.framebufferTexture2D(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,jt.__webglTexture,q),Pt?N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,zr.__webglTexture,Ce,Qt+Ut):N.framebufferTexture2D(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,zr.__webglTexture,Ce),q!==0?N.blitFramebuffer($e,ot,Ie,Ue,Qe,At,Ie,Ue,N.COLOR_BUFFER_BIT,N.NEAREST):Pt?N.copyTexSubImage3D(ze,Ce,Qe,At,Qt+Ut,$e,ot,Ie,Ue):N.copyTexSubImage2D(ze,Ce,Qe,At,$e,ot,Ie,Ue);ae.bindFramebuffer(N.READ_FRAMEBUFFER,null),ae.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else Pt?T.isDataTexture||T.isData3DTexture?N.texSubImage3D(ze,Ce,Qe,At,Qt,Ie,Ue,Xe,Rt,Dn,Yt.data):W.isCompressedArrayTexture?N.compressedTexSubImage3D(ze,Ce,Qe,At,Qt,Ie,Ue,Xe,Rt,Yt.data):N.texSubImage3D(ze,Ce,Qe,At,Qt,Ie,Ue,Xe,Rt,Dn,Yt):T.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,Ce,Qe,At,Ie,Ue,Rt,Dn,Yt.data):T.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,Ce,Qe,At,Yt.width,Yt.height,Rt,Yt.data):N.texSubImage2D(N.TEXTURE_2D,Ce,Qe,At,Ie,Ue,Rt,Dn,Yt);ae.pixelStorei(N.UNPACK_ROW_LENGTH,hi),ae.pixelStorei(N.UNPACK_IMAGE_HEIGHT,yt),ae.pixelStorei(N.UNPACK_SKIP_PIXELS,Ai),ae.pixelStorei(N.UNPACK_SKIP_ROWS,Zi),ae.pixelStorei(N.UNPACK_SKIP_IMAGES,kr),Ce===0&&W.generateMipmaps&&N.generateMipmap(ze),ae.unbindTexture()},this.initRenderTarget=function(T){R.get(T).__webglFramebuffer===void 0&&v.setupRenderTarget(T)},this.initTexture=function(T){T.isCubeTexture?v.setTextureCube(T,0):T.isData3DTexture?v.setTexture3D(T,0):T.isDataArrayTexture||T.isCompressedArrayTexture?v.setTexture2DArray(T,0):v.setTexture2D(T,0),ae.unbindTexture()},this.resetState=function(){z=0,H=0,D=null,ae.reset(),_e.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return zi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=_t._getDrawingBufferColorSpace(e),t.unpackColorSpace=_t._getUnpackColorSpace()}};function wr(r){if(r===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return r}function Wg(r,e){r.prototype=Object.create(e.prototype),r.prototype.constructor=r,r.__proto__=e}var oi={autoSleep:120,force3D:"auto",nullTargetWarn:1,units:{lineHeight:""}},fl={duration:.5,overwrite:!1,delay:0},Fd,An,kt,Ii=1e8,Dt=1/Ii,wd=Math.PI*2,h1=wd/4,f1=0,Xg=Math.sqrt,d1=Math.cos,p1=Math.sin,pn=function(e){return typeof e=="string"},Zt=function(e){return typeof e=="function"},Cr=function(e){return typeof e=="number"},oh=function(e){return typeof e>"u"},lr=function(e){return typeof e=="object"},ai=function(e){return e!==!1},Od=function(){return typeof window<"u"},Qu=function(e){return Zt(e)||pn(e)},qg=typeof ArrayBuffer=="function"&&ArrayBuffer.isView||function(){},kn=Array.isArray,m1=/random\([^)]+\)/g,g1=/,\s*/g,Fg=/(?:-?\.?\d|\.)+/gi,Bd=/[-+=.]*\d+[.e\-+]*\d*[e\-+]*\d*/g,Gs=/[-+=.]*\d+[.e-]*\d*[a-z%]*/g,vd=/[-+=.]*\d+\.?\d*(?:e-|e\+)?\d*/gi,kd=/[+-]=-?[.\d]+/,_1=/[^,'"\[\]\s]+/gi,x1=/^[+\-=e\s\d]*\d+[.\d]*([a-z]*|%)\s*$/i,Xt,ar,Ad,zd,xi={},nh={},Yg,Zg=function(e){return(nh=Ya(e,xi))&&zn},lh=function(e,t){return console.warn("Invalid property",e,"set to",t,"Missing plugin? gsap.registerPlugin()")},dl=function(e,t){return!t&&console.warn(e)},Jg=function(e,t){return e&&(xi[e]=t)&&nh&&(nh[e]=t)||xi},pl=function(){return 0},v1={suppressEvents:!0,isStart:!0,kill:!1},ju={suppressEvents:!0,kill:!1},y1={suppressEvents:!0},Vd={},us=[],Cd={},$g,ri={},yd={},Og=30,eh=[],Hd="",Gd=function(e){var t=e[0],n,i;if(lr(t)||Zt(t)||(e=[e]),!(n=(t._gsap||{}).harness)){for(i=eh.length;i--&&!eh[i].targetTest(t););n=eh[i]}for(i=e.length;i--;)e[i]&&(e[i]._gsap||(e[i]._gsap=new Yd(e[i],n)))||e.splice(i,1);return e},hs=function(e){return e._gsap||Gd(Di(e))[0]._gsap},Wd=function(e,t,n){return(n=e[t])&&Zt(n)?e[t]():oh(n)&&e.getAttribute&&e.getAttribute(t)||n},Zn=function(e,t){return(e=e.split(",")).forEach(t)||e},Jt=function(e){return Math.round(e*1e5)/1e5||0},Wt=function(e){return Math.round(e*1e7)/1e7||0},Ws=function(e,t){var n=t.charAt(0),i=parseFloat(t.substr(2));return e=parseFloat(e),n==="+"?e+i:n==="-"?e-i:n==="*"?e*i:e/i},S1=function(e,t){for(var n=t.length,i=0;e.indexOf(t[i])<0&&++i<n;);return i<n},ih=function(){var e=us.length,t=us.slice(0),n,i;for(Cd={},us.length=0,n=0;n<e;n++)i=t[n],i&&i._lazy&&(i.render(i._lazy[0],i._lazy[1],!0)._lazy=0)},Xd=function(e){return!!(e._initted||e._startAt||e.add)},Kg=function(e,t,n,i){us.length&&!An&&ih(),e.render(t,n,i||!!(An&&t<0&&Xd(e))),us.length&&!An&&ih()},Qg=function(e){var t=parseFloat(e);return(t||t===0)&&(e+"").match(_1).length<2?t:pn(e)?e.trim():e},jg=function(e){return e},vi=function(e,t){for(var n in t)n in e||(e[n]=t[n]);return e},M1=function(e){return function(t,n){for(var i in n)i in t||i==="duration"&&e||i==="ease"||(t[i]=n[i])}},Ya=function(e,t){for(var n in t)e[n]=t[n];return e},Bg=function r(e,t){for(var n in t)n!=="__proto__"&&n!=="constructor"&&n!=="prototype"&&(e[n]=lr(t[n])?r(e[n]||(e[n]={}),t[n]):t[n]);return e},rh=function(e,t){var n={},i;for(i in e)i in t||(n[i]=e[i]);return n},cl=function(e){var t=e.parent||Xt,n=e.keyframes?M1(kn(e.keyframes)):vi;if(ai(e.inherit))for(;t;)n(e,t.vars.defaults),t=t.parent||t._dp;return e},b1=function(e,t){for(var n=e.length,i=n===t.length;i&&n--&&e[n]===t[n];);return n<0},e0=function(e,t,n,i,s){n===void 0&&(n="_first"),i===void 0&&(i="_last");var a=e[i],o;if(s)for(o=t[s];a&&a[s]>o;)a=a._prev;return a?(t._next=a._next,a._next=t):(t._next=e[n],e[n]=t),t._next?t._next._prev=t:e[i]=t,t._prev=a,t.parent=t._dp=e,t},ch=function(e,t,n,i){n===void 0&&(n="_first"),i===void 0&&(i="_last");var s=t._prev,a=t._next;s?s._next=a:e[n]===t&&(e[n]=a),a?a._prev=s:e[i]===t&&(e[i]=s),t._next=t._prev=t.parent=null},fs=function(e,t){e.parent&&(!t||e.parent.autoRemoveChildren)&&e.parent.remove&&e.parent.remove(e),e._act=0},zs=function(e,t){if(e&&(!t||t._end>e._dur||t._start<0))for(var n=e;n;)n._dirty=1,n=n.parent;return e},T1=function(e){for(var t=e.parent;t&&t.parent;)t._dirty=1,t.totalDuration(),t=t.parent;return e},Rd=function(e,t,n,i){return e._startAt&&(An?e._startAt.revert(ju):e.vars.immediateRender&&!e.vars.autoRevert||e._startAt.render(t,!0,i))},E1=function r(e){return!e||e._ts&&r(e.parent)},kg=function(e){return e._repeat?Za(e._tTime,e=e.duration()+e._rDelay)*e:0},Za=function(e,t){var n=Math.floor(e=Wt(e/t));return e&&n===e?n-1:n},sh=function(e,t){return(e-t._start)*t._ts+(t._ts>=0?0:t._dirty?t.totalDuration():t._tDur)},uh=function(e){return e._end=Wt(e._start+(e._tDur/Math.abs(e._ts||e._rts||Dt)||0))},hh=function(e,t){var n=e._dp;return n&&n.smoothChildTiming&&e._ts&&(e._start=Wt(n._time-(e._ts>0?t/e._ts:((e._dirty?e.totalDuration():e._tDur)-t)/-e._ts)),uh(e),n._dirty||zs(n,e)),e},t0=function(e,t){var n;if((t._time||!t._dur&&t._initted||t._start<e._time&&(t._dur||!t.add))&&(n=sh(e.rawTime(),t),(!t._dur||_l(0,t.totalDuration(),n)-t._tTime>Dt)&&t.render(n,!0)),zs(e,t)._dp&&e._initted&&e._time>=e._dur&&e._ts){if(e._dur<e.duration())for(n=e;n._dp;)n.rawTime()>=0&&n.totalTime(n._tTime),n=n._dp;e._zTime=-Dt}},or=function(e,t,n,i){return t.parent&&fs(t),t._start=Wt((Cr(n)?n:n||e!==Xt?Pi(e,n,t):e._time)+t._delay),t._end=Wt(t._start+(t.totalDuration()/Math.abs(t.timeScale())||0)),e0(e,t,"_first","_last",e._sort?"_start":0),Pd(t)||(e._recent=t),i||t0(e,t),e._ts<0&&hh(e,e._tTime),e},n0=function(e,t){return(xi.ScrollTrigger||lh("scrollTrigger",t))&&xi.ScrollTrigger.create(t,e)},i0=function(e,t,n,i,s){if($d(e,t,s),!e._initted)return 1;if(!n&&e._pt&&!An&&(e._dur&&e.vars.lazy!==!1||!e._dur&&e.vars.lazy)&&$g!==si.frame)return us.push(e),e._lazy=[s,i],1},w1=function r(e){var t=e.parent;return t&&t._ts&&t._initted&&!t._lock&&(t.rawTime()<0||r(t))},Pd=function(e){var t=e.data;return t==="isFromStart"||t==="isStart"},A1=function(e,t,n,i){var s=e.ratio,a=t<0||!t&&(!e._start&&w1(e)&&!(!e._initted&&Pd(e))||(e._ts<0||e._dp._ts<0)&&!Pd(e))?0:1,o=e._rDelay,l=0,c,u,d;if(o&&e._repeat&&(l=_l(0,e._tDur,t),u=Za(l,o),e._yoyo&&u&1&&(a=1-a),u!==Za(e._tTime,o)&&(s=1-a,e.vars.repeatRefresh&&e._initted&&e.invalidate())),a!==s||An||i||e._zTime===Dt||!t&&e._zTime){if(!e._initted&&i0(e,t,i,n,l))return;for(d=e._zTime,e._zTime=t||(n?Dt:0),n||(n=t&&!d),e.ratio=a,e._from&&(a=1-a),e._time=0,e._tTime=l,c=e._pt;c;)c.r(a,c.d),c=c._next;t<0&&Rd(e,t,n,!0),e._onUpdate&&!n&&_i(e,"onUpdate"),l&&e._repeat&&!n&&e.parent&&_i(e,"onRepeat"),(t>=e._tDur||t<0)&&e.ratio===a&&(a&&fs(e,1),!n&&!An&&(_i(e,a?"onComplete":"onReverseComplete",!0),e._prom&&e._prom()))}else e._zTime||(e._zTime=t)},C1=function(e,t,n){var i;if(n>t)for(i=e._first;i&&i._start<=n;){if(i.data==="isPause"&&i._start>t)return i;i=i._next}else for(i=e._last;i&&i._start>=n;){if(i.data==="isPause"&&i._start<t)return i;i=i._prev}},Ja=function(e,t,n,i){var s=e._repeat,a=Wt(t)||0,o=e._tTime/e._tDur;return o&&!i&&(e._time*=a/e._dur),e._dur=a,e._tDur=s?s<0?1e10:Wt(a*(s+1)+e._rDelay*s):a,o>0&&!i&&hh(e,e._tTime=e._tDur*o),e.parent&&uh(e),n||zs(e.parent,e),e},zg=function(e){return e instanceof Bn?zs(e):Ja(e,e._dur)},R1={_start:0,endTime:pl,totalDuration:pl},Pi=function r(e,t,n){var i=e.labels,s=e._recent||R1,a=e.duration()>=Ii?s.endTime(!1):e._dur,o,l,c;return pn(t)&&(isNaN(t)||t in i)?(l=t.charAt(0),c=t.substr(-1)==="%",o=t.indexOf("="),l==="<"||l===">"?(o>=0&&(t=t.replace(/=/,"")),(l==="<"?s._start:s.endTime(s._repeat>=0))+(parseFloat(t.substr(1))||0)*(c?(o<0?s:n).totalDuration()/100:1)):o<0?(t in i||(i[t]=a),i[t]):(l=parseFloat(t.charAt(o-1)+t.substr(o+1)),c&&n&&(l=l/100*(kn(n)?n[0]:n).totalDuration()),o>1?r(e,t.substr(0,o-1),n)+l:a+l)):t==null?a:+t},ul=function(e,t,n){var i=Cr(t[1]),s=(i?2:1)+(e<2?0:1),a=t[s],o,l;if(i&&(a.duration=t[1]),a.parent=n,e){for(o=a,l=n;l&&!("immediateRender"in o);)o=l.vars.defaults||{},l=ai(l.vars.inherit)&&l.parent;a.immediateRender=ai(o.immediateRender),e<2?a.runBackwards=1:a.startAt=t[s-1]}return new tn(t[0],a,t[s+1])},ds=function(e,t){return e||e===0?t(e):t},_l=function(e,t,n){return n<e?e:n>t?t:n},Cn=function(e,t){return!pn(e)||!(t=x1.exec(e))?"":t[1]},P1=function(e,t,n){return ds(n,function(i){return _l(e,t,i)})},Id=[].slice,r0=function(e,t){return e&&lr(e)&&"length"in e&&(!t&&!e.length||e.length-1 in e&&lr(e[0]))&&!e.nodeType&&e!==ar},I1=function(e,t,n){return n===void 0&&(n=[]),e.forEach(function(i){var s;return pn(i)&&!t||r0(i,1)?(s=n).push.apply(s,Di(i)):n.push(i)})||n},Di=function(e,t,n){return kt&&!t&&kt.selector?kt.selector(e):pn(e)&&!n&&(Ad||!$a())?Id.call((t||zd).querySelectorAll(e),0):kn(e)?I1(e,n):r0(e)?Id.call(e,0):e?[e]:[]},Dd=function(e){return e=Di(e)[0]||dl("Invalid scope")||{},function(t){var n=e.current||e.nativeElement||e;return Di(t,n.querySelectorAll?n:n===e?dl("Invalid scope")||zd.createElement("div"):e)}},s0=function(e){return e.sort(function(){return .5-Math.random()})},a0=function(e){if(Zt(e))return e;var t=lr(e)?e:{each:e},n=Vs(t.ease),i=t.from||0,s=parseFloat(t.base)||0,a={},o=i>0&&i<1,l=isNaN(i)||o,c=t.axis,u=i,d=i;return pn(i)?u=d={center:.5,edges:.5,end:1}[i]||0:!o&&l&&(u=i[0],d=i[1]),function(h,f,m){var _=(m||t).length,p=a[_],g,S,M,x,C,E,w,y,b;if(!p){if(b=t.grid==="auto"?0:(t.grid||[1,Ii])[1],!b){for(w=-Ii;w<(w=m[b++].getBoundingClientRect().left)&&b<_;);b<_&&b--}for(p=a[_]=[],g=l?Math.min(b,_)*u-.5:i%b,S=b===Ii?0:l?_*d/b-.5:i/b|0,w=0,y=Ii,E=0;E<_;E++)M=E%b-g,x=S-(E/b|0),p[E]=C=c?Math.abs(c==="y"?x:M):Xg(M*M+x*x),C>w&&(w=C),C<y&&(y=C);i==="random"&&s0(p),p.max=w-y,p.min=y,p.v=_=(parseFloat(t.amount)||parseFloat(t.each)*(b>_?_-1:c?c==="y"?_/b:b:Math.max(b,_/b))||0)*(i==="edges"?-1:1),p.b=_<0?s-_:s,p.u=Cn(t.amount||t.each)||0,n=n&&_<0?W1(n):n}return _=(p[h]-p.min)/p.max||0,Wt(p.b+(n?n(_):_)*p.v)+p.u}},Ld=function(e){var t=Math.pow(10,((e+"").split(".")[1]||"").length);return function(n){var i=Wt(Math.round(parseFloat(n)/e)*e*t);return(i-i%1)/t+(Cr(n)?0:Cn(n))}},o0=function(e,t){var n=kn(e),i,s;return!n&&lr(e)&&(i=n=e.radius||Ii,e.values?(e=Di(e.values),(s=!Cr(e[0]))&&(i*=i)):e=Ld(e.increment)),ds(t,n?Zt(e)?function(a){return s=e(a),Math.abs(s-a)<=i?s:a}:function(a){for(var o=parseFloat(s?a.x:a),l=parseFloat(s?a.y:0),c=Ii,u=0,d=e.length,h,f;d--;)s?(h=e[d].x-o,f=e[d].y-l,h=h*h+f*f):h=Math.abs(e[d]-o),h<c&&(c=h,u=d);return u=!i||c<=i?e[u]:a,s||u===a||Cr(a)?u:u+Cn(a)}:Ld(e))},l0=function(e,t,n,i){return ds(kn(e)?!t:n===!0?!!(n=0):!i,function(){return kn(e)?e[~~(Math.random()*e.length)]:(n=n||1e-5)&&(i=n<1?Math.pow(10,(n+"").length-2):1)&&Math.floor(Math.round((e-n/2+Math.random()*(t-e+n*.99))/n)*n*i)/i})},D1=function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return function(i){return t.reduce(function(s,a){return a(s)},i)}},L1=function(e,t){return function(n){return e(parseFloat(n))+(t||Cn(n))}},U1=function(e,t,n){return u0(e,t,0,1,n)},c0=function(e,t,n){return ds(n,function(i){return e[~~t(i)]})},N1=function r(e,t,n){var i=t-e;return kn(e)?c0(e,r(0,e.length),t):ds(n,function(s){return(i+(s-e)%i)%i+e})},F1=function r(e,t,n){var i=t-e,s=i*2;return kn(e)?c0(e,r(0,e.length-1),t):ds(n,function(a){return a=(s+(a-e)%s)%s||0,e+(a>i?s-a:a)})},Ka=function(e){return e.replace(m1,function(t){var n=t.indexOf("[")+1,i=t.substring(n||7,n?t.indexOf("]"):t.length-1).split(g1);return l0(n?i:+i[0],n?0:+i[1],+i[2]||1e-5)})},u0=function(e,t,n,i,s){var a=t-e,o=i-n;return ds(s,function(l){return n+((l-e)/a*o||0)})},O1=function r(e,t,n,i){var s=isNaN(e+t)?0:function(f){return(1-f)*e+f*t};if(!s){var a=pn(e),o={},l,c,u,d,h;if(n===!0&&(i=1)&&(n=null),a)e={p:e},t={p:t};else if(kn(e)&&!kn(t)){for(u=[],d=e.length,h=d-2,c=1;c<d;c++)u.push(r(e[c-1],e[c]));d--,s=function(m){m*=d;var _=Math.min(h,~~m);return u[_](m-_)},n=t}else i||(e=Ya(kn(e)?[]:{},e));if(!u){for(l in t)Zd.call(o,e,l,"get",t[l]);s=function(m){return jd(m,o)||(a?e.p:e)}}}return ds(n,s)},Vg=function(e,t,n){var i=e.labels,s=Ii,a,o,l;for(a in i)o=i[a]-t,o<0==!!n&&o&&s>(o=Math.abs(o))&&(l=a,s=o);return l},_i=function(e,t,n){var i=e.vars,s=i[t],a=kt,o=e._ctx,l,c,u;if(s)return l=i[t+"Params"],c=i.callbackScope||e,n&&us.length&&ih(),o&&(kt=o),u=l?s.apply(c,l):s.call(c),kt=a,u},ol=function(e){return fs(e),e.scrollTrigger&&e.scrollTrigger.kill(!!An),e.progress()<1&&_i(e,"onInterrupt"),e},qa,h0=[],f0=function(e){if(e)if(e=!e.name&&e.default||e,Od()||e.headless){var t=e.name,n=Zt(e),i=t&&!n&&e.init?function(){this._props=[]}:e,s={init:pl,render:jd,add:Zd,kill:eT,modifier:j1,rawVars:0},a={targetTest:0,get:0,getSetter:fh,aliases:{},register:0};if($a(),e!==i){if(ri[t])return;vi(i,vi(rh(e,s),a)),Ya(i.prototype,Ya(s,rh(e,a))),ri[i.prop=t]=i,e.targetTest&&(eh.push(i),Vd[t]=1),t=(t==="css"?"CSS":t.charAt(0).toUpperCase()+t.substr(1))+"Plugin"}Jg(t,i),e.register&&e.register(zn,i,Jn)}else h0.push(e)},It=255,ll={aqua:[0,It,It],lime:[0,It,0],silver:[192,192,192],black:[0,0,0],maroon:[128,0,0],teal:[0,128,128],blue:[0,0,It],navy:[0,0,128],white:[It,It,It],olive:[128,128,0],yellow:[It,It,0],orange:[It,165,0],gray:[128,128,128],purple:[128,0,128],green:[0,128,0],red:[It,0,0],pink:[It,192,203],cyan:[0,It,It],transparent:[It,It,It,0]},Sd=function(e,t,n){return e+=e<0?1:e>1?-1:0,(e*6<1?t+(n-t)*e*6:e<.5?n:e*3<2?t+(n-t)*(2/3-e)*6:t)*It+.5|0},d0=function(e,t,n){var i=e?Cr(e)?[e>>16,e>>8&It,e&It]:0:ll.black,s,a,o,l,c,u,d,h,f,m;if(!i){if(e.substr(-1)===","&&(e=e.substr(0,e.length-1)),ll[e])i=ll[e];else if(e.charAt(0)==="#"){if(e.length<6&&(s=e.charAt(1),a=e.charAt(2),o=e.charAt(3),e="#"+s+s+a+a+o+o+(e.length===5?e.charAt(4)+e.charAt(4):"")),e.length===9)return i=parseInt(e.substr(1,6),16),[i>>16,i>>8&It,i&It,parseInt(e.substr(7),16)/255];e=parseInt(e.substr(1),16),i=[e>>16,e>>8&It,e&It]}else if(e.substr(0,3)==="hsl"){if(i=m=e.match(Fg),!t)l=+i[0]%360/360,c=+i[1]/100,u=+i[2]/100,a=u<=.5?u*(c+1):u+c-u*c,s=u*2-a,i.length>3&&(i[3]*=1),i[0]=Sd(l+1/3,s,a),i[1]=Sd(l,s,a),i[2]=Sd(l-1/3,s,a);else if(~e.indexOf("="))return i=e.match(Bd),n&&i.length<4&&(i[3]=1),i}else i=e.match(Fg)||ll.transparent;i=i.map(Number)}return t&&!m&&(s=i[0]/It,a=i[1]/It,o=i[2]/It,d=Math.max(s,a,o),h=Math.min(s,a,o),u=(d+h)/2,d===h?l=c=0:(f=d-h,c=u>.5?f/(2-d-h):f/(d+h),l=d===s?(a-o)/f+(a<o?6:0):d===a?(o-s)/f+2:(s-a)/f+4,l*=60),i[0]=~~(l+.5),i[1]=~~(c*100+.5),i[2]=~~(u*100+.5)),n&&i.length<4&&(i[3]=1),i},p0=function(e){var t=[],n=[],i=-1;return e.split(Ar).forEach(function(s){var a=s.match(Gs)||[];t.push.apply(t,a),n.push(i+=a.length+1)}),t.c=n,t},Hg=function(e,t,n){var i="",s=(e+i).match(Ar),a=t?"hsla(":"rgba(",o=0,l,c,u,d;if(!s)return e;if(s=s.map(function(h){return(h=d0(h,t,1))&&a+(t?h[0]+","+h[1]+"%,"+h[2]+"%,"+h[3]:h.join(","))+")"}),n&&(u=p0(e),l=n.c,l.join(i)!==u.c.join(i)))for(c=e.replace(Ar,"1").split(Gs),d=c.length-1;o<d;o++)i+=c[o]+(~l.indexOf(o)?s.shift()||a+"0,0,0,0)":(u.length?u:s.length?s:n).shift());if(!c)for(c=e.split(Ar),d=c.length-1;o<d;o++)i+=c[o]+s[o];return i+c[d]},Ar=(function(){var r="(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#(?:[0-9a-f]{3,4}){1,2}\\b",e;for(e in ll)r+="|"+e+"\\b";return new RegExp(r+")","gi")})(),B1=/hsl[a]?\(/,qd=function(e){var t=e.join(" "),n;if(Ar.lastIndex=0,Ar.test(t))return n=B1.test(t),e[1]=Hg(e[1],n),e[0]=Hg(e[0],n,p0(e[1])),!0},ml,si=(function(){var r=Date.now,e=500,t=33,n=r(),i=n,s=1e3/240,a=s,o=[],l,c,u,d,h,f,m=function _(p){var g=r()-i,S=p===!0,M,x,C,E;if((g>e||g<0)&&(n+=g-t),i+=g,C=i-n,M=C-a,(M>0||S)&&(E=++d.frame,h=C-d.time*1e3,d.time=C=C/1e3,a+=M+(M>=s?4:s-M),x=1),S||(l=c(_)),x)for(f=0;f<o.length;f++)o[f](C,h,E,p)};return d={time:0,frame:0,tick:function(){m(!0)},deltaRatio:function(p){return h/(1e3/(p||60))},wake:function(){Yg&&(!Ad&&Od()&&(ar=Ad=window,zd=ar.document||{},xi.gsap=zn,(ar.gsapVersions||(ar.gsapVersions=[])).push(zn.version),Zg(nh||ar.GreenSockGlobals||!ar.gsap&&ar||{}),h0.forEach(f0)),u=typeof requestAnimationFrame<"u"&&requestAnimationFrame,l&&d.sleep(),c=u||function(p){return setTimeout(p,a-d.time*1e3+1|0)},ml=1,m(2))},sleep:function(){(u?cancelAnimationFrame:clearTimeout)(l),ml=0,c=pl},lagSmoothing:function(p,g){e=p||1/0,t=Math.min(g||33,e)},fps:function(p){s=1e3/(p||240),a=d.time*1e3+s},add:function(p,g,S){var M=g?function(x,C,E,w){p(x,C,E,w),d.remove(M)}:p;return d.remove(p),o[S?"unshift":"push"](M),$a(),M},remove:function(p,g){~(g=o.indexOf(p))&&o.splice(g,1)&&f>=g&&f--},_listeners:o},d})(),$a=function(){return!ml&&si.wake()},vt={},k1=/^[\d.\-M][\d.\-,\s]/,z1=/["']/g,V1=function(e){for(var t={},n=e.substr(1,e.length-3).split(":"),i=n[0],s=1,a=n.length,o,l,c;s<a;s++)l=n[s],o=s!==a-1?l.lastIndexOf(","):l.length,c=l.substr(0,o),t[i]=isNaN(c)?c.replace(z1,"").trim():+c,i=l.substr(o+1).trim();return t},H1=function(e){var t=e.indexOf("(")+1,n=e.indexOf(")"),i=e.indexOf("(",t);return e.substring(t,~i&&i<n?e.indexOf(")",n+1):n)},G1=function(e){var t=(e+"").split("("),n=vt[t[0]];return n&&t.length>1&&n.config?n.config.apply(null,~e.indexOf("{")?[V1(t[1])]:H1(e).split(",").map(Qg)):vt._CE&&k1.test(e)?vt._CE("",e):n},W1=function(e){return function(t){return 1-e(1-t)}},Vs=function(e,t){return e&&(Zt(e)?e:vt[e]||G1(e))||t},Xs=function(e,t,n,i){n===void 0&&(n=function(l){return 1-t(1-l)}),i===void 0&&(i=function(l){return l<.5?t(l*2)/2:1-t((1-l)*2)/2});var s={easeIn:t,easeOut:n,easeInOut:i},a;return Zn(e,function(o){vt[o]=xi[o]=s,vt[a=o.toLowerCase()]=n;for(var l in s)vt[a+(l==="easeIn"?".in":l==="easeOut"?".out":".inOut")]=vt[o+"."+l]=s[l]}),s},m0=function(e){return function(t){return t<.5?(1-e(1-t*2))/2:.5+e((t-.5)*2)/2}},Md=function r(e,t,n){var i=t>=1?t:1,s=(n||(e?.3:.45))/(t<1?t:1),a=s/wd*(Math.asin(1/i)||0),o=function(u){return u===1?1:i*Math.pow(2,-10*u)*p1((u-a)*s)+1},l=e==="out"?o:e==="in"?function(c){return 1-o(1-c)}:m0(o);return s=wd/s,l.config=function(c,u){return r(e,c,u)},l},bd=function r(e,t){t===void 0&&(t=1.70158);var n=function(a){return a?--a*a*((t+1)*a+t)+1:0},i=e==="out"?n:e==="in"?function(s){return 1-n(1-s)}:m0(n);return i.config=function(s){return r(e,s)},i};Zn("Linear,Quad,Cubic,Quart,Quint,Strong",function(r,e){var t=e<5?e+1:e;Xs(r+",Power"+(t-1),e?function(n){return Math.pow(n,t)}:function(n){return n},function(n){return 1-Math.pow(1-n,t)},function(n){return n<.5?Math.pow(n*2,t)/2:1-Math.pow((1-n)*2,t)/2})});vt.Linear.easeNone=vt.none=vt.Linear.easeIn;Xs("Elastic",Md("in"),Md("out"),Md());(function(r,e){var t=1/e,n=2*t,i=2.5*t,s=function(o){return o<t?r*o*o:o<n?r*Math.pow(o-1.5/e,2)+.75:o<i?r*(o-=2.25/e)*o+.9375:r*Math.pow(o-2.625/e,2)+.984375};Xs("Bounce",function(a){return 1-s(1-a)},s)})(7.5625,2.75);Xs("Expo",function(r){return Math.pow(2,10*(r-1))*r+r*r*r*r*r*r*(1-r)});Xs("Circ",function(r){return-(Xg(1-r*r)-1)});Xs("Sine",function(r){return r===1?1:-d1(r*h1)+1});Xs("Back",bd("in"),bd("out"),bd());vt.SteppedEase=vt.steps=xi.SteppedEase={config:function(e,t){e===void 0&&(e=1);var n=1/e,i=e+(t?0:1),s=t?1:0,a=1-Dt;return function(o){return((i*_l(0,a,o)|0)+s)*n}}};fl.ease=vt["quad.out"];Zn("onComplete,onUpdate,onStart,onRepeat,onReverseComplete,onInterrupt",function(r){return Hd+=r+","+r+"Params,"});var Yd=function(e,t){this.id=f1++,e._gsap=this,this.target=e,this.harness=t,this.get=t?t.get:Wd,this.set=t?t.getSetter:fh},gl=(function(){function r(t){this.vars=t,this._delay=+t.delay||0,(this._repeat=t.repeat===1/0?-2:t.repeat||0)&&(this._rDelay=t.repeatDelay||0,this._yoyo=!!t.yoyo||!!t.yoyoEase),this._ts=1,Ja(this,+t.duration,1,1),this.data=t.data,kt&&(this._ctx=kt,kt.data.push(this)),ml||si.wake()}var e=r.prototype;return e.delay=function(n){return n||n===0?(this.parent&&this.parent.smoothChildTiming&&this.startTime(this._start+n-this._delay),this._delay=n,this):this._delay},e.duration=function(n){return arguments.length?this.totalDuration(this._repeat>0?n+(n+this._rDelay)*this._repeat:n):this.totalDuration()&&this._dur},e.totalDuration=function(n){return arguments.length?(this._dirty=0,Ja(this,this._repeat<0?n:(n-this._repeat*this._rDelay)/(this._repeat+1))):this._tDur},e.totalTime=function(n,i){if($a(),!arguments.length)return this._tTime;var s=this._dp;if(s&&s.smoothChildTiming&&this._ts){for(hh(this,n),!s._dp||s.parent||t0(s,this);s&&s.parent;)s.parent._time!==s._start+(s._ts>=0?s._tTime/s._ts:(s.totalDuration()-s._tTime)/-s._ts)&&s.totalTime(s._tTime,!0),s=s.parent;!this.parent&&this._dp.autoRemoveChildren&&(this._ts>0&&n<this._tDur||this._ts<0&&n>0||!this._tDur&&!n)&&or(this._dp,this,this._start-this._delay)}return(this._tTime!==n||!this._dur&&!i||this._initted&&Math.abs(this._zTime)===Dt||!this._initted&&this._dur&&n||!n&&!this._initted&&(this.add||this._ptLookup))&&(this._ts||(this._pTime=n),Kg(this,n,i)),this},e.time=function(n,i){return arguments.length?this.totalTime(Math.min(this.totalDuration(),n+kg(this))%(this._dur+this._rDelay)||(n?this._dur:0),i):this._time},e.totalProgress=function(n,i){return arguments.length?this.totalTime(this.totalDuration()*n,i):this.totalDuration()?Math.min(1,this._tTime/this._tDur):this.rawTime()>=0&&this._initted?1:0},e.progress=function(n,i){return arguments.length?this.totalTime(this.duration()*(this._yoyo&&!(this.iteration()&1)?1-n:n)+kg(this),i):this.duration()?Math.min(1,this._time/this._dur):this.rawTime()>0?1:0},e.iteration=function(n,i){var s=this.duration()+this._rDelay;return arguments.length?this.totalTime(this._time+(n-1)*s,i):this._repeat?Za(this._tTime,s)+1:1},e.timeScale=function(n,i){if(!arguments.length)return this._rts===-Dt?0:this._rts;if(this._rts===n)return this;var s=this.parent&&this._ts?sh(this.parent._time,this):this._tTime;return this._rts=+n||0,this._ts=this._ps||n===-Dt?0:this._rts,this.totalTime(_l(-Math.abs(this._delay),this.totalDuration(),s),i!==!1),uh(this),T1(this)},e.paused=function(n){return arguments.length?(this._ps!==n&&(this._ps=n,n?(this._pTime=this._tTime||Math.max(-this._delay,this.rawTime()),this._ts=this._act=0):($a(),this._ts=this._rts,this.totalTime(this.parent&&!this.parent.smoothChildTiming?this.rawTime():this._tTime||this._pTime,this.progress()===1&&Math.abs(this._zTime)!==Dt&&(this._tTime-=Dt)))),this):this._ps},e.startTime=function(n){if(arguments.length){this._start=Wt(n);var i=this.parent||this._dp;return i&&(i._sort||!this.parent)&&or(i,this,this._start-this._delay),this}return this._start},e.endTime=function(n){return this._start+(ai(n)?this.totalDuration():this.duration())/Math.abs(this._ts||1)},e.rawTime=function(n){var i=this.parent||this._dp;return i?n&&(!this._ts||this._repeat&&this._time&&this.totalProgress()<1)?this._tTime%(this._dur+this._rDelay):this._ts?sh(i.rawTime(n),this):this._tTime:this._tTime},e.revert=function(n){n===void 0&&(n=y1);var i=An;return An=n,Xd(this)&&(this.timeline&&this.timeline.revert(n),this.totalTime(-.01,n.suppressEvents)),this.data!=="nested"&&n.kill!==!1&&this.kill(),An=i,this},e.globalTime=function(n){for(var i=this,s=arguments.length?n:i.rawTime();i;)s=i._start+s/(Math.abs(i._ts)||1),i=i._dp;return!this.parent&&this._sat?this._sat.globalTime(n):s},e.repeat=function(n){return arguments.length?(this._repeat=n===1/0?-2:n,zg(this)):this._repeat===-2?1/0:this._repeat},e.repeatDelay=function(n){if(arguments.length){var i=this._time;return this._rDelay=n,zg(this),i?this.time(i):this}return this._rDelay},e.yoyo=function(n){return arguments.length?(this._yoyo=n,this):this._yoyo},e.seek=function(n,i){return this.totalTime(Pi(this,n),ai(i))},e.restart=function(n,i){return this.play().totalTime(n?-this._delay:0,ai(i)),this._dur||(this._zTime=-Dt),this},e.play=function(n,i){return n!=null&&this.seek(n,i),this.reversed(!1).paused(!1)},e.reverse=function(n,i){return n!=null&&this.seek(n||this.totalDuration(),i),this.reversed(!0).paused(!1)},e.pause=function(n,i){return n!=null&&this.seek(n,i),this.paused(!0)},e.resume=function(){return this.paused(!1)},e.reversed=function(n){return arguments.length?(!!n!==this.reversed()&&this.timeScale(-this._rts||(n?-Dt:0)),this):this._rts<0},e.invalidate=function(){return this._initted=this._act=0,this._zTime=-Dt,this},e.isActive=function(){var n=this.parent||this._dp,i=this._start,s;return!!(!n||this._ts&&this._initted&&n.isActive()&&(s=n.rawTime(!0))>=i&&s<this.endTime(!0)-Dt)},e.eventCallback=function(n,i,s){var a=this.vars;return arguments.length>1?(i?(a[n]=i,s&&(a[n+"Params"]=s),n==="onUpdate"&&(this._onUpdate=i)):delete a[n],this):a[n]},e.then=function(n){var i=this,s=i._prom;return new Promise(function(a){var o=Zt(n)?n:jg,l=function(){var u=i.then;i.then=null,s&&s(),Zt(o)&&(o=o(i))&&(o.then||o===i)&&(i.then=u),a(o),i.then=u};i._initted&&i.totalProgress()===1&&i._ts>=0||!i._tTime&&i._ts<0?l():i._prom=l})},e.kill=function(){ol(this)},r})();vi(gl.prototype,{_time:0,_start:0,_end:0,_tTime:0,_tDur:0,_dirty:0,_repeat:0,_yoyo:!1,parent:null,_initted:!1,_rDelay:0,_ts:1,_dp:0,ratio:0,_zTime:-Dt,_prom:0,_ps:!1,_rts:1});var Bn=(function(r){Wg(e,r);function e(n,i){var s;return n===void 0&&(n={}),s=r.call(this,n)||this,s.labels={},s.smoothChildTiming=!!n.smoothChildTiming,s.autoRemoveChildren=!!n.autoRemoveChildren,s._sort=ai(n.sortChildren),Xt&&or(n.parent||Xt,wr(s),i),n.reversed&&s.reverse(),n.paused&&s.paused(!0),n.scrollTrigger&&n0(wr(s),n.scrollTrigger),s}var t=e.prototype;return t.to=function(i,s,a){return ul(0,arguments,this),this},t.from=function(i,s,a){return ul(1,arguments,this),this},t.fromTo=function(i,s,a,o){return ul(2,arguments,this),this},t.set=function(i,s,a){return s.duration=0,s.parent=this,cl(s).repeatDelay||(s.repeat=0),s.immediateRender=!!s.immediateRender,new tn(i,s,Pi(this,a),1),this},t.call=function(i,s,a){return or(this,tn.delayedCall(0,i,s),a)},t.staggerTo=function(i,s,a,o,l,c,u){return a.duration=s,a.stagger=a.stagger||o,a.onComplete=c,a.onCompleteParams=u,a.parent=this,new tn(i,a,Pi(this,l)),this},t.staggerFrom=function(i,s,a,o,l,c,u){return a.runBackwards=1,cl(a).immediateRender=ai(a.immediateRender),this.staggerTo(i,s,a,o,l,c,u)},t.staggerFromTo=function(i,s,a,o,l,c,u,d){return o.startAt=a,cl(o).immediateRender=ai(o.immediateRender),this.staggerTo(i,s,o,l,c,u,d)},t.render=function(i,s,a){var o=this._time,l=this._dirty?this.totalDuration():this._tDur,c=this._dur,u=i<=0?0:Wt(i),d=this._zTime<0!=i<0&&(this._initted||!c),h,f,m,_,p,g,S,M,x,C,E,w;if(this!==Xt&&u>l&&i>=0&&(u=l),u!==this._tTime||a||d){if(o!==this._time&&c&&(u+=this._time-o,i+=this._time-o),h=u,x=this._start,M=this._ts,g=!M,d&&(c||(o=this._zTime),(i||!s)&&(this._zTime=i)),this._repeat){if(E=this._yoyo,p=c+this._rDelay,this._repeat<-1&&i<0)return this.totalTime(p*100+i,s,a);if(h=Wt(u%p),u===l?(_=this._repeat,h=c):(C=Wt(u/p),_=~~C,_&&_===C&&(h=c,_--),h>c&&(h=c)),C=Za(this._tTime,p),!o&&this._tTime&&C!==_&&this._tTime-C*p-this._dur<=0&&(C=_),E&&_&1&&(h=c-h,w=1),_!==C&&!this._lock){var y=E&&C&1,b=y===(E&&_&1);if(_<C&&(y=!y),o=y?0:u%c?c:u,this._lock=1,this.render(o||(w?0:Wt(_*p)),s,!c)._lock=0,this._tTime=u,!s&&this.parent&&_i(this,"onRepeat"),this.vars.repeatRefresh&&!w&&(this.invalidate()._lock=1,C=_),o&&o!==this._time||g!==!this._ts||this.vars.onRepeat&&!this.parent&&!this._act)return this;if(c=this._dur,l=this._tDur,b&&(this._lock=2,o=y?c:-1e-4,this.render(o,!0),this.vars.repeatRefresh&&!w&&this.invalidate()),this._lock=0,!this._ts&&!g)return this}}if(this._hasPause&&!this._forcing&&this._lock<2&&(S=C1(this,Wt(o),Wt(h)),S&&(u-=h-(h=S._start))),this._tTime=u,this._time=h,this._act=!!M,this._initted||(this._onUpdate=this.vars.onUpdate,this._initted=1,this._zTime=i,o=0),!o&&u&&c&&!s&&!C&&(_i(this,"onStart"),this._tTime!==u))return this;if(h>=o&&i>=0)for(f=this._first;f;){if(m=f._next,(f._act||h>=f._start)&&f._ts&&S!==f){if(f.parent!==this)return this.render(i,s,a);if(f.render(f._ts>0?(h-f._start)*f._ts:(f._dirty?f.totalDuration():f._tDur)+(h-f._start)*f._ts,s,a),h!==this._time||!this._ts&&!g){S=0,m&&(u+=this._zTime=-Dt);break}}f=m}else{f=this._last;for(var P=i<0?i:h;f;){if(m=f._prev,(f._act||P<=f._end)&&f._ts&&S!==f){if(f.parent!==this)return this.render(i,s,a);if(f.render(f._ts>0?(P-f._start)*f._ts:(f._dirty?f.totalDuration():f._tDur)+(P-f._start)*f._ts,s,a||An&&Xd(f)),h!==this._time||!this._ts&&!g){S=0,m&&(u+=this._zTime=P?-Dt:Dt);break}}f=m}}if(S&&!s&&(this.pause(),S.render(h>=o?0:-Dt)._zTime=h>=o?1:-1,this._ts))return this._start=x,uh(this),this.render(i,s,a);this._onUpdate&&!s&&_i(this,"onUpdate",!0),(u===l&&this._tTime>=this.totalDuration()||!u&&o)&&(x===this._start||Math.abs(M)!==Math.abs(this._ts))&&(this._lock||((i||!c)&&(u===l&&this._ts>0||!u&&this._ts<0)&&fs(this,1),!s&&!(i<0&&!o)&&(u||o||!l)&&(_i(this,u===l&&i>=0?"onComplete":"onReverseComplete",!0),this._prom&&!(u<l&&this.timeScale()>0)&&this._prom())))}return this},t.add=function(i,s){var a=this;if(Cr(s)||(s=Pi(this,s,i)),!(i instanceof gl)){if(kn(i))return i.forEach(function(o){return a.add(o,s)}),this;if(pn(i))return this.addLabel(i,s);if(Zt(i))i=tn.delayedCall(0,i);else return this}return this!==i?or(this,i,s):this},t.getChildren=function(i,s,a,o){i===void 0&&(i=!0),s===void 0&&(s=!0),a===void 0&&(a=!0),o===void 0&&(o=-Ii);for(var l=[],c=this._first;c;)c._start>=o&&(c instanceof tn?s&&l.push(c):(a&&l.push(c),i&&l.push.apply(l,c.getChildren(!0,s,a)))),c=c._next;return l},t.getById=function(i){for(var s=this.getChildren(1,1,1),a=s.length;a--;)if(s[a].vars.id===i)return s[a]},t.remove=function(i){return pn(i)?this.removeLabel(i):Zt(i)?this.killTweensOf(i):(i.parent===this&&ch(this,i),i===this._recent&&(this._recent=this._last),zs(this))},t.totalTime=function(i,s){return arguments.length?(this._forcing=1,!this._dp&&this._ts&&(this._start=Wt(si.time-(this._ts>0?i/this._ts:(this.totalDuration()-i)/-this._ts))),r.prototype.totalTime.call(this,i,s),this._forcing=0,this):this._tTime},t.addLabel=function(i,s){return this.labels[i]=Pi(this,s),this},t.removeLabel=function(i){return delete this.labels[i],this},t.addPause=function(i,s,a){var o=tn.delayedCall(0,s||pl,a);return o.data="isPause",this._hasPause=1,or(this,o,Pi(this,i))},t.removePause=function(i){var s=this._first;for(i=Pi(this,i);s;)s._start===i&&s.data==="isPause"&&fs(s),s=s._next},t.killTweensOf=function(i,s,a){for(var o=this.getTweensOf(i,a),l=o.length;l--;)cs!==o[l]&&o[l].kill(i,s);return this},t.getTweensOf=function(i,s){for(var a=[],o=Di(i),l=this._first,c=Cr(s),u;l;)l instanceof tn?S1(l._targets,o)&&(c?(!cs||l._initted&&l._ts)&&l.globalTime(0)<=s&&l.globalTime(l.totalDuration())>s:!s||l.isActive())&&a.push(l):(u=l.getTweensOf(o,s)).length&&a.push.apply(a,u),l=l._next;return a},t.tweenTo=function(i,s){s=s||{};var a=this,o=Pi(a,i),l=s,c=l.startAt,u=l.onStart,d=l.onStartParams,h=l.immediateRender,f,m=tn.to(a,vi({ease:s.ease||"none",lazy:!1,immediateRender:!1,time:o,overwrite:"auto",duration:s.duration||Math.abs((o-(c&&"time"in c?c.time:a._time))/a.timeScale())||Dt,onStart:function(){if(a.pause(),!f){var p=s.duration||Math.abs((o-(c&&"time"in c?c.time:a._time))/a.timeScale());m._dur!==p&&Ja(m,p,0,1).render(m._time,!0,!0),f=1}u&&u.apply(m,d||[])}},s));return h?m.render(0):m},t.tweenFromTo=function(i,s,a){return this.tweenTo(s,vi({startAt:{time:Pi(this,i)}},a))},t.recent=function(){return this._recent},t.nextLabel=function(i){return i===void 0&&(i=this._time),Vg(this,Pi(this,i))},t.previousLabel=function(i){return i===void 0&&(i=this._time),Vg(this,Pi(this,i),1)},t.currentLabel=function(i){return arguments.length?this.seek(i,!0):this.previousLabel(this._time+Dt)},t.shiftChildren=function(i,s,a){a===void 0&&(a=0);var o=this._first,l=this.labels,c;for(i=Wt(i);o;)o._start>=a&&(o._start+=i,o._end+=i),o=o._next;if(s)for(c in l)l[c]>=a&&(l[c]+=i);return zs(this)},t.invalidate=function(i){var s=this._first;for(this._lock=0;s;)s.invalidate(i),s=s._next;return r.prototype.invalidate.call(this,i)},t.clear=function(i){i===void 0&&(i=!0);for(var s=this._first,a;s;)a=s._next,this.remove(s),s=a;return this._dp&&(this._time=this._tTime=this._pTime=0),i&&(this.labels={}),zs(this)},t.totalDuration=function(i){var s=0,a=this,o=a._last,l=Ii,c,u,d;if(arguments.length)return a.timeScale((a._repeat<0?a.duration():a.totalDuration())/(a.reversed()?-i:i));if(a._dirty){for(d=a.parent;o;)c=o._prev,o._dirty&&o.totalDuration(),u=o._start,u>l&&a._sort&&o._ts&&!a._lock?(a._lock=1,or(a,o,u-o._delay,1)._lock=0):l=u,u<0&&o._ts&&(s-=u,(!d&&!a._dp||d&&d.smoothChildTiming)&&(a._start+=Wt(u/a._ts),a._time-=u,a._tTime-=u),a.shiftChildren(-u,!1,-1/0),l=0),o._end>s&&o._ts&&(s=o._end),o=c;Ja(a,a===Xt&&a._time>s?a._time:s,1,1),a._dirty=0}return a._tDur},e.updateRoot=function(i){if(Xt._ts&&(Kg(Xt,sh(i,Xt)),$g=si.frame),si.frame>=Og){Og+=oi.autoSleep||120;var s=Xt._first;if((!s||!s._ts)&&oi.autoSleep&&si._listeners.length<2){for(;s&&!s._ts;)s=s._next;s||si.sleep()}}},e})(gl);vi(Bn.prototype,{_lock:0,_hasPause:0,_forcing:0});var X1=function(e,t,n,i,s,a,o){var l=new Jn(this._pt,e,t,0,1,Qd,null,s),c=0,u=0,d,h,f,m,_,p,g,S;for(l.b=n,l.e=i,n+="",i+="",(g=~i.indexOf("random("))&&(i=Ka(i)),a&&(S=[n,i],a(S,e,t),n=S[0],i=S[1]),h=n.match(vd)||[];d=vd.exec(i);)m=d[0],_=i.substring(c,d.index),f?f=(f+1)%5:_.substr(-5)==="rgba("&&(f=1),m!==h[u++]&&(p=parseFloat(h[u-1])||0,l._pt={_next:l._pt,p:_||u===1?_:",",s:p,c:m.charAt(1)==="="?Ws(p,m)-p:parseFloat(m)-p,m:f&&f<4?Math.round:0},c=vd.lastIndex);return l.c=c<i.length?i.substring(c,i.length):"",l.fp=o,(kd.test(i)||g)&&(l.e=0),this._pt=l,l},Zd=function(e,t,n,i,s,a,o,l,c,u){Zt(i)&&(i=i(s||0,e,a));var d=e[t],h=n!=="get"?n:Zt(d)?c?e[t.indexOf("set")||!Zt(e["get"+t.substr(3)])?t:"get"+t.substr(3)](c):e[t]():d,f=Zt(d)?c?$1:x0:Kd,m;if(pn(i)&&(~i.indexOf("random(")&&(i=Ka(i)),i.charAt(1)==="="&&(m=Ws(h,i)+(Cn(h)||0),(m||m===0)&&(i=m))),!u||h!==i||Ud)return!isNaN(h*i)&&i!==""?(m=new Jn(this._pt,e,t,+h||0,i-(h||0),typeof d=="boolean"?Q1:v0,0,f),c&&(m.fp=c),o&&m.modifier(o,this,e),this._pt=m):(!d&&!(t in e)&&lh(t,i),X1.call(this,e,t,h,i,f,l||oi.stringFilter,c))},q1=function(e,t,n,i,s){if(Zt(e)&&(e=hl(e,s,t,n,i)),!lr(e)||e.style&&e.nodeType||kn(e)||qg(e))return pn(e)?hl(e,s,t,n,i):e;var a={},o;for(o in e)a[o]=hl(e[o],s,t,n,i);return a},Jd=function(e,t,n,i,s,a){var o,l,c,u;if(ri[e]&&(o=new ri[e]).init(s,o.rawVars?t[e]:q1(t[e],i,s,a,n),n,i,a)!==!1&&(n._pt=l=new Jn(n._pt,s,e,0,1,o.render,o,0,o.priority),n!==qa))for(c=n._ptLookup[n._targets.indexOf(s)],u=o._props.length;u--;)c[o._props[u]]=l;return o},cs,Ud,$d=function r(e,t,n){var i=e.vars,s=i.ease,a=i.startAt,o=i.immediateRender,l=i.lazy,c=i.onUpdate,u=i.runBackwards,d=i.yoyoEase,h=i.keyframes,f=i.autoRevert,m=e._dur,_=e._startAt,p=e._targets,g=e.parent,S=g&&g.data==="nested"?g.vars.targets:p,M=e._overwrite==="auto"&&!Fd,x=e.timeline,C=i.easeReverse||d,E,w,y,b,P,A,I,z,H,D,F,U,Y;if(x&&(!h||!s)&&(s="none"),e._ease=Vs(s,fl.ease),e._rEase=C&&(Vs(C)||e._ease),e._from=!x&&!!i.runBackwards,e._from&&(e.ratio=1),!x||h&&!i.stagger){if(z=p[0]?hs(p[0]).harness:0,U=z&&i[z.prop],E=rh(i,Vd),_&&(_._zTime<0&&_.progress(1),t<0&&u&&o&&!f?_.render(-1,!0):_.revert(u&&m?ju:v1),_._lazy=0),a){if(fs(e._startAt=tn.set(p,vi({data:"isStart",overwrite:!1,parent:g,immediateRender:!0,lazy:!_&&ai(l),startAt:null,delay:0,onUpdate:c&&function(){return _i(e,"onUpdate")},stagger:0},a))),e._startAt._dp=0,e._startAt._sat=e,t<0&&(An||!o&&!f)&&e._startAt.revert(ju),o&&m&&t<=0&&n<=0){t&&(e._zTime=t);return}}else if(u&&m&&!_){if(t&&(o=!1),y=vi({overwrite:!1,data:"isFromStart",lazy:o&&!_&&ai(l),immediateRender:o,stagger:0,parent:g},E),U&&(y[z.prop]=U),fs(e._startAt=tn.set(p,y)),e._startAt._dp=0,e._startAt._sat=e,t<0&&(An?e._startAt.revert(ju):e._startAt.render(-1,!0)),e._zTime=t,!o)r(e._startAt,Dt,Dt);else if(!t)return}for(e._pt=e._ptCache=0,l=m&&ai(l)||l&&!m,w=0;w<p.length;w++){if(P=p[w],I=P._gsap||Gd(p)[w]._gsap,e._ptLookup[w]=D={},Cd[I.id]&&us.length&&ih(),F=S===p?w:S.indexOf(P),z&&(H=new z).init(P,U||E,e,F,S)!==!1&&(e._pt=b=new Jn(e._pt,P,H.name,0,1,H.render,H,0,H.priority),H._props.forEach(function(Q){D[Q]=b}),H.priority&&(A=1)),!z||U)for(y in E)ri[y]&&(H=Jd(y,E,e,F,P,S))?H.priority&&(A=1):D[y]=b=Zd.call(e,P,y,"get",E[y],F,S,0,i.stringFilter);e._op&&e._op[w]&&e.kill(P,e._op[w]),M&&e._pt&&(cs=e,Xt.killTweensOf(P,D,e.globalTime(t)),Y=!e.parent,cs=0),e._pt&&l&&(Cd[I.id]=1)}A&&ep(e),e._onInit&&e._onInit(e)}e._onUpdate=c,e._initted=(!e._op||e._pt)&&!Y,h&&t<=0&&x.render(Ii,!0,!0)},Y1=function(e,t,n,i,s,a,o,l){var c=(e._pt&&e._ptCache||(e._ptCache={}))[t],u,d,h,f;if(!c)for(c=e._ptCache[t]=[],h=e._ptLookup,f=e._targets.length;f--;){if(u=h[f][t],u&&u.d&&u.d._pt)for(u=u.d._pt;u&&u.p!==t&&u.fp!==t;)u=u._next;if(!u)return Ud=1,e.vars[t]="+=0",$d(e,o),Ud=0,l?dl(t+" not eligible for reset. Try splitting into individual properties"):1;c.push(u)}for(f=c.length;f--;)d=c[f],u=d._pt||d,u.s=(i||i===0)&&!s?i:u.s+(i||0)+a*u.c,u.c=n-u.s,d.e&&(d.e=Jt(n)+Cn(d.e)),d.b&&(d.b=u.s+Cn(d.b))},Z1=function(e,t){var n=e[0]?hs(e[0]).harness:0,i=n&&n.aliases,s,a,o,l;if(!i)return t;s=Ya({},t);for(a in i)if(a in s)for(l=i[a].split(","),o=l.length;o--;)s[l[o]]=s[a];return s},J1=function(e,t,n,i){var s=t.ease||i||"power1.inOut",a,o;if(kn(t))o=n[e]||(n[e]=[]),t.forEach(function(l,c){return o.push({t:c/(t.length-1)*100,v:l,e:s})});else for(a in t)o=n[a]||(n[a]=[]),a==="ease"||o.push({t:parseFloat(e),v:t[a],e:s})},hl=function(e,t,n,i,s){return Zt(e)?e.call(t,n,i,s):pn(e)&&~e.indexOf("random(")?Ka(e):e},g0=Hd+"repeat,repeatDelay,yoyo,repeatRefresh,yoyoEase,easeReverse,autoRevert",_0={};Zn(g0+",id,stagger,delay,duration,paused,scrollTrigger",function(r){return _0[r]=1});var tn=(function(r){Wg(e,r);function e(n,i,s,a){var o;typeof i=="number"&&(s.duration=i,i=s,s=null),o=r.call(this,a?i:cl(i))||this;var l=o.vars,c=l.duration,u=l.delay,d=l.immediateRender,h=l.stagger,f=l.overwrite,m=l.keyframes,_=l.defaults,p=l.scrollTrigger,g=i.parent||Xt,S=(kn(n)||qg(n)?Cr(n[0]):"length"in i)?[n]:Di(n),M,x,C,E,w,y,b,P;if(o._targets=S.length?Gd(S):dl("GSAP target "+n+" not found. https://gsap.com",!oi.nullTargetWarn)||[],o._ptLookup=[],o._overwrite=f,m||h||Qu(c)||Qu(u)){i=o.vars;var A=i.easeReverse||i.yoyoEase;if(M=o.timeline=new Bn({data:"nested",defaults:_||{},targets:g&&g.data==="nested"?g.vars.targets:S}),M.kill(),M.parent=M._dp=wr(o),M._start=0,h||Qu(c)||Qu(u)){if(E=S.length,b=h&&a0(h),lr(h))for(w in h)~g0.indexOf(w)&&(P||(P={}),P[w]=h[w]);for(x=0;x<E;x++)C=rh(i,_0),C.stagger=0,A&&(C.easeReverse=A),P&&Ya(C,P),y=S[x],C.duration=+hl(c,wr(o),x,y,S),C.delay=(+hl(u,wr(o),x,y,S)||0)-o._delay,!h&&E===1&&C.delay&&(o._delay=u=C.delay,o._start+=u,C.delay=0),M.to(y,C,b?b(x,y,S):0),M._ease=vt.none;M.duration()?c=u=0:o.timeline=0}else if(m){cl(vi(M.vars.defaults,{ease:"none"})),M._ease=Vs(m.ease||i.ease||"none");var I=0,z,H,D;if(kn(m))m.forEach(function(F){return M.to(S,F,">")}),M.duration();else{C={};for(w in m)w==="ease"||w==="easeEach"||J1(w,m[w],C,m.easeEach);for(w in C)for(z=C[w].sort(function(F,U){return F.t-U.t}),I=0,x=0;x<z.length;x++)H=z[x],D={ease:H.e,duration:(H.t-(x?z[x-1].t:0))/100*c},D[w]=H.v,M.to(S,D,I),I+=D.duration;M.duration()<c&&M.to({},{duration:c-M.duration()})}}c||o.duration(c=M.duration())}else o.timeline=0;return f===!0&&!Fd&&(cs=wr(o),Xt.killTweensOf(S),cs=0),or(g,wr(o),s),i.reversed&&o.reverse(),i.paused&&o.paused(!0),(d||!c&&!m&&o._start===Wt(g._time)&&ai(d)&&E1(wr(o))&&g.data!=="nested")&&(o._tTime=-Dt,o.render(Math.max(0,-u)||0)),p&&n0(wr(o),p),o}var t=e.prototype;return t.render=function(i,s,a){var o=this._time,l=this._tDur,c=this._dur,u=i<0,d=i>l-Dt&&!u?l:i<Dt?0:i,h,f,m,_,p,g,S,M;if(!c)A1(this,i,s,a);else if(d!==this._tTime||!i||a||!this._initted&&this._tTime||this._startAt&&this._zTime<0!==u||this._lazy){if(h=d,M=this.timeline,this._repeat){if(_=c+this._rDelay,this._repeat<-1&&u)return this.totalTime(_*100+i,s,a);if(h=Wt(d%_),d===l?(m=this._repeat,h=c):(p=Wt(d/_),m=~~p,m&&m===p?(h=c,m--):h>c&&(h=c)),g=this._yoyo&&m&1,g&&(h=c-h),p=Za(this._tTime,_),h===o&&!a&&this._initted&&m===p)return this._tTime=d,this;m!==p&&this.vars.repeatRefresh&&!g&&!this._lock&&h!==_&&this._initted&&(this._lock=a=1,this.render(Wt(_*m),!0).invalidate()._lock=0)}if(!this._initted){if(i0(this,u?i:h,a,s,d))return this._tTime=0,this;if(o!==this._time&&!(a&&this.vars.repeatRefresh&&m!==p))return this;if(c!==this._dur)return this.render(i,s,a)}if(this._rEase){var x=h<o;if(x!==this._inv){var C=x?o:c-o;this._inv=x,this._from&&(this.ratio=1-this.ratio),this._invRatio=this.ratio,this._invTime=o,this._invRecip=C?(x?-1:1)/C:0,this._invScale=x?-this.ratio:1-this.ratio,this._invEase=x?this._rEase:this._ease}this.ratio=S=this._invRatio+this._invScale*this._invEase((h-this._invTime)*this._invRecip)}else this.ratio=S=this._ease(h/c);if(this._from&&(this.ratio=S=1-S),this._tTime=d,this._time=h,!this._act&&this._ts&&(this._act=1,this._lazy=0),!o&&d&&!s&&!p&&(_i(this,"onStart"),this._tTime!==d))return this;for(f=this._pt;f;)f.r(S,f.d),f=f._next;M&&M.render(i<0?i:M._dur*M._ease(h/this._dur),s,a)||this._startAt&&(this._zTime=i),this._onUpdate&&!s&&(u&&Rd(this,i,s,a),_i(this,"onUpdate")),this._repeat&&m!==p&&this.vars.onRepeat&&!s&&this.parent&&_i(this,"onRepeat"),(d===this._tDur||!d)&&this._tTime===d&&(u&&!this._onUpdate&&Rd(this,i,!0,!0),(i||!c)&&(d===this._tDur&&this._ts>0||!d&&this._ts<0)&&fs(this,1),!s&&!(u&&!o)&&(d||o||g)&&(_i(this,d===l?"onComplete":"onReverseComplete",!0),this._prom&&!(d<l&&this.timeScale()>0)&&this._prom()))}return this},t.targets=function(){return this._targets},t.invalidate=function(i){return(!i||!this.vars.runBackwards)&&(this._startAt=0),this._pt=this._op=this._onUpdate=this._lazy=this.ratio=0,this._ptLookup=[],this.timeline&&this.timeline.invalidate(i),r.prototype.invalidate.call(this,i)},t.resetTo=function(i,s,a,o,l){ml||si.wake(),this._ts||this.play();var c=Math.min(this._dur,(this._dp._time-this._start)*this._ts),u;return this._initted||$d(this,c),u=this._ease(c/this._dur),Y1(this,i,s,a,o,u,c,l)?this.resetTo(i,s,a,o,1):(hh(this,0),this.parent||e0(this._dp,this,"_first","_last",this._dp._sort?"_start":0),this.render(0))},t.kill=function(i,s){if(s===void 0&&(s="all"),!i&&(!s||s==="all"))return this._lazy=this._pt=0,this.parent?ol(this):this.scrollTrigger&&this.scrollTrigger.kill(!!An),this;if(this.timeline){var a=this.timeline.totalDuration();return this.timeline.killTweensOf(i,s,cs&&cs.vars.overwrite!==!0)._first||ol(this),this.parent&&a!==this.timeline.totalDuration()&&Ja(this,this._dur*this.timeline._tDur/a,0,1),this}var o=this._targets,l=i?Di(i):o,c=this._ptLookup,u=this._pt,d,h,f,m,_,p,g;if((!s||s==="all")&&b1(o,l))return s==="all"&&(this._pt=0),ol(this);for(d=this._op=this._op||[],s!=="all"&&(pn(s)&&(_={},Zn(s,function(S){return _[S]=1}),s=_),s=Z1(o,s)),g=o.length;g--;)if(~l.indexOf(o[g])){h=c[g],s==="all"?(d[g]=s,m=h,f={}):(f=d[g]=d[g]||{},m=s);for(_ in m)p=h&&h[_],p&&((!("kill"in p.d)||p.d.kill(_)===!0)&&ch(this,p,"_pt"),delete h[_]),f!=="all"&&(f[_]=1)}return this._initted&&!this._pt&&u&&ol(this),this},e.to=function(i,s){return new e(i,s,arguments[2])},e.from=function(i,s){return ul(1,arguments)},e.delayedCall=function(i,s,a,o){return new e(s,0,{immediateRender:!1,lazy:!1,overwrite:!1,delay:i,onComplete:s,onReverseComplete:s,onCompleteParams:a,onReverseCompleteParams:a,callbackScope:o})},e.fromTo=function(i,s,a){return ul(2,arguments)},e.set=function(i,s){return s.duration=0,s.repeatDelay||(s.repeat=0),new e(i,s)},e.killTweensOf=function(i,s,a){return Xt.killTweensOf(i,s,a)},e})(gl);vi(tn.prototype,{_targets:[],_lazy:0,_startAt:0,_op:0,_onInit:0});Zn("staggerTo,staggerFrom,staggerFromTo",function(r){tn[r]=function(){var e=new Bn,t=Id.call(arguments,0);return t.splice(r==="staggerFromTo"?5:4,0,0),e[r].apply(e,t)}});var Kd=function(e,t,n){return e[t]=n},x0=function(e,t,n){return e[t](n)},$1=function(e,t,n,i){return e[t](i.fp,n)},K1=function(e,t,n){return e.setAttribute(t,n)},fh=function(e,t){return Zt(e[t])?x0:oh(e[t])&&e.setAttribute?K1:Kd},v0=function(e,t){return t.set(t.t,t.p,Math.round((t.s+t.c*e)*1e6)/1e6,t)},Q1=function(e,t){return t.set(t.t,t.p,!!(t.s+t.c*e),t)},Qd=function(e,t){var n=t._pt,i="";if(!e&&t.b)i=t.b;else if(e===1&&t.e)i=t.e;else{for(;n;)i=n.p+(n.m?n.m(n.s+n.c*e):Math.round((n.s+n.c*e)*1e4)/1e4)+i,n=n._next;i+=t.c}t.set(t.t,t.p,i,t)},jd=function(e,t){for(var n=t._pt;n;)n.r(e,n.d),n=n._next},j1=function(e,t,n,i){for(var s=this._pt,a;s;)a=s._next,s.p===i&&s.modifier(e,t,n),s=a},eT=function(e){for(var t=this._pt,n,i;t;)i=t._next,t.p===e&&!t.op||t.op===e?ch(this,t,"_pt"):t.dep||(n=1),t=i;return!n},tT=function(e,t,n,i){i.mSet(e,t,i.m.call(i.tween,n,i.mt),i)},ep=function(e){for(var t=e._pt,n,i,s,a;t;){for(n=t._next,i=s;i&&i.pr>t.pr;)i=i._next;(t._prev=i?i._prev:a)?t._prev._next=t:s=t,(t._next=i)?i._prev=t:a=t,t=n}e._pt=s},Jn=(function(){function r(t,n,i,s,a,o,l,c,u){this.t=n,this.s=s,this.c=a,this.p=i,this.r=o||v0,this.d=l||this,this.set=c||Kd,this.pr=u||0,this._next=t,t&&(t._prev=this)}var e=r.prototype;return e.modifier=function(n,i,s){this.mSet=this.mSet||this.set,this.set=tT,this.m=n,this.mt=s,this.tween=i},r})();Zn(Hd+"parent,duration,ease,delay,overwrite,runBackwards,startAt,yoyo,immediateRender,repeat,repeatDelay,data,paused,reversed,lazy,callbackScope,stringFilter,id,yoyoEase,stagger,inherit,repeatRefresh,keyframes,autoRevert,scrollTrigger,easeReverse",function(r){return Vd[r]=1});xi.TweenMax=xi.TweenLite=tn;xi.TimelineLite=xi.TimelineMax=Bn;Xt=new Bn({sortChildren:!1,defaults:fl,autoRemoveChildren:!0,id:"root",smoothChildTiming:!0});oi.stringFilter=qd;var Hs=[],th={},nT=[],Gg=0,iT=0,Td=function(e){return(th[e]||nT).map(function(t){return t()})},Nd=function(){var e=Date.now(),t=[];e-Gg>2&&(Td("matchMediaInit"),Hs.forEach(function(n){var i=n.queries,s=n.conditions,a,o,l,c;for(o in i)a=ar.matchMedia(i[o]).matches,a&&(l=1),a!==s[o]&&(s[o]=a,c=1);c&&(n.revert(),l&&t.push(n))}),Td("matchMediaRevert"),t.forEach(function(n){return n.onMatch(n,function(i){return n.add(null,i)})}),Gg=e,Td("matchMedia"))},y0=(function(){function r(t,n){this.selector=n&&Dd(n),this.data=[],this._r=[],this.isReverted=!1,this.id=iT++,t&&this.add(t)}var e=r.prototype;return e.add=function(n,i,s){Zt(n)&&(s=i,i=n,n=Zt);var a=this,o=function(){var c=kt,u=a.selector,d;return c&&c!==a&&c.data.push(a),s&&(a.selector=Dd(s)),kt=a,d=i.apply(a,arguments),Zt(d)&&a._r.push(d),kt=c,a.selector=u,a.isReverted=!1,d};return a.last=o,n===Zt?o(a,function(l){return a.add(null,l)}):n?a[n]=o:o},e.ignore=function(n){var i=kt;kt=null,n(this),kt=i},e.getTweens=function(){var n=[];return this.data.forEach(function(i){return i instanceof r?n.push.apply(n,i.getTweens()):i instanceof tn&&!(i.parent&&i.parent.data==="nested")&&n.push(i)}),n},e.clear=function(){this._r.length=this.data.length=0},e.kill=function(n,i){var s=this;if(n?(function(){for(var o=s.getTweens(),l=s.data.length,c;l--;)c=s.data[l],c.data==="isFlip"&&(c.revert(),c.getChildren(!0,!0,!1).forEach(function(u){return o.splice(o.indexOf(u),1)}));for(o.map(function(u){return{g:u._dur||u._delay||u._sat&&!u._sat.vars.immediateRender?u.globalTime(0):-1/0,t:u}}).sort(function(u,d){return d.g-u.g||-1/0}).forEach(function(u){return u.t.revert(n)}),l=s.data.length;l--;)c=s.data[l],c instanceof Bn?c.data!=="nested"&&(c.scrollTrigger&&c.scrollTrigger.revert(),c.kill()):!(c instanceof tn)&&c.revert&&c.revert(n);s._r.forEach(function(u){return u(n,s)}),s.isReverted=!0})():this.data.forEach(function(o){return o.kill&&o.kill()}),this.clear(),i)for(var a=Hs.length;a--;)Hs[a].id===this.id&&Hs.splice(a,1)},e.revert=function(n){this.kill(n||{})},r})(),rT=(function(){function r(t){this.contexts=[],this.scope=t,kt&&kt.data.push(this)}var e=r.prototype;return e.add=function(n,i,s){lr(n)||(n={matches:n});var a=new y0(0,s||this.scope),o=a.conditions={},l,c,u;kt&&!a.selector&&(a.selector=kt.selector),this.contexts.push(a),i=a.add("onMatch",i),a.queries=n;for(c in n)c==="all"?u=1:(l=ar.matchMedia(n[c]),l&&(Hs.indexOf(a)<0&&Hs.push(a),(o[c]=l.matches)&&(u=1),l.addListener?l.addListener(Nd):l.addEventListener("change",Nd)));return u&&i(a,function(d){return a.add(null,d)}),this},e.revert=function(n){this.kill(n||{})},e.kill=function(n){this.contexts.forEach(function(i){return i.kill(n,!0)})},r})(),ah={registerPlugin:function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];t.forEach(function(i){return f0(i)})},timeline:function(e){return new Bn(e)},getTweensOf:function(e,t){return Xt.getTweensOf(e,t)},getProperty:function(e,t,n,i){pn(e)&&(e=Di(e)[0]);var s=hs(e||{}).get,a=n?jg:Qg;return n==="native"&&(n=""),e&&(t?a((ri[t]&&ri[t].get||s)(e,t,n,i)):function(o,l,c){return a((ri[o]&&ri[o].get||s)(e,o,l,c))})},quickSetter:function(e,t,n){if(e=Di(e),e.length>1){var i=e.map(function(u){return zn.quickSetter(u,t,n)}),s=i.length;return function(u){for(var d=s;d--;)i[d](u)}}e=e[0]||{};var a=ri[t],o=hs(e),l=o.harness&&(o.harness.aliases||{})[t]||t,c=a?function(u){var d=new a;qa._pt=0,d.init(e,n?u+n:u,qa,0,[e]),d.render(1,d),qa._pt&&jd(1,qa)}:o.set(e,l);return a?c:function(u){return c(e,l,n?u+n:u,o,1)}},quickTo:function(e,t,n){var i,s=zn.to(e,vi((i={},i[t]="+=0.1",i.paused=!0,i.stagger=0,i),n||{})),a=function(l,c,u){return s.resetTo(t,l,c,u)};return a.tween=s,a},isTweening:function(e){return Xt.getTweensOf(e,!0).length>0},defaults:function(e){return e&&e.ease&&(e.ease=Vs(e.ease,fl.ease)),Bg(fl,e||{})},config:function(e){return Bg(oi,e||{})},registerEffect:function(e){var t=e.name,n=e.effect,i=e.plugins,s=e.defaults,a=e.extendTimeline;(i||"").split(",").forEach(function(o){return o&&!ri[o]&&!xi[o]&&dl(t+" effect requires "+o+" plugin.")}),yd[t]=function(o,l,c){return n(Di(o),vi(l||{},s),c)},a&&(Bn.prototype[t]=function(o,l,c){return this.add(yd[t](o,lr(l)?l:(c=l)&&{},this),c)})},registerEase:function(e,t){vt[e]=Vs(t)},parseEase:function(e,t){return arguments.length?Vs(e,t):vt},getById:function(e){return Xt.getById(e)},exportRoot:function(e,t){e===void 0&&(e={});var n=new Bn(e),i,s;for(n.smoothChildTiming=ai(e.smoothChildTiming),Xt.remove(n),n._dp=0,n._time=n._tTime=Xt._time,i=Xt._first;i;)s=i._next,(t||!(!i._dur&&i instanceof tn&&i.vars.onComplete===i._targets[0]))&&or(n,i,i._start-i._delay),i=s;return or(Xt,n,0),n},context:function(e,t){return e?new y0(e,t):kt},matchMedia:function(e){return new rT(e)},matchMediaRefresh:function(){return Hs.forEach(function(e){var t=e.conditions,n,i;for(i in t)t[i]&&(t[i]=!1,n=1);n&&e.revert()})||Nd()},addEventListener:function(e,t){var n=th[e]||(th[e]=[]);~n.indexOf(t)||n.push(t)},removeEventListener:function(e,t){var n=th[e],i=n&&n.indexOf(t);i>=0&&n.splice(i,1)},utils:{wrap:N1,wrapYoyo:F1,distribute:a0,random:l0,snap:o0,normalize:U1,getUnit:Cn,clamp:P1,splitColor:d0,toArray:Di,selector:Dd,mapRange:u0,pipe:D1,unitize:L1,interpolate:O1,shuffle:s0},install:Zg,effects:yd,ticker:si,updateRoot:Bn.updateRoot,plugins:ri,globalTimeline:Xt,core:{PropTween:Jn,globals:Jg,Tween:tn,Timeline:Bn,Animation:gl,getCache:hs,_removeLinkedListItem:ch,reverting:function(){return An},context:function(e){return e&&kt&&(kt.data.push(e),e._ctx=kt),kt},suppressOverwrites:function(e){return Fd=e}}};Zn("to,from,fromTo,delayedCall,set,killTweensOf",function(r){return ah[r]=tn[r]});si.add(Bn.updateRoot);qa=ah.to({},{duration:0});var sT=function(e,t){for(var n=e._pt;n&&n.p!==t&&n.op!==t&&n.fp!==t;)n=n._next;return n},aT=function(e,t){var n=e._targets,i,s,a;for(i in t)for(s=n.length;s--;)a=e._ptLookup[s][i],a&&(a=a.d)&&(a._pt&&(a=sT(a,i)),a&&a.modifier&&a.modifier(t[i],e,n[s],i))},Ed=function(e,t){return{name:e,headless:1,rawVars:1,init:function(i,s,a){a._onInit=function(o){var l,c;if(pn(s)&&(l={},Zn(s,function(u){return l[u]=1}),s=l),t){l={};for(c in s)l[c]=t(s[c]);s=l}aT(o,s)}}}},zn=ah.registerPlugin({name:"attr",init:function(e,t,n,i,s){var a,o,l;this.tween=n;for(a in t)l=e.getAttribute(a)||"",o=this.add(e,"setAttribute",(l||0)+"",t[a],i,s,0,0,a),o.op=a,o.b=l,this._props.push(a)},render:function(e,t){for(var n=t._pt;n;)An?n.set(n.t,n.p,n.b,n):n.r(e,n.d),n=n._next}},{name:"endArray",headless:1,init:function(e,t){for(var n=t.length;n--;)this.add(e,n,e[n]||0,t[n],0,0,0,0,0,1)}},Ed("roundProps",Ld),Ed("modifiers"),Ed("snap",o0))||ah;tn.version=Bn.version=zn.version="3.15.0";Yg=1;Od()&&$a();var oT=vt.Power0,lT=vt.Power1,cT=vt.Power2,uT=vt.Power3,hT=vt.Power4,fT=vt.Linear,dT=vt.Quad,pT=vt.Cubic,mT=vt.Quart,gT=vt.Quint,_T=vt.Strong,xT=vt.Elastic,vT=vt.Back,yT=vt.SteppedEase,ST=vt.Bounce,MT=vt.Sine,bT=vt.Expo,TT=vt.Circ;var S0,ps,ja,ap,Js,ET,M0,op,wT=function(){return typeof window<"u"},Pr={},Zs=180/Math.PI,eo=Math.PI/180,Qa=Math.atan2,b0=1e8,lp=/([A-Z])/g,AT=/(left|right|width|margin|padding|x)/i,CT=/[\s,\(]\S/,cr={autoAlpha:"opacity,visibility",scale:"scaleX,scaleY",alpha:"opacity"},np=function(e,t){return t.set(t.t,t.p,Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},RT=function(e,t){return t.set(t.t,t.p,e===1?t.e:Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},PT=function(e,t){return t.set(t.t,t.p,e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},IT=function(e,t){return t.set(t.t,t.p,e===1?t.e:e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},DT=function(e,t){var n=t.s+t.c*e;t.set(t.t,t.p,~~(n+(n<0?-.5:.5))+t.u,t)},I0=function(e,t){return t.set(t.t,t.p,e?t.e:t.b,t)},D0=function(e,t){return t.set(t.t,t.p,e!==1?t.b:t.e,t)},LT=function(e,t,n){return e.style[t]=n},UT=function(e,t,n){return e.style.setProperty(t,n)},NT=function(e,t,n){return e._gsap[t]=n},FT=function(e,t,n){return e._gsap.scaleX=e._gsap.scaleY=n},OT=function(e,t,n,i,s){var a=e._gsap;a.scaleX=a.scaleY=n,a.renderTransform(s,a)},BT=function(e,t,n,i,s){var a=e._gsap;a[t]=n,a.renderTransform(s,a)},qt="transform",li=qt+"Origin",kT=function r(e,t){var n=this,i=this.target,s=i.style,a=i._gsap;if(e in Pr&&s){if(this.tfm=this.tfm||{},e!=="transform")e=cr[e]||e,~e.indexOf(",")?e.split(",").forEach(function(o){return n.tfm[o]=Rr(i,o)}):this.tfm[e]=a.x?a[e]:Rr(i,e),e===li&&(this.tfm.zOrigin=a.zOrigin);else return cr.transform.split(",").forEach(function(o){return r.call(n,o,t)});if(this.props.indexOf(qt)>=0)return;a.svg&&(this.svgo=i.getAttribute("data-svg-origin"),this.props.push(li,t,"")),e=qt}(s||t)&&this.props.push(e,t,s[e])},L0=function(e){e.translate&&(e.removeProperty("translate"),e.removeProperty("scale"),e.removeProperty("rotate"))},zT=function(){var e=this.props,t=this.target,n=t.style,i=t._gsap,s,a;for(s=0;s<e.length;s+=3)e[s+1]?e[s+1]===2?t[e[s]](e[s+2]):t[e[s]]=e[s+2]:e[s+2]?n[e[s]]=e[s+2]:n.removeProperty(e[s].substr(0,2)==="--"?e[s]:e[s].replace(lp,"-$1").toLowerCase());if(this.tfm){for(a in this.tfm)i[a]=this.tfm[a];i.svg&&(i.renderTransform(),t.setAttribute("data-svg-origin",this.svgo||"")),s=op(),(!s||!s.isStart)&&!n[qt]&&(L0(n),i.zOrigin&&n[li]&&(n[li]+=" "+i.zOrigin+"px",i.zOrigin=0,i.renderTransform()),i.uncache=1)}},U0=function(e,t){var n={target:e,props:[],revert:zT,save:kT};return e._gsap||zn.core.getCache(e),t&&e.style&&e.nodeType&&t.split(",").forEach(function(i){return n.save(i)}),n},N0,ip=function(e,t){var n=ps.createElementNS?ps.createElementNS((t||"http://www.w3.org/1999/xhtml").replace(/^https/,"http"),e):ps.createElement(e);return n&&n.style?n:ps.createElement(e)},yi=function r(e,t,n){var i=getComputedStyle(e);return i[t]||i.getPropertyValue(t.replace(lp,"-$1").toLowerCase())||i.getPropertyValue(t)||!n&&r(e,to(t)||t,1)||""},T0="O,Moz,ms,Ms,Webkit".split(","),to=function(e,t,n){var i=t||Js,s=i.style,a=5;if(e in s&&!n)return e;for(e=e.charAt(0).toUpperCase()+e.substr(1);a--&&!(T0[a]+e in s););return a<0?null:(a===3?"ms":a>=0?T0[a]:"")+e},rp=function(){wT()&&window.document&&(S0=window,ps=S0.document,ja=ps.documentElement,Js=ip("div")||{style:{}},ET=ip("div"),qt=to(qt),li=qt+"Origin",Js.style.cssText="border-width:0;line-height:0;position:absolute;padding:0",N0=!!to("perspective"),op=zn.core.reverting,ap=1)},E0=function(e){var t=e.ownerSVGElement,n=ip("svg",t&&t.getAttribute("xmlns")||"http://www.w3.org/2000/svg"),i=e.cloneNode(!0),s;i.style.display="block",n.appendChild(i),ja.appendChild(n);try{s=i.getBBox()}catch{}return n.removeChild(i),ja.removeChild(n),s},w0=function(e,t){for(var n=t.length;n--;)if(e.hasAttribute(t[n]))return e.getAttribute(t[n])},F0=function(e){var t,n;try{t=e.getBBox()}catch{t=E0(e),n=1}return t&&(t.width||t.height)||n||(t=E0(e)),t&&!t.width&&!t.x&&!t.y?{x:+w0(e,["x","cx","x1"])||0,y:+w0(e,["y","cy","y1"])||0,width:0,height:0}:t},O0=function(e){return!!(e.getCTM&&(!e.parentNode||e.ownerSVGElement)&&F0(e))},gs=function(e,t){if(t){var n=e.style,i;t in Pr&&t!==li&&(t=qt),n.removeProperty?(i=t.substr(0,2),(i==="ms"||t.substr(0,6)==="webkit")&&(t="-"+t),n.removeProperty(i==="--"?t:t.replace(lp,"-$1").toLowerCase())):n.removeAttribute(t)}},ms=function(e,t,n,i,s,a){var o=new Jn(e._pt,t,n,0,1,a?D0:I0);return e._pt=o,o.b=i,o.e=s,e._props.push(n),o},A0={deg:1,rad:1,turn:1},VT={grid:1,flex:1},_s=function r(e,t,n,i){var s=parseFloat(n)||0,a=(n+"").trim().substr((s+"").length)||"px",o=Js.style,l=AT.test(t),c=e.tagName.toLowerCase()==="svg",u=(c?"client":"offset")+(l?"Width":"Height"),d=100,h=i==="px",f=i==="%",m,_,p,g;if(i===a||!s||A0[i]||A0[a])return s;if(a!=="px"&&!h&&(s=r(e,t,n,"px")),g=e.getCTM&&O0(e),(f||a==="%")&&(Pr[t]||~t.indexOf("adius")))return m=g?e.getBBox()[l?"width":"height"]:e[u],Jt(f?s/m*d:s/100*m);if(o[l?"width":"height"]=d+(h?a:i),_=i!=="rem"&&~t.indexOf("adius")||i==="em"&&e.appendChild&&!c?e:e.parentNode,g&&(_=(e.ownerSVGElement||{}).parentNode),(!_||_===ps||!_.appendChild)&&(_=ps.body),p=_._gsap,p&&f&&p.width&&l&&p.time===si.time&&!p.uncache)return Jt(s/p.width*d);if(f&&(t==="height"||t==="width")){var S=e.style[t];e.style[t]=d+i,m=e[u],S?e.style[t]=S:gs(e,t)}else(f||a==="%")&&!VT[yi(_,"display")]&&(o.position=yi(e,"position")),_===e&&(o.position="static"),_.appendChild(Js),m=Js[u],_.removeChild(Js),o.position="absolute";return l&&f&&(p=hs(_),p.time=si.time,p.width=_[u]),Jt(h?m*s/d:m&&s?d/m*s:0)},Rr=function(e,t,n,i){var s;return ap||rp(),t in cr&&t!=="transform"&&(t=cr[t],~t.indexOf(",")&&(t=t.split(",")[0])),Pr[t]&&t!=="transform"?(s=yl(e,i),s=t!=="transformOrigin"?s[t]:s.svg?s.origin:ph(yi(e,li))+" "+s.zOrigin+"px"):(s=e.style[t],(!s||s==="auto"||i||~(s+"").indexOf("calc("))&&(s=dh[t]&&dh[t](e,t,n)||yi(e,t)||Wd(e,t)||(t==="opacity"?1:0))),n&&!~(s+"").trim().indexOf(" ")?_s(e,t,s,n)+n:s},HT=function(e,t,n,i){if(!n||n==="none"){var s=to(t,e,1),a=s&&yi(e,s,1);a&&a!==n?(t=s,n=a):t==="borderColor"&&(n=yi(e,"borderTopColor"))}var o=new Jn(this._pt,e.style,t,0,1,Qd),l=0,c=0,u,d,h,f,m,_,p,g,S,M,x,C;if(o.b=n,o.e=i,n+="",i+="",i.substring(0,6)==="var(--"&&(i=yi(e,i.substring(4,i.indexOf(")")))),i==="auto"&&(_=e.style[t],e.style[t]=i,i=yi(e,t)||i,_?e.style[t]=_:gs(e,t)),u=[n,i],qd(u),n=u[0],i=u[1],h=n.match(Gs)||[],C=i.match(Gs)||[],C.length){for(;d=Gs.exec(i);)p=d[0],S=i.substring(l,d.index),m?m=(m+1)%5:(S.substr(-5)==="rgba("||S.substr(-5)==="hsla(")&&(m=1),p!==(_=h[c++]||"")&&(f=parseFloat(_)||0,x=_.substr((f+"").length),p.charAt(1)==="="&&(p=Ws(f,p)+x),g=parseFloat(p),M=p.substr((g+"").length),l=Gs.lastIndex-M.length,M||(M=M||oi.units[t]||x,l===i.length&&(i+=M,o.e+=M)),x!==M&&(f=_s(e,t,_,M)||0),o._pt={_next:o._pt,p:S||c===1?S:",",s:f,c:g-f,m:m&&m<4||t==="zIndex"?Math.round:0});o.c=l<i.length?i.substring(l,i.length):""}else o.r=t==="display"&&i==="none"?D0:I0;return kd.test(i)&&(o.e=0),this._pt=o,o},C0={top:"0%",bottom:"100%",left:"0%",right:"100%",center:"50%"},GT=function(e){var t=e.split(" "),n=t[0],i=t[1]||"50%";return(n==="top"||n==="bottom"||i==="left"||i==="right")&&(e=n,n=i,i=e),t[0]=C0[n]||n,t[1]=C0[i]||i,t.join(" ")},WT=function(e,t){if(t.tween&&t.tween._time===t.tween._dur){var n=t.t,i=n.style,s=t.u,a=n._gsap,o,l,c;if(s==="all"||s===!0)i.cssText="",l=1;else for(s=s.split(","),c=s.length;--c>-1;)o=s[c],Pr[o]&&(l=1,o=o==="transformOrigin"?li:qt),gs(n,o);l&&(gs(n,qt),a&&(a.svg&&n.removeAttribute("transform"),i.scale=i.rotate=i.translate="none",yl(n,1),a.uncache=1,L0(i)))}},dh={clearProps:function(e,t,n,i,s){if(s.data!=="isFromStart"){var a=e._pt=new Jn(e._pt,t,n,0,0,WT);return a.u=i,a.pr=-10,a.tween=s,e._props.push(n),1}}},vl=[1,0,0,1,0,0],B0={},k0=function(e){return e==="matrix(1, 0, 0, 1, 0, 0)"||e==="none"||!e},R0=function(e){var t=yi(e,qt);return k0(t)?vl:t.substr(7).match(Bd).map(Jt)},cp=function(e,t){var n=e._gsap||hs(e),i=e.style,s=R0(e),a,o,l,c;return n.svg&&e.getAttribute("transform")?(l=e.transform.baseVal.consolidate().matrix,s=[l.a,l.b,l.c,l.d,l.e,l.f],s.join(",")==="1,0,0,1,0,0"?vl:s):(s===vl&&!e.offsetParent&&e!==ja&&!n.svg&&(l=i.display,i.display="block",a=e.parentNode,(!a||!e.offsetParent&&!e.getBoundingClientRect().width)&&(c=1,o=e.nextElementSibling,ja.appendChild(e)),s=R0(e),l?i.display=l:gs(e,"display"),c&&(o?a.insertBefore(e,o):a?a.appendChild(e):ja.removeChild(e))),t&&s.length>6?[s[0],s[1],s[4],s[5],s[12],s[13]]:s)},sp=function(e,t,n,i,s,a){var o=e._gsap,l=s||cp(e,!0),c=o.xOrigin||0,u=o.yOrigin||0,d=o.xOffset||0,h=o.yOffset||0,f=l[0],m=l[1],_=l[2],p=l[3],g=l[4],S=l[5],M=t.split(" "),x=parseFloat(M[0])||0,C=parseFloat(M[1])||0,E,w,y,b;n?l!==vl&&(w=f*p-m*_)&&(y=x*(p/w)+C*(-_/w)+(_*S-p*g)/w,b=x*(-m/w)+C*(f/w)-(f*S-m*g)/w,x=y,C=b):(E=F0(e),x=E.x+(~M[0].indexOf("%")?x/100*E.width:x),C=E.y+(~(M[1]||M[0]).indexOf("%")?C/100*E.height:C)),i||i!==!1&&o.smooth?(g=x-c,S=C-u,o.xOffset=d+(g*f+S*_)-g,o.yOffset=h+(g*m+S*p)-S):o.xOffset=o.yOffset=0,o.xOrigin=x,o.yOrigin=C,o.smooth=!!i,o.origin=t,o.originIsAbsolute=!!n,e.style[li]="0px 0px",a&&(ms(a,o,"xOrigin",c,x),ms(a,o,"yOrigin",u,C),ms(a,o,"xOffset",d,o.xOffset),ms(a,o,"yOffset",h,o.yOffset)),e.setAttribute("data-svg-origin",x+" "+C)},yl=function(e,t){var n=e._gsap||new Yd(e);if("x"in n&&!t&&!n.uncache)return n;var i=e.style,s=n.scaleX<0,a="px",o="deg",l=getComputedStyle(e),c=yi(e,li)||"0",u,d,h,f,m,_,p,g,S,M,x,C,E,w,y,b,P,A,I,z,H,D,F,U,Y,Q,L,se,Se,Le,Oe,Be;return u=d=h=_=p=g=S=M=x=0,f=m=1,n.svg=!!(e.getCTM&&O0(e)),l.translate&&((l.translate!=="none"||l.scale!=="none"||l.rotate!=="none")&&(i[qt]=(l.translate!=="none"?"translate3d("+(l.translate+" 0 0").split(" ").slice(0,3).join(", ")+") ":"")+(l.rotate!=="none"?"rotate("+l.rotate+") ":"")+(l.scale!=="none"?"scale("+l.scale.split(" ").join(",")+") ":"")+(l[qt]!=="none"?l[qt]:"")),i.scale=i.rotate=i.translate="none"),w=cp(e,n.svg),n.svg&&(n.uncache?(Y=e.getBBox(),c=n.xOrigin-Y.x+"px "+(n.yOrigin-Y.y)+"px",U=""):U=!t&&e.getAttribute("data-svg-origin"),sp(e,U||c,!!U||n.originIsAbsolute,n.smooth!==!1,w)),C=n.xOrigin||0,E=n.yOrigin||0,w!==vl&&(A=w[0],I=w[1],z=w[2],H=w[3],u=D=w[4],d=F=w[5],w.length===6?(f=Math.sqrt(A*A+I*I),m=Math.sqrt(H*H+z*z),_=A||I?Qa(I,A)*Zs:0,S=z||H?Qa(z,H)*Zs+_:0,S&&(m*=Math.abs(Math.cos(S*eo))),n.svg&&(u-=C-(C*A+E*z),d-=E-(C*I+E*H))):(Be=w[6],Le=w[7],L=w[8],se=w[9],Se=w[10],Oe=w[11],u=w[12],d=w[13],h=w[14],y=Qa(Be,Se),p=y*Zs,y&&(b=Math.cos(-y),P=Math.sin(-y),U=D*b+L*P,Y=F*b+se*P,Q=Be*b+Se*P,L=D*-P+L*b,se=F*-P+se*b,Se=Be*-P+Se*b,Oe=Le*-P+Oe*b,D=U,F=Y,Be=Q),y=Qa(-z,Se),g=y*Zs,y&&(b=Math.cos(-y),P=Math.sin(-y),U=A*b-L*P,Y=I*b-se*P,Q=z*b-Se*P,Oe=H*P+Oe*b,A=U,I=Y,z=Q),y=Qa(I,A),_=y*Zs,y&&(b=Math.cos(y),P=Math.sin(y),U=A*b+I*P,Y=D*b+F*P,I=I*b-A*P,F=F*b-D*P,A=U,D=Y),p&&Math.abs(p)+Math.abs(_)>359.9&&(p=_=0,g=180-g),f=Jt(Math.sqrt(A*A+I*I+z*z)),m=Jt(Math.sqrt(F*F+Be*Be)),y=Qa(D,F),S=Math.abs(y)>2e-4?y*Zs:0,x=Oe?1/(Oe<0?-Oe:Oe):0),n.svg&&(U=e.getAttribute("transform"),n.forceCSS=e.setAttribute("transform","")||!k0(yi(e,qt)),U&&e.setAttribute("transform",U))),Math.abs(S)>90&&Math.abs(S)<270&&(s?(f*=-1,S+=_<=0?180:-180,_+=_<=0?180:-180):(m*=-1,S+=S<=0?180:-180)),t=t||n.uncache,n.x=u-((n.xPercent=u&&(!t&&n.xPercent||(Math.round(e.offsetWidth/2)===Math.round(-u)?-50:0)))?e.offsetWidth*n.xPercent/100:0)+a,n.y=d-((n.yPercent=d&&(!t&&n.yPercent||(Math.round(e.offsetHeight/2)===Math.round(-d)?-50:0)))?e.offsetHeight*n.yPercent/100:0)+a,n.z=h+a,n.scaleX=Jt(f),n.scaleY=Jt(m),n.rotation=Jt(_)+o,n.rotationX=Jt(p)+o,n.rotationY=Jt(g)+o,n.skewX=S+o,n.skewY=M+o,n.transformPerspective=x+a,(n.zOrigin=parseFloat(c.split(" ")[2])||!t&&n.zOrigin||0)&&(i[li]=ph(c)),n.xOffset=n.yOffset=0,n.force3D=oi.force3D,n.renderTransform=n.svg?qT:N0?z0:XT,n.uncache=0,n},ph=function(e){return(e=e.split(" "))[0]+" "+e[1]},tp=function(e,t,n){var i=Cn(t);return Jt(parseFloat(t)+parseFloat(_s(e,"x",n+"px",i)))+i},XT=function(e,t){t.z="0px",t.rotationY=t.rotationX="0deg",t.force3D=0,z0(e,t)},qs="0deg",xl="0px",Ys=") ",z0=function(e,t){var n=t||this,i=n.xPercent,s=n.yPercent,a=n.x,o=n.y,l=n.z,c=n.rotation,u=n.rotationY,d=n.rotationX,h=n.skewX,f=n.skewY,m=n.scaleX,_=n.scaleY,p=n.transformPerspective,g=n.force3D,S=n.target,M=n.zOrigin,x="",C=g==="auto"&&e&&e!==1||g===!0;if(M&&(d!==qs||u!==qs)){var E=parseFloat(u)*eo,w=Math.sin(E),y=Math.cos(E),b;E=parseFloat(d)*eo,b=Math.cos(E),a=tp(S,a,w*b*-M),o=tp(S,o,-Math.sin(E)*-M),l=tp(S,l,y*b*-M+M)}p!==xl&&(x+="perspective("+p+Ys),(i||s)&&(x+="translate("+i+"%, "+s+"%) "),(C||a!==xl||o!==xl||l!==xl)&&(x+=l!==xl||C?"translate3d("+a+", "+o+", "+l+") ":"translate("+a+", "+o+Ys),c!==qs&&(x+="rotate("+c+Ys),u!==qs&&(x+="rotateY("+u+Ys),d!==qs&&(x+="rotateX("+d+Ys),(h!==qs||f!==qs)&&(x+="skew("+h+", "+f+Ys),(m!==1||_!==1)&&(x+="scale("+m+", "+_+Ys),S.style[qt]=x||"translate(0, 0)"},qT=function(e,t){var n=t||this,i=n.xPercent,s=n.yPercent,a=n.x,o=n.y,l=n.rotation,c=n.skewX,u=n.skewY,d=n.scaleX,h=n.scaleY,f=n.target,m=n.xOrigin,_=n.yOrigin,p=n.xOffset,g=n.yOffset,S=n.forceCSS,M=parseFloat(a),x=parseFloat(o),C,E,w,y,b;l=parseFloat(l),c=parseFloat(c),u=parseFloat(u),u&&(u=parseFloat(u),c+=u,l+=u),l||c?(l*=eo,c*=eo,C=Math.cos(l)*d,E=Math.sin(l)*d,w=Math.sin(l-c)*-h,y=Math.cos(l-c)*h,c&&(u*=eo,b=Math.tan(c-u),b=Math.sqrt(1+b*b),w*=b,y*=b,u&&(b=Math.tan(u),b=Math.sqrt(1+b*b),C*=b,E*=b)),C=Jt(C),E=Jt(E),w=Jt(w),y=Jt(y)):(C=d,y=h,E=w=0),(M&&!~(a+"").indexOf("px")||x&&!~(o+"").indexOf("px"))&&(M=_s(f,"x",a,"px"),x=_s(f,"y",o,"px")),(m||_||p||g)&&(M=Jt(M+m-(m*C+_*w)+p),x=Jt(x+_-(m*E+_*y)+g)),(i||s)&&(b=f.getBBox(),M=Jt(M+i/100*b.width),x=Jt(x+s/100*b.height)),b="matrix("+C+","+E+","+w+","+y+","+M+","+x+")",f.setAttribute("transform",b),S&&(f.style[qt]=b)},YT=function(e,t,n,i,s){var a=360,o=pn(s),l=parseFloat(s)*(o&&~s.indexOf("rad")?Zs:1),c=l-i,u=i+c+"deg",d,h;return o&&(d=s.split("_")[1],d==="short"&&(c%=a,c!==c%(a/2)&&(c+=c<0?a:-a)),d==="cw"&&c<0?c=(c+a*b0)%a-~~(c/a)*a:d==="ccw"&&c>0&&(c=(c-a*b0)%a-~~(c/a)*a)),e._pt=h=new Jn(e._pt,t,n,i,c,RT),h.e=u,h.u="deg",e._props.push(n),h},P0=function(e,t){for(var n in t)e[n]=t[n];return e},ZT=function(e,t,n){var i=P0({},n._gsap),s="perspective,force3D,transformOrigin,svgOrigin",a=n.style,o,l,c,u,d,h,f,m;i.svg?(c=n.getAttribute("transform"),n.setAttribute("transform",""),a[qt]=t,o=yl(n,1),gs(n,qt),n.setAttribute("transform",c)):(c=getComputedStyle(n)[qt],a[qt]=t,o=yl(n,1),a[qt]=c);for(l in Pr)c=i[l],u=o[l],c!==u&&s.indexOf(l)<0&&(f=Cn(c),m=Cn(u),d=f!==m?_s(n,l,c,m):parseFloat(c),h=parseFloat(u),e._pt=new Jn(e._pt,o,l,d,h-d,np),e._pt.u=m||0,e._props.push(l));P0(o,i)};Zn("padding,margin,Width,Radius",function(r,e){var t="Top",n="Right",i="Bottom",s="Left",a=(e<3?[t,n,i,s]:[t+s,t+n,i+n,i+s]).map(function(o){return e<2?r+o:"border"+o+r});dh[e>1?"border"+r:r]=function(o,l,c,u,d){var h,f;if(arguments.length<4)return h=a.map(function(m){return Rr(o,m,c)}),f=h.join(" "),f.split(h[0]).length===5?h[0]:f;h=(u+"").split(" "),f={},a.forEach(function(m,_){return f[m]=h[_]=h[_]||h[(_-1)/2|0]}),o.init(l,f,d)}});var up={name:"css",register:rp,targetTest:function(e){return e.style&&e.nodeType},init:function(e,t,n,i,s){var a=this._props,o=e.style,l=n.vars.startAt,c,u,d,h,f,m,_,p,g,S,M,x,C,E,w,y,b;ap||rp(),this.styles=this.styles||U0(e),y=this.styles.props,this.tween=n;for(_ in t)if(_!=="autoRound"&&(u=t[_],!(ri[_]&&Jd(_,t,n,i,e,s)))){if(f=typeof u,m=dh[_],f==="function"&&(u=u.call(n,i,e,s),f=typeof u),f==="string"&&~u.indexOf("random(")&&(u=Ka(u)),m)m(this,e,_,u,n)&&(w=1);else if(_.substr(0,2)==="--")c=(getComputedStyle(e).getPropertyValue(_)+"").trim(),u+="",Ar.lastIndex=0,Ar.test(c)||(p=Cn(c),g=Cn(u),g?p!==g&&(c=_s(e,_,c,g)+g):p&&(u+=p)),this.add(o,"setProperty",c,u,i,s,0,0,_),a.push(_),y.push(_,0,o[_]);else if(f!=="undefined"){if(l&&_ in l?(c=typeof l[_]=="function"?l[_].call(n,i,e,s):l[_],pn(c)&&~c.indexOf("random(")&&(c=Ka(c)),Cn(c+"")||c==="auto"||(c+=oi.units[_]||Cn(Rr(e,_))||""),(c+"").charAt(1)==="="&&(c=Rr(e,_))):c=Rr(e,_),h=parseFloat(c),S=f==="string"&&u.charAt(1)==="="&&u.substr(0,2),S&&(u=u.substr(2)),d=parseFloat(u),_ in cr&&(_==="autoAlpha"&&(h===1&&Rr(e,"visibility")==="hidden"&&d&&(h=0),y.push("visibility",0,o.visibility),ms(this,o,"visibility",h?"inherit":"hidden",d?"inherit":"hidden",!d)),_!=="scale"&&_!=="transform"&&(_=cr[_],~_.indexOf(",")&&(_=_.split(",")[0]))),M=_ in Pr,M){if(this.styles.save(_),b=u,f==="string"&&u.substring(0,6)==="var(--"){if(u=yi(e,u.substring(4,u.indexOf(")"))),u.substring(0,5)==="calc("){var P=e.style.perspective;e.style.perspective=u,u=yi(e,"perspective"),P?e.style.perspective=P:gs(e,"perspective")}d=parseFloat(u)}if(x||(C=e._gsap,C.renderTransform&&!t.parseTransform||yl(e,t.parseTransform),E=t.smoothOrigin!==!1&&C.smooth,x=this._pt=new Jn(this._pt,o,qt,0,1,C.renderTransform,C,0,-1),x.dep=1),_==="scale")this._pt=new Jn(this._pt,C,"scaleY",C.scaleY,(S?Ws(C.scaleY,S+d):d)-C.scaleY||0,np),this._pt.u=0,a.push("scaleY",_),_+="X";else if(_==="transformOrigin"){y.push(li,0,o[li]),u=GT(u),C.svg?sp(e,u,0,E,0,this):(g=parseFloat(u.split(" ")[2])||0,g!==C.zOrigin&&ms(this,C,"zOrigin",C.zOrigin,g),ms(this,o,_,ph(c),ph(u)));continue}else if(_==="svgOrigin"){sp(e,u,1,E,0,this);continue}else if(_ in B0){YT(this,C,_,h,S?Ws(h,S+u):u);continue}else if(_==="smoothOrigin"){ms(this,C,"smooth",C.smooth,u);continue}else if(_==="force3D"){C[_]=u;continue}else if(_==="transform"){ZT(this,u,e);continue}}else _ in o||(_=to(_)||_);if(M||(d||d===0)&&(h||h===0)&&!CT.test(u)&&_ in o)p=(c+"").substr((h+"").length),d||(d=0),g=Cn(u)||(_ in oi.units?oi.units[_]:p),p!==g&&(h=_s(e,_,c,g)),this._pt=new Jn(this._pt,M?C:o,_,h,(S?Ws(h,S+d):d)-h,!M&&(g==="px"||_==="zIndex")&&t.autoRound!==!1?DT:np),this._pt.u=g||0,M&&b!==u?(this._pt.b=c,this._pt.e=b,this._pt.r=IT):p!==g&&g!=="%"&&(this._pt.b=c,this._pt.r=PT);else if(_ in o)HT.call(this,e,_,c,S?S+u:u);else if(_ in e)this.add(e,_,c||e[_],S?S+u:u,i,s);else if(_!=="parseTransform"){lh(_,u);continue}M||(_ in o?y.push(_,0,o[_]):typeof e[_]=="function"?y.push(_,2,e[_]()):y.push(_,1,c||e[_])),a.push(_)}}w&&ep(this)},render:function(e,t){if(t.tween._time||!op())for(var n=t._pt;n;)n.r(e,n.d),n=n._next;else t.styles.revert()},get:Rr,aliases:cr,getSetter:function(e,t,n){var i=cr[t];return i&&i.indexOf(",")<0&&(t=i),t in Pr&&t!==li&&(e._gsap.x||Rr(e,"x"))?n&&M0===n?t==="scale"?FT:NT:(M0=n||{})&&(t==="scale"?OT:BT):e.style&&!oh(e.style[t])?LT:~t.indexOf("-")?UT:fh(e,t)},core:{_removeProperty:gs,_getMatrix:cp}};zn.utils.checkPrefix=to;zn.core.getStyleSaver=U0;(function(r,e,t,n){var i=Zn(r+","+e+","+t,function(s){Pr[s]=1});Zn(e,function(s){oi.units[s]="deg",B0[s]=1}),cr[i[13]]=r+","+e,Zn(n,function(s){var a=s.split(":");cr[a[1]]=i[a[0]]})})("x,y,z,scale,scaleX,scaleY,xPercent,yPercent","rotation,rotationX,rotationY,skewX,skewY","transform,transformOrigin,svgOrigin,force3D,smoothOrigin,transformPerspective","0:translateX,1:translateY,2:translateZ,8:rotate,8:rotationZ,8:rotateZ,9:rotateX,10:rotateY");Zn("x,y,z,top,right,bottom,left,width,height,fontSize,padding,margin,perspective",function(r){oi.units[r]="px"});zn.registerPlugin(up);var mh=zn.registerPlugin(up)||zn,WC=mh.core.Tween;function V0(r,e){for(var t=0;t<e.length;t++){var n=e[t];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(r,n.key,n)}}function JT(r,e,t){return e&&V0(r.prototype,e),t&&V0(r,t),r}var Rn,xh,$T,Si,xs,vs,io,G0,$s,ro,W0,Ir,Wi,X0,q0=function(){return Rn||typeof window<"u"&&(Rn=window.gsap)&&Rn.registerPlugin&&Rn},Y0=1,no=[],dt=[],Xi=[],Ml=Date.now,hp=function(e,t){return t},KT=function(){var e=ro.core,t=e.bridge||{},n=e._scrollers,i=e._proxies;n.push.apply(n,dt),i.push.apply(i,Xi),dt=n,Xi=i,hp=function(a,o){return t[a](o)}},Lr=function(e,t){return~Xi.indexOf(e)&&Xi[Xi.indexOf(e)+1][t]},bl=function(e){return!!~W0.indexOf(e)},Kn=function(e,t,n,i,s){return e.addEventListener(t,n,{passive:i!==!1,capture:!!s})},$n=function(e,t,n,i){return e.removeEventListener(t,n,!!i)},gh="scrollLeft",_h="scrollTop",fp=function(){return Ir&&Ir.isPressed||dt.cache++},vh=function(e,t){var n=function i(s){if(s||s===0){Y0&&(Si.history.scrollRestoration="manual");var a=Ir&&Ir.isPressed;s=i.v=Math.round(s)||(Ir&&Ir.iOS?1:0),e(s),i.cacheID=dt.cache,a&&hp("ss",s)}else(t||dt.cache!==i.cacheID||hp("ref"))&&(i.cacheID=dt.cache,i.v=e());return i.v+i.offset};return n.offset=0,e&&n},Vn={s:gh,p:"left",p2:"Left",os:"right",os2:"Right",d:"width",d2:"Width",a:"x",sc:vh(function(r){return arguments.length?Si.scrollTo(r,cn.sc()):Si.pageXOffset||xs[gh]||vs[gh]||io[gh]||0})},cn={s:_h,p:"top",p2:"Top",os:"bottom",os2:"Bottom",d:"height",d2:"Height",a:"y",op:Vn,sc:vh(function(r){return arguments.length?Si.scrollTo(Vn.sc(),r):Si.pageYOffset||xs[_h]||vs[_h]||io[_h]||0})},Qn=function(e,t){return(t&&t._ctx&&t._ctx.selector||Rn.utils.toArray)(e)[0]||(typeof e=="string"&&Rn.config().nullTargetWarn!==!1?console.warn("Element not found:",e):null)},QT=function(e,t){for(var n=t.length;n--;)if(t[n]===e||t[n].contains(e))return!0;return!1},Dr=function(e,t){var n=t.s,i=t.sc;bl(e)&&(e=xs.scrollingElement||vs);var s=dt.indexOf(e),a=i===cn.sc?1:2;!~s&&(s=dt.push(e)-1),dt[s+a]||Kn(e,"scroll",fp);var o=dt[s+a],l=o||(dt[s+a]=vh(Lr(e,n),!0)||(bl(e)?i:vh(function(c){return arguments.length?e[n]=c:e[n]})));return l.target=e,o||(l.smooth=Rn.getProperty(e,"scrollBehavior")==="smooth"),l},yh=function(e,t,n){var i=e,s=e,a=Ml(),o=a,l=t||50,c=Math.max(500,l*3),u=function(m,_){var p=Ml();_||p-a>l?(s=i,i=m,o=a,a=p):n?i+=m:i=s+(m-s)/(p-o)*(a-o)},d=function(){s=i=n?0:i,o=a=0},h=function(m){var _=o,p=s,g=Ml();return(m||m===0)&&m!==i&&u(m),a===o||g-o>c?0:(i+(n?p:-p))/((n?g:a)-_)*1e3};return{update:u,reset:d,getVelocity:h}},Sl=function(e,t){return t&&!e._gsapAllow&&e.cancelable!==!1&&e.preventDefault(),e.changedTouches?e.changedTouches[0]:e},H0=function(e){var t=Math.max.apply(Math,e),n=Math.min.apply(Math,e);return Math.abs(t)>=Math.abs(n)?t:n},Z0=function(){ro=Rn.core.globals().ScrollTrigger,ro&&ro.core&&KT()},J0=function(e){return Rn=e||q0(),!xh&&Rn&&typeof document<"u"&&document.body&&(Si=window,xs=document,vs=xs.documentElement,io=xs.body,W0=[Si,xs,vs,io],$T=Rn.utils.clamp,X0=Rn.core.context||function(){},$s="onpointerenter"in io?"pointer":"mouse",G0=$t.isTouch=Si.matchMedia&&Si.matchMedia("(hover: none), (pointer: coarse)").matches?1:"ontouchstart"in Si||navigator.maxTouchPoints>0||navigator.msMaxTouchPoints>0?2:0,Wi=$t.eventTypes=("ontouchstart"in vs?"touchstart,touchmove,touchcancel,touchend":"onpointerdown"in vs?"pointerdown,pointermove,pointercancel,pointerup":"mousedown,mousemove,mouseup,mouseup").split(","),setTimeout(function(){return Y0=0},500),xh=1),ro||Z0(),xh};Vn.op=cn;dt.cache=0;var $t=(function(){function r(t){this.init(t)}var e=r.prototype;return e.init=function(n){xh||J0(Rn)||console.warn("Please gsap.registerPlugin(Observer)"),ro||Z0();var i=n.tolerance,s=n.dragMinimum,a=n.type,o=n.target,l=n.lineHeight,c=n.debounce,u=n.preventDefault,d=n.onStop,h=n.onStopDelay,f=n.ignore,m=n.wheelSpeed,_=n.event,p=n.onDragStart,g=n.onDragEnd,S=n.onDrag,M=n.onPress,x=n.onRelease,C=n.onRight,E=n.onLeft,w=n.onUp,y=n.onDown,b=n.onChangeX,P=n.onChangeY,A=n.onChange,I=n.onToggleX,z=n.onToggleY,H=n.onHover,D=n.onHoverEnd,F=n.onMove,U=n.ignoreCheck,Y=n.isNormalizer,Q=n.onGestureStart,L=n.onGestureEnd,se=n.onWheel,Se=n.onEnable,Le=n.onDisable,Oe=n.onClick,Be=n.scrollSpeed,ee=n.capture,ce=n.allowClicks,he=n.lockAxis,Me=n.onLockAxis;this.target=o=Qn(o)||vs,this.vars=n,f&&(f=Rn.utils.toArray(f)),i=i||1e-9,s=s||0,m=m||1,Be=Be||1,a=a||"wheel,touch,pointer",c=c!==!1,l||(l=parseFloat(Si.getComputedStyle(io).lineHeight)||22);var ke,Pe,qe,be,j,oe,ie,B=this,me=0,We=0,N=n.passive||!u&&n.passive!==!1,Ne=Dr(o,Vn),J=Dr(o,cn),le=Ne(),ae=J(),Fe=~a.indexOf("touch")&&!~a.indexOf("pointer")&&Wi[0]==="pointerdown",R=bl(o),v=o.ownerDocument||xs,V=[0,0,0],K=[0,0,0],re=0,ue=function(){return re=Ml()},O=function(ye,Ke){return(B.event=ye)&&f&&QT(ye.target,f)||Ke&&Fe&&ye.pointerType!=="touch"||U&&U(ye,Ke)},Z=function(){B._vx.reset(),B._vy.reset(),Pe.pause(),d&&d(B)},te=function(){var ye=B.deltaX=H0(V),Ke=B.deltaY=H0(K),de=Math.abs(ye)>=i,Ze=Math.abs(Ke)>=i;A&&(de||Ze)&&A(B,ye,Ke,V,K),de&&(C&&B.deltaX>0&&C(B),E&&B.deltaX<0&&E(B),b&&b(B),I&&B.deltaX<0!=me<0&&I(B),me=B.deltaX,V[0]=V[1]=V[2]=0),Ze&&(y&&B.deltaY>0&&y(B),w&&B.deltaY<0&&w(B),P&&P(B),z&&B.deltaY<0!=We<0&&z(B),We=B.deltaY,K[0]=K[1]=K[2]=0),(be||qe)&&(F&&F(B),qe&&(p&&qe===1&&p(B),S&&S(B),qe=0),be=!1),oe&&!(oe=!1)&&Me&&Me(B),j&&(se(B),j=!1),ke=0},Ee=function(ye,Ke,de){V[de]+=ye,K[de]+=Ke,B._vx.update(ye),B._vy.update(Ke),c?ke||(ke=requestAnimationFrame(te)):te()},Ae=function(ye,Ke){he&&!ie&&(B.axis=ie=Math.abs(ye)>Math.abs(Ke)?"x":"y",oe=!0),ie!=="y"&&(V[2]+=ye,B._vx.update(ye,!0)),ie!=="x"&&(K[2]+=Ke,B._vy.update(Ke,!0)),c?ke||(ke=requestAnimationFrame(te)):te()},xe=function(ye){if(!O(ye,1)){ye=Sl(ye,u);var Ke=ye.clientX,de=ye.clientY,Ze=Ke-B.x,Ve=de-B.y,Je=B.isDragging;B.x=Ke,B.y=de,(Je||(Ze||Ve)&&(Math.abs(B.startX-Ke)>=s||Math.abs(B.startY-de)>=s))&&(qe||(qe=Je?2:1),Je||(B.isDragging=!0),Ae(Ze,Ve))}},ge=B.onPress=function(pe){O(pe,1)||pe&&pe.button||(B.axis=ie=null,Pe.pause(),B.isPressed=!0,pe=Sl(pe),me=We=0,B.startX=B.x=pe.clientX,B.startY=B.y=pe.clientY,B._vx.reset(),B._vy.reset(),Kn(Y?o:v,Wi[1],xe,N,!0),B.deltaX=B.deltaY=0,M&&M(B))},Te=B.onRelease=function(pe){if(!O(pe,1)){$n(Y?o:v,Wi[1],xe,!0);var ye=!isNaN(B.y-B.startY),Ke=B.isDragging,de=Ke&&(Math.abs(B.x-B.startX)>3||Math.abs(B.y-B.startY)>3),Ze=Sl(pe);!de&&ye&&(B._vx.reset(),B._vy.reset(),u&&ce&&Rn.delayedCall(.08,function(){if(Ml()-re>300&&!pe.defaultPrevented){if(pe.target.click)pe.target.click();else if(v.createEvent){var Ve=v.createEvent("MouseEvents");Ve.initMouseEvent("click",!0,!0,Si,1,Ze.screenX,Ze.screenY,Ze.clientX,Ze.clientY,!1,!1,!1,!1,0,null),pe.target.dispatchEvent(Ve)}}})),B.isDragging=B.isGesturing=B.isPressed=!1,d&&Ke&&!Y&&Pe.restart(!0),qe&&te(),g&&Ke&&g(B),x&&x(B,de)}},je=function(ye){return ye.touches&&ye.touches.length>1&&(B.isGesturing=!0)&&Q(ye,B.isDragging)},rt=function(){return(B.isGesturing=!1)||L(B)},k=function(ye){if(!O(ye)){var Ke=Ne(),de=J();Ee((Ke-le)*Be,(de-ae)*Be,1),le=Ke,ae=de,d&&Pe.restart(!0)}},_e=function(ye){if(!O(ye)){ye=Sl(ye,u),se&&(j=!0);var Ke=(ye.deltaMode===1?l:ye.deltaMode===2?Si.innerHeight:1)*m;Ee(ye.deltaX*Ke,ye.deltaY*Ke,0),d&&!Y&&Pe.restart(!0)}},ne=function(ye){if(!O(ye)){var Ke=ye.clientX,de=ye.clientY,Ze=Ke-B.x,Ve=de-B.y;B.x=Ke,B.y=de,be=!0,d&&Pe.restart(!0),(Ze||Ve)&&Ae(Ze,Ve)}},Re=function(ye){B.event=ye,H(B)},ve=function(ye){B.event=ye,D(B)},fe=function(ye){return O(ye)||Sl(ye,u)&&Oe(B)};Pe=B._dc=Rn.delayedCall(h||.25,Z).pause(),B.deltaX=B.deltaY=0,B._vx=yh(0,50,!0),B._vy=yh(0,50,!0),B.scrollX=Ne,B.scrollY=J,B.isDragging=B.isGesturing=B.isPressed=!1,X0(this),B.enable=function(pe){return B.isEnabled||(Kn(R?v:o,"scroll",fp),a.indexOf("scroll")>=0&&Kn(R?v:o,"scroll",k,N,ee),a.indexOf("wheel")>=0&&Kn(o,"wheel",_e,N,ee),(a.indexOf("touch")>=0&&G0||a.indexOf("pointer")>=0)&&(Kn(o,Wi[0],ge,N,ee),Kn(v,Wi[2],Te),Kn(v,Wi[3],Te),ce&&Kn(o,"click",ue,!0,!0),Oe&&Kn(o,"click",fe),Q&&Kn(v,"gesturestart",je),L&&Kn(v,"gestureend",rt),H&&Kn(o,$s+"enter",Re),D&&Kn(o,$s+"leave",ve),F&&Kn(o,$s+"move",ne)),B.isEnabled=!0,B.isDragging=B.isGesturing=B.isPressed=be=qe=!1,B._vx.reset(),B._vy.reset(),le=Ne(),ae=J(),pe&&pe.type&&ge(pe),Se&&Se(B)),B},B.disable=function(){B.isEnabled&&(no.filter(function(pe){return pe!==B&&bl(pe.target)}).length||$n(R?v:o,"scroll",fp),B.isPressed&&(B._vx.reset(),B._vy.reset(),$n(Y?o:v,Wi[1],xe,!0)),$n(R?v:o,"scroll",k,ee),$n(o,"wheel",_e,ee),$n(o,Wi[0],ge,ee),$n(v,Wi[2],Te),$n(v,Wi[3],Te),$n(o,"click",ue,!0),$n(o,"click",fe),$n(v,"gesturestart",je),$n(v,"gestureend",rt),$n(o,$s+"enter",Re),$n(o,$s+"leave",ve),$n(o,$s+"move",ne),B.isEnabled=B.isPressed=B.isDragging=!1,Le&&Le(B))},B.kill=B.revert=function(){B.disable();var pe=no.indexOf(B);pe>=0&&no.splice(pe,1),Ir===B&&(Ir=0)},no.push(B),Y&&bl(o)&&(Ir=B),B.enable(_)},JT(r,[{key:"velocityX",get:function(){return this._vx.getVelocity()}},{key:"velocityY",get:function(){return this._vy.getVelocity()}}]),r})();$t.version="3.15.0";$t.create=function(r){return new $t(r)};$t.register=J0;$t.getAll=function(){return no.slice()};$t.getById=function(r){return no.filter(function(e){return e.vars.id===r})[0]};q0()&&Rn.registerPlugin($t);var He,lo,mt,Et,Ti,Tt,wp,Fh,Ol,Pl,El,Sh,Hn,kh,vp,ei,$0,K0,co,d_,dp,p_,jn,yp,m_,g_,ys,Sp,Ap,uo,Cp,Il,Mp,pp,Mh=1,Gn=Date.now,mp=Gn(),Ni=0,wl=0,Q0=function(e,t,n){var i=bi(e)&&(e.substr(0,6)==="clamp("||e.indexOf("max")>-1);return n["_"+t+"Clamp"]=i,i?e.substr(6,e.length-7):e},j0=function(e,t){return t&&(!bi(e)||e.substr(0,6)!=="clamp(")?"clamp("+e+")":e},jT=function r(){return wl&&requestAnimationFrame(r)},e_=function(){return kh=1},t_=function(){return kh=0},ur=function(e){return e},Al=function(e){return Math.round(e*1e5)/1e5||0},__=function(){return typeof window<"u"},x_=function(){return He||__()&&(He=window.gsap)&&He.registerPlugin&&He},na=function(e){return!!~wp.indexOf(e)},v_=function(e){return(e==="Height"?Cp:mt["inner"+e])||Ti["client"+e]||Tt["client"+e]},y_=function(e){return Lr(e,"getBoundingClientRect")||(na(e)?function(){return Nh.width=mt.innerWidth,Nh.height=Cp,Nh}:function(){return Ur(e)})},eE=function(e,t,n){var i=n.d,s=n.d2,a=n.a;return(a=Lr(e,"getBoundingClientRect"))?function(){return a()[i]}:function(){return(t?v_(s):e["client"+s])||0}},tE=function(e,t){return!t||~Xi.indexOf(e)?y_(e):function(){return Nh}},hr=function(e,t){var n=t.s,i=t.d2,s=t.d,a=t.a;return Math.max(0,(n="scroll"+i)&&(a=Lr(e,n))?a()-y_(e)()[s]:na(e)?(Ti[n]||Tt[n])-v_(i):e[n]-e["offset"+i])},bh=function(e,t){for(var n=0;n<co.length;n+=3)(!t||~t.indexOf(co[n+1]))&&e(co[n],co[n+1],co[n+2])},bi=function(e){return typeof e=="string"},Wn=function(e){return typeof e=="function"},Cl=function(e){return typeof e=="number"},Ks=function(e){return typeof e=="object"},Tl=function(e,t,n){return e&&e.progress(t?0:1)&&n&&e.pause()},so=function(e,t,n){if(e.enabled){var i=e._ctx?e._ctx.add(function(){return t(e,n)}):t(e,n);i&&i.totalTime&&(e.callbackAnimation=i)}},ao=Math.abs,S_="left",M_="top",Rp="right",Pp="bottom",js="width",ea="height",Dl="Right",Ll="Left",Ul="Top",Nl="Bottom",un="padding",Li="margin",fo="Width",Ip="Height",mn="px",Ui=function(e){return mt.getComputedStyle(e.nodeType===Node.DOCUMENT_NODE?e.scrollingElement:e)},nE=function(e){var t=Ui(e).position;e.style.position=t==="absolute"||t==="fixed"?t:"relative"},n_=function(e,t){for(var n in t)n in e||(e[n]=t[n]);return e},Ur=function(e,t){var n=t&&Ui(e)[vp]!=="matrix(1, 0, 0, 1, 0, 0)"&&He.to(e,{x:0,y:0,xPercent:0,yPercent:0,rotation:0,rotationX:0,rotationY:0,scale:1,skewX:0,skewY:0}).progress(1),i=e.getBoundingClientRect?e.getBoundingClientRect():e.scrollingElement.getBoundingClientRect();return n&&n.progress(0).kill(),i},Oh=function(e,t){var n=t.d2;return e["offset"+n]||e["client"+n]||0},b_=function(e){var t=[],n=e.labels,i=e.duration(),s;for(s in n)t.push(n[s]/i);return t},iE=function(e){return function(t){return He.utils.snap(b_(e),t)}},Dp=function(e){var t=He.utils.snap(e),n=Array.isArray(e)&&e.slice(0).sort(function(i,s){return i-s});return n?function(i,s,a){a===void 0&&(a=.001);var o;if(!s)return t(i);if(s>0){for(i-=a,o=0;o<n.length;o++)if(n[o]>=i)return n[o];return n[o-1]}else for(o=n.length,i+=a;o--;)if(n[o]<=i)return n[o];return n[0]}:function(i,s,a){a===void 0&&(a=.001);var o=t(i);return!s||Math.abs(o-i)<a||o-i<0==s<0?o:t(s<0?i-e:i+e)}},rE=function(e){return function(t,n){return Dp(b_(e))(t,n.direction)}},Th=function(e,t,n,i){return n.split(",").forEach(function(s){return e(t,s,i)})},En=function(e,t,n,i,s){return e.addEventListener(t,n,{passive:!i,capture:!!s})},Tn=function(e,t,n,i){return e.removeEventListener(t,n,!!i)},Eh=function(e,t,n){n=n&&n.wheelHandler,n&&(e(t,"wheel",n),e(t,"touchmove",n))},i_={startColor:"green",endColor:"red",indent:0,fontSize:"16px",fontWeight:"normal"},wh={toggleActions:"play",anticipatePin:0},Bh={top:0,left:0,center:.5,bottom:1,right:1},Ih=function(e,t){if(bi(e)){var n=e.indexOf("="),i=~n?+(e.charAt(n-1)+1)*parseFloat(e.substr(n+1)):0;~n&&(e.indexOf("%")>n&&(i*=t/100),e=e.substr(0,n-1)),e=i+(e in Bh?Bh[e]*t:~e.indexOf("%")?parseFloat(e)*t/100:parseFloat(e)||0)}return e},Ah=function(e,t,n,i,s,a,o,l){var c=s.startColor,u=s.endColor,d=s.fontSize,h=s.indent,f=s.fontWeight,m=Et.createElement("div"),_=na(n)||Lr(n,"pinType")==="fixed",p=e.indexOf("scroller")!==-1,g=_?Tt:n.tagName==="IFRAME"?n.contentDocument.body:n,S=e.indexOf("start")!==-1,M=S?c:u,x="border-color:"+M+";font-size:"+d+";color:"+M+";font-weight:"+f+";pointer-events:none;white-space:nowrap;font-family:sans-serif,Arial;z-index:1000;padding:4px 8px;border-width:0;border-style:solid;";return x+="position:"+((p||l)&&_?"fixed;":"absolute;"),(p||l||!_)&&(x+=(i===cn?Rp:Pp)+":"+(a+parseFloat(h))+"px;"),o&&(x+="box-sizing:border-box;text-align:left;width:"+o.offsetWidth+"px;"),m._isStart=S,m.setAttribute("class","gsap-marker-"+e+(t?" marker-"+t:"")),m.style.cssText=x,m.innerText=t||t===0?e+"-"+t:e,g.children[0]?g.insertBefore(m,g.children[0]):g.appendChild(m),m._offset=m["offset"+i.op.d2],Dh(m,0,i,S),m},Dh=function(e,t,n,i){var s={display:"block"},a=n[i?"os2":"p2"],o=n[i?"p2":"os2"];e._isFlipped=i,s[n.a+"Percent"]=i?-100:0,s[n.a]=i?"1px":0,s["border"+a+fo]=1,s["border"+o+fo]=0,s[n.p]=t+"px",He.set(e,s)},pt=[],bp={},Bl,r_=function(){return Gn()-Ni>34&&(Bl||(Bl=requestAnimationFrame(Nr)))},oo=function(){(!jn||!jn.isPressed||jn.startX>Tt.clientWidth)&&(dt.cache++,jn?Bl||(Bl=requestAnimationFrame(Nr)):Nr(),Ni||ra("scrollStart"),Ni=Gn())},gp=function(){g_=mt.innerWidth,m_=mt.innerHeight},Rl=function(e){dt.cache++,(e===!0||!Hn&&!p_&&!Et.fullscreenElement&&!Et.webkitFullscreenElement&&(!yp||g_!==mt.innerWidth||Math.abs(mt.innerHeight-m_)>mt.innerHeight*.25))&&Fh.restart(!0)},ia={},sE=[],T_=function r(){return Tn(lt,"scrollEnd",r)||Qs(!0)},ra=function(e){return ia[e]&&ia[e].map(function(t){return t()})||sE},Mi=[],E_=function(e){for(var t=0;t<Mi.length;t+=5)(!e||Mi[t+4]&&Mi[t+4].query===e)&&(Mi[t].style.cssText=Mi[t+1],Mi[t].getBBox&&Mi[t].setAttribute("transform",Mi[t+2]||""),Mi[t+3].uncache=1)},w_=function(){return dt.forEach(function(e){return Wn(e)&&++e.cacheID&&(e.rec=e())})},Lp=function(e,t){var n;for(ei=0;ei<pt.length;ei++)n=pt[ei],n&&(!t||n._ctx===t)&&(e?n.kill(1):n.revert(!0,!0));Il=!0,t&&E_(t),t||ra("revert")},A_=function(e,t){dt.cache++,(t||!ti)&&dt.forEach(function(n){return Wn(n)&&n.cacheID++&&(n.rec=0)}),bi(e)&&(mt.history.scrollRestoration=Ap=e)},ti,ta=0,s_,aE=function(){if(s_!==ta){var e=s_=ta;requestAnimationFrame(function(){return e===ta&&Qs(!0)})}},C_=function(){Tt.appendChild(uo),Cp=!jn&&uo.offsetHeight||mt.innerHeight,Tt.removeChild(uo)},a_=function(e){return Ol(".gsap-marker-start, .gsap-marker-end, .gsap-marker-scroller-start, .gsap-marker-scroller-end").forEach(function(t){return t.style.display=e?"none":"block"})},Qs=function(e,t){if(Ti=Et.documentElement,Tt=Et.body,wp=[mt,Et,Ti,Tt],Ni&&!e&&!Il){En(lt,"scrollEnd",T_);return}C_(),ti=lt.isRefreshing=!0,Il||w_();var n=ra("refreshInit");d_&&lt.sort(),t||Lp(),dt.forEach(function(i){Wn(i)&&(i.smooth&&(i.target.style.scrollBehavior="auto"),i(0))}),pt.slice(0).forEach(function(i){return i.refresh()}),Il=!1,pt.forEach(function(i){if(i._subPinOffset&&i.pin){var s=i.vars.horizontal?"offsetWidth":"offsetHeight",a=i.pin[s];i.revert(!0,1),i.adjustPinSpacing(i.pin[s]-a),i.refresh()}}),Mp=1,a_(!0),pt.forEach(function(i){var s=hr(i.scroller,i._dir),a=i.vars.end==="max"||i._endClamp&&i.end>s,o=i._startClamp&&i.start>=s;(a||o)&&i.setPositions(o?s-1:i.start,a?Math.max(o?s:i.start+1,s):i.end,!0)}),a_(!1),Mp=0,n.forEach(function(i){return i&&i.render&&i.render(-1)}),dt.forEach(function(i){Wn(i)&&(i.smooth&&requestAnimationFrame(function(){return i.target.style.scrollBehavior="smooth"}),i.rec&&i(i.rec))}),A_(Ap,1),Fh.pause(),ta++,ti=2,Nr(2),pt.forEach(function(i){return Wn(i.vars.onRefresh)&&i.vars.onRefresh(i)}),ti=lt.isRefreshing=!1,ra("refresh")},Tp=0,Lh=1,Fl,Nr=function(e){if(e===2||!ti&&!Il){lt.isUpdating=!0,Fl&&Fl.update(0);var t=pt.length,n=Gn(),i=n-mp>=50,s=t&&pt[0].scroll();if(Lh=Tp>s?-1:1,ti||(Tp=s),i&&(Ni&&!kh&&n-Ni>200&&(Ni=0,ra("scrollEnd")),El=mp,mp=n),Lh<0){for(ei=t;ei-- >0;)pt[ei]&&pt[ei].update(0,i);Lh=1}else for(ei=0;ei<t;ei++)pt[ei]&&pt[ei].update(0,i);lt.isUpdating=!1}Bl=0},Ep=[S_,M_,Pp,Rp,Li+Nl,Li+Dl,Li+Ul,Li+Ll,"display","flexShrink","float","zIndex","gridColumnStart","gridColumnEnd","gridRowStart","gridRowEnd","gridArea","justifySelf","alignSelf","placeSelf","order"],Uh=Ep.concat([js,ea,"boxSizing","max"+fo,"max"+Ip,"position",Li,un,un+Ul,un+Dl,un+Nl,un+Ll]),oE=function(e,t,n){ho(n);var i=e._gsap;if(i.spacerIsNative)ho(i.spacerState);else if(e._gsap.swappedIn){var s=t.parentNode;s&&(s.insertBefore(e,t),s.removeChild(t))}e._gsap.swappedIn=!1},_p=function(e,t,n,i){if(!e._gsap.swappedIn){for(var s=Ep.length,a=t.style,o=e.style,l;s--;)l=Ep[s],a[l]=n[l];a.position=n.position==="absolute"?"absolute":"relative",n.display==="inline"&&(a.display="inline-block"),o[Pp]=o[Rp]="auto",a.flexBasis=n.flexBasis||"auto",a.overflow="visible",a.boxSizing="border-box",a[js]=Oh(e,Vn)+mn,a[ea]=Oh(e,cn)+mn,a[un]=o[Li]=o[M_]=o[S_]="0",ho(i),o[js]=o["max"+fo]=n[js],o[ea]=o["max"+Ip]=n[ea],o[un]=n[un],e.parentNode!==t&&(e.parentNode.insertBefore(t,e),t.appendChild(e)),e._gsap.swappedIn=!0}},lE=/([A-Z])/g,ho=function(e){if(e){var t=e.t.style,n=e.length,i=0,s,a;for((e.t._gsap||He.core.getCache(e.t)).uncache=1;i<n;i+=2)a=e[i+1],s=e[i],a?t[s]=a:t[s]&&t.removeProperty(s.replace(lE,"-$1").toLowerCase())}},Ch=function(e){for(var t=Uh.length,n=e.style,i=[],s=0;s<t;s++)i.push(Uh[s],n[Uh[s]]);return i.t=e,i},cE=function(e,t,n){for(var i=[],s=e.length,a=n?8:0,o;a<s;a+=2)o=e[a],i.push(o,o in t?t[o]:e[a+1]);return i.t=e.t,i},Nh={left:0,top:0},o_=function(e,t,n,i,s,a,o,l,c,u,d,h,f,m){Wn(e)&&(e=e(l)),bi(e)&&e.substr(0,3)==="max"&&(e=h+(e.charAt(4)==="="?Ih("0"+e.substr(3),n):0));var _=f?f.time():0,p,g,S;if(f&&f.seek(0),isNaN(e)||(e=+e),Cl(e))f&&(e=He.utils.mapRange(f.scrollTrigger.start,f.scrollTrigger.end,0,h,e)),o&&Dh(o,n,i,!0);else{Wn(t)&&(t=t(l));var M=(e||"0").split(" "),x,C,E,w;S=Qn(t,l)||Tt,x=Ur(S)||{},(!x||!x.left&&!x.top)&&Ui(S).display==="none"&&(w=S.style.display,S.style.display="block",x=Ur(S),w?S.style.display=w:S.style.removeProperty("display")),C=Ih(M[0],x[i.d]),E=Ih(M[1]||"0",n),e=x[i.p]-c[i.p]-u+C+s-E,o&&Dh(o,E,i,n-E<20||o._isStart&&E>20),n-=n-E}if(m&&(l[m]=e||-.001,e<0&&(e=0)),a){var y=e+n,b=a._isStart;p="scroll"+i.d2,Dh(a,y,i,b&&y>20||!b&&(d?Math.max(Tt[p],Ti[p]):a.parentNode[p])<=y+1),d&&(c=Ur(o),d&&(a.style[i.op.p]=c[i.op.p]-i.op.m-a._offset+mn))}return f&&S&&(p=Ur(S),f.seek(h),g=Ur(S),f._caScrollDist=p[i.p]-g[i.p],e=e/f._caScrollDist*h),f&&f.seek(_),f?e:Math.round(e)},uE=/(webkit|moz|length|cssText|inset)/i,l_=function(e,t,n,i){if(e.parentNode!==t){var s=e.style,a,o;if(t===Tt){e._stOrig=s.cssText,o=Ui(e);for(a in o)!+a&&!uE.test(a)&&o[a]&&typeof s[a]=="string"&&a!=="0"&&(s[a]=o[a]);s.top=n,s.left=i}else s.cssText=e._stOrig;He.core.getCache(e).uncache=1,t.appendChild(e)}},R_=function(e,t,n){var i=t,s=i;return function(a){var o=Math.round(e());return o!==i&&o!==s&&Math.abs(o-i)>3&&Math.abs(o-s)>3&&(a=o,n&&n()),s=i,i=Math.round(a),i}},Rh=function(e,t,n){var i={};i[t.p]="+="+n,He.set(e,i)},c_=function(e,t){var n=Dr(e,t),i="_scroll"+t.p2,s=function a(o,l,c,u,d){var h=a.tween,f=l.onComplete,m={};c=c||n();var _=R_(n,c,function(){h.kill(),a.tween=0});return d=u&&d||0,u=u||o-c,h&&h.kill(),l[i]=o,l.inherit=!1,l.modifiers=m,m[i]=function(){return _(c+u*h.ratio+d*h.ratio*h.ratio)},l.onUpdate=function(){dt.cache++,a.tween&&Nr()},l.onComplete=function(){a.tween=0,f&&f.call(h)},h=a.tween=He.to(e,l),h};return e[i]=n,n.wheelHandler=function(){return s.tween&&s.tween.kill()&&(s.tween=0)},En(e,"wheel",n.wheelHandler),lt.isTouch&&En(e,"touchmove",n.wheelHandler),s},lt=(function(){function r(t,n){lo||r.register(He)||console.warn("Please gsap.registerPlugin(ScrollTrigger)"),Sp(this),this.init(t,n)}var e=r.prototype;return e.init=function(n,i){if(this.progress=this.start=0,this.vars&&this.kill(!0,!0),!wl){this.update=this.refresh=this.kill=ur;return}n=n_(bi(n)||Cl(n)||n.nodeType?{trigger:n}:n,wh);var s=n,a=s.onUpdate,o=s.toggleClass,l=s.id,c=s.onToggle,u=s.onRefresh,d=s.scrub,h=s.trigger,f=s.pin,m=s.pinSpacing,_=s.invalidateOnRefresh,p=s.anticipatePin,g=s.onScrubComplete,S=s.onSnapComplete,M=s.once,x=s.snap,C=s.pinReparent,E=s.pinSpacer,w=s.containerAnimation,y=s.fastScrollEnd,b=s.preventOverlaps,P=n.horizontal||n.containerAnimation&&n.horizontal!==!1?Vn:cn,A=!d&&d!==0,I=Qn(n.scroller||mt),z=He.core.getCache(I),H=na(I),D=("pinType"in n?n.pinType:Lr(I,"pinType")||H&&"fixed")==="fixed",F=[n.onEnter,n.onLeave,n.onEnterBack,n.onLeaveBack],U=A&&n.toggleActions.split(" "),Y="markers"in n?n.markers:wh.markers,Q=H?0:parseFloat(Ui(I)["border"+P.p2+fo])||0,L=this,se=n.onRefreshInit&&function(){return n.onRefreshInit(L)},Se=eE(I,H,P),Le=tE(I,H),Oe=0,Be=0,ee=0,ce=Dr(I,P),he,Me,ke,Pe,qe,be,j,oe,ie,B,me,We,N,Ne,J,le,ae,Fe,R,v,V,K,re,ue,O,Z,te,Ee,Ae,xe,ge,Te,je,rt,k,_e,ne,Re,ve;if(L._startClamp=L._endClamp=!1,L._dir=P,p*=45,L.scroller=I,L.scroll=w?w.time.bind(w):ce,Pe=ce(),L.vars=n,i=i||n.animation,"refreshPriority"in n&&(d_=1,n.refreshPriority===-9999&&(Fl=L)),z.tweenScroll=z.tweenScroll||{top:c_(I,cn),left:c_(I,Vn)},L.tweenTo=he=z.tweenScroll[P.p],L.scrubDuration=function(de){je=Cl(de)&&de,je?Te?Te.duration(de):Te=He.to(i,{ease:"expo",totalProgress:"+=0",inherit:!1,duration:je,paused:!0,onComplete:function(){return g&&g(L)}}):(Te&&Te.progress(1).kill(),Te=0)},i&&(i.vars.lazy=!1,i._initted&&!L.isReverted||i.vars.immediateRender!==!1&&n.immediateRender!==!1&&i.duration()&&i.render(0,!0,!0),L.animation=i.pause(),i.scrollTrigger=L,L.scrubDuration(d),xe=0,l||(l=i.vars.id)),x&&((!Ks(x)||x.push)&&(x={snapTo:x}),"scrollBehavior"in Tt.style&&He.set(H?[Tt,Ti]:I,{scrollBehavior:"auto"}),dt.forEach(function(de){return Wn(de)&&de.target===(H?Et.scrollingElement||Ti:I)&&(de.smooth=!1)}),ke=Wn(x.snapTo)?x.snapTo:x.snapTo==="labels"?iE(i):x.snapTo==="labelsDirectional"?rE(i):x.directional!==!1?function(de,Ze){return Dp(x.snapTo)(de,Gn()-Be<500?0:Ze.direction)}:He.utils.snap(x.snapTo),rt=x.duration||{min:.1,max:2},rt=Ks(rt)?Pl(rt.min,rt.max):Pl(rt,rt),k=He.delayedCall(x.delay||je/2||.1,function(){var de=ce(),Ze=Gn()-Be<500,Ve=he.tween;if((Ze||Math.abs(L.getVelocity())<10)&&!Ve&&!kh&&Oe!==de){var Je=(de-be)/Ne,it=i&&!A?i.totalProgress():Je,tt=Ze?0:(it-ge)/(Gn()-El)*1e3||0,ut=He.utils.clamp(-Je,1-Je,ao(tt/2)*tt/.185),gt=Je+(x.inertia===!1?0:ut),wt,Ct,Mt=x,In=Mt.onStart,Lt=Mt.onInterrupt,gn=Mt.onComplete;if(wt=ke(gt,L),Cl(wt)||(wt=gt),Ct=Math.max(0,Math.round(be+wt*Ne)),de<=j&&de>=be&&Ct!==de){if(Ve&&!Ve._initted&&Ve.data<=ao(Ct-de))return;x.inertia===!1&&(ut=wt-Je),he(Ct,{duration:rt(ao(Math.max(ao(gt-it),ao(wt-it))*.185/tt/.05||0)),ease:x.ease||"power3",data:ao(Ct-de),onInterrupt:function(){return k.restart(!0)&&Lt&&so(L,Lt)},onComplete:function(){L.update(),Oe=ce(),i&&!A&&(Te?Te.resetTo("totalProgress",wt,i._tTime/i._tDur):i.progress(wt)),xe=ge=i&&!A?i.totalProgress():L.progress,S&&S(L),gn&&so(L,gn)}},de,ut*Ne,Ct-de-ut*Ne),In&&so(L,In,he.tween)}}else L.isActive&&Oe!==de&&k.restart(!0)}).pause()),l&&(bp[l]=L),h=L.trigger=Qn(h||f!==!0&&f),ve=h&&h._gsap&&h._gsap.stRevert,ve&&(ve=ve(L)),f=f===!0?h:Qn(f),bi(o)&&(o={targets:h,className:o}),f&&(m===!1||m===Li||(m=!m&&f.parentNode&&f.parentNode.style&&Ui(f.parentNode).display==="flex"?!1:un),L.pin=f,Me=He.core.getCache(f),Me.spacer?J=Me.pinState:(E&&(E=Qn(E),E&&!E.nodeType&&(E=E.current||E.nativeElement),Me.spacerIsNative=!!E,E&&(Me.spacerState=Ch(E))),Me.spacer=Fe=E||Et.createElement("div"),Fe.classList.add("pin-spacer"),l&&Fe.classList.add("pin-spacer-"+l),Me.pinState=J=Ch(f)),n.force3D!==!1&&He.set(f,{force3D:!0}),L.spacer=Fe=Me.spacer,Ae=Ui(f),ue=Ae[m+P.os2],v=He.getProperty(f),V=He.quickSetter(f,P.a,mn),_p(f,Fe,Ae),ae=Ch(f)),Y){We=Ks(Y)?n_(Y,i_):i_,B=Ah("scroller-start",l,I,P,We,0),me=Ah("scroller-end",l,I,P,We,0,B),R=B["offset"+P.op.d2];var fe=Qn(Lr(I,"content")||I);oe=this.markerStart=Ah("start",l,fe,P,We,R,0,w),ie=this.markerEnd=Ah("end",l,fe,P,We,R,0,w),w&&(Re=He.quickSetter([oe,ie],P.a,mn)),!D&&!(Xi.length&&Lr(I,"fixedMarkers")===!0)&&(nE(H?Tt:I),He.set([B,me],{force3D:!0}),Z=He.quickSetter(B,P.a,mn),Ee=He.quickSetter(me,P.a,mn))}if(w){var pe=w.vars.onUpdate,ye=w.vars.onUpdateParams;w.eventCallback("onUpdate",function(){L.update(0,0,1),pe&&pe.apply(w,ye||[])})}if(L.previous=function(){return pt[pt.indexOf(L)-1]},L.next=function(){return pt[pt.indexOf(L)+1]},L.revert=function(de,Ze){if(!Ze)return L.kill(!0);var Ve=de!==!1||!L.enabled,Je=Hn;Ve!==L.isReverted&&(Ve&&(_e=Math.max(ce(),L.scroll.rec||0),ee=L.progress,ne=i&&i.progress()),oe&&[oe,ie,B,me].forEach(function(it){return it.style.display=Ve?"none":"block"}),Ve&&(Hn=L,L.update(Ve)),f&&(!C||!L.isActive)&&(Ve?oE(f,Fe,J):_p(f,Fe,Ui(f),O)),Ve||L.update(Ve),Hn=Je,L.isReverted=Ve)},L.refresh=function(de,Ze,Ve,Je){if(!((Hn||!L.enabled)&&!Ze)){if(f&&de&&Ni){En(r,"scrollEnd",T_);return}!ti&&se&&se(L),Hn=L,he.tween&&!Ve&&(he.tween.kill(),he.tween=0),Te&&Te.pause(),_&&i&&(i.revert({kill:!1}).invalidate(),i.getChildren?i.getChildren(!0,!0,!1).forEach(function(Ie){return Ie.vars.immediateRender&&Ie.render(0,!0,!0)}):i.vars.immediateRender&&i.render(0,!0,!0)),L.isReverted||L.revert(!0,!0),L._subPinOffset=!1;var it=Se(),tt=Le(),ut=w?w.duration():hr(I,P),gt=Ne<=.01||!Ne,wt=0,Ct=Je||0,Mt=Ks(Ve)?Ve.end:n.end,In=n.endTrigger||h,Lt=Ks(Ve)?Ve.start:n.start||(n.start===0||!h?0:f?"0 0":"0 100%"),gn=L.pinnedContainer=n.pinnedContainer&&Qn(n.pinnedContainer,L),ui=h&&Math.max(0,pt.indexOf(L))||0,nn=ui,hn,_n,dr,ca,xn,Kt,wi,T,W,$,X,q,Ce;for(Y&&Ks(Ve)&&(q=He.getProperty(B,P.p),Ce=He.getProperty(me,P.p));nn-- >0;)Kt=pt[nn],Kt.end||Kt.refresh(0,1)||(Hn=L),wi=Kt.pin,wi&&(wi===h||wi===f||wi===gn)&&!Kt.isReverted&&($||($=[]),$.unshift(Kt),Kt.revert(!0,!0)),Kt!==pt[nn]&&(ui--,nn--);for(Wn(Lt)&&(Lt=Lt(L)),Lt=Q0(Lt,"start",L),be=o_(Lt,h,it,P,ce(),oe,B,L,tt,Q,D,ut,w,L._startClamp&&"_startClamp")||(f?-.001:0),Wn(Mt)&&(Mt=Mt(L)),bi(Mt)&&!Mt.indexOf("+=")&&(~Mt.indexOf(" ")?Mt=(bi(Lt)?Lt.split(" ")[0]:"")+Mt:(wt=Ih(Mt.substr(2),it),Mt=bi(Lt)?Lt:(w?He.utils.mapRange(0,w.duration(),w.scrollTrigger.start,w.scrollTrigger.end,be):be)+wt,In=h)),Mt=Q0(Mt,"end",L),j=Math.max(be,o_(Mt||(In?"100% 0":ut),In,it,P,ce()+wt,ie,me,L,tt,Q,D,ut,w,L._endClamp&&"_endClamp"))||-.001,wt=0,nn=ui;nn--;)Kt=pt[nn]||{},wi=Kt.pin,wi&&Kt.start-Kt._pinPush<=be&&!w&&Kt.end>0&&(hn=Kt.end-(L._startClamp?Math.max(0,Kt.start):Kt.start),(wi===h&&Kt.start-Kt._pinPush<be||wi===gn)&&isNaN(Lt)&&(wt+=hn*(1-Kt.progress)),wi===f&&(Ct+=hn));if(be+=wt,j+=wt,L._startClamp&&(L._startClamp+=wt),L._endClamp&&!ti&&(L._endClamp=j||-.001,j=Math.min(j,hr(I,P))),Ne=j-be||(be-=.01)&&.001,gt&&(ee=He.utils.clamp(0,1,He.utils.normalize(be,j,_e))),L._pinPush=Ct,oe&&wt&&(hn={},hn[P.a]="+="+wt,gn&&(hn[P.p]="-="+ce()),He.set([oe,ie],hn)),f&&!(Mp&&L.end>=hr(I,P)))hn=Ui(f),ca=P===cn,dr=ce(),K=parseFloat(v(P.a))+Ct,!ut&&j>1&&(X=(H?Et.scrollingElement||Ti:I).style,X={style:X,value:X["overflow"+P.a.toUpperCase()]},H&&Ui(Tt)["overflow"+P.a.toUpperCase()]!=="scroll"&&(X.style["overflow"+P.a.toUpperCase()]="scroll")),_p(f,Fe,hn),ae=Ch(f),_n=Ur(f,!0),T=D&&Dr(I,ca?Vn:cn)(),m?(O=[m+P.os2,Ne+Ct+mn],O.t=Fe,nn=m===un?Oh(f,P)+Ne+Ct:0,nn&&(O.push(P.d,nn+mn),Fe.style.flexBasis!=="auto"&&(Fe.style.flexBasis=nn+mn)),ho(O),gn&&pt.forEach(function(Ie){Ie.pin===gn&&Ie.vars.pinSpacing!==!1&&(Ie._subPinOffset=!0)}),D&&ce(_e)):(nn=Oh(f,P),nn&&Fe.style.flexBasis!=="auto"&&(Fe.style.flexBasis=nn+mn)),D&&(xn={top:_n.top+(ca?dr-be:T)+mn,left:_n.left+(ca?T:dr-be)+mn,boxSizing:"border-box",position:"fixed"},xn[js]=xn["max"+fo]=Math.ceil(_n.width)+mn,xn[ea]=xn["max"+Ip]=Math.ceil(_n.height)+mn,xn[Li]=xn[Li+Ul]=xn[Li+Dl]=xn[Li+Nl]=xn[Li+Ll]="0",xn[un]=hn[un],xn[un+Ul]=hn[un+Ul],xn[un+Dl]=hn[un+Dl],xn[un+Nl]=hn[un+Nl],xn[un+Ll]=hn[un+Ll],le=cE(J,xn,C),ti&&ce(0)),i?(W=i._initted,dp(1),i.render(i.duration(),!0,!0),re=v(P.a)-K+Ne+Ct,te=Math.abs(Ne-re)>1,D&&te&&le.splice(le.length-2,2),i.render(0,!0,!0),W||i.invalidate(!0),i.parent||i.totalTime(i.totalTime()),dp(0)):re=Ne,X&&(X.value?X.style["overflow"+P.a.toUpperCase()]=X.value:X.style.removeProperty("overflow-"+P.a));else if(h&&ce()&&!w)for(_n=h.parentNode;_n&&_n!==Tt;)_n._pinOffset&&(be-=_n._pinOffset,j-=_n._pinOffset),_n=_n.parentNode;$&&$.forEach(function(Ie){return Ie.revert(!1,!0)}),L.start=be,L.end=j,Pe=qe=ti?_e:ce(),!w&&!ti&&(Pe<_e&&ce(_e),L.scroll.rec=0),L.revert(!1,!0),Be=Gn(),k&&(Oe=-1,k.restart(!0)),Hn=0,i&&A&&(i._initted||ne)&&i.progress()!==ne&&i.progress(ne||0,!0).render(i.time(),!0,!0),(gt||ee!==L.progress||w||_||i&&!i._initted)&&(i&&!A&&(i._initted||ee||i.vars.immediateRender!==!1)&&i.totalProgress(w&&be<-.001&&!ee?He.utils.normalize(be,j,0):ee,!0),L.progress=gt||(Pe-be)/Ne===ee?0:ee),f&&m&&(Fe._pinOffset=Math.round(L.progress*re)),Te&&Te.invalidate(),isNaN(q)||(q-=He.getProperty(B,P.p),Ce-=He.getProperty(me,P.p),Rh(B,P,q),Rh(oe,P,q-(Je||0)),Rh(me,P,Ce),Rh(ie,P,Ce-(Je||0))),gt&&!ti&&L.update(),u&&!ti&&!N&&(N=!0,u(L),N=!1)}},L.getVelocity=function(){return(ce()-qe)/(Gn()-El)*1e3||0},L.endAnimation=function(){Tl(L.callbackAnimation),i&&(Te?Te.progress(1):i.paused()?A||Tl(i,L.direction<0,1):Tl(i,i.reversed()))},L.labelToScroll=function(de){return i&&i.labels&&(be||L.refresh()||be)+i.labels[de]/i.duration()*Ne||0},L.getTrailing=function(de){var Ze=pt.indexOf(L),Ve=L.direction>0?pt.slice(0,Ze).reverse():pt.slice(Ze+1);return(bi(de)?Ve.filter(function(Je){return Je.vars.preventOverlaps===de}):Ve).filter(function(Je){return L.direction>0?Je.end<=be:Je.start>=j})},L.update=function(de,Ze,Ve){if(!(w&&!Ve&&!de)){var Je=ti===!0?_e:L.scroll(),it=de?0:(Je-be)/Ne,tt=it<0?0:it>1?1:it||0,ut=L.progress,gt,wt,Ct,Mt,In,Lt,gn,ui;if(Ze&&(qe=Pe,Pe=w?ce():Je,x&&(ge=xe,xe=i&&!A?i.totalProgress():tt)),p&&f&&!Hn&&!Mh&&Ni&&(!tt&&be<Je+(Je-qe)/(Gn()-El)*p?tt=1e-4:tt===1&&j>Je+(Je-qe)/(Gn()-El)*p&&(tt=.9999)),tt!==ut&&L.enabled){if(gt=L.isActive=!!tt&&tt<1,wt=!!ut&&ut<1,Lt=gt!==wt,In=Lt||!!tt!=!!ut,L.direction=tt>ut?1:-1,L.progress=tt,In&&!Hn&&(Ct=tt&&!ut?0:tt===1?1:ut===1?2:3,A&&(Mt=!Lt&&U[Ct+1]!=="none"&&U[Ct+1]||U[Ct],ui=i&&(Mt==="complete"||Mt==="reset"||Mt in i))),b&&(Lt||ui)&&(ui||d||!i)&&(Wn(b)?b(L):L.getTrailing(b).forEach(function(dr){return dr.endAnimation()})),A||(Te&&!Hn&&!Mh?(Te._dp._time-Te._start!==Te._time&&Te.render(Te._dp._time-Te._start),Te.resetTo?Te.resetTo("totalProgress",tt,i._tTime/i._tDur):(Te.vars.totalProgress=tt,Te.invalidate().restart())):i&&i.totalProgress(tt,!!(Hn&&(Be||de)))),f){if(de&&m&&(Fe.style[m+P.os2]=ue),!D)V(Al(K+re*tt));else if(In){if(gn=!de&&tt>ut&&j+1>Je&&Je+1>=hr(I,P),C)if(!de&&(gt||gn)){var nn=Ur(f,!0),hn=Je-be;l_(f,Tt,nn.top+(P===cn?hn:0)+mn,nn.left+(P===cn?0:hn)+mn)}else l_(f,Fe);ho(gt||gn?le:ae),te&&tt<1&&gt||V(K+(tt===1&&!gn?re:0))}}x&&!he.tween&&!Hn&&!Mh&&k.restart(!0),o&&(Lt||M&&tt&&(tt<1||!pp))&&Ol(o.targets).forEach(function(dr){return dr.classList[gt||M?"add":"remove"](o.className)}),a&&!A&&!de&&a(L),In&&!Hn?(A&&(ui&&(Mt==="complete"?i.pause().totalProgress(1):Mt==="reset"?i.restart(!0).pause():Mt==="restart"?i.restart(!0):i[Mt]()),a&&a(L)),(Lt||!pp)&&(c&&Lt&&so(L,c),F[Ct]&&so(L,F[Ct]),M&&(tt===1?L.kill(!1,1):F[Ct]=0),Lt||(Ct=tt===1?1:3,F[Ct]&&so(L,F[Ct]))),y&&!gt&&Math.abs(L.getVelocity())>(Cl(y)?y:2500)&&(Tl(L.callbackAnimation),Te?Te.progress(1):Tl(i,Mt==="reverse"?1:!tt,1))):A&&a&&!Hn&&a(L)}if(Ee){var _n=w?Je/w.duration()*(w._caScrollDist||0):Je;Z(_n+(B._isFlipped?1:0)),Ee(_n)}Re&&Re(-Je/w.duration()*(w._caScrollDist||0))}},L.enable=function(de,Ze){L.enabled||(L.enabled=!0,En(I,"resize",Rl),H||En(I,"scroll",oo),se&&En(r,"refreshInit",se),de!==!1&&(L.progress=ee=0,Pe=qe=Oe=ce()),Ze!==!1&&L.refresh())},L.getTween=function(de){return de&&he?he.tween:Te},L.setPositions=function(de,Ze,Ve,Je){if(w){var it=w.scrollTrigger,tt=w.duration(),ut=it.end-it.start;de=it.start+ut*de/tt,Ze=it.start+ut*Ze/tt}L.refresh(!1,!1,{start:j0(de,Ve&&!!L._startClamp),end:j0(Ze,Ve&&!!L._endClamp)},Je),L.update()},L.adjustPinSpacing=function(de){if(O&&de){var Ze=O.indexOf(P.d)+1;O[Ze]=parseFloat(O[Ze])+de+mn,O[1]=parseFloat(O[1])+de+mn,ho(O)}},L.disable=function(de,Ze){if(de!==!1&&L.revert(!0,!0),L.enabled&&(L.enabled=L.isActive=!1,Ze||Te&&Te.pause(),_e=0,Me&&(Me.uncache=1),se&&Tn(r,"refreshInit",se),k&&(k.pause(),he.tween&&he.tween.kill()&&(he.tween=0)),!H)){for(var Ve=pt.length;Ve--;)if(pt[Ve].scroller===I&&pt[Ve]!==L)return;Tn(I,"resize",Rl),H||Tn(I,"scroll",oo)}},L.kill=function(de,Ze){L.disable(de,Ze),Te&&!Ze&&Te.kill(),l&&delete bp[l];var Ve=pt.indexOf(L);Ve>=0&&pt.splice(Ve,1),Ve===ei&&Lh>0&&ei--,Ve=0,pt.forEach(function(Je){return Je.scroller===L.scroller&&(Ve=1)}),Ve||ti||(L.scroll.rec=0),i&&(i.scrollTrigger=null,de&&i.revert({kill:!1}),Ze||i.kill()),oe&&[oe,ie,B,me].forEach(function(Je){return Je.parentNode&&Je.parentNode.removeChild(Je)}),Fl===L&&(Fl=0),f&&(Me&&(Me.uncache=1),Ve=0,pt.forEach(function(Je){return Je.pin===f&&Ve++}),Ve||(Me.spacer=0)),n.onKill&&n.onKill(L)},pt.push(L),L.enable(!1,!1),ve&&ve(L),i&&i.add&&!Ne){var Ke=L.update;L.update=function(){L.update=Ke,dt.cache++,be||j||L.refresh()},He.delayedCall(.01,L.update),Ne=.01,be=j=0}else L.refresh();f&&aE()},r.register=function(n){return lo||(He=n||x_(),__()&&window.document&&r.enable(),lo=wl),lo},r.defaults=function(n){if(n)for(var i in n)wh[i]=n[i];return wh},r.disable=function(n,i){wl=0,pt.forEach(function(a){return a[i?"kill":"disable"](n)}),Tn(mt,"wheel",oo),Tn(Et,"scroll",oo),clearInterval(Sh),Tn(Et,"touchcancel",ur),Tn(Tt,"touchstart",ur),Th(Tn,Et,"pointerdown,touchstart,mousedown",e_),Th(Tn,Et,"pointerup,touchend,mouseup",t_),Fh.kill(),bh(Tn);for(var s=0;s<dt.length;s+=3)Eh(Tn,dt[s],dt[s+1]),Eh(Tn,dt[s],dt[s+2])},r.enable=function(){if(mt=window,Et=document,Ti=Et.documentElement,Tt=Et.body,He){if(Ol=He.utils.toArray,Pl=He.utils.clamp,Sp=He.core.context||ur,dp=He.core.suppressOverwrites||ur,Ap=mt.history.scrollRestoration||"auto",Tp=mt.pageYOffset||0,He.core.globals("ScrollTrigger",r),Tt){wl=1,uo=document.createElement("div"),uo.style.height="100vh",uo.style.position="absolute",C_(),jT(),$t.register(He),r.isTouch=$t.isTouch,ys=$t.isTouch&&/(iPad|iPhone|iPod|Mac)/g.test(navigator.userAgent),yp=$t.isTouch===1,En(mt,"wheel",oo),wp=[mt,Et,Ti,Tt],He.matchMedia?(r.matchMedia=function(u){var d=He.matchMedia(),h;for(h in u)d.add(h,u[h]);return d},He.addEventListener("matchMediaInit",function(){w_(),Lp()}),He.addEventListener("matchMediaRevert",function(){return E_()}),He.addEventListener("matchMedia",function(){Qs(0,1),ra("matchMedia")}),He.matchMedia().add("(orientation: portrait)",function(){return gp(),gp})):console.warn("Requires GSAP 3.11.0 or later"),gp(),En(Et,"scroll",oo);var n=Tt.hasAttribute("style"),i=Tt.style,s=i.borderTopStyle,a=He.core.Animation.prototype,o,l;for(a.revert||Object.defineProperty(a,"revert",{value:function(){return this.time(-.01,!0)}}),i.borderTopStyle="solid",o=Ur(Tt),cn.m=Math.round(o.top+cn.sc())||0,Vn.m=Math.round(o.left+Vn.sc())||0,s?i.borderTopStyle=s:i.removeProperty("border-top-style"),n||(Tt.setAttribute("style",""),Tt.removeAttribute("style")),Sh=setInterval(r_,250),He.delayedCall(.5,function(){return Mh=0}),En(Et,"touchcancel",ur),En(Tt,"touchstart",ur),Th(En,Et,"pointerdown,touchstart,mousedown",e_),Th(En,Et,"pointerup,touchend,mouseup",t_),vp=He.utils.checkPrefix("transform"),Uh.push(vp),lo=Gn(),Fh=He.delayedCall(.2,Qs).pause(),co=[Et,"visibilitychange",function(){var u=mt.innerWidth,d=mt.innerHeight;Et.hidden?($0=u,K0=d):($0!==u||K0!==d)&&Rl()},Et,"DOMContentLoaded",Qs,mt,"load",Qs,mt,"resize",Rl],bh(En),pt.forEach(function(u){return u.enable(0,1)}),l=0;l<dt.length;l+=3)Eh(Tn,dt[l],dt[l+1]),Eh(Tn,dt[l],dt[l+2])}else if(Et){var c=function u(){r.enable(),Et.removeEventListener("DOMContentLoaded",u)};Et.addEventListener("DOMContentLoaded",c)}}},r.config=function(n){"limitCallbacks"in n&&(pp=!!n.limitCallbacks);var i=n.syncInterval;i&&clearInterval(Sh)||(Sh=i)&&setInterval(r_,i),"ignoreMobileResize"in n&&(yp=r.isTouch===1&&n.ignoreMobileResize),"autoRefreshEvents"in n&&(bh(Tn)||bh(En,n.autoRefreshEvents||"none"),p_=(n.autoRefreshEvents+"").indexOf("resize")===-1)},r.scrollerProxy=function(n,i){var s=Qn(n),a=dt.indexOf(s),o=na(s);~a&&dt.splice(a,o?6:2),i&&(o?Xi.unshift(mt,i,Tt,i,Ti,i):Xi.unshift(s,i))},r.clearMatchMedia=function(n){pt.forEach(function(i){return i._ctx&&i._ctx.query===n&&i._ctx.kill(!0,!0)})},r.isInViewport=function(n,i,s){var a=(bi(n)?Qn(n):n).getBoundingClientRect(),o=a[s?js:ea]*i||0;return s?a.right-o>0&&a.left+o<mt.innerWidth:a.bottom-o>0&&a.top+o<mt.innerHeight},r.positionInViewport=function(n,i,s){bi(n)&&(n=Qn(n));var a=n.getBoundingClientRect(),o=a[s?js:ea],l=i==null?o/2:i in Bh?Bh[i]*o:~i.indexOf("%")?parseFloat(i)*o/100:parseFloat(i)||0;return s?(a.left+l)/mt.innerWidth:(a.top+l)/mt.innerHeight},r.killAll=function(n){if(pt.slice(0).forEach(function(s){return s.vars.id!=="ScrollSmoother"&&s.kill()}),n!==!0){var i=ia.killAll||[];ia={},i.forEach(function(s){return s()})}},r})();lt.version="3.15.0";lt.saveStyles=function(r){return r?Ol(r).forEach(function(e){if(e&&e.style){var t=Mi.indexOf(e);t>=0&&Mi.splice(t,5),Mi.push(e,e.style.cssText,e.getBBox&&e.getAttribute("transform"),He.core.getCache(e),Sp())}}):Mi};lt.revert=function(r,e){return Lp(!r,e)};lt.create=function(r,e){return new lt(r,e)};lt.refresh=function(r){return r?Rl(!0):(lo||lt.register())&&Qs(!0)};lt.update=function(r){return++dt.cache&&Nr(r===!0?2:0)};lt.clearScrollMemory=A_;lt.maxScroll=function(r,e){return hr(r,e?Vn:cn)};lt.getScrollFunc=function(r,e){return Dr(Qn(r),e?Vn:cn)};lt.getById=function(r){return bp[r]};lt.getAll=function(){return pt.filter(function(r){return r.vars.id!=="ScrollSmoother"})};lt.isScrolling=function(){return!!Ni};lt.snapDirectional=Dp;lt.addEventListener=function(r,e){var t=ia[r]||(ia[r]=[]);~t.indexOf(e)||t.push(e)};lt.removeEventListener=function(r,e){var t=ia[r],n=t&&t.indexOf(e);n>=0&&t.splice(n,1)};lt.batch=function(r,e){var t=[],n={},i=e.interval||.016,s=e.batchMax||1e9,a=function(c,u){var d=[],h=[],f=He.delayedCall(i,function(){u(d,h),d=[],h=[]}).pause();return function(m){d.length||f.restart(!0),d.push(m.trigger),h.push(m),s<=d.length&&f.progress(1)}},o;for(o in e)n[o]=o.substr(0,2)==="on"&&Wn(e[o])&&o!=="onRefreshInit"?a(o,e[o]):e[o];return Wn(s)&&(s=s(),En(lt,"refresh",function(){return s=e.batchMax()})),Ol(r).forEach(function(l){var c={};for(o in n)c[o]=n[o];c.trigger=l,t.push(lt.create(c))}),t};var u_=function(e,t,n,i){return t>i?e(i):t<0&&e(0),n>i?(i-t)/(n-t):n<0?t/(t-n):1},xp=function r(e,t){t===!0?e.style.removeProperty("touch-action"):e.style.touchAction=t===!0?"auto":t?"pan-"+t+($t.isTouch?" pinch-zoom":""):"none",e===Ti&&r(Tt,t)},Ph={auto:1,scroll:1},hE=function(e){var t=e.event,n=e.target,i=e.axis,s=(t.changedTouches?t.changedTouches[0]:t).target,a=s._gsap||He.core.getCache(s),o=Gn(),l;if(!a._isScrollT||o-a._isScrollT>2e3){for(;s&&s!==Tt&&(s.scrollHeight<=s.clientHeight&&s.scrollWidth<=s.clientWidth||!(Ph[(l=Ui(s)).overflowY]||Ph[l.overflowX]));)s=s.parentNode;a._isScroll=s&&s!==n&&!na(s)&&(Ph[(l=Ui(s)).overflowY]||Ph[l.overflowX]),a._isScrollT=o}(a._isScroll||i==="x")&&(t.stopPropagation(),t._gsapAllow=!0)},P_=function(e,t,n,i){return $t.create({target:e,capture:!0,debounce:!1,lockAxis:!0,type:t,onWheel:i=i&&hE,onPress:i,onDrag:i,onScroll:i,onEnable:function(){return n&&En(Et,$t.eventTypes[0],f_,!1,!0)},onDisable:function(){return Tn(Et,$t.eventTypes[0],f_,!0)}})},fE=/(input|label|select|textarea)/i,h_,f_=function(e){var t=fE.test(e.target.tagName);(t||h_)&&(e._gsapAllow=!0,h_=t)},dE=function(e){Ks(e)||(e={}),e.preventDefault=e.isNormalizer=e.allowClicks=!0,e.type||(e.type="wheel,touch"),e.debounce=!!e.debounce,e.id=e.id||"normalizer";var t=e,n=t.normalizeScrollX,i=t.momentum,s=t.allowNestedScroll,a=t.onRelease,o,l,c=Qn(e.target)||Ti,u=He.core.globals().ScrollSmoother,d=u&&u.get(),h=ys&&(e.content&&Qn(e.content)||d&&e.content!==!1&&!d.smooth()&&d.content()),f=Dr(c,cn),m=Dr(c,Vn),_=1,p=($t.isTouch&&mt.visualViewport?mt.visualViewport.scale*mt.visualViewport.width:mt.outerWidth)/mt.innerWidth,g=0,S=Wn(i)?function(){return i(o)}:function(){return i||2.8},M,x,C=P_(c,e.type,!0,s),E=function(){return x=!1},w=ur,y=ur,b=function(){l=hr(c,cn),y=Pl(ys?1:0,l),n&&(w=Pl(0,hr(c,Vn))),M=ta},P=function(){h._gsap.y=Al(parseFloat(h._gsap.y)+f.offset)+"px",h.style.transform="matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, "+parseFloat(h._gsap.y)+", 0, 1)",f.offset=f.cacheID=0},A=function(){if(x){requestAnimationFrame(E);var Y=Al(o.deltaY/2),Q=y(f.v-Y);if(h&&Q!==f.v+f.offset){f.offset=Q-f.v;var L=Al((parseFloat(h&&h._gsap.y)||0)-f.offset);h.style.transform="matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, "+L+", 0, 1)",h._gsap.y=L+"px",f.cacheID=dt.cache,Nr()}return!0}f.offset&&P(),x=!0},I,z,H,D,F=function(){b(),I.isActive()&&I.vars.scrollY>l&&(f()>l?I.progress(1)&&f(l):I.resetTo("scrollY",l))};return h&&He.set(h,{y:"+=0"}),e.ignoreCheck=function(U){return ys&&U.type==="touchmove"&&A(U)||_>1.05&&U.type!=="touchstart"||o.isGesturing||U.touches&&U.touches.length>1},e.onPress=function(){x=!1;var U=_;_=Al((mt.visualViewport&&mt.visualViewport.scale||1)/p),I.pause(),U!==_&&xp(c,_>1.01?!0:n?!1:"x"),z=m(),H=f(),b(),M=ta},e.onRelease=e.onGestureStart=function(U,Y){if(f.offset&&P(),!Y)D.restart(!0);else{dt.cache++;var Q=S(),L,se;n&&(L=m(),se=L+Q*.05*-U.velocityX/.227,Q*=u_(m,L,se,hr(c,Vn)),I.vars.scrollX=w(se)),L=f(),se=L+Q*.05*-U.velocityY/.227,Q*=u_(f,L,se,hr(c,cn)),I.vars.scrollY=y(se),I.invalidate().duration(Q).play(.01),(ys&&I.vars.scrollY>=l||L>=l-1)&&He.to({},{onUpdate:F,duration:Q})}a&&a(U)},e.onWheel=function(){I._ts&&I.pause(),Gn()-g>1e3&&(M=0,g=Gn())},e.onChange=function(U,Y,Q,L,se){if(ta!==M&&b(),Y&&n&&m(w(L[2]===Y?z+(U.startX-U.x):m()+Y-L[1])),Q){f.offset&&P();var Se=se[2]===Q,Le=Se?H+U.startY-U.y:f()+Q-se[1],Oe=y(Le);Se&&Le!==Oe&&(H+=Oe-Le),f(Oe)}(Q||Y)&&Nr()},e.onEnable=function(){xp(c,n?!1:"x"),lt.addEventListener("refresh",F),En(mt,"resize",F),f.smooth&&(f.target.style.scrollBehavior="auto",f.smooth=m.smooth=!1),C.enable()},e.onDisable=function(){xp(c,!0),Tn(mt,"resize",F),lt.removeEventListener("refresh",F),C.kill()},e.lockAxis=e.lockAxis!==!1,o=new $t(e),o.iOS=ys,ys&&!f()&&f(1),ys&&He.ticker.add(ur),D=o._dc,I=He.to(o,{ease:"power4",paused:!0,inherit:!1,scrollX:n?"+=0.1":"+=0",scrollY:"+=0.1",modifiers:{scrollY:R_(f,f(),function(){return I.pause()})},onUpdate:Nr,onComplete:D.vars.onComplete}),o};lt.sort=function(r){if(Wn(r))return pt.sort(r);var e=mt.pageYOffset||0;return lt.getAll().forEach(function(t){return t._sortY=t.trigger?e+t.trigger.getBoundingClientRect().top:t.start+mt.innerHeight}),pt.sort(r||function(t,n){return(t.vars.refreshPriority||0)*-1e6+(t.vars.containerAnimation?1e6:t._sortY)-((n.vars.containerAnimation?1e6:n._sortY)+(n.vars.refreshPriority||0)*-1e6)})};lt.observe=function(r){return new $t(r)};lt.normalizeScroll=function(r){if(typeof r>"u")return jn;if(r===!0&&jn)return jn.enable();if(r===!1){jn&&jn.kill(),jn=r;return}var e=r instanceof $t?r:dE(r);return jn&&jn.target===e.target&&jn.kill(),na(e.target)&&(jn=e),e};lt.core={_getVelocityProp:yh,_inputObserver:P_,_scrollers:dt,_proxies:Xi,bridge:{ss:function(){Ni||ra("scrollStart"),Ni=Gn()},ref:function(){return Hn}}};x_()&&He.registerPlugin(lt);async function I_(r="geometry"){let e=globalThis.__DIANA_ASSET_BASE__,t=l=>e?`${String(e).replace(/\/$/,"")}/${l}`:`./${l}`,[n,i]=await Promise.all([fetch(t(`${r}.json`)),fetch(t(`${r}.bin`))]);if(!n.ok||!i.ok)throw new Error("The Diana model could not load");let[s,a]=await Promise.all([n.json(),i.arrayBuffer()]),o=new an;for(let[l,c]of Object.entries(s.attributes)){let u=c.type==="Uint32"?new Uint32Array(a,c.offset,c.length):new Float32Array(a,c.offset,c.length);l==="index"?o.setIndex(new sn(u,1)):o.setAttribute(l,new sn(u,c.itemSize))}return o.computeBoundingSphere(),{geometry:o,count:s.fragments,planes:s.planes}}function D_(r){let e=new qn;e.background=new Ye("#34343e");function t(s,a,o,l){let c=new on({color:new Ye(s).multiplyScalar(a),side:Bt}),u=new xt(new ln(...o),c);u.position.set(...l),u.lookAt(0,0,0),e.add(u)}t("#fbd4f0",2.2,[.65,7],[-4,2,5]),t("#a9e8ff",2.4,[.7,8],[4,-1,3]),t("#ffffff",2.4,[6,.65],[0,5,2]),t("#eab5ec",2.5,[2,6],[-4,0,-3]),t("#b3ecff",2,[4,.8],[1,-5,1]),t("#f0c6ef",1.5,[8,10],[-2,1,11]),t("#ace9fb",1.1,[5,9],[5,0,9]);let n=new Wa(r),i=n.fromScene(e,.02,.1,40);n.dispose();for(let s of e.children)s.geometry.dispose(),s.material.dispose();return i}async function L_(){let{geometry:r}=await I_("resting"),e=[],t=[];for(let s=0;s<r.index.count;s+=3){let a=r.index.getX(s),o=r.index.getX(s+1),l=r.index.getX(s+2);(r.attributes.aLobe.getX(a)<.5?e:t).push(a,o,l)}r.setIndex([...e,...t]),r.clearGroups(),r.addGroup(0,e.length,0),r.addGroup(e.length,t.length,1);for(let s of Object.keys(r.attributes))["position","normal"].includes(s)||r.deleteAttribute(s);let n={color:"#ffffff",metalness:0,roughness:.02,transmission:1,thickness:1.05,ior:1.5,dispersion:.65,clearcoat:1,clearcoatRoughness:.025,envMapIntensity:1.3,attenuationDistance:1.5,iridescence:.12,iridescenceIOR:1.25,iridescenceThicknessRange:[140,280]},i=[new tr({...n,attenuationColor:"#e5adeb"}),new tr({...n,attenuationColor:"#9ce0f3",attenuationDistance:1.8})];for(let[s,a]of i.entries())a.onBeforeCompile=o=>{o.uniforms.uRimTint={value:new Ye(s?"#a7e8fa":"#efb9e9")},o.fragmentShader=`uniform vec3 uRimTint;
`+o.fragmentShader,o.fragmentShader=o.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
        float rim=pow(1.-abs(dot(normal,normalize(vViewPosition))),2.5);
        totalEmissiveRadiance+=uRimTint*rim*.18;
      `)};return new xt(r,i)}function U_(){let r=document.createElement("canvas");r.width=4096,r.height=1024;let e=r.getContext("2d");e.font="600 900px Outfit",e.textAlign="center",e.textBaseline="alphabetic";let t=900*3900/e.measureText("DIANA").width;e.font=`600 ${t}px Outfit`;let n=e.measureText("DIANA");e.fillStyle="#ffffff",e.fillText("DIANA",2048,(1024+n.actualBoundingBoxAscent-n.actualBoundingBoxDescent)/2);let i=new Ls(r);return i.colorSpace=Vt,new xt(new ln(1,1),new on({map:i,alphaTest:.025,toneMapped:!1,side:Bt}))}function N_(r){let e=document.createElement("canvas").getContext("2d");e.font="700 300px Outfit";let t=e.measureText(r),n=(t.actualBoundingBoxAscent+t.actualBoundingBoxDescent+30)/(t.width+60),i=document.createElement("canvas");i.width=4096,i.height=Math.ceil(i.width*n);let s=i.getContext("2d"),a=300*i.width/(t.width+60);s.font=`700 ${a}px Outfit`,s.textAlign="center",s.textBaseline="alphabetic";let o=s.measureText(r);s.fillStyle="#000000",s.fillRect(0,0,i.width,i.height),s.fillStyle="#ffffff",s.fillText(r,i.width/2,(i.height+o.actualBoundingBoxAscent-o.actualBoundingBoxDescent)/2);let l=new Ls(i);return l.minFilter=Ot,l.magFilter=Ot,l.generateMipmaps=!1,{texture:l,aspect:n}}function F_(){let r=["HOMEWORK","THAT FITS","YOUR LIFE"].map(N_),e=N_("YOUR  AI  TUTOR"),t=new ln(26.6,40,320,1),n=t.attributes.position,i=new Float32Array(n.count*2);for(let o=0;o<n.count;o++){let l=n.getX(o),c=n.getY(o),u=l/9.5;n.setXYZ(o,9.5*Math.sin(u),c,9.5*(1-Math.cos(u))),i[o*2]=l,i[o*2+1]=c}t.setAttribute("screenCoord",new sn(i,2)),t.computeVertexNormals();let s={uTime:{value:0},uPitch:{value:.045},uMobile:{value:0},uSpan:{value:18},uCopyBottom:{value:.25},uCopyTop:{value:.88},uIntensity:{value:.55},uHomework:{value:r[0].texture},uFits:{value:r[1].texture},uBottom:{value:r[2].texture},uAspects:{value:new G(...r.map(o=>o.aspect))},uOpening:{value:1},uTutor:{value:0},uTextCenter:{value:0},uTutorOffset:{value:new we},uTutorLine:{value:e.texture},uTutorAspect:{value:e.aspect},uBrand:{value:null},uBrandOpacity:{value:1},uBrandScreenToLocal:{value:new at},uCyan:{value:new Ye("#46cee2")},uPink:{value:new Ye("#f08abf")}},a=new en({uniforms:s,side:Bt,toneMapped:!1,vertexShader:`
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
    `});return{mesh:new xt(t,a),uniforms:s}}function O_(r,e,t){let n=new Us,i=r/2,s=e/2;n.moveTo(-i+t,-s);for(let a=1;a<=64;a++)n.lineTo(-i+t+(r-2*t)*a/64,-s);n.quadraticCurveTo(i,-s,i,-s+t),n.lineTo(i,s-t),n.quadraticCurveTo(i,s,i-t,s);for(let a=1;a<=64;a++)n.lineTo(i-t-(r-2*t)*a/64,s);return n.quadraticCurveTo(-i,s,-i,s-t),n.lineTo(-i,-s+t),n.quadraticCurveTo(-i,-s,-i+t,-s),n.closePath(),n}function B_(r,e,t=!1){let n=e<0?-1:1;e=Math.abs(e);let i=r.attributes.position,s=r.userData.rest??=i.array.slice();for(let a=0;a<i.count;a++){let o=s[a*3],l=s[a*3+1],c=s[a*3+2],u=o/e;i.setXYZ(a,(e+c)*Math.sin(u),l,-n*e*(1-Math.cos(u))+c*Math.cos(u))}i.needsUpdate=!0,t&&r.computeVertexNormals(),r.computeBoundingSphere()}function po(r,e){let t=new Nn,n=st.clamp(r*.012,.026,.068),i=st.clamp(r*.027,.064,.15),s=O_(r+n*2,e+n*2,n*.8),a=new Fa(s.getPoints(8));a.holes.push(O_(r+.012,e+.012,.006));let o=new qo(a,{depth:i,steps:1,bevelEnabled:!0,bevelSize:n*.2,bevelThickness:n*.2,bevelSegments:3,curveSegments:8});o.translate(0,0,-i);let l=new tr({color:"#d9edf1",metalness:.08,roughness:.14,transmission:.72,thickness:i,ior:1.46,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.6,transparent:!0,opacity:0,depthWrite:!1,attenuationColor:"#c5e9ec",attenuationDistance:.65}),c=new xt(o,l);t.add(c);let u=[];for(let[f,m,_]of[[.008,"#edfaff",.6],[-i,"#a6bdce",.32]]){let p=s.getPoints(8).map(S=>new G(S.x,S.y,f)),g=new Ds(new an().setFromPoints(p),new Kr({color:m,transparent:!0,opacity:0,depthWrite:!1}));g.userData.opacity=_,u.push(g),t.add(g)}t.userData.dimensions={width:r,height:e,border:n,depth:i};let d;function h(f){Math.abs((d??0)-f)<1e-4||(B_(o,r*f,!0),u.forEach(m=>B_(m.geometry,r*f)),d=f,t.userData.curvature=f)}return h(1.15),{group:t,update(f,m=1.15){f>.002&&h(m),l.opacity=f*.94,u.forEach(_=>{_.material.opacity=f*_.userData.opacity})},dispose(){t.traverse(f=>{f.geometry?.dispose(),f.material?.dispose()})}}}var Pn=r=>{let e=globalThis.__DIANA_ASSET_BASE__,t=globalThis.__DIANA_ASSET_VERSION__;return e?`${String(e).replace(/\/$/,"")}/${r}${t?`?v=${t}`:""}`:r},Fr=[{title:"Your Day Starts Here",description:"Open your lobby and see where to start first.",detail:"Optional check-ins for energy, sleep, and movement help Diana understand how your day is going before you begin.",image:Pn("lobby.webp"),mobile:Pn("lobby.webp"),scale:.9,detailImage:Pn("check-in.webp"),detailMobile:Pn("check-in-mobile.webp"),mobileCrop:{x:.135,y:.08,width:.44,height:.78},alt:"Diana Lobby with the next assignment, time estimate, due date, and optional Check In"},{title:"Homework Organized",description:"Assignments, deadlines, saved progress, and review status stay in one place, so your next step is easier to find.",detail:"",image:Pn("control-work.webp"),mobile:Pn("control-work.webp"),mobileCrop:{x:.225,y:.3,width:.5,height:.59},alt:"Diana Work with the weekly assignment list, reaction lab notes, and saved progress"},{title:"Work Through It",description:"Ask Diana for help and work the problem together, one question and one step at a time.",detail:"Talk to Diana live, type a question or use voice to text to work through a confusing part.",image:Pn("work-through-it.webp"),mobile:Pn("work-through-it.webp"),alt:"Diana linear equations workspace with message, voice-to-text, and live voice support"},{title:"Prepare For The Test",description:"Turn what you are learning into practice. Review the parts that need another look.",detail:"",image:Pn("practice-desktop.webp"),mobile:Pn("practice-mobile.webp"),alt:"Diana chemistry test prep with a limiting-reactant practice question"}];var Or=[{title:"See Your Whole Day",description:"",detail:"Diana helps you see where schoolwork fits around real life, then choose a realistic starting point for the time you have.",image:Pn("calendar.webp"),alt:"Diana Calendar with basketball practice, robotics club, and a study block",action:"See Your Calendar"},{title:"Bring It All Together",description:"Put homework, notes, syllabi, screenshots, and class files in one place instead of searching through apps when you sit down.",detail:"",image:Pn("bring-it-all-together-poster.webp"),video:Pn("bring-it-all-together.mp4"),alt:"Student taking notes during a classroom lesson",action:"Watch Class Context"},{title:"Beyond Homework",description:"Make a plan with room for the things you care about, and a clear place to pick up when you come back.",detail:"",image:Pn("beyond-homework-poster.webp"),video:Pn("beyond-homework.mp4"),alt:"Students walking together after school, representing life beyond homework",action:"See The Film"}];var ni=Fr;function k_(r){let e=st.clamp(r,0,1),t=st.smoothstep(e,.2,1),n=.8*(1-t);return{angle:n,yaw:n*.5,y:-.45*(1-t),opacity:e,neighbors:st.smoothstep(e,.78,1)}}function pE(r){let e=st.smoothstep(r,0,.82),t=.8*e;return{angle:t,yaw:t*.5,y:.18*e,opacity:1-st.smoothstep(r,.4,.82)}}function mE(r,e,t){if(t===0&&e<=0)return k_(r);let n=e-t;return n>0?pE(n):k_(st.smoothstep(1+n,.42,1))}function gE(r){return st.lerp(1e4,1.15,st.smoothstep(Math.abs(r),.02,.52))}function _E(r,e,t){let n=e<r?1:e===Math.round(r)?t:0;return st.smoothstep(n,.32,.68)}function zh(r,e){if(Math.abs((r.userData.curvature??0)-e)<1e-4)return;let t=r.userData.width,n=r.attributes.position,i=r.attributes.uv,s=e<0?-1:1,a=t*Math.abs(e);for(let o=0;o<n.count;o++){let l=(i.getX(o)-.5)*t/a;n.setXYZ(o,a*Math.sin(l),n.getY(o),-s*a*(1-Math.cos(l)))}n.needsUpdate=!0,r.computeVertexNormals(),r.computeBoundingSphere(),r.userData.curvature=e}function kl(r,e){let t=new ln(r,e,96,1);return t.userData.width=r,zh(t,1.15),t}async function z_(r){let e=new ts,t=new Nn,n=[];for(let h of ni){let f=await e.loadAsync(h.image),m=h.mobileCrop?f.clone():h.image===h.mobile?f:await e.loadAsync(h.mobile),_=h.detailImage?await e.loadAsync(h.detailImage):null,p=!_||!h.detailMobile||h.detailImage===h.detailMobile?_:await e.loadAsync(h.detailMobile);if(h.mobileCrop){let w=h.mobileCrop;m.repeat.set(w.width,w.height),m.offset.set(w.x,1-w.y-w.height),m.needsUpdate=!0}for(let w of[f,m,_,p])w&&(w.colorSpace=Vt,w.anisotropy=Math.min(8,r.capabilities.getMaxAnisotropy()));let g=new on({map:f,side:Bt,toneMapped:!1,transparent:!0,opacity:0}),S=new xt(kl(6,3.375),g),M=_?new on({map:_,side:Bt,toneMapped:!1,transparent:!0,opacity:0}):null,x=M?new xt(S.geometry,M):null;S.userData.slide=n.length;let C=new Nn,E=po(6,3.375);S.position.z=.016,x&&(x.position.z=.018),C.add(S),x&&C.add(x),C.add(E.group),t.add(C),n.push({mesh:S,detailMesh:x,pivot:C,frame:E,desktop:f,mobile:m,detailDesktop:_,detailMobile:p})}let i=!1,s=7.8,a=.4,o=2.2,l=6,c=3.4;t.visible=!1;function u({width:h,height:f,copyTop:m,headerBottom:_}){i=h<960&&h<f;let p=10.8-o,g=2*Math.tan(16*Math.PI/180)*p,S=g*h/f,M=Math.max(140,m-_-56)/f*g;l=i?S*.86:Math.min(S*.87,M*2.06),c=i?Math.min(M,l*1.65):l/1.78,s=l*1.08,a=(.5-(_+m)/2/f)*g;for(let x of n){let C=ni[x.mesh.userData.slide],E=i&&h<700&&C.mobileCrop,w=i&&(!C.mobileCrop||E)?x.mobile:x.desktop,y=x.detailDesktop?i&&x.detailMobile?x.detailMobile:x.detailDesktop:null,b=i&&E?w.image.height/w.image.width*(C.mobileCrop.height/C.mobileCrop.width):9/16,P=Math.min(l,c/b);x.mesh.geometry.dispose(),x.mesh.geometry=kl(P,P*b),x.detailMesh&&(x.detailMesh.geometry=x.mesh.geometry),x.mesh.material.map=w,x.detailMesh&&y&&(x.detailMesh.material.map=y),x.pivot.remove(x.frame.group),x.frame.dispose(),x.frame=po(P,P*b),x.pivot.add(x.frame.group)}}function d(h,f,m=0){t.visible=h>.001,n.forEach(({mesh:_,detailMesh:p,pivot:g,frame:S},M)=>{let x=mE(h,f,M),C=x.angle;g.position.set(Math.sin(C)*s,a+x.y,o+s*(Math.cos(C)-1)),g.rotation.set(0,C+x.yaw,0);let E=p?_E(f,M,m):0;_.material.opacity=x.opacity*(1-E),p&&(p.material.opacity=x.opacity*E,p.visible=E>.002);let w=gE(C);x.opacity>.002&&zh(_.geometry,w),S.update(x.opacity,w),g.visible=x.opacity>.002,_.material.color.setScalar(.68+.32*st.smoothstep(Math.cos(C),.5,1))})}return{group:t,resize:u,update:d,panels:n}}var ci=(r,e,t)=>Math.min(t,Math.max(e,r)),zt=(r,e,t)=>{let n=ci((r-e)/(t-e),0,1);return n*n*(3-2*n)};function V_({height:r,span:e,tutorWidth:t}){let n=r*1.28,i=r,s=i*.18,a=i*.56,o=e*.95,l=-e*.58-t/2-1.4,c=r*2.4,u=0,d=r<720?1.1:2.05,h=(o-l)/(c-s),f=s+e*1.6/h,m=c+n*.08,_=n*1.16,p=n*1.24,g=p+n*.82,S=n*1.08,M=Fr.map((v,V)=>V===0?g:p),x=Fr.map((v,V)=>m+_+V*(p+S)+(V>0?g-p:0)),C=x[0],E=x.at(-1),w=n*1.08,y=E+p+w,b=E+p+w*.45,P=y+n*.44,A=P+n*.1,I=A+n*1.62,z=I+n*.28,H=z+n*8.4,D=z+n*.48,F=H,U=H+n*.18,Y=U+n*1.25,Q=Y-n*.13,L=Q+n*.82,se=n*1.58,Se=n*1.4,Le=Or.map(v=>v.video?n*.1:se),Oe=[L];for(let v=1;v<Or.length;v++)Oe.push(Oe[v-1]+Le[v-1]+Se);let Be=Oe.at(-1),ee=Be+Le.at(-1)+n*1.2,ce=ee+n*.06,he=ce+n*2.1,Me=ce+n*1.8,ke=Me+n*.32,Pe=Me+n*.84,qe=Me+n*1.55,be=qe+n*.36,j=n*.68,oe=n*.96,ie=[be,be+j+oe,be+2*(j+oe)],B=ie.at(-1)+j,me=B,We=Oe.map((v,V)=>v+Le[V]*.18),N=Oe.map((v,V)=>Or[V].video?v:null),Ne=x.map(v=>v+p*.45),J=ie.map(v=>v+j*.2),le=Array.from({length:7},(v,V)=>D+(V+.3)/7*(F-D)),ae=[...le.map((v,V)=>({id:`vision-${V}`,point:v,duration:V===3?1800:2300})),{id:"control-title",point:ke,duration:2200}],Fe=(v,V,K,re)=>V.reduce((ue,O,Z)=>{let te=Array.isArray(K)?K[Z]:K;return ue+zt(v,O+te,V[Z+1]??re)},0),R=[P,A+(I-A)*.5,I+r*.2];return{end:me,nativeEnd:me-(c-a),textExit:c,tutorLockStart:a,tutorX:u,tutorY:d,carouselStart:m,stops:Ne,finaleStops:R,waveStart:A,waveEnd:I,exitEnd:y,startX:o,endX:l,tutorWidth:t,visionStart:z,visionEnd:H,diveStart:U,diveEnd:Y,dayStart:Q,daySettled:L,dayReadingStops:We,dayPlaybackStops:N,dayExitEnd:ee,breachStart:ce,breachEnd:he,controlStart:Me,controlEnd:B,controlReadingStops:J,readingStops:ae,visionReadingStops:le,controlStop:ke,dayStops:[U+r*.7,U+r*1.35,Q+r*.3,L+r*.4],visionStops:[z+r*.6,z+r*1.7,H],at(v){let V=ci((v-s)/(c-s),0,1),K=zt(v,m,C),re=Fe(v,x,M,y),ue=Math.min(Fr.length-1,Math.round(re)),O=ci((v-x[ue])/M[ue],0,1),Z=Fe(v,Oe,Le,ee),te=Math.min(Or.length-1,Math.round(Z)),Ee=ci((v-Oe[te])/Le[te],0,1),Ae=zt(v,Q+r*.35,L)*(1-zt(Math.abs(Z-Math.round(Z)),.32,.5))*(1-zt(Z,Or.length-.6,Or.length)),xe=ci((v-Me)/(B-Me),0,1),ge=ci((v-Me)/(qe-Me),0,1),Te=zt(v,ie[0]+j,ie[1])+zt(v,ie[1]+j,ie[2]);return{opening:1-zt(v,i*.015,a),tutor:0,x:u,y:d,stage:K,index:re,productDetail:zt(O,.42,.54),growth:zt(v,b,P),wave:ci((v-A)/(I-A),0,1),vision:zt(v,z,z+r*1.5),draw:ci((v-z)/(r*1.2),0,1),explanation:zt(v,D,D+n*.22),visionSequence:ci((v-D)/(F-D),0,1),gridTravel:ci(v-z,0,H-z)*.42,dive:ci((v-U)/(Y-U),0,1),visionFade:1-zt(v,U,U+r*.5),day:ci((v-Q)/(L-Q),0,1),dayTravel:ci((v-U)/r,0,(me-U)/r),dayIndex:Z,dayActive:te,dayDetail:zt(Ee,.42,.58),dayCopy:Ae,dayHeading:zt(v,Q+r*.35,L)*(1-zt(v,Be+Le.at(-1),ee)),breach:ci((v-ce)/(he-ce),0,1),control:zt(v,Me,Me+n*.3),controlScene:xe,controlIntro:ge,controlDim:zt(v,Pe,qe),controlTitle:zt(v,Me+n*.05,ke)*(1-zt(v,Pe,qe)),controlEnter:zt(v,Pe+n*.3,be),controlExit:0,controlBeatIndex:Te,controlBeatActive:Math.min(2,Math.round(Te)),active:Math.min(Fr.length-1,Math.round(re)),copy:zt(K,.28,.86)*(1-zt(Math.abs(re-Math.round(re)),.22,.5))*(1-zt(re,Fr.length-.8,Fr.length-.35))}}}}var H_=`
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
`,xE=`varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, .999, 1.0); }`;function G_(r,e){return-.12+1.24*r+.035*Math.sin(e*Math.PI*1.4+r*1.8)+.012*Math.sin(e*Math.PI*2-r*.8)}function W_(r){let e=new qn;e.background=new Ye("#000000");let t=new xt(r.geometry,[new on({color:"#ff0000",toneMapped:!1}),new on({color:"#00ff00",toneMapped:!1})]);t.matrixAutoUpdate=!1,e.add(t);let n=new bn(1,1,{depthBuffer:!0,minFilter:Ot,magFilter:Ot});n.samples=4;let i={uMask:{value:n.texture},uWave:{value:0},uTexel:{value:new we(1,1)},uPixelRatio:{value:1},uGray:{value:new Ye("#c6cccd")},uOutline:{value:new Ye("#fcfdfd")},uResolution:{value:new we(1,1)},uGridTravel:{value:0},uGlass:{value:0}},s=new xt(new ln(2,2),new en({uniforms:i,depthWrite:!1,depthTest:!1,toneMapped:!1,vertexShader:xE,fragmentShader:`varying vec2 vUv; ${H_}
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
      ${H_}
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
    `}),o=new qn;o.add(new xt(new ln(2,2),a));let l=new Tr;return{backdrop:s,update(c,u){i.uGlass.value=c,i.uGridTravel.value=u*6.5,s.visible=c>0},resize(c,u,d){n.setSize(Math.round(c*d),Math.round(u*d)),i.uTexel.value.set(1/n.width,1/n.height),i.uPixelRatio.value=d,i.uResolution.value.set(c,u)},render(c,u,d,h){if(h<=0){c.render(u,d);return}i.uWave.value=h,r.updateWorldMatrix(!0,!1),t.matrix.copy(r.matrixWorld),t.visible=r.visible;let f=c.getRenderTarget();c.setRenderTarget(n),c.render(e,d),c.setRenderTarget(f),c.render(u,d);let m=c.autoClear;c.autoClear=!1,c.render(o,l),c.autoClear=m}}}function X_(r){let e=r.material,t={value:0},i=[["#ed1597","#6320d6"],["#04dfec","#075bc9"]].map(([s,a],o)=>{let l=new tr({color:"#ffffff",metalness:.55,roughness:.16,transmission:0,transparent:!1,opacity:1,clearcoat:1,clearcoatRoughness:.055,ior:1.5,iridescence:.28,iridescenceIOR:1.35,iridescenceThicknessRange:[180,340],envMapIntensity:1.05});return l.onBeforeCompile=c=>{Object.assign(c.uniforms,{uJewelTime:t,uJewelBright:{value:new Ye(s)},uJewelDeep:{value:new Ye(a)},uJewelPhase:{value:o*1.8}}),c.vertexShader=`varying vec3 vJewelPosition;
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
      `)},l.customProgramCacheKey=()=>"diana-opaque-jewel-v1",l});return{materials:i,update(s,a){r.material=s>0?i:e,t.value=a,i.forEach((o,l)=>{o.envMapRotation.set(.06*Math.sin(a*.19),.22*Math.sin(a*.23+l*.7),0)})}}}var fr=Or;function q_(r,e,t){let{smoothstep:n,lerp:i,clamp:s}=st,a=e-t,o=t===0&&e<=0?r:n(1+a,.32,1),l=s(a,0,1),c=n(o,.12,1),u=n(l,0,.9),d=-.92*(1-c+u);return{angle:d,yaw:d*.48,y:-.3*(1-c)+u*.65,opacity:n(o,0,.35)*(1-n(l,.32,.9)),curvature:64}}function Y_(r){return r*.18}var zl=st.smoothstep,Ss=r=>{let e=Math.sin(r*127.1+311.7)*43758.5453;return e-Math.floor(e)};function vE(r,e,t){let n=Ss(e+9)*.05,i=zl(r,.08+n,.82),s=Math.atan2(t.y,t.x),a=Math.pow(i,1.35)*(4.6+Ss(e+20)*3.8);return{x:Math.cos(s)*a,y:Math.sin(s)*a-i*i*1.3,z:i*(2+Ss(e+40)*6),rx:i*(Ss(e+50)-.5)*3,ry:i*(Ss(e+60)-.5)*4,rz:i*(Ss(e+70)-.5)*2,opacity:1-zl(i,.5,.95),edge:zl(r,.035,.18)*(1-zl(i,.42,.88))}}function yE(r){let t=[.17,.49,1.02,Math.hypot(r,1)+.8],n=new we(r*.06,.025),i=t.map((a,o)=>Array.from({length:17},(l,c)=>{let u=c/17*Math.PI*2+(Ss(c+1)-.5)*.11,d=a*(o===3?1:.84+Ss(o*17+c+99)*.32);return new we(Math.cos(u)*d,Math.sin(u)*d).add(n)})),s=[];for(let a=0;a<17;a++){let o=(a+1)%17;s.push([n,i[0][a],i[0][o]]);for(let l=0;l<i.length-1;l++){let c=i[l][a],u=i[l][o],d=i[l+1][a],h=i[l+1][o];s.push([c,d,h],[c,h,u])}}return s}function Z_(r,e){let t=new qn;t.background=new Ye("#f1f3f0");let n=new ns(-1,1,1,-1,.1,40);n.position.z=12;let i=new xt(new ln(2,2),new on({map:e,transparent:!0,opacity:0,toneMapped:!1,depthWrite:!1}));i.position.z=-8,i.renderOrder=-1,t.add(i);let s=[];return{resize(a,o){let l=a/o;n.left=-l,n.right=l,n.updateProjectionMatrix(),i.scale.x=l;let c=e.image.width/e.image.height,u=Math.min(1,l/c),d=Math.min(1,c/l);e.repeat.set(u,d),e.offset.set((1-u)*(o>a?.1:.5),(1-d)/2),e.needsUpdate=!0,s.forEach(h=>h.group.traverse(f=>{f.geometry?.dispose(),f.material?.dispose()})),t.clear(),t.add(i),s=yE(l).map((h,f)=>{let m=h.reduce((y,b)=>y.add(b),new we).multiplyScalar(.3333333333333333),_=h.map(y=>new G(y.x-m.x,y.y-m.y,0)),p=new an().setFromPoints(_);p.setAttribute("uv",new Sn(h.flatMap(y=>[y.x/(l*2)+.5,y.y/2+.5]),2)),p.computeVertexNormals();let g=new on({map:r,side:Bt,transparent:!0,toneMapped:!1}),S=new xt(p,g),M=new Nn;M.add(S),M.position.set(m.x,m.y,0);let x=new Ds(new an().setFromPoints(_.map(y=>y.clone().setZ(.004))),new Kr({color:"#dff7ff",transparent:!0,opacity:0}));M.add(x);let C=[];for(let y=0;y<3;y++){let b=_[y],P=_[(y+1)%3];C.push(b.x,b.y,0,P.x,P.y,0,P.x,P.y,-.024,b.x,b.y,0,P.x,P.y,-.024,b.x,b.y,-.024)}let E=new an;E.setAttribute("position",new Sn(C,3));let w=new xt(E,new on({color:"#81b5c7",side:Bt,transparent:!0,opacity:0,toneMapped:!1}));return M.add(w),t.add(M),{group:M,material:g,edge:x,side:w,center:m,index:f}})},render(a,o){i.material.opacity=zl(o,.24,.55);for(let l of s){let c=vE(o,l.index,l.center);l.group.position.set(l.center.x+c.x,l.center.y+c.y,c.z),l.group.rotation.set(c.rx,c.ry,c.rz),l.group.visible=c.opacity>.001,l.material.opacity=c.opacity,l.edge.material.opacity=c.edge*.62,l.side.material.opacity=c.edge*.75}a.render(t,n)}}}var go=st.smoothstep,mo=st.lerp;function J_(r){return{approach:go(r,0,.56),distortion:go(r,.34,.56)*(1-go(r,.74,1)),reveal:go(r,.6,.96)}}async function $_(r,e){let t=new qn;t.background=new Ye("#090b15"),t.environment=e;let n=new yn(38,1,.1,80);n.position.set(0,.1,11),n.lookAt(0,0,-2);let i=new qn,s=new Tr,a=new bn(1,1,{type:gi}),o=new bn(1,1,{type:gi}),l=await new ts().loadAsync(Pn("day-student.webp"));l.colorSpace=Vt;let c=Z_(o.texture,l);a.samples=4,o.samples=4;let u={uOriginal:{value:a.texture},uRoom:{value:o.texture},uReveal:{value:0},uDistort:{value:0},uProgress:{value:0}},d=new en({uniforms:u,depthTest:!1,depthWrite:!1,toneMapped:!1,vertexShader:"varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",fragmentShader:`
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
    `});i.add(new xt(new ln(2,2),d));let h={uTime:{value:0},uTravel:{value:0},uPaletteSpread:{value:1}},f=new ln(46,30,192,8),m=f.attributes.position,_=m.array.slice();f.setAttribute("gridCoord",new sn(_,3));for(let A=0;A<m.count;A++){let I=m.getX(A)/15;m.setXYZ(A,15*Math.sin(I),m.getY(A),15*(1-Math.cos(I)))}f.computeVertexNormals(),f.computeBoundingSphere();let p=new xt(f,new en({uniforms:h,side:Bt,toneMapped:!1,depthWrite:!1,vertexShader:`attribute vec3 gridCoord; varying vec2 vGrid;
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
    `}));p.position.set(0,0,-7),p.rotation.set(.03,-.25,-.065),p.renderOrder=-1,t.add(p);let g=await Promise.all(fr.map(async A=>{let I=await new ts().loadAsync(A.image);I.colorSpace=Vt,I.anisotropy=Math.min(8,r.capabilities.getMaxAnisotropy());let z=new xt(kl(6,3.375),new on({map:I,side:Bt,transparent:!0,opacity:0,toneMapped:!1}));z.position.z=.016;let H=new Nn;H.add(z),t.add(H);let D=po(6,3.375);H.add(D.group);let F=null,U=null;return A.video&&!A.videoPending&&(F=document.createElement("video"),F.muted=!0,F.loop=!1,F.playsInline=!0,F.preload="metadata",F.src=A.video,U=new Fo(F),U.colorSpace=Vt,F.addEventListener("loadeddata",()=>{z.material.map=U,z.material.needsUpdate=!0}),F.addEventListener("error",()=>{z.material.map=I,z.material.needsUpdate=!0})),{group:H,image:z,frame:D,texture:I,video:F,playing:!1,started:!1,finished:!1,playAttempt:0,lastProgressAt:0,lastTime:0}})),S=new is("#e5f6ff",2);S.position.set(3,4,7),t.add(S);let M=-2,x=0,C=9,E=!1,w=()=>{},y=()=>{};function b(A,I){A.playAttempt++,A.video?.pause(),A.playing=!1,A.finished=!0,y(I)}g.forEach((A,I)=>{A.video?.addEventListener("ended",()=>b(A,I)),A.video?.addEventListener("error",()=>b(A,I))});function P(A,I){let z=++A.playAttempt;A.playing=!0,A.lastProgressAt=performance.now(),A.video.play().catch(H=>{z===A.playAttempt&&(A.playing=!1,E&&H.name!=="AbortError"&&b(A,I))})}return{setVideoCallbacks({onStart:A,onEnd:I}){w=A??w,y=I??y},videoState(){return g.map(A=>({started:A.started,finished:A.finished,playing:A.playing,duration:A.video?.duration??0,currentTime:A.video?.currentTime??0,paused:A.video?.paused??!0,angle:A.group.rotation.y,opacity:A.image.material.opacity}))},setPlayback(A){E=A,g.forEach((I,z)=>{!I.started||I.finished||(A?I.playing||P(I,z):(I.playAttempt++,I.video.pause(),I.playing=!1))})},cancelPlayback(){g.forEach((A,I)=>{A.started&&!A.finished&&b(A,I)})},prepare(A,I,z){let H=J_(z.dive);if(H.approach>0){I.updateWorldMatrix(!0,!1);let D=new G(.6,-.45,.35).applyMatrix4(I.matrixWorld),F=new G(0,.12,10.8),U=D.clone().add(new G(0,0,.7));A.position.copy(F.lerp(U,H.approach)),A.lookAt(new G().lerp(D,H.approach))}return H},resize(A,I,z){for(let U of[a,o])U.setSize(Math.round(A*z),Math.round(I*z));c.resize(A,I),n.aspect=A/I,n.updateProjectionMatrix();let H=2*Math.tan(19*Math.PI/180)*11,D=H*A/I,F=A<1e3&&I>A;h.uPaletteSpread.value=F?1.8:1,M=F?0:-D*.18,x=F?H*.08:0,C=D*1.25;for(let U of g){let Y=U.texture.image.width/U.texture.image.height,Q=H*(F?.33:.52),L=Math.min(F?D*.86:D*.52,Q*Y),se=L/Y;U.image.geometry.dispose(),U.image.geometry=kl(L,se),U.group.remove(U.frame.group),U.frame.dispose(),U.frame=po(L,se),U.group.add(U.frame.group)}},render(A,I,z,H){if(z.dive<=0){I();return}let D=J_(z.dive),F=go(z.dive,.6,1),U=go(z.breach||0,0,.48);n.position.set(mo(-1.1,0,F)+U*.5,.1,mo(mo(8.8,11,F),-3.5,U)),n.lookAt(mo(1,0,F),0,mo(-2,-7,U)),n.rotateZ(mo(-.08,0,F));for(let[se,Se]of g.entries()){let Le=q_(z.day,z.dayIndex||0,se);Se.group.visible=Le.opacity>.001&&!z.breach,Se.group.position.set(M+Math.sin(Le.angle)*C,x+Le.y,C*(Math.cos(Le.angle)-1)),Se.group.rotation.set(0,Le.yaw,0),Se.image.material.opacity=Le.opacity,Se.group.visible&&zh(Se.image.geometry,Le.curvature),Se.frame.update(Le.opacity,Le.curvature)}let Y=g[z.dayActive],Q=z.day>=.999&&Math.abs(z.dayIndex-z.dayActive)<1e-4&&z.dayCopy>.999&&Y?.group.visible&&Math.abs(Y.group.rotation.y)<1e-4;E&&Q&&Y?.video&&!Y.started&&!Y.finished&&(Y.started=!0,Y.video.currentTime=0,w(z.dayActive,z.timelinePixels),P(Y,z.dayActive)),g.forEach((se,Se)=>{!se.playing||!se.video||(se.video.currentTime>se.lastTime?(se.lastTime=se.video.currentTime,se.lastProgressAt=performance.now()):performance.now()-se.lastProgressAt>15e3&&b(se,Se))}),h.uTime.value=H,h.uTravel.value=Y_(H),u.uReveal.value=D.reveal,u.uDistort.value=D.distortion,u.uProgress.value=z.dive;let L=A.getRenderTarget();D.reveal<1&&(A.setRenderTarget(a),I()),A.setRenderTarget(o),A.render(t,n),A.setRenderTarget(L),z.breach>.2?c.render(A,z.breach):A.render(i,s)}}}function K_(){let r=new Set,e=null;return{get active(){return e},cancel(){e&&r.add(e.id),e=null},update(t,n,i,s){if(e){if(i-e.startedAt<e.duration)return e.point;r.add(e.id),e=null}if(n<t-2){for(let o of s)n<o.point-80&&r.delete(o.id);return n}let a=s.find(o=>!r.has(o.id)&&t<=o.point&&n>=o.point);return a?(e={...a,startedAt:i},a.point):n}}}function Q_(r,e=!1){let t=(s,a)=>{let o=Math.max(0,Math.min(1,(r-s)/(a-s)));return o*o*(3-2*o)},n=t(.05,.26),i=e?0:t(.78,.98);return{opacity:n*(1-i),y:18*(1-n)-18*i}}var Fi=document.querySelector("#scene"),Vl=document.querySelector(".hero"),j_=document.querySelector(".header"),Br=document.querySelector("#motion"),St=matchMedia("(prefers-reduced-motion: reduce)"),Up=matchMedia("(hover: hover) and (pointer: fine)"),qi=document.querySelector(".hero-story"),sa=document.querySelector(".carousel-copy"),Np=document.querySelector(".carousel-controls"),ex=document.querySelector(".hero-footer"),Ms=document.querySelector(".tutor-intro"),aa=document.querySelector(".vision-copy"),oa=document.querySelector(".day-copy"),_o=oa.querySelector(".day-caption"),SE=oa.querySelector(".day-controls"),Ei=document.querySelector(".control-chapter"),ME=Ei.querySelector(".control-photo"),Fp=[...Ei.querySelectorAll(".control-beat")],Vh=[...sa.querySelectorAll("p")],Op=_o.querySelector(".day-summary"),Bp=_o.querySelector(".day-detail"),la=Ei.cloneNode(!0),kp=document.querySelector(".story-progress");la.removeAttribute("id");la.removeAttribute("aria-labelledby");la.removeAttribute("aria-hidden");la.inert=!1;la.querySelectorAll("[id]").forEach(r=>r.removeAttribute("id"));document.querySelector(".fallback-control").append(la);document.querySelectorAll(".closing-emblem path").forEach(r=>r.setAttribute("pathLength","1"));var tx=[...aa.querySelectorAll(".outline-title path")],zp=[...aa.querySelectorAll(".vision-sequence > *")],Ge={ready:!1,playing:!St.matches,renders:0,time:0,progress:0,rotation:0,rotating:!St.matches,reducedMotion:St.matches};window.__dianaComposition=Ge;mh.registerPlugin(lt);var Hh=(r,e={})=>window.dispatchEvent(new CustomEvent("diana:cinematic-event",{detail:{name:r,...e}}));document.querySelectorAll('a[href="#waitlist"]').forEach(r=>r.addEventListener("click",()=>Hh("cta",{location:r.classList.contains("header-cta")?"header":"hero"})));document.querySelectorAll(".chapter-menu a").forEach(r=>r.addEventListener("click",()=>{r.closest("details").open=!1}));var Yi=document.querySelector("#work-dialog");function nx(r){Yi.classList.remove("zoomed"),document.querySelector("#zoom-screen").setAttribute("aria-pressed","false"),Yi.querySelector("source").srcset=r.mobile||r.image,Yi.querySelector("img").src=r.image,Yi.querySelector("img").alt=r.alt,document.querySelector("#dialog-heading").textContent=r.title,Yi.showModal()}function Gh(r=0,e=!1){nx((e?fr:ni)[r])}document.querySelectorAll("[data-control]").forEach(r=>r.addEventListener("click",()=>{let e=r.closest(".control-beat"),t=e.querySelector("img");nx({title:e.querySelector("h3").textContent,image:t.getAttribute("src"),alt:t.alt})}));document.querySelectorAll("[data-slide]").forEach(r=>r.addEventListener("click",()=>Gh(Number(r.dataset.slide))));document.querySelectorAll("[data-day]").forEach(r=>r.addEventListener("click",()=>Gh(Number(r.dataset.day),!0)));document.querySelector("#zoom-screen").addEventListener("click",r=>{let e=Yi.classList.toggle("zoomed");r.currentTarget.setAttribute("aria-pressed",String(e))});document.querySelector("#close-dialog").addEventListener("click",()=>Yi.close());Yi.addEventListener("click",r=>{r.target===Yi&&Yi.close()});async function bE(){await Promise.all([document.fonts.load("600 100px Outfit"),document.fonts.load("700 200px Outfit")]);let r=new Ju({canvas:Fi,antialias:!0,powerPreference:"high-performance"});r.outputColorSpace=Vt,r.toneMapping=Jo,r.toneMappingExposure=1,r.transmissionResolutionScale=1;let e=new qn;e.background=new Ye("#08090c");let t=new yn(32,1,.1,80);t.position.set(0,.12,10.8),t.lookAt(0,0,0);let n=D_(r);e.environment=n.texture;let i=await L_(),s=X_(i),a=W_(i),o=U_(),l=F_(),c=await z_(r),u=await $_(r,n.texture);l.uniforms.uBrand.value=o.material.map;let d=new Nt;e.add(l.mesh,i,c.group,a.backdrop);let h=new is("#ffffff",2);h.position.set(-3,5,6),e.add(h);let f=new is("#e0eaff",.45);f.position.set(4,-1,3),e.add(f);let m=new we,_=new we,p=0,g=0,S=!0,M,x,C=0,E=1,w=0,y=0,b=!1,P=-1,A=-1,I=-1,z=!1,H={progress:0},D={active:!1,complete:!1,departed:!1,startedAt:0,lockedY:0,duration:6200,progress:0},F={active:!1,index:-1,lockedY:0,lockedTimeline:0},U=K_(),Y=0,Q=0,L=null,se=[],Se=new Set(["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"," "]);function Le(J,le,ae){let Fe=st.clamp((J-le)/(ae-le),0,1);return Fe*Fe*(3-2*Fe)}function Oe(J){!D.active&&!F.active&&!U.active||J.type==="keydown"&&!Se.has(J.key)||J.preventDefault()}window.addEventListener("wheel",Oe,{passive:!1}),window.addEventListener("touchmove",Oe,{passive:!1}),window.addEventListener("keydown",Oe);function Be(){let J=F.active?F.lockedY:U.active?Q:null;J===null||Math.abs(scrollY-J)<=1||window.scrollTo({top:J,left:0,behavior:"instant"})}window.addEventListener("scroll",Be,{passive:!0}),u.setVideoCallbacks({onStart(J,le){!x||St.matches||F.active||(F.active=!0,F.index=J,F.lockedY=oe(le),F.lockedTimeline=le,H.progress=(F.lockedY-qi.offsetTop)/Math.max(1,M.scrollTrigger.end-M.scrollTrigger.start),Be())},onEnd(J){F.index===J&&(F.active=!1,F.index=-1,F.lockedTimeline=0)}});function ee(){U.cancel(),u.cancelPlayback(),F.active=!1,D.active=!1}function ce(){let J=Math.max(1,M?.scrollTrigger?.end-M?.scrollTrigger?.start||1),le=st.clamp((scrollY-qi.offsetTop)/J,0,1);b&&Math.abs(H.progress-le)<.001&&(b=!1);let ae=St.matches?0:b?le:H.progress;Ge.progress=ae;let Fe=ae*J,R=Math.max(0,scrollY-qi.offsetTop),v=Math.abs(Fe-R)<innerHeight*.3,V=R<y-1?-1:R>y+1?1:0,K=Math.max(0,x.textExit-x.tutorLockStart);D.complete&&R>x.tutorLockStart+innerHeight*.5&&(D.departed=!0),D.complete&&D.departed&&V<0&&R<=x.tutorLockStart+innerHeight*.08&&(D.complete=!1,D.departed=!1,D.progress=0);let re=D.complete?Math.max(x.textExit,Fe+K):Fe,ue=F.active?F.lockedTimeline:re;if(Ge.playing&&!St.matches&&!b&&!F.active){ue=U.update(Y,ue,performance.now(),x.readingStops);let it=u.videoState(),tt=x.dayPlaybackStops.find((ut,gt)=>ut!==null&&!it[gt].started&&!it[gt].finished&&Y<=ut&&ue>=ut);tt!==void 0&&(ue=tt),(U.active||tt!==void 0)&&(Q=oe(ue),Math.abs(scrollY-Q)>1&&window.scrollTo({top:Q,left:0,behavior:"instant"}),H.progress=(Q-qi.offsetTop)/J,v=!0)}let O=x.at(ue),Z=0,te=14,Ee=.985;if(Fe<x.tutorLockStart-48&&(D.complete=!1,D.active=!1,D.departed=!1,D.progress=0),!St.matches&&!D.complete&&v&&(D.active||Fe>=x.tutorLockStart&&Fe<x.carouselStart)){D.active||(D.active=!0,D.startedAt=performance.now(),D.lockedY=qi.offsetTop+x.tutorLockStart),Math.abs(scrollY-D.lockedY)>1&&window.scrollTo({top:D.lockedY,left:0,behavior:"instant"});let it=st.clamp((performance.now()-D.startedAt)/D.duration,0,1),tt=Le(it,.025,.43),ut=Le(it,.74,.98),gt=Le(it,.74,1);D.progress=it,Z=tt*(1-ut),te=st.lerp(18,-70,gt),Ee=st.lerp(.982,1,tt)-gt*.018,O={...O,opening:0,tutor:0,x:x.tutorX,y:x.tutorY,stage:0,copy:0},it>=1&&(D.active=!1,D.complete=!0,D.departed=!1,O=x.at(x.textExit))}else D.complete&&Fe<x.textExit&&(O={...O,tutor:0,x:x.tutorX,y:x.tutorY});Ms&&(Ms.style.setProperty("--tutor-alpha",String(Z)),Ms.style.setProperty("--tutor-y",`${te}px`),Ms.style.setProperty("--tutor-scale",String(Ee)));let xe=Math.round(ae*100);kp.style.setProperty("--story-progress",`${xe}%`),kp.setAttribute("aria-valuenow",String(xe));let ge=O.control>.4?"Your control":O.day>.2?"Your day":O.vision>.1?"Why Diana":O.stage>.2?"Diana workspace":"Introduction";kp.querySelector("b").textContent=ge,s.update(O.vision,Ge.time),a.update(O.vision,Ge.time),l.mesh.visible=Ge.layers?.wall!==!1&&O.vision===0,l.uniforms.uTime.value=Ge.time,l.uniforms.uOpening.value=O.opening,l.uniforms.uTutor.value=O.tutor,l.uniforms.uTutorOffset.value.set(O.x,O.y),l.uniforms.uBrandOpacity.value=o.visible?O.opening:0,l.uniforms.uIntensity.value=.55-O.stage*.25,c.update(O.stage,O.index,O.productDetail),Ge.finalizing=O.growth>0;let je=Fi.clientWidth>=700&&Fi.clientWidth<1e3&&Fi.clientHeight>Fi.clientWidth?1.14*.62:1.14;i.scale.setScalar(E*st.lerp(1-O.stage*.42,je,O.growth)*(1-.2*O.vision)),i.position.set(0,w*(1-O.growth),-O.stage*1.2*(1-O.growth)),Vl.classList.toggle("light-chapter",O.breach>.75&&O.controlIntro<.2||O.dive<.43&&O.wave>0&&G_(O.wave,.5)>1-(Ge.headerBottom||80)*.5/Fi.clientHeight);let rt=1-st.smoothstep(O.breach,.25,.45)*(1-st.smoothstep(O.breach,.76,.94));j_.style.opacity=String(rt),j_.inert=rt<.05,ex.style.opacity=String(O.opening),ex.inert=O.opening<.1;let _e=(ni[O.active]??ni[0]).detail?O.productDetail:0;sa.style.opacity=String(O.copy),sa.style.setProperty("--product-detail",String(_e)),Vh[0].setAttribute("aria-hidden",String(_e>.5)),Vh[1].setAttribute("aria-hidden",String(_e<=.5));let ne=O.draw>0&&O.visionFade>0&&!St.matches;aa.style.visibility=ne?"visible":"hidden",aa.style.opacity=String(O.visionFade),aa.inert=!ne,aa.setAttribute("aria-hidden",String(!ne)),oa.style.opacity=String(O.dayHeading),_o.style.opacity=String(O.dayCopy),_o.style.transform=`translateY(${(O.dayActive-O.dayIndex)*innerHeight*.75}px)`,SE.style.opacity=String(O.dayCopy);let ve=(fr[O.dayActive]??fr[0]).detail?O.dayDetail:0;if(Op.style.opacity=String(1-st.smoothstep(ve,0,.45)),Bp.style.opacity=String(st.smoothstep(ve,.55,1)),Op.setAttribute("aria-hidden",String(ve>.5)),Bp.setAttribute("aria-hidden",String(ve<=.5)),oa.style.visibility=O.dayHeading>0&&!St.matches?"visible":"hidden",oa.inert=O.dayCopy===0||St.matches,oa.setAttribute("aria-hidden",String(oa.inert)),A!==O.dayActive){A=O.dayActive;let it=fr[A];_o.querySelector("h3").textContent=it.title,Op.textContent=it.description,Bp.textContent=it.detail,_o.querySelector("button").firstChild.textContent=`${it.action} `,document.querySelector("#day-count").textContent=`0${A+1} / 0${fr.length}`,document.querySelector("#previous-day").disabled=A===0,document.querySelector("#next-day").disabled=A===fr.length-1,Hh("section",{section:"your_day",scene:A})}let fe=O.controlEnter,pe=O.controlExit,ye=fe*(1-pe);Ei.style.opacity=String(O.control),Ei.style.setProperty("--control-photo",String(st.smoothstep(O.controlIntro,.05,.22))),Ei.style.setProperty("--control-dim",String(O.controlDim)),Ei.style.setProperty("--control-title",String(O.controlTitle)),Ei.style.setProperty("--control-travel",`${O.controlScene*-innerHeight*.95}px`);for(let it=0;it<3;it++){let tt=Math.abs(O.controlBeatIndex-it),ut=ye*(1-st.smoothstep(tt,.62,.9));Ei.style.setProperty(`--beat-${it}`,String(ut));let gt=(it-O.controlBeatIndex)*innerHeight*.86+(1-fe)*innerHeight*.58-pe*innerHeight*.28;Fp[it].style.transform=`translate(-50%, calc(-50% + ${gt}px))`,Fp[it].inert=ut<.95,Fp[it].setAttribute("aria-hidden",String(ut<.05))}O.control>.9&&I!==O.controlBeatActive&&(I=O.controlBeatActive,Hh("section",{section:"control",scene:I})),ME.style.opacity=String(st.smoothstep(O.controlIntro,.05,.22)),Ei.style.visibility=O.control>0&&!St.matches?"visible":"hidden",Ei.inert=O.control<.9||St.matches,Ei.setAttribute("aria-hidden",String(Ei.inert)),tx.forEach((it,tt)=>{let ut=tt/tx.length*.58,gt=st.smoothstep(O.draw,ut,ut+.42);it.style.strokeDashoffset=String(1-gt)});let Ke=1/zp.length;zp.forEach((it,tt)=>{let ut=st.clamp((O.visionSequence-tt*Ke)/Ke,0,1),{opacity:gt,y:wt}=Q_(ut,tt===zp.length-1);it.style.opacity=String(gt),it.style.transform=`translateY(${wt}px)`,it.setAttribute("aria-hidden",String(gt<.1))}),aa.querySelector(".vision-sequence").style.opacity=String(O.explanation),Np.style.opacity=String(st.smoothstep(O.stage,.85,1)*(1-st.smoothstep(O.index,ni.length-.95,ni.length-.5)));let de=O.stage>.95&&O.index<ni.length-.5&&!St.matches;z!==de&&(z=de,sa.inert=!de,Np.inert=!de,sa.setAttribute("aria-hidden",String(!de)),Np.setAttribute("aria-hidden",String(!de))),P!==O.active&&(P=O.active,sa.querySelector("h2").textContent=ni[P].title,Vh[0].textContent=ni[P].description,Vh[1].textContent=ni[P].detail,document.querySelector("#slide-count").textContent=`0${P+1} / 0${ni.length}`,document.querySelector("#previous-screen").disabled=P===0,document.querySelector("#next-screen").disabled=P===ni.length-1,Hh("product",{scene:P}));let Ze=-.16+Ge.rotation+_.x*.045*(1-O.growth),Ve=Math.atan2(Math.sin(-Ze),Math.cos(-Ze));i.rotation.set((.035+_.y*.04)*(1-O.growth)-.12*O.vision,Ze+Ve*O.growth+.6*O.vision,-.018*(1-O.growth)-.08*O.vision),t.position.x=_.x*.11*(1-O.growth),t.position.y=.12+_.y*.04*(1-O.growth),t.position.z=10.8,t.lookAt(0,0,0),u.prepare(t,i,O),t.updateMatrixWorld(),o.updateMatrixWorld(),d.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse).multiply(o.matrixWorld);let Je=d.elements;l.uniforms.uBrandScreenToLocal.value.set(Je[0],Je[4],Je[12],Je[1],Je[5],Je[13],Je[3],Je[7],Je[15]).invert(),O.timelinePixels=ue,u.setPlayback(Ge.playing&&S&&(F.active||v)&&!document.hidden&&!Yi.open),O.control<1&&u.render(r,()=>a.render(r,e,t,O.wave),O,Ge.time),Object.assign(Ge,{dive:O.dive,day:O.day,dayCopy:O.dayCopy,dayStops:x.dayStops,diveStart:x.diveStart,diveEnd:x.diveEnd,dayStart:x.dayStart,daySettled:x.daySettled,cameraPosition:t.position.toArray()}),Object.assign(Ge,{dayIndex:O.dayIndex,dayReadingStops:x.dayReadingStops,dayExitEnd:x.dayExitEnd,breachStart:x.breachStart,breachEnd:x.breachEnd,breach:O.breach,control:O.control,controlScene:O.controlScene,controlIntro:O.controlIntro,controlDim:O.controlDim,controlStop:x.controlStop}),Object.assign(Ge,{controlReadingStops:x.controlReadingStops,controlStart:x.controlStart,controlEnd:x.controlEnd,dayDetail:ve,videoPlayback:u.videoState()}),Object.assign(Ge,{readingHold:U.active?.id??null,readingStops:x.readingStops,videoLocked:F.active,dayPlaybackStops:x.dayPlaybackStops,nativeEnd:x.nativeEnd}),Object.assign(Ge,{renders:Ge.renders+1,yaw:i.rotation.y,scrollPixels:Fe,timelinePixels:ue,scrollRange:J,growth:O.growth,wave:O.wave,vision:O.vision,draw:O.draw,gridTravel:O.gridTravel,visionStops:x.visionStops,visionStart:x.visionStart,visionEnd:x.visionEnd,finaleStops:x.finaleStops,waveStart:x.waveStart,waveEnd:x.waveEnd,exitEnd:x.exitEnd,wordmarkOpacity:O.opening,tutorOpacity:O.tutor,tutorOverlayOpacity:Z,tutorOverlayY:te,tutorOverlayScale:Ee,tutorOffset:l.uniforms.uTutorOffset.value.toArray(),tutorSequenceProgress:D.progress,tutorSequenceActive:D.active,carousel:O.stage,carouselIndex:O.index,activeSlide:P,checkInOpacity:c.panels[0].detailMesh?.material.opacity??0,lobbyOpacity:c.panels[0].mesh.material.opacity,textExit:x.textExit,carouselStart:x.carouselStart,stops:x.stops,textRightEdge:O.x+x.tutorWidth/2,width:Fi.clientWidth,height:Fi.clientHeight,triangles:r.info.render.triangles}),y=R,Y=ue,Ge.readingHold!==L&&(L=Ge.readingHold,window.dispatchEvent(new CustomEvent("diana:reading-hold",{detail:{id:Ge.readingHold,timelinePixels:ue}})))}function he(){Br.innerHTML=document.querySelector(Ge.playing?"#pause-icon":"#play-icon").innerHTML;let J=St.matches?"Motion disabled by reduced-motion preference":Ge.playing?"Pause motion":"Play motion";Br.setAttribute("aria-label",J),Br.title=J,Br.setAttribute("aria-pressed",String(!Ge.playing)),Br.disabled=St.matches}function Me(J){if(p=0,!Ge.playing||!S||document.hidden||!Ge.ready)return;let le=Math.max(0,(J-g)/1e3);g=J;let ae=Math.min(le,.1);se.push(le*1e3),se.length>120&&se.shift(),Ge.time+=ae,Ge.rotating&&!Ge.finalizing&&(Ge.rotation+=Math.PI*2/28*ae),_.lerp(m,1-Math.exp(-6*ae)),ce(),p=requestAnimationFrame(Me)}function ke(){p||!Ge.playing||!S||document.hidden||!Ge.ready||(g=performance.now(),p=requestAnimationFrame(Me))}function Pe(){cancelAnimationFrame(p),p=0,u.setPlayback(!1),Ge.videoPlayback=u.videoState()}function qe(){Ge.playing=!1,U.cancel(),Pe(),he()}function be(){let J=Fi.clientWidth,le=Fi.clientHeight;t.aspect=J/le,t.updateProjectionMatrix();let ae=Math.min(devicePixelRatio,Up.matches?1.5:1.25);r.setPixelRatio(ae),r.setSize(J,le,!1),a.resize(J,le,ae),u.resize(J,le,ae);let Fe=2*Math.tan(st.degToRad(16))*10.8,R=Fe*t.aspect,v=J<700,V=document.querySelector(".hero-footer").offsetTop,K=document.querySelector(".header").offsetHeight,re=v?Math.min(V,le-(le<680?252:268)):V,ue=(K+re)/2,O=Math.max(150,re-K-48),Z=Math.min(.87,R/(v?5.5:5.1),O/le*Fe/4.45);E=Z,w=(.5-ue/le)*Fe,i.scale.setScalar(Z),i.position.y=w;let te=O/le*Fe*4,Ee=Math.min(R*(v?.95:.895),te)*(10.8+1.8)/10.8*.9;o.scale.set(Ee,Ee/4,1),o.position.set(0,i.position.y*(10.8+1.8)/10.8,-1.8);let Ae=J<le,xe=Ae?56:48,ge=2*Math.tan(st.degToRad(16))/Math.tan(st.degToRad(xe/2));l.mesh.scale.set(ge,ge,2),l.mesh.position.z=10.8-24,l.uniforms.uMobile.value=J<=960||Ae?1:0,l.uniforms.uPitch.value=v?.032:.045,l.uniforms.uSpan.value=2*Math.tan(st.degToRad(xe/2))*12*t.aspect,l.uniforms.uTextCenter.value=i.position.y*24/10.8/ge,l.uniforms.uCopyBottom.value=1-V/le,l.uniforms.uCopyTop.value=1-K/le;let Te=l.uniforms.uSpan.value,je=l.uniforms.uMobile.value?Te*.84*.68:16*.45;if(x=V_({height:innerHeight,span:Te,tutorWidth:je}),Ms){Ms.style.setProperty("--tutor-font-size","100px");let k=100*Math.max(280,J-(v?24:36))/Math.max(1,Ms.scrollWidth);Ms.style.setProperty("--tutor-font-size",`${k}px`)}qi.style.setProperty("--scroll-distance",`${x.nativeEnd}px`),c.resize({width:J,height:le,headerBottom:K,copyTop:sa.offsetTop}),Object.assign(Ge,{symbolScale:Z,focalCenter:ue,headerBottom:K,footerTop:V}),ce(),M&&(cancelAnimationFrame(C),C=requestAnimationFrame(()=>{lt.refresh(),ce()}))}Br.addEventListener("click",()=>{St.matches||(Ge.playing?qe():(Ge.playing=!0,he(),ke()))}),Vl.addEventListener("pointermove",J=>{if(!Ge.playing||St.matches||!Up.matches||J.pointerType!=="mouse")return;let le=Vl.getBoundingClientRect();m.set((J.clientX/le.width-.5)*2,(.5-(J.clientY-le.top)/le.height)*2)}),Vl.addEventListener("pointerleave",()=>m.set(0,0));function j(){M?.scrollTrigger?.kill(),M?.kill(),H.progress=0,document.body.classList.toggle("motion-ready",!St.matches&&Ge.ready),!St.matches&&Ge.ready&&(M=mh.fromTo(H,{progress:0},{progress:1,ease:"none",scrollTrigger:{trigger:qi,start:"top top",end:"bottom bottom",scrub:.38},onUpdate:()=>{ce()}}),lt.refresh()),ce()}function oe(J){let le=J>=x.textExit?Math.max(0,x.textExit-x.tutorLockStart):0;return qi.offsetTop+J-le}function ie(J,le){location.hash!==J&&history.pushState(null,"",J),ee(),D.complete=le>qi.offsetTop+x.tutorLockStart,Y=le-qi.offsetTop+(D.complete?x.textExit-x.tutorLockStart:0),b=!0,window.scrollTo({top:le,behavior:"instant"}),M?.scrollTrigger?.update(),ce()}function B(J){let le=oe(x.stops[st.clamp(J,0,ni.length-1)]);window.scrollTo({top:le,behavior:St.matches?"instant":"smooth"})}document.querySelectorAll('a[href="#homework"]').forEach(J=>J.addEventListener("click",le=>{!Ge.ready||St.matches||(le.preventDefault(),ie("#homework",oe(x.stops[0])))})),document.querySelector("#previous-screen").addEventListener("click",()=>B(P-1)),document.querySelector("#next-screen").addEventListener("click",()=>B(P+1)),document.querySelector("#inspect-screen").addEventListener("click",()=>Gh(P)),document.querySelector("#inspect-day").addEventListener("click",()=>Gh(A,!0));function me(J){window.scrollTo({top:oe(x.dayReadingStops[st.clamp(J,0,fr.length-1)]),behavior:St.matches?"instant":"smooth"})}document.querySelector("#previous-day").addEventListener("click",()=>me(A-1)),document.querySelector("#next-day").addEventListener("click",()=>me(A+1)),document.querySelectorAll('a[href="#your-day"]').forEach(J=>J.addEventListener("click",le=>{le.preventDefault(),St.matches||!Ge.ready?document.querySelector(".fallback-day-heading").scrollIntoView():ie("#your-day",oe(x.dayReadingStops[0]))})),document.querySelectorAll(".questions details").forEach(J=>J.addEventListener("toggle",()=>lt.refresh())),document.querySelectorAll('a[href="#your-control"]').forEach(J=>J.addEventListener("click",le=>{le.preventDefault(),St.matches||!Ge.ready?la.scrollIntoView():ie("#your-control",oe(x.controlStop))}));let We=document.querySelector(".closing");document.querySelectorAll('a[href="#waitlist"]').forEach(J=>J.addEventListener("click",le=>{le.preventDefault(),ie("#waitlist",We.getBoundingClientRect().top+scrollY)})),document.querySelectorAll('a[href="#opening"]').forEach(J=>J.addEventListener("click",le=>{le.preventDefault(),ie("#opening",0)}));function N(J){We.style.setProperty("--closing-progress",String(J));for(let le=0;le<5;le++){let ae=st.clamp((J-(.42+le*.045))/.28,0,1);We.style.setProperty(`--letter-${le}-alpha`,String(ae)),We.style.setProperty(`--letter-${le}-clip`,`${(1-ae)*100}%`)}}let Ne=lt.create({trigger:We,start:"top bottom",end:"bottom bottom",onUpdate:J=>{N(St.matches?1:J.progress)}});Ge.closingMotion=Ne,N(St.matches?1:Ne.progress),St.addEventListener("change",()=>{ee(),Ge.reducedMotion=St.matches,qe(),_.set(0,0),m.set(0,0),Ge.rotating=!St.matches,St.matches&&(Ge.time=0,Ge.rotation=0),N(St.matches?1:Ne.progress),j(),he()}),Up.addEventListener("change",()=>{_.set(0,0),m.set(0,0),be()}),new ResizeObserver(be).observe(Vl),new IntersectionObserver(J=>{S=J[0].isIntersecting,S?ke():Pe()},{threshold:0}).observe(qi),document.addEventListener("visibilitychange",()=>{document.hidden?Pe():ke()}),Fi.addEventListener("webglcontextlost",J=>{ee(),J.preventDefault(),Pe(),Ge.ready=!1,M?.scrollTrigger?.kill(),M?.kill(),document.body.classList.remove("ready","motion-ready")}),Fi.addEventListener("webglcontextrestored",()=>{be(),Ge.ready=!0,document.body.classList.add("ready"),j(),ke()}),Ge.seek=J=>{qe(),Ge.time=Math.max(0,Number(J)||0),_.set(0,0),m.set(0,0),ce()},Ge.setAngle=J=>{qe(),Ge.rotation=Number(J)+.16,_.set(0,0),m.set(0,0),ce()},Ge.play=()=>{St.matches||(Ge.playing=!0,he(),ke())},Ge.redraw=ce,Ge.performance=()=>({samples:se.length,meanFrameMs:se.reduce((J,le)=>J+le,0)/Math.max(1,se.length),drawCalls:r.info.render.calls,triangles:r.info.render.triangles}),Ge.goToSlide=B,Ge.goToDay=me,Ge.layers={wall:!0,wordmark:!0,symbol:!0},Ge.showLayer=(J,le)=>{let ae={wall:l.mesh,wordmark:o,symbol:i}[J];ae&&(ae.visible=le,Ge.layers[J]=le,ce())},be(),Ge.ready=!0,he(),document.body.classList.add("ready"),j(),ke()}bE().catch(r=>{Ge.error=String(r),document.body.classList.remove("ready","motion-ready"),Br.disabled=!0,Br.title="Motion unavailable",Br.setAttribute("aria-label","Motion unavailable")});})();
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
