// The visual skins use different arrangements, not just different synth presets.
const PROFILES=[
 {bpm:112,chords:[[60,64,67,69,74],[57,60,64,67,71],[57,60,64,65,67],[55,57,60,62,67]],roots:[36,33,29,31],kick:[0,7,10],snare:[4,12],hat:[0,2,3,6,8,10,11,14],bass:[0,6,10],arp:[2,5,9,14],waves:['sine','triangle','sine'],cutoff:4200,filterEnd:1100,attack:.002,duration:.16,fm:.8,fmRatio:2},
 {bpm:58,chords:[[60,64,67,71,74],[57,60,64,67,71],[53,57,60,64,67],[55,59,62,66,69]],roots:[36,33,29,31],kick:[],snare:[],hat:[],bass:[0],arp:[6,14],waves:['triangle','sine','sine'],cutoff:1400,filterEnd:550,attack:.08,duration:1.05,ambient:true},
 {bpm:160,chords:[[72,76,79,81,84],[69,72,76,79,83],[65,69,72,76,79],[67,71,74,77,81]],roots:[36,33,29,31],kick:[0,8],snare:[4,12],hat:[0,2,4,6,8,10,12,14],bass:[0,4,8,12],arp:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],waves:['square','triangle','square'],cutoff:11000,filterEnd:6500,attack:.001,duration:.095,chiptune:true},
 {bpm:136,chords:[[50,51,57,60,63],[50,53,57,60,65],[53,56,60,63,65],[48,51,55,58,62]],roots:[26,26,29,24],kick:[0,4,8,12],snare:[4,12],hat:[2,6,10,14],bass:[0,3,6,8,11,14],arp:[3,7,10,15],waves:['sine','sawtooth','sine'],cutoff:5200,filterEnd:350,attack:.0015,duration:.11,fm:3.2,fmRatio:3.91,industrial:true}
];
export class MusicPattern {
  constructor(){this.setSkin(0);}
  setSkin(skin){const index=((Math.trunc(skin)||0)%4+4)%4;if(this.skin===index)return;this.skin=index;this.profile=PROFILES[index];this.bpm=this.profile.bpm;this.step=60/this.bpm/4;this.stop();}
  stop(){this.origin=null;this.cursor=0;this.until=-Infinity;this.pending=new Map();}
  hit(key,now){
    if(this.origin===null||now>this.until){this.stop();this.origin=now+.015;}
    this.until=now+(this.profile.ambient?4.2:2.4);
    const tick=Math.max(this.cursor,Math.round((now-this.origin)/this.step));
    let hash=0;for(const ch of key)hash=(hash*31+ch.codePointAt(0))>>>0;
    this.pending.set(tick,hash);
  }
  drain(now){
    if(this.origin===null)return [];
    if(now>this.until+.15){this.stop();return [];}
    const events=[],p=this.profile;
    const earliest=Math.max(0,Math.ceil((now-.15-this.origin)/this.step));
    if(this.cursor<earliest){for(const tick of this.pending.keys())if(tick<earliest)this.pending.delete(tick);this.cursor=earliest;}
    while(this.origin+this.cursor*this.step<=Math.min(now+.09,this.until)){
      const tick=this.cursor++,at=this.origin+tick*this.step,beat=tick%16;
      const chordIndex=Math.floor(tick/32)%4,chord=p.chords[chordIndex];
      if(this.pending.has(tick)){
        const hash=this.pending.get(tick);let midi=chord[(hash+Math.floor(tick/4))%chord.length]+(hash%3===0&&!p.industrial?12:0);if(midi>84)midi-=12;
        events.push({kind:'lead',midi,at,velocity:p.industrial?.53:.65,duration:p.duration});this.pending.delete(tick);
      }
      if(p.bass.includes(beat))events.push({kind:'bass',midi:p.roots[chordIndex]+(!p.industrial&&beat===8?7:0),at,velocity:p.ambient?.40:.52,duration:p.ambient?1.4:p.chiptune?.11:p.industrial?.16:.22});
      if(p.arp.includes(beat)){
        const motif=p.chiptune?[0,2,1,3,2,4,3,1]:[0,2,4,1,3];
        events.push({kind:'arp',midi:chord[motif[tick%motif.length]],at,velocity:p.ambient?.28:p.chiptune?.26:.20,duration:p.ambient?1.15:p.chiptune?.075:.12});
      }
      if(p.ambient&&beat===0){for(let i=0;i<3;i++)events.push({kind:'pad',midi:chord[i===2?3:i],at:at+i*.035,velocity:.38,duration:2.2,attack:.24});}
      for(const kind of ['kick','snare','hat'])if(p[kind].includes(beat))events.push({kind,at,velocity:kind==='kick'?(p.industrial?.85:.62):kind==='snare'?.29:(beat%4===0?.13:.20)});
      if(p.industrial&&[5,13,15].includes(beat))events.push({kind:'metal',midi:82,at,velocity:.18,duration:.065});
    }
    return events.map(event=>{
      const tonal=['lead','arp','metal'].includes(event.kind),bass=event.kind==='bass',pad=event.kind==='pad';
      return {...event,skin:this.skin,wave:pad?'sine':p.waves[event.kind==='lead'?0:bass?1:2],cutoff:bass?(p.industrial?2400:650):p.cutoff,filterEnd:bass?(p.industrial?170:350):p.filterEnd,attack:event.attack??(p.ambient?(bass?.08:p.attack):p.attack),fm:tonal?(p.fm||0):0,fmRatio:p.fmRatio||2,drive:p.industrial?(bass?3.6:event.kind==='kick'?1.7:1.25):0,resonance:p.industrial&&bass?7:pad?.3:1.1,noiseCutoff:event.kind==='hat'?(p.chiptune?9000:7000):(p.industrial?850:1800)};
    });
  }
}
