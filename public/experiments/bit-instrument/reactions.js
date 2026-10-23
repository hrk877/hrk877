export const REACTIONS=['spikes','tremor','fury','happy','surprise','calm'];
export class ReactionPalette {
  constructor(){this.angerIndex=0;}
  choose(event){if(['happy','surprise','calm'].includes(event.kind))return event.kind;return REACTIONS[this.angerIndex++%3];}
}

export const emotionGLSL=`
vec3 feel(vec3 q,vec3 p,vec3 n,float t,float phase,float anger,float variant,vec3 mood){
 float field=abs(sin(p.x*13.+phase)*cos(p.y*12.+phase)*sin(p.z*15.+phase));
 float teeth=pow(field,variant<.5?4.:variant<1.5?2.5:5.);
 q+=n*anger*(.035+teeth*(variant<.5?1.25:variant<1.5?.8:1.65));
 float shake=anger*(variant>.5&&variant<1.5?.055:.014);
 q+=shake*vec3(sin(p.y*23.+t*66.),cos(p.z*27.-t*72.),sin(p.x*29.+t*59.));
 if(variant>1.5){float a=anger*.7*sin(p.x*3.2-t*8.);float y=q.y*cos(a)-q.z*sin(a);q.z=q.y*sin(a)+q.z*cos(a);q.y=y;}
 q+=n*(mood.x*.12*sin(p.x*3.-t*7.)+mood.z*.045*sin(t*1.6));
 q.y+=mood.x*.18*sin(t*7.)+mood.z*.025*sin(t*1.3);
 q.x+=mood.x*.06*cos(t*3.5);
 q=mix(q,q*.78+n*.18,mood.y*.7);q.y+=mood.y*.18*abs(sin(t*12.));
 return q;
}`;

// Same field as the vertex shader, so tracking marks and mobile framing follow it.
export function deformEmotion(q,p,n,t,phase,anger,variant,mood){
 const field=Math.abs(Math.sin(p.x*13+phase)*Math.cos(p.y*12+phase)*Math.sin(p.z*15+phase));
 const teeth=field**(variant<.5?4:variant<1.5?2.5:5);
 q.addScaledVector(n,anger*(.035+teeth*(variant<.5?1.25:variant<1.5?.8:1.65)));
 const shake=anger*(variant>.5&&variant<1.5?.055:.014);
 q.x+=shake*Math.sin(p.y*23+t*66);q.y+=shake*Math.cos(p.z*27-t*72);q.z+=shake*Math.sin(p.x*29+t*59);
 if(variant>1.5){const a=anger*.7*Math.sin(p.x*3.2-t*8),y=q.y*Math.cos(a)-q.z*Math.sin(a);q.z=q.y*Math.sin(a)+q.z*Math.cos(a);q.y=y;}
 q.addScaledVector(n,mood.x*.12*Math.sin(p.x*3-t*7)+mood.z*.045*Math.sin(t*1.6));
 q.y+=mood.x*.18*Math.sin(t*7)+mood.z*.025*Math.sin(t*1.3);q.x+=mood.x*.06*Math.cos(t*3.5);
 const blend=mood.y*.7;q.multiplyScalar(1-.22*blend).addScaledVector(n,.18*blend);q.y+=mood.y*.18*Math.abs(Math.sin(t*12));
 return q;
}
