import * as T from 'three';
import {OBJLoader} from './vendor/OBJLoader.js';
import {MeshSurfaceSampler} from './vendor/MeshSurfaceSampler.js';
import {MechanicalSynth} from './synth.js?v=skin-music-4';
import {MusicPattern} from './music-pattern.js?v=3';
import {REACTIONS,ReactionPalette,emotionGLSL,deformEmotion} from './reactions.js?v=1';
import {LogoMorph} from './logo-morph.js?v=4';
import {TAP_EFFECTS,TAP_ORDER,effectForKey,tapGLSL,deformTap} from './tap-effects.js?v=4';
const canvas=document.querySelector('#scene'),hud=document.querySelector('#hud'),c=hud.getContext('2d');
const music=new MusicPattern();
const synth=new MechanicalSynth(),status=document.querySelector('#status');
// Safari must receive the unlock inside a real completed tap as well as key input.
function unlockAudio(){try{synth.unlockFromGesture();}catch(e){status.textContent='AUDIO / '+e.message;}}
for(const event of ['pointerdown','pointerup','touchend','click','keydown'])document.addEventListener(event,unlockAudio,{capture:true,passive:true});
addEventListener('error',e=>{status.textContent='ERROR / '+e.message});
const renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xf9c70d,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.1,100);camera.position.z=12;
scene.add(new T.HemisphereLight(0xffffff,0xb5b29d,2.4));const key=new T.DirectionalLight(0xfff5d9,3.2);key.position.set(-3,5,7);scene.add(key);const fill=new T.DirectionalLight(0xffffff,1.4);fill.position.set(3,-1,-2);scene.add(fill);
let w,h,dpr,time=0,last=performance.now(),mode=2,clean=false,drag=false,px=0,py=0,rx=0,ry=0,energy=0,totalHits=0,lastKey='—',lastHit=-10,selected=0;
let recording=false,recorder,recordStart=0,recordChunks=[],fps=60;
const composite=document.createElement('canvas'),cc=composite.getContext('2d');
const target=new T.WebGLRenderTarget(1,1),postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
const postMat=new T.ShaderMaterial({uniforms:{image:{value:target.texture},uResolution:{value:new T.Vector2()}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`uniform sampler2D image;uniform vec2 uResolution;varying vec2 vUv;float bayer(vec2 p){vec2 a=mod(floor(p),2.);return (a.x+2.*a.y)/4.;}void main(){vec4 texel=texture2D(image,vUv);vec3 col=texel.rgb;if(texel.a<.01){gl_FragColor=vec4(.9764706,.7803922,.0509804,1.);return;}vec2 pixel=floor(vUv*uResolution/2.);float d=bayer(pixel)*.25+bayer(floor(pixel/2.));float l=dot(col,vec3(.2126,.7152,.0722));gl_FragColor=vec4(mix(vec3(.08,.10,.045),vec3(.9764706,.7803922,.0509804),step(.13+d*.76,l)),1.);}`});postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),postMat));
function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio,2);renderer.setSize(w,h);target.setSize(w*dpr,h*dpr);postMat.uniforms.uResolution.value.set(w*dpr,h*dpr);hud.width=w*dpr;hud.height=h*dpr;c.setTransform(dpr,0,0,dpr,0,0);camera.aspect=w/h;camera.position.z=w<h?18:12;camera.updateProjectionMatrix();camera.updateMatrixWorld();if(!recording){composite.width=Math.round(w*dpr);composite.height=Math.round(h*dpr)}}addEventListener('resize',resize);resize();
const texture=await new T.TextureLoader().loadAsync('./assets/banana.jpg');texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();const obj=await new OBJLoader().loadAsync('./assets/banana.obj');let source;obj.traverse(o=>{if(o.isMesh&&!source)source=o});
const geometry=source.geometry.clone();geometry.computeBoundingBox();const center=geometry.boundingBox.getCenter(new T.Vector3()),size=geometry.boundingBox.getSize(new T.Vector3()),scale=4.6/Math.max(size.x,size.y,size.z);geometry.translate(-center.x,-center.y,-center.z);geometry.scale(scale,scale,scale);geometry.computeVertexNormals();
const skin=new T.MeshStandardMaterial({map:texture,roughness:.8}),depthMat=new T.MeshBasicMaterial({colorWrite:false,depthWrite:true,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
const sampler=new MeshSurfaceSampler(new T.Mesh(geometry)).build(),N=125000,pos=new Float32Array(N*3),uvs=new Float32Array(N*2),normals=new Float32Array(N*3),seeds=new Float32Array(N),v=new T.Vector3(),uv=new T.Vector2(),normal=new T.Vector3();let seed=877;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}sampler.setRandomGenerator(rnd);
for(let i=0;i<N;i++){sampler.sample(v,normal,undefined,uv);v.addScaledVector(normal,.008);v.toArray(pos,i*3);normal.toArray(normals,i*3);uv.toArray(uvs,i*2);seeds[i]=rnd()}
const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pos,3));pg.setAttribute('normal',new T.BufferAttribute(normals,3));pg.setAttribute('uv',new T.BufferAttribute(uvs,2));pg.setAttribute('seed',new T.BufferAttribute(seeds,1));
const smallPg=pg.clone();smallPg.setDrawRange(0,14000);
// Both visible points and the occlusion surface share the same spatial deformation.
// No point dispersal or screen distortion: sampled skin coordinates become the new surface.
const shapeGLSL=`
${emotionGLSL}
${tapGLSL}
vec3 sculpt(vec3 p,vec3 n,float e,float t,vec4 shape,float phase){
 float lump=sin(p.x*6.+t*3.+phase)*sin(p.y*7.-t*2.)*cos(p.z*8.+t*2.5);
 float thorn=pow(max(0.,sin(p.x*13.+phase)*sin(p.y*11.+phase)*cos(p.z*12.)),7.);
 vec3 q=p+n*e*(.025+shape.x*(.08+lump*.27)+shape.w*thorn*.70);
 float twist=e*shape.z*.9*sin(p.x*1.7-t*2.8+phase);
 float cy=q.y*cos(twist)-q.z*sin(twist),cz=q.y*sin(twist)+q.z*cos(twist);q.y=cy;q.z=cz;
 q.y+=e*shape.y*.42*sin(p.x*2.8+t*4.+phase);
 q.z+=e*shape.y*.38*cos(p.x*3.1-t*3.6+phase);
 q=tapShape(q,p,n,t,uTap);
 return feel(q,p,n,t,phase,uAnger,uRageStyle,uMood);
}`;
const vertex=`attribute float seed;uniform float uTime,uEnergy,uDpr,uSmall,uPhase,uAnger,uRageStyle;uniform vec3 uMood;uniform vec2 uTap;uniform vec4 uShape;varying float vLight,vWave,vSeed;varying vec2 vUv;${shapeGLSL}void main(){vUv=uv;vSeed=seed;vec3 n=normalize(normalMatrix*normal);vLight=.5+.5*max(dot(n,normalize(vec3(-.5,.7,1.))),0.);vWave=.5+.5*sin(position.x*9.+position.y*11.-uTime*16.);vec3 p=sculpt(position,normal,uEnergy,uTime,uShape,uPhase);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float base=mix(1.15,.85,uSmall);gl_PointSize=clamp(base+uEnergy*(.45+vWave*.75),.7,2.8)*uDpr;}`;
const depthVertex=`uniform float uTime,uEnergy,uPhase,uAnger,uRageStyle;uniform vec3 uMood;uniform vec2 uTap;uniform vec4 uShape;${shapeGLSL}void main(){vec3 p=sculpt(position,normal,uEnergy,uTime,uShape,uPhase);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const fragment=`uniform float uEnergy,uAnger;varying float vLight,vWave,vSeed;varying vec2 vUv;void main(){vec3 ink=vec3(.08,.10,.045);vec3 yellow=vec3(.87,.64,.0);vec3 col=mix(ink,yellow,uEnergy*vWave*.6*(1.-min(1.,uAnger)*.8));gl_FragColor=vec4(col*(1.4-vLight*.4),1.);}`;
// Keep the original mesh normals: LineSegments/WireframeGeometry drops them,
// which would make normal-directed angry spikes disappear in WIRE mode.
const wireMat=new T.MeshBasicMaterial({color:0x363c29,transparent:true,opacity:.34,wireframe:true});
const mobileView=matchMedia('(max-width: 700px), (pointer: coarse) and (max-height: 600px)');
const bodies=[];
function body(i,baseScale){
 const g=new T.Group(),uniforms={uTime:{value:0},uEnergy:{value:0},uDpr:{value:dpr},uSmall:{value:i?1:0},uPhase:{value:0},uAnger:{value:0},uRageStyle:{value:0},uMood:{value:new T.Vector3()},uTap:{value:new T.Vector2()},uShape:{value:new T.Vector4(1,0,0,0)}};
 const surfaceMaterial=skin.clone();surfaceMaterial.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime,uEnergy,uPhase,uAnger,uRageStyle;uniform vec3 uMood;uniform vec2 uTap;uniform vec4 uShape;\n'+shapeGLSL).replace('#include <begin_vertex>','vec3 transformed=sculpt(position,normal,uEnergy,uTime,uShape,uPhase);')};surfaceMaterial.customProgramCacheKey=()=> 'sculpted-banana';
 const mesh=new T.Mesh(geometry,surfaceMaterial),depth=new T.Mesh(geometry,new T.ShaderMaterial({uniforms,vertexShader:depthVertex,fragmentShader:'void main(){gl_FragColor=vec4(0.);}',colorWrite:false,depthWrite:true,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1})),mat=new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,depthWrite:true}),points=new T.Points(i?smallPg:pg,mat),wire=new T.Mesh(geometry,wireMat.clone());
 wire.material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime,uEnergy,uPhase,uAnger,uRageStyle;uniform vec3 uMood;uniform vec2 uTap;uniform vec4 uShape;\n'+shapeGLSL).replace('#include <begin_vertex>','vec3 transformed=sculpt(position,normal,uEnergy,uTime,uShape,uPhase);')};wire.material.customProgramCacheKey=()=> 'angry-banana-wire';
 depth.renderOrder=-2;points.renderOrder=1;g.add(mesh,depth,points,wire);scene.add(g);
 const b={g,mesh,depth,points,wire,mat,baseScale,base:new T.Vector3(),baseRot:new T.Vector3(.12,Math.PI,-.4),rot:new T.Vector3(),rv:new T.Vector3(),offset:new T.Vector3(),ov:new T.Vector3(),energy:0,anger:0,tapId:0,tapLevel:0,tapUntil:-Infinity,rageStyle:0,mood:new T.Vector3(),phase:0,phaseTarget:0,shape:new T.Vector4(1,0,0,0),shapeTarget:new T.Vector4(1,0,0,0)};bodies.push(b);return b;
}
const satelliteCount=6;const hero=body(0,1);for(let i=1;i<=satelliteCount;i++){const b=body(i,.17+(i%3)*.025);b.baseRot.set(.12+(i%3)*.14,Math.PI+(i%4)*.6,-.6+i*.42)}
// Portrait layout is fitted in screen space: a tall soloist, two separate satellite lanes.
const layoutVector=new T.Vector3(),layoutNormal=new T.Vector3();
function sculptPoint(vector,normal,e,body){
 const p=vector.clone(),shape=body.shape,phase=body.phase;
 const lump=Math.sin(p.x*6+time*3+phase)*Math.sin(p.y*7-time*2)*Math.cos(p.z*8+time*2.5);
 const thorn=Math.max(0,Math.sin(p.x*13+phase)*Math.sin(p.y*11+phase)*Math.cos(p.z*12))**7;
 vector.addScaledVector(normal,e*(.025+shape.x*(.08+lump*.27)+shape.w*thorn*.70));
 const twist=e*shape.z*.9*Math.sin(p.x*1.7-time*2.8+phase),cy=vector.y*Math.cos(twist)-vector.z*Math.sin(twist),cz=vector.y*Math.sin(twist)+vector.z*Math.cos(twist);vector.y=cy+e*shape.y*.42*Math.sin(p.x*2.8+time*4+phase);vector.z=cz+e*shape.y*.38*Math.cos(p.x*3.1-time*3.6+phase);deformTap(vector,p,normal,time,body.tapId,body.tapLevel);return deformEmotion(vector,p,normal,time,phase,body.anger,body.rageStyle,body.mood);
}
function projectedBounds(group,samples=240,padding=0,deformation=0){let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;const stride=Math.max(1,Math.floor(N/samples)),body=bodies.find(b=>b.g===group);for(let k=0;k<N;k+=stride){layoutVector.fromArray(pos,k*3);if(deformation>0||body.anger>0.001||body.mood.lengthSq()>.00001||body.tapLevel>.00001){layoutNormal.fromArray(normals,k*3);sculptPoint(layoutVector,layoutNormal,deformation,body)}layoutVector.applyMatrix4(group.matrixWorld).project(camera);const x=(layoutVector.x*.5+.5)*w,y=(.5-layoutVector.y*.5)*h;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}return{x:left-padding,y:top-padding,width:right-left+padding*2,height:bottom-top+padding*2}}
function layout(){
 bodies.forEach((b,i)=>{b.g.visible=i===0||!mobileView.matches});
 const portrait=w<h,halfHeight=camera.position.z*Math.tan(T.MathUtils.degToRad(camera.fov/2));
 if(portrait&&mobileView.matches){
  const stageTop=mobileView.matches?96:70,stageBottom=Math.max(stageTop+160,h-(mobileView.matches?28:90)),stageHeight=stageBottom-stageTop,pixelsPerUnit=h/(2*halfHeight);
  hero.baseRot.set(.08,Math.PI,-1.4);hero.g.position.set(0,0,0);hero.g.scale.setScalar(1);
  // The OBJ is mirrored by its Y rotation; find its actual upright silhouette instead of guessing an Euler angle.
  let bestAngle=-1.4,bestRatio=0;for(let j=0;j<80;j++){const angle=-Math.PI+j*Math.PI/80;hero.g.rotation.set(hero.baseRot.x,hero.baseRot.y,angle);hero.g.updateMatrixWorld(true);const bounds=projectedBounds(hero.g,150);const ratio=bounds.height/bounds.width;if(ratio>bestRatio){bestRatio=ratio;bestAngle=angle}}
  hero.baseRot.z=bestAngle;hero.g.rotation.set(hero.baseRot.x,hero.baseRot.y,bestAngle);hero.g.updateMatrixWorld(true);
  const unit=projectedBounds(hero.g,500);hero.baseScale=Math.min(stageHeight*(mobileView.matches?.98:.90)/unit.height,w*(mobileView.matches?.78:.57)/unit.width);
  hero.g.scale.setScalar(hero.baseScale);hero.g.updateMatrixWorld(true);const fitted=projectedBounds(hero.g,500);
  hero.base.set((w*.5-fitted.x-fitted.width/2)/pixelsPerUnit,(fitted.y+fitted.height/2-(stageTop+stageBottom)/2)/pixelsPerUnit,0);
  bodies.slice(1).forEach((body,j)=>{const row=Math.floor(j/2),sx=(j%2===0?.09:.91)*w,sy=stageTop+26+row*(stageHeight-52)/5,z=-1.2-(j%3)*.2,unitsPerPixel=2*(camera.position.z-z)*Math.tan(T.MathUtils.degToRad(camera.fov/2))/h;
   body.base.set((sx-w/2)*unitsPerPixel,(h/2-sy)*unitsPerPixel,z);body.baseScale=(Math.min(36,w*.095)/4.6)*unitsPerPixel;
  });
 }else if(mobileView.matches){
  hero.baseRot.set(.12,Math.PI,-.4);hero.base.set(0,.25,0);hero.baseScale=1.15;
 }else{
  // Fit the real silhouettes into a generous center and three balanced rows per side.
  function fit(body,cx,cy,maxWidth,maxHeight,z){
   body.g.position.set(0,0,z);body.g.rotation.set(body.baseRot.x,body.baseRot.y,body.baseRot.z);body.g.scale.setScalar(1);body.g.updateMatrixWorld(true);
   const unit=projectedBounds(body.g,400);body.baseScale=Math.min(maxWidth/unit.width,maxHeight/unit.height);
   body.g.scale.setScalar(body.baseScale);body.g.updateMatrixWorld(true);const bounds=projectedBounds(body.g,400),unitsPerPixel=2*(camera.position.z-z)*Math.tan(T.MathUtils.degToRad(camera.fov/2))/h;
   body.base.set((cx-bounds.x-bounds.width/2)*unitsPerPixel,(bounds.y+bounds.height/2-cy)*unitsPerPixel,z);body.g.position.copy(body.base);body.g.updateMatrixWorld(true);
  }
  hero.baseRot.set(.12,Math.PI,-.32);fit(hero,w*.5,h*.52,w*.54,h*.58,0);
  bodies.slice(1).forEach((body,j)=>{
   const row=Math.floor(j/2),right=j%2===1,tilt=[-.48,.22,-.28][row];body.baseRot.set(.1+row*.05,Math.PI+(row-1)*.22,right?-tilt:tilt);
   fit(body,w*(right?.87:.13),h*(.24+row*.27),w*.16,h*.20,-.65);
  });
 }
}
layout();addEventListener('resize',layout);
const anchors=[];for(let i=0;i<400;i++){const k=Math.floor(rnd()*N),p=new T.Vector3().fromArray(pos,k*3),n=new T.Vector3().fromArray(normals,k*3),a=Math.abs(n.y)<.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0),tangent=new T.Vector3().crossVectors(n,a).normalize();anchors.push({p,n,k,tangent,r:.04+rnd()*.09})}
const morphVector=new T.Vector3(),morphNormal=new T.Vector3(),morphView=new T.Vector3();
const logoMorph=await LogoMorph.create({scene,camera,count:mobileView.matches?28000:75000,capture:(positions,facing)=>{
 scene.updateMatrixWorld(true);const normalMatrices=bodies.map(b=>new T.Matrix3().getNormalMatrix(b.g.matrixWorld));
 const count=positions.count;
 for(let i=0;i<count;i++){
  const bodyIndex=mobileView.matches||i<count*.68?0:1+Math.min(satelliteCount-1,Math.floor((i-count*.68)/(count*.32)*satelliteCount));
  const b=bodies[bodyIndex],sampleCount=bodyIndex===0?(w<h?28000:N):(w<h?2200:14000),sample=(i*73)%sampleCount;
  morphVector.fromArray(pos,sample*3);morphNormal.fromArray(normals,sample*3);
  if(b.energy>.00001||b.anger>.00001||b.mood.lengthSq()>.00001||b.tapLevel>.00001)sculptPoint(morphVector,morphNormal,b.energy,b);morphVector.applyMatrix4(b.g.matrixWorld);positions.setXYZ(i,morphVector.x,morphVector.y,morphVector.z);
  morphNormal.applyMatrix3(normalMatrices[bodyIndex]).normalize();morphView.copy(camera.position).sub(morphVector).normalize();facing.setX(i,morphNormal.dot(morphView)>.03?1:0);
 }
}});
addEventListener('resize',()=>logoMorph.resize());
function toggleLogo(){
 logoMorph.toggle(time);held.clear();
 const a=synth.unlock();synth.music({kind:'arp',midi:logoMorph.state.target?79:60,at:a.currentTime+.005,velocity:.6,duration:.45});
}
const keys='asdfghjklqwertyuiopzxcvbnm1234567890',held=new Map();
const morphs=[new T.Vector4(1,.15,.15,0),new T.Vector4(.2,1,.25,0),new T.Vector4(.2,.35,1,0),new T.Vector4(.3,.15,.15,1)];
function pulse(b,i,power=1){const effect=i%TAP_EFFECTS.length;b.tapId=effect===4?3:0;b.tapUntil=effect>=4?time+.65:-Infinity;if(effect>=4)b.shapeTarget.set(0,0,0,0);else b.shapeTarget.copy(morphs[effect]);b.phaseTarget=(i%7)*.45;b.energy=Math.min(1.4,b.energy+.85*power);const sign=i%2?1:-1;b.rv.x=T.MathUtils.clamp(b.rv.x+sign*(1.7+i%3)*power,-8,8);b.rv.y=T.MathUtils.clamp(b.rv.y+sign*2.6*power,-8,8);b.rv.z=T.MathUtils.clamp(b.rv.z+((i%5)-2)*1.9*power,-9,9);b.ov.y=T.MathUtils.clamp(b.ov.y+2.3*power,-5,5);b.ov.x=T.MathUtils.clamp(b.ov.x+sign*.7*power,-3,3)}
function press(k,all=false,effectOverride=null){try{const context=synth.unlock();music.hit(k,context.currentTime)}catch(e){status.textContent='AUDIO / '+e.message}
 const i=Math.max(0,keys.indexOf(k));selected=1+i%satelliteCount;energy=Math.min(1.5,energy+.7);lastHit=time;totalHits++;lastKey=k===' '?'SPACE':k.toUpperCase();document.body.classList.add('played');
 const effect=effectOverride??effectForKey(k,i);document.body.dataset.tapEffect=TAP_EFFECTS[effect%TAP_EFFECTS.length];pulse(hero,effect,all?1.2:.6);if(all)bodies.slice(1).forEach(b=>pulse(b,effect,1));else{pulse(bodies[selected],effect,1.15);pulse(bodies[1+(i+3)%satelliteCount],effect,.45)}

 status.textContent=lastKey+' / '+synth.lastFrequency.toFixed(1)+' Hz / B'+String(selected).padStart(2,'0');
 document.body.dataset.lastKey=lastKey;document.body.dataset.hits=totalHits;document.body.dataset.frequency=synth.lastFrequency.toFixed(2);
}
function setMode(n,audible=true){mode=n;music.setSkin(n);const name=['POINTS','SKIN','1BIT','WIRE'][mode],button=document.querySelector('#mode');button.title=name+' / スキンを切り替える';button.setAttribute('aria-label','スキンを切り替える（'+name+'）');document.body.dataset.mode=String(mode);document.body.dataset.musicSkin=name;if(audible){const context=synth.unlock();music.hit('skin',context.currentTime);}}
function reset(){logoMorph.reset();music.stop();held.clear();bodies.forEach(b=>{b.rot.set(0,0,0);b.rv.set(0,0,0);b.offset.set(0,0,0);b.ov.set(0,0,0);b.energy=0;b.anger=0;b.tapId=0;b.tapLevel=0;b.tapUntil=-Infinity;b.mood.set(0,0,0)});energy=0;rx=ry=0;status.textContent='READY / PRESS ANY LETTER'}
addEventListener('keydown',e=>{
 if(e.metaKey||e.ctrlKey||e.altKey||e.isComposing||e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target.isContentEditable)return;
 if(e.code==='Escape'){reset();return;}
 if(e.code==='Enter'&&!e.target.closest?.('button,summary,a,[role="button"]')){e.preventDefault();if(!e.repeat)toggleLogo();return;}
 if(e.key.length!==1||e.repeat)return;
 if(e.code==='Space'&&e.target.closest?.('button,summary,a,[role="button"]'))return;
 e.preventDefault();const note=e.code==='Space'?' ':e.key.toLowerCase();press(note,note===' ');held.set(e.code,{key:note,next:time+.26});
});
addEventListener('keyup',e=>held.delete(e.code));
addEventListener('blur',()=>{held.clear();music.stop();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){held.clear();music.stop();}});
function screen(p,g=hero.g){const a=p.clone().applyMatrix4(g.matrixWorld).project(camera);return{x:(a.x*.5+.5)*w,y:(-.5*a.y+.5)*h}}
function label(s,x,y,color='#505845'){c.fillStyle=color;c.font='9px monospace';c.fillText(s,x,y)}
function box(x,y,bw,bh,a=.35){c.strokeStyle=`rgba(24,35,13,${a})`;c.lineWidth=1;c.strokeRect(x,y,bw,bh)}
let regionCount=0;
function drawHud(dt){c.clearRect(0,0,w,h);if(clean||logoMorph.active)return;
 const norm=new T.Matrix3().getNormalMatrix(hero.g.matrixWorld),visible=[];
 anchors.forEach((a,i)=>{const wn=a.n.clone().applyMatrix3(norm),world=a.p.clone().applyMatrix4(hero.g.matrixWorld);if(wn.dot(camera.position.clone().sub(world).normalize())<.1)return;const surfacePoint=sculptPoint(a.p.clone(),a.n,hero.energy,hero);const p=screen(surfacePoint),q=screen(surfacePoint.clone().addScaledVector(a.tangent,a.r));visible.push({p,i});const active=energy>.08;if(active?i%2!==0:i%10!==0)return;const r=active?6+((i*13)%15)*(1+energy*.35):6;box(p.x-r/2,p.y-r/2,r,r,active?.55:.22); });regionCount=visible.length;
 if(energy>.025&&visible.length>10){c.strokeStyle=`rgba(41,57,13,${Math.min(.24,energy*.20)})`;c.lineWidth=.95;c.beginPath();for(let i=0;i<visible.length;i+=7){const a=visible[i].p,b=visible[(i+9)%visible.length].p;c.moveTo(a.x,a.y);c.lineTo(b.x,b.y)}c.stroke()}
 bodies.slice(1).forEach((b,j)=>{if(!b.g.visible||b.energy<.06)return;const p=screen(new T.Vector3(),b.g),s=(w<h?Math.min(38,w*.10):h*(.065+(j%3)*.008))*(1+b.energy*.08);box(p.x-s/2,p.y-s/2,s,s,b.energy>.08?.7:.2);const key=keys[j]||'';if(b.energy>.1){c.fillStyle='#f9c70d';c.fillRect(p.x-s/2-3,p.y-s/2-3,6,6)}});

 synth.waveform();
 document.body.dataset.anger=hero.anger.toFixed(4);document.body.dataset.audioState=synth.ctx?.state||'locked';document.body.dataset.audioRms=String(synth.peak);document.body.dataset.energy=energy.toFixed(4);document.body.dataset.held=String(held.size);document.body.dataset.regions=regionCount;
}
function compose(){cc.fillStyle='#f9c70d';cc.fillRect(0,0,composite.width,composite.height);cc.drawImage(canvas,0,0,composite.width,composite.height);if(!clean)cc.drawImage(hud,0,0,composite.width,composite.height)}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function step(b,dt){const steps=Math.ceil(dt/.012),d=dt/steps;for(let n=0;n<steps;n++){b.rv.addScaledVector(b.rot,-42*d).multiplyScalar(Math.exp(-8*d));b.rot.addScaledVector(b.rv,d);b.ov.addScaledVector(b.offset,-52*d).multiplyScalar(Math.exp(-8*d));b.offset.addScaledVector(b.ov,d)}b.energy*=Math.exp(-3.5*dt);b.tapLevel=T.MathUtils.lerp(b.tapLevel,time<b.tapUntil?1:0,1-Math.exp(-(time<b.tapUntil?12:3)*dt));b.anger*=Math.exp(-1.15*dt);b.mood.multiplyScalar(Math.exp(-.65*dt));b.shape.lerp(b.shapeTarget,1-Math.exp(-7*dt));b.phase=T.MathUtils.lerp(b.phase,b.phaseTarget,1-Math.exp(-6*dt))}
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;time+=dt;logoMorph.update(time);document.body.classList.toggle('logo-active',logoMorph.active);fps=T.MathUtils.lerp(fps,1/Math.max(dt,.001),.04);for(const hold of held.values()){if(time>=hold.next){press(hold.key,hold.key===' ');hold.next=time+.145}}
 if(synth.ctx?.state==='running'){for(const note of music.drain(synth.ctx.currentTime))synth.music(note);}
 pg.setDrawRange(0,w<h?28000:125000);smallPg.setDrawRange(0,w<h?2200:14000);energy*=Math.exp(-3.8*dt);bodies.forEach((b,i)=>{b.g.visible=(i===0||!mobileView.matches)&&!logoMorph.active;step(b,dt);const portrait=w<h;
 if(portrait){const isHero=i===0;b.g.position.copy(b.base);b.g.position.x+=Math.tanh(b.offset.x)*.18;b.g.position.y+=Math.tanh(b.offset.y)*(isHero?.32:.22);b.g.rotation.set(b.baseRot.x+Math.tanh(b.rot.x)*.18+(isHero?rx*.2:0),b.baseRot.y+Math.tanh(b.rot.y)*(isHero?.24:.55)+(isHero?ry*.2:0),b.baseRot.z+Math.tanh(b.rot.z)*(isHero?.07:.6));b.g.scale.setScalar(b.baseScale*(1+b.energy*(isHero?.045:.08)))}
 else{b.g.position.copy(b.base).add(b.offset);b.g.rotation.set(b.baseRot.x+b.rot.x+(i===0?rx:0),b.baseRot.y+b.rot.y+(i===0?ry:0),b.baseRot.z+b.rot.z);b.g.scale.setScalar(b.baseScale*(1+b.energy*.12))}const pointMode=mode===0;b.mesh.visible=mode===1||mode===2;b.points.visible=pointMode;b.depth.visible=pointMode||mode===3;b.wire.visible=mode===3;b.mat.uniforms.uTime.value=time;b.mat.uniforms.uEnergy.value=b.energy;b.mat.uniforms.uDpr.value=dpr;b.mat.uniforms.uShape.value.copy(b.shape);b.mat.uniforms.uPhase.value=b.phase;b.mat.uniforms.uAnger.value=b.anger;b.mat.uniforms.uRageStyle.value=b.rageStyle;b.mat.uniforms.uMood.value.copy(b.mood);b.mat.uniforms.uTap.value.set(b.tapId,b.tapLevel)});
 scene.updateMatrixWorld();
 if(w<h){
  const energyMargin=mode===0||hero.anger>.001||hero.mood.lengthSq()>.00001||hero.tapLevel>.00001?hero.energy:0,minX=w*(mobileView.matches?.06:.18),maxX=w*(mobileView.matches?.94:.82),minY=mobileView.matches?96:70,maxY=Math.max(230,h-(mobileView.matches?28:90));let bound=projectedBounds(hero.g,350,8,energyMargin);
  const fit=Math.min(1,(maxX-minX)/bound.width,(maxY-minY)/bound.height);if(fit<1){hero.g.scale.multiplyScalar(fit);hero.g.updateMatrixWorld(true);bound=projectedBounds(hero.g,350,8,energyMargin)}
  const dx=bound.x<minX?minX-bound.x:bound.x+bound.width>maxX?maxX-bound.x-bound.width:0;
  const dy=bound.y<minY?minY-bound.y:bound.y+bound.height>maxY?maxY-bound.y-bound.height:0;
  const pixelsPerUnit=h/(2*camera.position.z*Math.tan(T.MathUtils.degToRad(camera.fov/2)));hero.g.position.x+=dx/pixelsPerUnit;hero.g.position.y-=dy/pixelsPerUnit;hero.g.updateMatrixWorld(true);
 }
 if(Math.floor(time*5)!==Number(document.body.dataset.boundsTick)){document.body.dataset.boundsTick=String(Math.floor(time*5));document.body.dataset.layoutBounds=JSON.stringify(bodies.map((b,i)=>({i,visible:b.g.visible,...projectedBounds(b.g,i===0?400:100,i===0?8:3,mode===0?b.energy:0)})));}
 logoMorph.refreshReturn(time);
 if(mode===2&&!logoMorph.active){renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera)}else renderer.render(scene,camera);drawHud(dt);

 if(recording){compose();if(now-recordStart>=12000&&recorder.state==='recording')recorder.stop()}
}
document.querySelector('#loading').remove();setMode(2,false);requestAnimationFrame(frame);
document.querySelector('#mode').onclick=()=>setMode((mode+1)%4);
let tapCursor=0;
function tap(){press(' ',true,TAP_ORDER[tapCursor++%TAP_ORDER.length]);}
canvas.addEventListener('pointerdown',e=>{drag=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId);tap();});
canvas.addEventListener('pointermove',e=>{if(drag){ry+=(e.clientX-px)*.005;rx+=(e.clientY-py)*.005;px=e.clientX;py=e.clientY;}});
canvas.addEventListener('pointerup',()=>drag=false);
canvas.addEventListener('pointercancel',()=>drag=false);
