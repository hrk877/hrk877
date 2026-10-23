import * as T from 'three';
import {LogoMorphState} from './logo-morph-state.js';
import {pairPointSets} from './point-pairing.js';

export class LogoMorph {
  static async create(options){
    const face=new FontFace('877SiteLogo',"url('./assets/cormorant-garamond-600.ttf')",{weight:'600',style:'normal'});
    await face.load();document.fonts.add(face);
    return new LogoMorph(options);
  }
  constructor({scene,camera,capture,count=75000}){
    this.camera=camera;this.capture=capture;this.count=count;this.state=new LogoMorphState();this.active=false;
    const mask=document.createElement('canvas');mask.width=2048;mask.height=512;const ctx=mask.getContext('2d',{willReadFrequently:true});
    ctx.font='600 390px "877SiteLogo"';ctx.textBaseline='alphabetic';ctx.fillStyle='#fff';ctx.fontKerning='none';
    // The site renders separate spans with tracking-tighter (-.05em), without pair kerning.
    let x=40;for(const char of '877hand'){ctx.fillText(char,x,397);x+=ctx.measureText(char).width-390*.05;}
    const data=ctx.getImageData(0,0,2048,512).data,samples=[];let minX=2048,maxX=0,minY=512,maxY=0;
    for(let y=0;y<512;y+=2)for(let x=0;x<2048;x+=2){if(data[(y*2048+x)*4+3]>150){samples.push([x,y]);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
    if(!samples.length)throw new Error('877handの字体を読み込めませんでした');
    const positions=new Float32Array(count*3),targets=new Float32Array(count*3),chunks=new Float32Array(count*2),facing=new Float32Array(count);
    this.normalized=new Float32Array(count*2);this.mapping=Uint32Array.from({length:count},(_,i)=>i);this.rawDestination=new Float32Array(count*3);this.livePosition=new T.BufferAttribute(new Float32Array(count*3),3);this.liveFacing=new T.BufferAttribute(new Float32Array(count),1);this.aspect=(maxX-minX)/(maxY-minY);
    let seed=877;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<count;i++){
      const p=samples[Math.floor(rnd()*samples.length)];this.normalized[i*2]=(p[0]-minX)/(maxX-minX)-.5;this.normalized[i*2+1]=.5-(p[1]-minY)/(maxY-minY);
      facing[i]=1;
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('destination',new T.BufferAttribute(targets,3));geometry.setAttribute('facing',new T.BufferAttribute(facing,1));geometry.setAttribute('chunk',new T.BufferAttribute(chunks,2));
    this.material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uProgress:{value:0},uDpr:{value:1}},
      vertexShader:`attribute vec3 destination;attribute float facing;attribute vec2 chunk;uniform float uProgress,uDpr;varying float vAlpha;
      void main(){float p=smoothstep(chunk.x,.95,uProgress);vec3 q=mix(position,destination,p);
       vAlpha=mix(facing,1.,smoothstep(0.,.28,p));gl_Position=projectionMatrix*viewMatrix*vec4(q,1.);gl_PointSize=mix(1.12,.95,p)*uDpr;}`,
      fragmentShader:'varying float vAlpha;void main(){vec2 p=gl_PointCoord-.5;float edge=1.-smoothstep(.30,.5,length(p));gl_FragColor=vec4(.08,.10,.045,vAlpha*edge);}' });
    this.points=new T.Points(geometry,this.material);this.points.frustumCulled=false;this.points.visible=false;this.points.renderOrder=5;scene.add(this.points);this.resize();
  }
  resize(){
    const units=2*this.camera.position.z*Math.tan(T.MathUtils.degToRad(this.camera.fov/2))/innerHeight;
    const width=Math.min(innerWidth*(innerWidth<700?.87:.78),1400)*units,height=width/this.aspect;
    const target=this.points.geometry.attributes.destination;
    for(let i=0;i<this.count;i++){this.rawDestination[i*3]=this.normalized[i*2]*width;this.rawDestination[i*3+1]=this.normalized[i*2+1]*height+.06;}
    this.applyMapping();this.material.uniforms.uDpr.value=Math.min(devicePixelRatio,2);
  }
  applyMapping(){
    const target=this.points.geometry.attributes.destination;
    for(let i=0;i<this.count;i++){const j=this.mapping[i]*3;target.setXYZ(i,this.rawDestination[j],this.rawDestination[j+1],this.rawDestination[j+2]);}
    target.needsUpdate=true;
  }
  toggle(now){
    const source=this.points.geometry.attributes.position,facing=this.points.geometry.attributes.facing;
    if(!this.active){
      this.capture(source,facing);this.mapping=pairPointSets(source.array,this.rawDestination);this.applyMapping();
      const chunk=this.points.geometry.attributes.chunk;let minX=Infinity,maxX=-Infinity;
      for(let i=0;i<this.count;i++){minX=Math.min(minX,source.getX(i));maxX=Math.max(maxX,source.getX(i));}
      for(let i=0;i<this.count;i++){
       const x=source.getX(i),y=source.getY(i),z=source.getZ(i),cx=Math.floor(x/.065),cy=Math.floor(y/.065),cz=Math.floor(z/.065);
       const hash=((cx*73856093)^(cy*19349663)^(cz*83492791))>>>0;
       const wave=(x-minX)/Math.max(.001,maxX-minX);chunk.setXY(i,.035+(.70*wave+.30*(hash%1000)/1000)*.26,0);
      }
      chunk.needsUpdate=true;source.needsUpdate=true;facing.needsUpdate=true;
    }
    this.state.toggle(now);
    if(this.state.target===0){this.returnSource=source.array.slice();this.returnFacing=facing.array.slice();}
    this.active=true;this.points.visible=true;
  }
  refreshReturn(now){
    if(!this.active||this.state.target!==0)return;
    this.capture(this.livePosition,this.liveFacing);
    const source=this.points.geometry.attributes.position,facing=this.points.geometry.attributes.facing;
    const t=Math.min(1,Math.max(0,(now-this.state.started)/.3)),blend=t*t*(3-2*t);
    for(let i=0;i<source.array.length;i++)source.array[i]=this.returnSource[i]+(this.livePosition.array[i]-this.returnSource[i])*blend;
    for(let i=0;i<this.count;i++)facing.array[i]=this.returnFacing[i]+(this.liveFacing.array[i]-this.returnFacing[i])*blend;
    source.needsUpdate=true;facing.needsUpdate=true;
  }

  reset(){this.state.reset();this.active=false;this.points.visible=false;}
  update(now){this.active=this.state.active(now);this.points.visible=this.active;this.material.uniforms.uProgress.value=this.state.value(now);}
}
