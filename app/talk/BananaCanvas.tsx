"use client"

import { useEffect, useRef } from "react"
type Phoneme = "X" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H"

const W = 600
const H = 400

// ── Banana keypoints ─────────────────────────────────────────────────────────
const LT  = { x: 62,  y: 196 }
const RT  = { x: 538, y: 174 }
const OC1 = { x: 112, y: 44  }
const OC2 = { x: 488, y: 52  }
const IC1 = { x: 488, y: 292 }
const IC2 = { x: 112, y: 300 }

const MX = 300, MY = 236   // mouth centre
const ELX = 248, ELY = 196
const ERX = 352, ERY = 193

const S  = (v: number, sc: number) => v * sc
const SS = (sx: number, sy: number) => Math.min(sx, sy)

// ── Banana path ───────────────────────────────────────────────────────────────
function makeBananaPath(sx: number, sy: number): Path2D {
  const p = new Path2D()
  p.moveTo(S(LT.x, sx), S(LT.y, sy))
  p.bezierCurveTo(S(OC1.x,sx),S(OC1.y,sy),S(OC2.x,sx),S(OC2.y,sy),S(RT.x,sx),S(RT.y,sy))
  p.bezierCurveTo(S(IC1.x,sx),S(IC1.y,sy),S(IC2.x,sx),S(IC2.y,sy),S(LT.x,sx),S(LT.y,sy))
  p.closePath()
  return p
}

function rrect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  const R=Math.min(r,w/2,h/2)
  ctx.beginPath()
  ctx.moveTo(x+R,y);ctx.lineTo(x+w-R,y);ctx.quadraticCurveTo(x+w,y,x+w,y+R)
  ctx.lineTo(x+w,y+h-R);ctx.quadraticCurveTo(x+w,y+h,x+w-R,y+h)
  ctx.lineTo(x+R,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-R)
  ctx.lineTo(x,y+R);ctx.quadraticCurveTo(x,y,x+R,y);ctx.closePath()
}

// ── Banana body ───────────────────────────────────────────────────────────────
function drawBananaBody(ctx:CanvasRenderingContext2D,sx:number,sy:number,path:Path2D){
  const ss=SS(sx,sy)
  ctx.save()
  ctx.shadowColor="rgba(0,0,0,0.32)";ctx.shadowBlur=S(26,ss)
  ctx.shadowOffsetX=S(6,sx);ctx.shadowOffsetY=S(12,sy)
  const base=ctx.createLinearGradient(S(LT.x,sx),0,S(RT.x,sx),0)
  base.addColorStop(0,"#506018");base.addColorStop(0.05,"#88A020")
  base.addColorStop(0.18,"#CEB000");base.addColorStop(0.50,"#FFD700")
  base.addColorStop(0.82,"#CEB000");base.addColorStop(0.95,"#96880E")
  base.addColorStop(1,"#506018")
  ctx.fillStyle=base;ctx.fill(path);ctx.restore()

  ctx.save();ctx.clip(path)
  const depth=ctx.createLinearGradient(0,S(44,sy),0,S(306,sy))
  depth.addColorStop(0,"rgba(0,0,0,0.27)")
  depth.addColorStop(0.10,"rgba(255,255,255,0.24)")
  depth.addColorStop(0.25,"rgba(0,0,0,0.04)")
  depth.addColorStop(0.58,"rgba(255,255,160,0.07)")
  depth.addColorStop(1,"rgba(0,0,0,0.20)")
  ctx.fillStyle=depth;ctx.fillRect(0,0,S(W,sx),S(H,sy))

  const radX=S(W/2,sx),radY=S(H/2,sy)
  const rad=ctx.createRadialGradient(radX,radY,0,radX,radY,S(210,ss))
  rad.addColorStop(0,"rgba(255,255,180,0.10)")
  rad.addColorStop(0.5,"rgba(0,0,0,0)")
  rad.addColorStop(1,"rgba(0,0,0,0.22)")
  ctx.fillStyle=rad;ctx.fillRect(0,0,S(W,sx),S(H,sy))

  ctx.beginPath()
  ctx.moveTo(S(LT.x+18,sx),S(LT.y-16,sy))
  ctx.bezierCurveTo(S(112,sx),S(72,sy),S(488,sx),S(78,sy),S(RT.x-18,sx),S(RT.y-14,sy))
  ctx.lineWidth=S(5,ss);ctx.strokeStyle="rgba(255,255,255,0.46)";ctx.lineCap="round";ctx.stroke()
  ctx.lineWidth=S(14,ss);ctx.strokeStyle="rgba(255,255,255,0.12)"
  ctx.beginPath()
  ctx.moveTo(S(LT.x+30,sx),S(LT.y-9,sy))
  ctx.bezierCurveTo(S(120,sx),S(96,sy),S(480,sx),S(101,sy),S(RT.x-30,sx),S(RT.y-8,sy))
  ctx.stroke()

  const spots=[
    {x:178,y:148,rx:9,ry:5.5,rot:-0.28,a:0.22},{x:300,y:128,rx:6.5,ry:4,rot:0.18,a:0.20},
    {x:384,y:142,rx:11,ry:6,rot:-0.14,a:0.24},{x:242,y:170,rx:5.5,ry:3.5,rot:0.40,a:0.18},
    {x:152,y:170,rx:6.5,ry:3.5,rot:-0.50,a:0.17},{x:428,y:158,rx:5,ry:3,rot:0.12,a:0.16},
    {x:342,y:162,rx:4,ry:2.5,rot:-0.22,a:0.14},
  ]
  for(const sp of spots){
    ctx.save();ctx.translate(S(sp.x,sx),S(sp.y,sy));ctx.rotate(sp.rot)
    ctx.beginPath();ctx.ellipse(0,0,S(sp.rx,sx),S(sp.ry,sy),0,0,Math.PI*2)
    ctx.fillStyle=`rgba(55,26,4,${sp.a})`;ctx.fill();ctx.restore()
  }
  ctx.restore()
  ctx.save()
  ctx.strokeStyle="rgba(75,46,4,0.28)";ctx.lineWidth=S(1.8,ss);ctx.stroke(path);ctx.restore()

  // Stem
  ctx.save();ctx.translate(S(RT.x,sx),S(RT.y,sy));ctx.rotate(-0.25)
  ctx.beginPath();ctx.moveTo(0,0)
  ctx.bezierCurveTo(S(10,sx),S(-20,sy),S(15,sx),S(-32,sy),S(8,sx),S(-44,sy))
  ctx.lineWidth=S(7,ss);ctx.strokeStyle="#3A2005";ctx.lineCap="round";ctx.stroke()
  ctx.beginPath();ctx.arc(S(8,sx),S(-44,sy),S(4,ss),0,Math.PI*2)
  ctx.fillStyle="#261505";ctx.fill();ctx.restore()
}

// ── Eyes ──────────────────────────────────────────────────────────────────────
function drawEye(ctx:CanvasRenderingContext2D,cx:number,cy:number,talking:boolean,ss:number){
  const rx=S(11,ss),ry=talking?S(11.5,ss):S(8.8,ss)
  ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2)
  ctx.fillStyle="#FAFAF2";ctx.fill()
  const ir=rx*0.62,ix=cx+S(0.8,ss),iy=cy+S(0.4,ss)
  ctx.beginPath();ctx.arc(ix,iy,ir,0,Math.PI*2);ctx.fillStyle="#211204";ctx.fill()
  const iG=ctx.createRadialGradient(ix-ir*0.28,iy-ir*0.28,0,ix,iy,ir)
  iG.addColorStop(0,"rgba(90,55,10,0.55)");iG.addColorStop(1,"rgba(0,0,0,0)")
  ctx.beginPath();ctx.arc(ix,iy,ir,0,Math.PI*2);ctx.fillStyle=iG;ctx.fill()
  ctx.beginPath();ctx.arc(ix,iy,ir*0.52,0,Math.PI*2);ctx.fillStyle="#070202";ctx.fill()
  ctx.beginPath();ctx.arc(cx+rx*0.32,cy-ry*0.28,ir*0.29,0,Math.PI*2)
  ctx.fillStyle="rgba(255,255,255,0.95)";ctx.fill()
  ctx.beginPath();ctx.arc(cx-rx*0.10,cy+ry*0.20,ir*0.14,0,Math.PI*2)
  ctx.fillStyle="rgba(255,255,255,0.55)";ctx.fill()
  ctx.beginPath();ctx.ellipse(cx,cy-ry*0.08,rx*0.88,ry*0.50,0,Math.PI,Math.PI*2)
  ctx.strokeStyle="rgba(0,0,0,0.15)";ctx.lineWidth=S(2.5,ss);ctx.stroke()
  ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2)
  ctx.strokeStyle="rgba(0,0,0,0.18)";ctx.lineWidth=S(1.2,ss);ctx.stroke()
}

function drawBrows(ctx:CanvasRenderingContext2D,sx:number,sy:number,talking:boolean){
  const ss=SS(sx,sy),lift=talking?S(-6,sy):0,hw=S(16,sx)
  const brow=(cx:number,cy:number,isLeft:boolean)=>{
    const lf=isLeft?lift*0.75:lift
    ctx.beginPath()
    ctx.moveTo(cx-hw,cy+lf*0.70)
    ctx.bezierCurveTo(cx-hw*0.3,cy-S(3.5,sy)+lf,cx+hw*0.3,cy-S(5,sy)+lf,cx+hw,cy-S(1,sy)+lf*0.70)
    ctx.strokeStyle="#392005";ctx.lineWidth=S(4,ss);ctx.lineCap="round";ctx.stroke()
  }
  brow(S(ELX,sx),S(ELY-16,sy),true)
  brow(S(ERX,sx),S(ERY-16,sy),false)
}

// ── Mouth — Rhubarb phoneme shapes ──────────────────────────────────────────
// X: silence/rest  A: "bad"  B: b/p/m  C: sh/ch  D: th  E: bed  F: f/v  G: k/g  H: l/n/t
function drawMouth(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  phoneme: Phoneme,
  sx: number, sy: number,
) {
  const ss  = SS(sx, sy)
  const mw  = S(72, sx)
  const lx  = cx - mw / 2
  const rx  = cx + mw / 2

  // Shared helpers
  const cavity = (openH: number) => {
    const p = new Path2D()
    p.moveTo(lx, cy)
    p.bezierCurveTo(cx - mw * 0.10, cy - openH * 0.62, cx + mw * 0.10, cy - openH * 0.62, rx, cy)
    p.bezierCurveTo(rx, cy + openH * 0.15, cx + mw * 0.05, cy + openH * 0.64, cx, cy + openH * 0.64)
    p.bezierCurveTo(cx - mw * 0.05, cy + openH * 0.64, lx, cy + openH * 0.15, lx, cy)
    p.closePath()
    return p
  }
  const fillCavity = (openH: number) => {
    ctx.save()
    ctx.clip(cavity(openH))
    const g = ctx.createLinearGradient(cx, cy - openH * 0.62, cx, cy + openH * 0.64)
    g.addColorStop(0, "#100200"); g.addColorStop(0.15, "#4A0C06")
    g.addColorStop(0.35, "#881C10"); g.addColorStop(0.55, "#AE2A18")
    g.addColorStop(1, "#881C12")
    ctx.fillStyle = g
    ctx.fillRect(lx - 4, cy - openH - 4, mw + 8, openH * 2 + 8)
  }
  const drawTeeth = (openH: number, upper = true, lower = false) => {
    const tN = 4, tZone = mw * 0.72, tW = tZone / tN, tX0 = cx - tZone / 2
    const tH = openH * 0.28
    const tG = (y0: number, y1: number) => {
      const g = ctx.createLinearGradient(0, y0, 0, y1)
      g.addColorStop(0, "#EDE6D3"); g.addColorStop(0.65, "#E2D9C0"); g.addColorStop(1, "#CEC4A0")
      return g
    }
    if (upper) {
      for (let i = 0; i < tN; i++) {
        const tx = tX0 + i * tW + tW * 0.07, ty = cy - openH * 0.50
        ctx.save(); rrect(ctx, tx, ty, tW * 0.86, tH, S(2.5, ss))
        ctx.fillStyle = tG(ty, ty + tH); ctx.fill()
        ctx.strokeStyle = "rgba(0,0,0,0.09)"; ctx.lineWidth = S(0.7, ss); ctx.stroke()
        ctx.restore()
      }
      ctx.beginPath(); ctx.ellipse(cx, cy - openH * 0.44 + tH * 0.88, mw * 0.34, S(4, sy), 0, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(185,84,76,0.56)"; ctx.fill()
    }
    if (lower) {
      for (let i = 0; i < tN; i++) {
        const tx = tX0 + i * tW + tW * 0.07, ty = cy + openH * 0.44 - tH
        ctx.save(); rrect(ctx, tx, ty, tW * 0.86, tH, S(2.5, ss))
        ctx.fillStyle = tG(ty + tH, ty); ctx.fill()
        ctx.strokeStyle = "rgba(0,0,0,0.09)"; ctx.lineWidth = S(0.7, ss); ctx.stroke()
        ctx.restore()
      }
      ctx.beginPath(); ctx.ellipse(cx, cy + openH * 0.44 - tH * 0.88, mw * 0.34, S(4, sy), 0, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(185,84,76,0.56)"; ctx.fill()
    }
  }
  const drawTongue = (openH: number) => {
    const tG = ctx.createRadialGradient(cx - mw * 0.05, cy + openH * 0.20, 0, cx, cy + openH * 0.26, mw * 0.30)
    tG.addColorStop(0, "#D88090"); tG.addColorStop(0.55, "#C05F6E"); tG.addColorStop(1, "#9A3C50")
    ctx.beginPath(); ctx.ellipse(cx, cy + openH * 0.28, mw * 0.30, openH * 0.21, 0, 0, Math.PI * 2)
    ctx.fillStyle = tG; ctx.fill()
    ctx.beginPath(); ctx.moveTo(cx, cy + openH * 0.09); ctx.lineTo(cx, cy + openH * 0.45)
    ctx.strokeStyle = "rgba(130,40,55,0.32)"; ctx.lineWidth = S(1.2, ss); ctx.stroke()
  }
  const upperLip = (openH: number) => {
    const lipU = S(10, sy)
    const p = new Path2D()
    p.moveTo(lx, cy)
    p.bezierCurveTo(cx - mw * 0.10, cy - openH * 0.62, cx + mw * 0.10, cy - openH * 0.62, rx, cy)
    p.bezierCurveTo(rx, cy - openH * 0.68 - lipU, cx + mw * 0.14, cy - openH * 0.72 - lipU * 1.1, cx, cy - openH * 0.72 - lipU * 1.1)
    p.bezierCurveTo(cx - mw * 0.14, cy - openH * 0.72 - lipU * 1.1, lx, cy - openH * 0.68 - lipU, lx, cy)
    p.closePath()
    ctx.save()
    const g = ctx.createLinearGradient(cx, cy - openH * 0.74 - lipU * 1.1, cx, cy)
    g.addColorStop(0, "#6A2C10"); g.addColorStop(0.55, "#9A4824"); g.addColorStop(1, "#C06840")
    ctx.fillStyle = g; ctx.fill(p); ctx.restore()
  }
  const lowerLip = (openH: number) => {
    const lipL = S(13, sy)
    const p = new Path2D()
    p.moveTo(lx, cy)
    p.bezierCurveTo(lx, cy + openH * 0.15, cx - mw * 0.05, cy + openH * 0.64, cx, cy + openH * 0.64)
    p.bezierCurveTo(cx + mw * 0.05, cy + openH * 0.64, rx, cy + openH * 0.15, rx, cy)
    p.bezierCurveTo(rx, cy + openH * 0.72 + lipL, cx + mw * 0.10, cy + openH * 0.76 + lipL, cx, cy + openH * 0.76 + lipL)
    p.bezierCurveTo(cx - mw * 0.10, cy + openH * 0.76 + lipL, lx, cy + openH * 0.72 + lipL, lx, cy)
    p.closePath()
    ctx.save()
    const g = ctx.createLinearGradient(cx, cy, cx, cy + openH * 0.78 + lipL)
    g.addColorStop(0, "#C06840"); g.addColorStop(0.5, "#8C3E1A"); g.addColorStop(1, "#6A2A0C")
    ctx.fillStyle = g; ctx.fill(p); ctx.restore()
  }
  const closedLips = () => {
    // Upper lip shape
    ctx.save()
    const ul = new Path2D()
    const lipU = S(10, sy), lipL = S(13, sy)
    ul.moveTo(lx, cy)
    ul.bezierCurveTo(lx + mw * 0.22, cy - lipU, cx, cy - lipU * 1.35, rx - mw * 0.22, cy - lipU)
    ul.bezierCurveTo(rx - mw * 0.1, cy - lipU * 0.65, rx, cy - lipU * 0.25, rx, cy)
    ul.bezierCurveTo(rx - mw * 0.22, cy + S(2.5, sy), cx, cy + S(3.5, sy), lx + mw * 0.22, cy + S(2.5, sy))
    ul.lineTo(lx, cy); ul.closePath()
    const ulG = ctx.createLinearGradient(cx, cy - lipU * 1.38, cx, cy + S(3.5, sy))
    ulG.addColorStop(0, "#7A3818"); ulG.addColorStop(0.55, "#9E5028"); ulG.addColorStop(1, "#C07040")
    ctx.fillStyle = ulG; ctx.fill(ul)
    ctx.beginPath(); ctx.ellipse(cx, cy - lipU * 0.88, mw * 0.20, lipU * 0.26, 0, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(230,158,108,0.28)"; ctx.fill()
    ctx.restore()
    // Lower lip
    ctx.save()
    const ll = new Path2D()
    ll.moveTo(lx, cy)
    ll.bezierCurveTo(lx + mw * 0.22, cy + S(2.5, sy), cx, cy + S(3.5, sy), rx - mw * 0.22, cy + S(2.5, sy))
    ll.lineTo(rx, cy)
    ll.bezierCurveTo(rx - mw * 0.10, cy + lipL * 0.5, rx - mw * 0.20, cy + lipL * 0.95, cx, cy + lipL * 0.98)
    ll.bezierCurveTo(lx + mw * 0.20, cy + lipL * 0.95, lx + mw * 0.10, cy + lipL * 0.5, lx, cy)
    ll.closePath()
    const llG = ctx.createLinearGradient(cx, cy, cx, cy + lipL)
    llG.addColorStop(0, "#B86038"); llG.addColorStop(0.5, "#8E4020"); llG.addColorStop(1, "#6E2E0E")
    ctx.fillStyle = llG; ctx.fill(ll)
    ctx.beginPath(); ctx.ellipse(cx, cy + lipL * 0.56, mw * 0.23, lipL * 0.23, 0, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(230,162,110,0.44)"; ctx.fill()
    ctx.restore()
    ctx.beginPath(); ctx.moveTo(lx, cy)
    ctx.bezierCurveTo(cx - mw * 0.28, cy + S(3, sy), cx + mw * 0.28, cy + S(3, sy), rx, cy)
    ctx.strokeStyle = "#4C1C06"; ctx.lineWidth = S(1.5, ss); ctx.lineCap = "round"; ctx.stroke()
  }

  // ── Phoneme dispatch ────────────────────────────────────────────────────────
  switch (phoneme) {

    // X — silence: closed lips
    case "X":
      closedLips()
      break

    // B — b/p/m: lips pressed (slight tension)
    case "B": {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(lx + S(4, sx), cy)
      ctx.bezierCurveTo(cx - mw * 0.25, cy - S(5, sy), cx + mw * 0.25, cy - S(5, sy), rx - S(4, sx), cy)
      ctx.bezierCurveTo(rx - S(4, sx) - mw * 0.1, cy + S(5, sy), lx + S(4, sx) + mw * 0.1, cy + S(5, sy), lx + S(4, sx), cy)
      ctx.closePath()
      const gB = ctx.createLinearGradient(cx, cy - S(5, sy), cx, cy + S(5, sy))
      gB.addColorStop(0, "#9A4824"); gB.addColorStop(1, "#7A3014")
      ctx.fillStyle = gB; ctx.fill()
      ctx.strokeStyle = "#4C1C06"; ctx.lineWidth = S(1.2, ss); ctx.stroke()
      ctx.restore()
      break
    }

    // E — bed: small-medium open (neutral vowel)
    case "E": {
      const h = S(16, sy)
      fillCavity(h); drawTeeth(h, true, false); ctx.restore()
      upperLip(h); lowerLip(h)
      break
    }

    // C — sh/ch: pursed round opening
    case "C": {
      const r = S(12, sx)
      ctx.save()
      ctx.beginPath(); ctx.ellipse(cx, cy + S(3, sy), r * 0.7, r, 0, 0, Math.PI * 2)
      const gC = ctx.createRadialGradient(cx, cy + S(3, sy), 0, cx, cy + S(3, sy), r)
      gC.addColorStop(0, "#4A0C06"); gC.addColorStop(1, "#100200")
      ctx.fillStyle = gC; ctx.fill()
      ctx.strokeStyle = "#9A4824"; ctx.lineWidth = S(5, ss); ctx.stroke()
      ctx.restore()
      break
    }

    // A — bad: wide open, teeth + tongue
    case "A": {
      const h = S(44, sy)
      fillCavity(h); drawTeeth(h, true, true); drawTongue(h); ctx.restore()
      upperLip(h); lowerLip(h)
      break
    }

    // D — the: tongue tip slightly visible
    case "D": {
      const h = S(22, sy)
      fillCavity(h); drawTeeth(h, true, false); ctx.restore()
      upperLip(h); lowerLip(h)
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(cx, cy + h * 0.15, mw * 0.22, S(8, sy), 0, 0, Math.PI * 2)
      ctx.fillStyle = "#C86070"; ctx.fill()
      ctx.restore()
      break
    }

    // F — f/v: upper teeth on lower lip
    case "F": {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(lx, cy)
      ctx.bezierCurveTo(cx - mw * 0.3, cy - S(6, sy), cx + mw * 0.3, cy - S(6, sy), rx, cy)
      ctx.bezierCurveTo(rx, cy + S(8, sy), cx, cy + S(10, sy), lx, cy)
      ctx.closePath()
      ctx.fillStyle = "#8C3E1A"; ctx.fill()
      const tN = 4, tZone = mw * 0.65, tW = tZone / tN, tX0 = cx - tZone / 2
      const tH = S(12, sy)
      for (let i = 0; i < tN; i++) {
        const tx = tX0 + i * tW + tW * 0.08, ty = cy - S(12, sy)
        ctx.save(); rrect(ctx, tx, ty, tW * 0.84, tH, S(2, ss))
        const g = ctx.createLinearGradient(0, ty, 0, ty + tH)
        g.addColorStop(0, "#EDE6D3"); g.addColorStop(1, "#CEC4A0")
        ctx.fillStyle = g; ctx.fill()
        ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = S(0.7, ss); ctx.stroke()
        ctx.restore()
      }
      ctx.restore()
      break
    }

    // G — k/g: back of mouth, wider flat opening
    case "G": {
      const h = S(28, sy)
      fillCavity(h * 0.8); drawTeeth(h * 0.8, true, false); ctx.restore()
      upperLip(h * 0.8); lowerLip(h * 0.8)
      break
    }

    // H — l/n/t: tongue raised, medium open
    case "H": {
      const h = S(20, sy)
      fillCavity(h); drawTeeth(h, true, false); ctx.restore()
      upperLip(h); lowerLip(h)
      ctx.save()
      const tG = ctx.createRadialGradient(cx, cy - h * 0.25, 0, cx, cy - h * 0.1, mw * 0.28)
      tG.addColorStop(0, "#D88090"); tG.addColorStop(1, "#C05F6E")
      ctx.beginPath(); ctx.ellipse(cx, cy - h * 0.20, mw * 0.28, S(9, sy), 0, 0, Math.PI * 2)
      ctx.fillStyle = tG; ctx.fill()
      ctx.restore()
      break
    }
  }
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function drawScene(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  phoneme: Phoneme,
  talking: boolean,
) {
  const sx = w / W, sy = h / H
  ctx.clearRect(0, 0, w, h)

  const path = makeBananaPath(sx, sy)
  drawBananaBody(ctx, sx, sy, path)
  drawBrows(ctx, sx, sy, talking)
  drawEye(ctx, S(ELX, sx), S(ELY, sy), talking, SS(sx, sy))
  drawEye(ctx, S(ERX, sx), S(ERY, sy), talking, SS(sx, sy))
  drawMouth(ctx, S(MX, sx), S(MY, sy), phoneme, sx, sy)
}

// ── Component ─────────────────────────────────────────────────────────────────
interface BananaCanvasProps {
  canvasRef:    React.RefObject<HTMLCanvasElement | null>
  phoneme:      Phoneme
  isTalking?:   boolean
  isRecording?: boolean
}

export default function BananaCanvas({ canvasRef, phoneme, isTalking, isRecording }: BananaCanvasProps) {
  const frameRef   = useRef(0)
  const phonemeRef = useRef<Phoneme>(phoneme)
  const talkRef    = useRef(!!isTalking)

  useEffect(() => { phonemeRef.current = phoneme }, [phoneme])
  useEffect(() => { talkRef.current = !!isTalking }, [isTalking])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    canvas.width = W; canvas.height = H
    const tick = () => {
      drawScene(ctx, W, H, phonemeRef.current, talkRef.current)
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef])

  return (
    <div className="relative w-full">
      <canvas ref={canvasRef} className="w-full block" style={{ aspectRatio: `${W}/${H}` }} />
      {isRecording && (
        <div className="absolute top-3 right-4 flex items-center gap-1.5 pointer-events-none select-none">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse block" />
          <span className="font-mono text-[9px] uppercase tracking-widest opacity-50">REC</span>
        </div>
      )}
    </div>
  )
}
