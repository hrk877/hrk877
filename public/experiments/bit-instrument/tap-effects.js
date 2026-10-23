export const TAP_EFFECTS=['LUMP','WAVE','TWIST','THORNS','RIBBONS'];
export const TAP_ORDER=[0,1,2,3,4];
export function effectForKey(key,index){return key.toLowerCase()==='j'?4:index%4;}
export const tapGLSL=`
vec3 tapShape(vec3 q,vec3 p,vec3 n,float t,vec2 tap){
 float a=tap.y;
 if(tap.x<2.5||tap.x>3.5||a<.0001)return q;
 float strip=floor((p.x+3.)/.12);float angle=a*.7*sin(strip*.38-t*3.);
 float y=q.y*cos(angle)-q.z*sin(angle);q.z=q.y*sin(angle)+q.z*cos(angle);q.y=y;
 q.y+=a*.07*sin(strip*1.7+t*4.);return q;
}`;
export function deformTap(q,p,n,t,id,a){
 if(id<2.5||id>3.5||a<.0001)return q;
 const strip=Math.floor((p.x+3)/.12),angle=a*.7*Math.sin(strip*.38-t*3),y=q.y*Math.cos(angle)-q.z*Math.sin(angle);
 q.z=q.y*Math.sin(angle)+q.z*Math.cos(angle);q.y=y+a*.07*Math.sin(strip*1.7+t*4);return q;
}
