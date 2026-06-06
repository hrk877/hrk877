"use client"

import { useEffect, useRef } from "react"
import type { MouthState } from "./types"

const W = 600
const H = 400

// ── Design-space keypoints (designed for 600×400 canvas) ────────────────────
const LT  = { x: 62,  y: 196 }   // left tip
const RT  = { x: 538, y: 174 }   // right tip
const OC1 = { x: 112, y: 44  }   // outer spine bezier cp1
const OC2 = { x: 488, y: 52  }   // outer spine bezier cp2
const IC1 = { x: 488, y: 292 }   // inner belly bezier cp1
const IC2 = { x: 112, y: 300 }   // inner belly bezier cp2

const MX = 300, MY = 236          // mouth centre
const ELX = 248, ELY = 196        // left  eye centre
const ERX = 352, ERY = 193        // right eye centre

const S = (v: number, sc: number) => v * sc
const SS = (sx: number, sy: number) => Math.min(sx, sy)

// ── Banana path ─────────────────────────────────────────────────────────────
function makeBananaPath(sx: number, sy: number): Path2D {
  const p = new Path2D()
  p.moveTo(S(LT.x, sx), S(LT.y, sy))
  p.bezierCurveTo(S(OC1.x,sx),S(OC1.y,sy), S(OC2.x,sx),S(OC2.y,sy), S(RT.x,sx),S(RT.y,sy))
  p.bezierCurveTo(S(IC1.x,sx),S(IC1.y,sy), S(IC2.x,sx),S(IC2.y,sy), S(LT.x,sx),S(LT.y,sy))
  p.closePath()
  return p
}

// ── Rounded rect ────────────────────────────────────────────────────────────
function rrect(ctx:CanvasRenderingContext2D, x:number,y:number,w:number,h:number,r:number) {
  const R = Math.min(r, w/2, h/2)
  ctx.beginPath()
  ctx.moveTo(x+R,y); ctx.lineTo(x+w-R,y); ctx.quadraticCurveTo(x+w,y,x+w,y+R)
  ctx.lineTo(x+w,y+h-R); ctx.quadraticCurveTo(x+w,y+h,x+w-R,y+h)
  ctx.lineTo(x+R,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-R)
  ctx.lineTo(x,y+R); ctx.quadraticCurveTo(x,y,x+R,y); ctx.closePath()
}

// ─────────────────────────────────────────────────────────────────────────────
// BANANA BODY
// ─────────────────────────────────────────────────────────────────────────────
function drawBananaBody(ctx:CanvasRenderingContext2D, sx:number, sy:number, path:Path2D) {
  const ss = SS(sx,sy)

  // 1. Shadow + base horizontal gradient
  ctx.save()
  ctx.shadowColor="rgba(0,0,0,0.32)"; ctx.shadowBlur=S(26,ss)
  ctx.shadowOffsetX=S(6,sx); ctx.shadowOffsetY=S(12,sy)
  const base = ctx.createLinearGradient(S(LT.x,sx),0,S(RT.x,sx),0)
  base.addColorStop(0,   "#506018"); base.addColorStop(0.05,"#88A020")
  base.addColorStop(0.18,"#CEB000"); base.addColorStop(0.50,"#FFD700")
  base.addColorStop(0.82,"#CEB000"); base.addColorStop(0.95,"#96880E")
  base.addColorStop(1,   "#506018")
  ctx.fillStyle=base; ctx.fill(path)
  ctx.restore()

  // 2. Clipped overlays
  ctx.save(); ctx.clip(path)

  // Vertical depth (dark spine → warm belly glow)
  const depth = ctx.createLinearGradient(0,S(44,sy),0,S(306,sy))
  depth.addColorStop(0,   "rgba(0,0,0,0.27)")
  depth.addColorStop(0.10,"rgba(255,255,255,0.24)")   // specular band
  depth.addColorStop(0.25,"rgba(0,0,0,0.04)")
  depth.addColorStop(0.58,"rgba(255,255,160,0.07)")
  depth.addColorStop(1,   "rgba(0,0,0,0.20)")
  ctx.fillStyle=depth; ctx.fillRect(0,0,S(W,sx),S(H,sy))

  // Radial roundness — lighter face centre, darker edges
  const radX=S(W/2,sx), radY=S(H/2,sy)
  const rad = ctx.createRadialGradient(radX,radY,0,radX,radY,S(210,ss))
  rad.addColorStop(0,  "rgba(255,255,180,0.10)")
  rad.addColorStop(0.5,"rgba(0,0,0,0)")
  rad.addColorStop(1,  "rgba(0,0,0,0.22)")
  ctx.fillStyle=rad; ctx.fillRect(0,0,S(W,sx),S(H,sy))

  // Sharp specular highlight along outer spine
  ctx.beginPath()
  ctx.moveTo(S(LT.x+18,sx),S(LT.y-16,sy))
  ctx.bezierCurveTo(S(112,sx),S(72,sy),S(488,sx),S(78,sy),S(RT.x-18,sx),S(RT.y-14,sy))
  ctx.lineWidth=S(5,ss); ctx.strokeStyle="rgba(255,255,255,0.46)"; ctx.lineCap="round"; ctx.stroke()
  // Soft secondary glow
  ctx.lineWidth=S(14,ss); ctx.strokeStyle="rgba(255,255,255,0.12)"
  ctx.beginPath()
  ctx.moveTo(S(LT.x+30,sx),S(LT.y-9,sy))
  ctx.bezierCurveTo(S(120,sx),S(96,sy),S(480,sx),S(101,sy),S(RT.x-30,sx),S(RT.y-8,sy))
  ctx.stroke()

  // Sugar spots
  const spots=[
    {x:178,y:148,rx:9,  ry:5.5,rot:-0.28,a:0.22},
    {x:300,y:128,rx:6.5,ry:4,  rot: 0.18,a:0.20},
    {x:384,y:142,rx:11, ry:6,  rot:-0.14,a:0.24},
    {x:242,y:170,rx:5.5,ry:3.5,rot: 0.40,a:0.18},
    {x:152,y:170,rx:6.5,ry:3.5,rot:-0.50,a:0.17},
    {x:428,y:158,rx:5,  ry:3,  rot: 0.12,a:0.16},
    {x:342,y:162,rx:4,  ry:2.5,rot:-0.22,a:0.14},
  ]
  for(const sp of spots){
    ctx.save(); ctx.translate(S(sp.x,sx),S(sp.y,sy)); ctx.rotate(sp.rot)
    ctx.beginPath(); ctx.ellipse(0,0,S(sp.rx,sx),S(sp.ry,sy),0,0,Math.PI*2)
    ctx.fillStyle=`rgba(55,26,4,${sp.a})`; ctx.fill(); ctx.restore()
  }
  ctx.restore()

  // Outline
  ctx.save()
  ctx.strokeStyle="rgba(75,46,4,0.28)"; ctx.lineWidth=S(1.8,ss)
  ctx.stroke(path); ctx.restore()

  // Stem
  ctx.save(); ctx.translate(S(RT.x,sx),S(RT.y,sy)); ctx.rotate(-0.25)
  ctx.beginPath(); ctx.moveTo(0,0)
  ctx.bezierCurveTo(S(10,sx),S(-20,sy),S(15,sx),S(-32,sy),S(8,sx),S(-44,sy))
  ctx.lineWidth=S(7,ss); ctx.strokeStyle="#3A2005"; ctx.lineCap="round"; ctx.stroke()
  ctx.beginPath(); ctx.arc(S(8,sx),S(-44,sy),S(4,ss),0,Math.PI*2)
  ctx.fillStyle="#261505"; ctx.fill(); ctx.restore()
}

// ─────────────────────────────────────────────────────────────────────────────
// EYES + EYEBROWS
// ─────────────────────────────────────────────────────────────────────────────
function drawEye(ctx:CanvasRenderingContext2D, cx:number, cy:number, talking:boolean, ss:number) {
  const rx=S(11,ss), ry=talking?S(11.5,ss):S(8.8,ss)

  // Sclera
  ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2)
  ctx.fillStyle="#FAFAF2"; ctx.fill()

  // Iris
  const ir=rx*0.62, ix=cx+S(0.8,ss), iy=cy+S(0.4,ss)
  ctx.beginPath(); ctx.arc(ix,iy,ir,0,Math.PI*2)
  ctx.fillStyle="#211204"; ctx.fill()

  // Iris shimmer
  const iG=ctx.createRadialGradient(ix-ir*0.28,iy-ir*0.28,0,ix,iy,ir)
  iG.addColorStop(0,"rgba(90,55,10,0.55)"); iG.addColorStop(1,"rgba(0,0,0,0)")
  ctx.beginPath(); ctx.arc(ix,iy,ir,0,Math.PI*2)
  ctx.fillStyle=iG; ctx.fill()

  // Pupil
  ctx.beginPath(); ctx.arc(ix,iy,ir*0.52,0,Math.PI*2)
  ctx.fillStyle="#070202"; ctx.fill()

  // Main catchlight
  ctx.beginPath(); ctx.arc(cx+rx*0.32,cy-ry*0.28,ir*0.29,0,Math.PI*2)
  ctx.fillStyle="rgba(255,255,255,0.95)"; ctx.fill()

  // Small secondary catchlight
  ctx.beginPath(); ctx.arc(cx-rx*0.10,cy+ry*0.20,ir*0.14,0,Math.PI*2)
  ctx.fillStyle="rgba(255,255,255,0.55)"; ctx.fill()

  // Eyelid shadow
  ctx.beginPath(); ctx.ellipse(cx,cy-ry*0.08,rx*0.88,ry*0.50,0,Math.PI,Math.PI*2)
  ctx.strokeStyle="rgba(0,0,0,0.15)"; ctx.lineWidth=S(2.5,ss); ctx.stroke()

  // Outline
  ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2)
  ctx.strokeStyle="rgba(0,0,0,0.18)"; ctx.lineWidth=S(1.2,ss); ctx.stroke()
}

function drawBrows(ctx:CanvasRenderingContext2D, sx:number, sy:number, talking:boolean) {
  const ss=SS(sx,sy), lift=talking?S(-6,sy):0, hw=S(16,sx)
  const brow=(cx:number,cy:number,isLeft:boolean)=>{
    const lf=isLeft?lift*0.75:lift
    ctx.beginPath()
    ctx.moveTo(cx-hw,cy+lf*0.70)
    ctx.bezierCurveTo(cx-hw*0.3,cy-S(3.5,sy)+lf,cx+hw*0.3,cy-S(5,sy)+lf,cx+hw,cy-S(1,sy)+lf*0.70)
    ctx.strokeStyle="#392005"; ctx.lineWidth=S(4,ss); ctx.lineCap="round"; ctx.stroke()
  }
  brow(S(ELX,sx),S(ELY-16,sy),true)
  brow(S(ERX,sx),S(ERY-16,sy),false)
}

// ─────────────────────────────────────────────────────────────────────────────
// MOUTH
// ─────────────────────────────────────────────────────────────────────────────
function drawMouth(
  ctx:CanvasRenderingContext2D,
  cx:number, cy:number,
  state:MouthState,
  sx:number, sy:number,
  frame:number,
) {
  const ss=SS(sx,sy)
  const mw=S(74,sx)
  const lx=cx-mw/2, rx2=cx+mw/2   // left / right corner x
  const lipU=S(10,sy), lipL=S(13,sy)

  // ═══ REST — filled closed lips ═══════════════════════════════════════════
  if(state==="rest"){
    // Upper lip
    ctx.save()
    const ulR=new Path2D()
    ulR.moveTo(lx,cy)
    ulR.bezierCurveTo(lx+mw*0.22,cy-lipU*1.0,cx,cy-lipU*1.35,rx2-mw*0.22,cy-lipU*1.0)
    ulR.bezierCurveTo(rx2-mw*0.1,cy-lipU*0.65,rx2,cy-lipU*0.25,rx2,cy)
    ulR.bezierCurveTo(rx2-mw*0.22,cy+S(2.5,sy),cx,cy+S(3.5,sy),lx+mw*0.22,cy+S(2.5,sy))
    ulR.lineTo(lx,cy); ulR.closePath()
    const ulG=ctx.createLinearGradient(cx,cy-lipU*1.38,cx,cy+S(3.5,sy))
    ulG.addColorStop(0,"#7A3818"); ulG.addColorStop(0.55,"#9E5028"); ulG.addColorStop(1,"#C07040")
    ctx.fillStyle=ulG; ctx.fill(ulR)
    // Highlight centre
    ctx.beginPath(); ctx.ellipse(cx,cy-lipU*0.88,mw*0.20,lipU*0.26,0,0,Math.PI*2)
    ctx.fillStyle="rgba(230,158,108,0.28)"; ctx.fill()
    ctx.restore()

    // Lower lip (fuller)
    ctx.save()
    const llR=new Path2D()
    llR.moveTo(lx,cy)
    llR.bezierCurveTo(lx+mw*0.22,cy+S(2.5,sy),cx,cy+S(3.5,sy),rx2-mw*0.22,cy+S(2.5,sy))
    llR.lineTo(rx2,cy)
    llR.bezierCurveTo(rx2-mw*0.10,cy+lipL*0.5,rx2-mw*0.20,cy+lipL*0.95,cx,cy+lipL*0.98)
    llR.bezierCurveTo(lx+mw*0.20,cy+lipL*0.95,lx+mw*0.10,cy+lipL*0.5,lx,cy)
    llR.closePath()
    const llG=ctx.createLinearGradient(cx,cy,cx,cy+lipL)
    llG.addColorStop(0,"#B86038"); llG.addColorStop(0.5,"#8E4020"); llG.addColorStop(1,"#6E2E0E")
    ctx.fillStyle=llG; ctx.fill(llR)
    // Lower lip highlight
    ctx.beginPath(); ctx.ellipse(cx,cy+lipL*0.56,mw*0.23,lipL*0.23,0,0,Math.PI*2)
    ctx.fillStyle="rgba(230,162,110,0.44)"; ctx.fill()
    ctx.restore()

    // Seam
    ctx.beginPath(); ctx.moveTo(lx,cy)
    ctx.bezierCurveTo(cx-mw*0.28,cy+S(3,sy),cx+mw*0.28,cy+S(3,sy),rx2,cy)
    ctx.strokeStyle="#4C1C06"; ctx.lineWidth=S(1.5,ss); ctx.lineCap="round"; ctx.stroke()
    return
  }

  // ═══ OPEN states ══════════════════════════════════════════════════════════
  const osc=Math.sin(frame*0.20)*0.055
  const baseH=state==="open_mid"?S(20,sy):S(46,sy)
  const openH=baseH*(1+osc)

  // ── Cavity (clipped interior) ────────────────────────────────────────────
  const cavPath=new Path2D()
  cavPath.moveTo(lx,cy)
  // Top edge of cavity (upper lip inner boundary)
  cavPath.bezierCurveTo(cx-mw*0.10,cy-openH*0.62,cx+mw*0.10,cy-openH*0.62,rx2,cy)
  // Bottom edge of cavity (lower lip inner boundary)
  cavPath.bezierCurveTo(rx2,cy+openH*0.15,cx+mw*0.05,cy+openH*0.64,cx,cy+openH*0.64)
  cavPath.bezierCurveTo(cx-mw*0.05,cy+openH*0.64,lx,cy+openH*0.15,lx,cy)
  cavPath.closePath()

  ctx.save(); ctx.clip(cavPath)

  // Interior gradient
  const inG=ctx.createLinearGradient(cx,cy-openH*0.62,cx,cy+openH*0.64)
  inG.addColorStop(0,"#100200"); inG.addColorStop(0.12,"#4A0C06")
  inG.addColorStop(0.32,"#881C10"); inG.addColorStop(0.52,"#AE2A18")
  inG.addColorStop(0.74,"#A02618"); inG.addColorStop(1,"#881C12")
  ctx.fillStyle=inG
  ctx.fillRect(lx-S(4,sx),cy-openH-S(4,sy),mw+S(8,sx),openH*2+S(8,sy))

  // Teeth
  const tN=4, tZone=mw*0.72, tW=tZone/tN, tH=openH*(state==="open_mid"?0.28:0.24)
  const tX0=cx-tZone/2
  const toothGrad=(y0:number,y1:number)=>{
    const g=ctx.createLinearGradient(0,y0,0,y1)
    g.addColorStop(0,"#EDE6D3"); g.addColorStop(0.65,"#E2D9C0"); g.addColorStop(1,"#CEC4A0")
    return g
  }
  // Upper teeth
  for(let i=0;i<tN;i++){
    const tx=tX0+i*tW+tW*0.07, ty=cy-openH*0.50
    ctx.save(); rrect(ctx,tx,ty,tW*0.86,tH,S(2.5,ss))
    ctx.fillStyle=toothGrad(ty,ty+tH); ctx.fill()
    ctx.strokeStyle="rgba(0,0,0,0.09)"; ctx.lineWidth=S(0.7,ss); ctx.stroke()
    ctx.restore()
  }
  // Upper gum
  ctx.beginPath(); ctx.ellipse(cx,cy-openH*0.44+tH*0.88,mw*0.35,S(4.5,sy),0,0,Math.PI*2)
  ctx.fillStyle="rgba(185,84,76,0.56)"; ctx.fill()

  if(state==="open_full"){
    // Lower teeth
    for(let i=0;i<tN;i++){
      const tx=tX0+i*tW+tW*0.07, ty=cy+openH*0.44-tH
      ctx.save(); rrect(ctx,tx,ty,tW*0.86,tH,S(2.5,ss))
      ctx.fillStyle=toothGrad(ty+tH,ty); ctx.fill()
      ctx.strokeStyle="rgba(0,0,0,0.09)"; ctx.lineWidth=S(0.7,ss); ctx.stroke()
      ctx.restore()
    }
    // Lower gum
    ctx.beginPath(); ctx.ellipse(cx,cy+openH*0.44-tH*0.88,mw*0.35,S(4.5,sy),0,0,Math.PI*2)
    ctx.fillStyle="rgba(185,84,76,0.56)"; ctx.fill()

    // Tongue
    const tG=ctx.createRadialGradient(cx-mw*0.05,cy+openH*0.20,0,cx,cy+openH*0.26,mw*0.30)
    tG.addColorStop(0,"#D88090"); tG.addColorStop(0.55,"#C05F6E"); tG.addColorStop(1,"#9A3C50")
    ctx.beginPath(); ctx.ellipse(cx,cy+openH*0.28,mw*0.30,openH*0.21,0,0,Math.PI*2)
    ctx.fillStyle=tG; ctx.fill()
    // Tongue centrefold
    ctx.beginPath(); ctx.moveTo(cx,cy+openH*0.09); ctx.lineTo(cx,cy+openH*0.45)
    ctx.strokeStyle="rgba(130,40,55,0.32)"; ctx.lineWidth=S(1.2,ss); ctx.stroke()
    // Tongue highlight
    ctx.beginPath(); ctx.ellipse(cx-mw*0.07,cy+openH*0.20,mw*0.09,openH*0.09,-0.2,0,Math.PI*2)
    ctx.fillStyle="rgba(235,165,165,0.42)"; ctx.fill()
  }
  ctx.restore()  // end cavity clip

  // ── Upper lip — filled shape above the opening ────────────────────────────
  ctx.save()
  const ulPath=new Path2D()
  // Bottom edge (= top of cavity)
  ulPath.moveTo(lx,cy)
  ulPath.bezierCurveTo(cx-mw*0.10,cy-openH*0.62,cx+mw*0.10,cy-openH*0.62,rx2,cy)
  // Outer top of upper lip
  ulPath.bezierCurveTo(rx2,cy-openH*0.68-lipU,cx+mw*0.14,cy-openH*0.72-lipU*1.1,cx,cy-openH*0.72-lipU*1.1)
  ulPath.bezierCurveTo(cx-mw*0.14,cy-openH*0.72-lipU*1.1,lx,cy-openH*0.68-lipU,lx,cy)
  ulPath.closePath()
  const ulG=ctx.createLinearGradient(cx,cy-openH*0.74-lipU*1.1,cx,cy)
  ulG.addColorStop(0,"#6A2C10"); ulG.addColorStop(0.55,"#9A4824"); ulG.addColorStop(1,"#C06840")
  ctx.fillStyle=ulG; ctx.fill(ulPath)
  // Highlight
  ctx.beginPath(); ctx.ellipse(cx,cy-openH*0.52-lipU*0.55,mw*0.12,lipU*0.22,0,0,Math.PI*2)
  ctx.fillStyle="rgba(225,150,100,0.26)"; ctx.fill()
  ctx.restore()

  // ── Lower lip — filled shape below the opening ────────────────────────────
  ctx.save()
  const llPath=new Path2D()
  // Top edge (= bottom of cavity)
  llPath.moveTo(lx,cy)
  llPath.bezierCurveTo(lx,cy+openH*0.15,cx-mw*0.05,cy+openH*0.64,cx,cy+openH*0.64)
  llPath.bezierCurveTo(cx+mw*0.05,cy+openH*0.64,rx2,cy+openH*0.15,rx2,cy)
  // Outer bottom of lower lip
  llPath.bezierCurveTo(rx2,cy+openH*0.72+lipL,cx+mw*0.10,cy+openH*0.76+lipL,cx,cy+openH*0.76+lipL)
  llPath.bezierCurveTo(cx-mw*0.10,cy+openH*0.76+lipL,lx,cy+openH*0.72+lipL,lx,cy)
  llPath.closePath()
  const llG=ctx.createLinearGradient(cx,cy,cx,cy+openH*0.78+lipL)
  llG.addColorStop(0,"#C06840"); llG.addColorStop(0.5,"#8C3E1A"); llG.addColorStop(1,"#6A2A0C")
  ctx.fillStyle=llG; ctx.fill(llPath)
  // Lower lip highlight (prominent)
  ctx.beginPath(); ctx.ellipse(cx,cy+openH*0.64+lipL*0.52,mw*0.22,lipL*0.24,0,0,Math.PI*2)
  ctx.fillStyle="rgba(230,155,105,0.45)"; ctx.fill()
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE
// ─────────────────────────────────────────────────────────────────────────────
function drawScene(
  ctx:CanvasRenderingContext2D,
  w:number, h:number,
  mouth:MouthState,
  talking:boolean,
  frame:number,
) {
  const sx=w/W, sy=h/H, ss=SS(sx,sy)
  ctx.clearRect(0,0,w,h)

  const bobAmp =talking?S(3.5,sy):S(1.5,sy)
  const bobFreq=talking?0.09:0.025
  const bob=Math.sin(frame*bobFreq)*bobAmp

  ctx.save(); ctx.translate(0,bob)
  const path=makeBananaPath(sx,sy)
  drawBananaBody(ctx,sx,sy,path)
  drawBrows(ctx,sx,sy,talking)
  drawEye(ctx,S(ELX,sx),S(ELY,sy),talking,ss)
  drawEye(ctx,S(ERX,sx),S(ERY,sy),talking,ss)
  drawMouth(ctx,S(MX,sx),S(MY,sy),mouth,sx,sy,frame)
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface BananaCanvasProps {
  canvasRef:    React.RefObject<HTMLCanvasElement | null>
  mouthState:   MouthState
  isTalking?:   boolean
  isRecording?: boolean
}

export default function BananaCanvas({canvasRef,mouthState,isTalking,isRecording}:BananaCanvasProps) {
  const frameRef = useRef(0)
  const countRef = useRef(0)
  const mouthRef = useRef<MouthState>(mouthState)
  const talkRef  = useRef(!!isTalking)

  useEffect(()=>{mouthRef.current=mouthState},[mouthState])
  useEffect(()=>{talkRef.current=!!isTalking},[isTalking])

  useEffect(()=>{
    const canvas=canvasRef.current
    if(!canvas) return
    const ctx=canvas.getContext("2d")
    if(!ctx) return
    canvas.width=W; canvas.height=H
    const tick=()=>{
      countRef.current++
      drawScene(ctx,W,H,mouthRef.current,talkRef.current,countRef.current)
      frameRef.current=requestAnimationFrame(tick)
    }
    frameRef.current=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(frameRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[canvasRef])

  return (
    <div className="relative w-full">
      <canvas ref={canvasRef} className="w-full block" style={{aspectRatio:`${W}/${H}`}} />
      {isRecording&&(
        <div className="absolute top-3 right-4 flex items-center gap-1.5 pointer-events-none select-none">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse block"/>
          <span className="font-mono text-[9px] uppercase tracking-widest opacity-50">REC</span>
        </div>
      )}
    </div>
  )
}
