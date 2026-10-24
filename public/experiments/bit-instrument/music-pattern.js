// Each visual skin has its own harmony, groove and synthesized instruments.
const PROFILES=[
 {bpm:112,chords:[[60,64,67,69,74],[57,60,64,67,71],[57,60,64,65,67],[55,57,60,62,67]],roots:[36,33,29,31],kick:8,bass:4,hat:2,arp:4,offset:2,waves:['square','triangle','sine'],cutoff:3800,duration:.30},
 {bpm:88,chords:[[60,64,67,71,74],[57,60,64,67,71],[53,57,60,64,67],[55,59,62,65,69]],roots:[36,33,29,31],kick:16,bass:8,hat:4,arp:4,offset:2,waves:['triangle','sine','sine'],cutoff:1900,duration:.65},
 {bpm:144,chords:[[60,63,67,70,75],[56,60,63,67,70],[53,56,60,63,67],[58,62,65,68,72]],roots:[36,32,29,34],kick:4,bass:4,hat:2,arp:2,offset:1,waves:['square','square','square'],cutoff:6200,duration:.13},
 {bpm:128,chords:[[62,65,69,72,76],[58,62,65,69,72],[60,64,67,70,74],[57,60,64,67,71]],roots:[38,34,36,33],kick:4,bass:8,hat:1,arp:4,offset:3,waves:['sine','sawtooth','sine'],cutoff:4800,duration:.18,fm:.65}
];
export class MusicPattern {
  constructor(){this.setSkin(0);}
  setSkin(skin){const index=((Math.trunc(skin)||0)%4+4)%4;if(this.skin===index)return;this.skin=index;this.profile=PROFILES[index];this.bpm=this.profile.bpm;this.step=60/this.bpm/4;this.stop();}
  stop(){this.origin=null;this.cursor=0;this.until=-Infinity;this.pending=new Map();}
  hit(key,now){
    if(this.origin===null||now>this.until){this.stop();this.origin=now+.015;}
    this.until=now+2.4;
    const tick=Math.max(this.cursor,Math.round((now-this.origin)/this.step));
    let hash=0;for(const ch of key)hash=(hash*31+ch.codePointAt(0))>>>0;
    this.pending.set(tick,hash);
  }
  drain(now){
    if(this.origin===null)return [];
    if(now>this.until+.15){this.stop();return [];}
    const events=[],profile=this.profile,{chords,roots}=profile;
    // Resume from the current clock instead of dumping missed beats after a slow frame.
    const earliest=Math.max(0,Math.ceil((now-.15-this.origin)/this.step));
    if(this.cursor<earliest){for(const tick of this.pending.keys())if(tick<earliest)this.pending.delete(tick);this.cursor=earliest;}
    while(this.origin+this.cursor*this.step<=Math.min(now+.09,this.until)){
      const tick=this.cursor++,at=this.origin+tick*this.step,chordIndex=Math.floor(tick/32)%4,chord=chords[chordIndex];
      if(this.pending.has(tick)){
        const hash=this.pending.get(tick);let midi=chord[(hash+Math.floor(tick/4))%chord.length]+(hash%3===0?12:0);if(midi>84)midi-=12;
        events.push({kind:'lead',midi,at,velocity:.65,duration:profile.duration});this.pending.delete(tick);
      }
      if(tick%profile.bass===0)events.push({kind:'bass',midi:roots[chordIndex]+(tick%16===8?7:0),at,velocity:.48,duration:.38});
      if(tick%profile.arp===profile.offset)events.push({kind:'arp',midi:chord[Math.floor(tick/2)%5],at,velocity:.20,duration:.22});
      if(tick%profile.kick===0)events.push({kind:'kick',at,velocity:.65});
      if(tick%16===4||tick%16===12)events.push({kind:'snare',at,velocity:.25});
      if(tick%profile.hat===0)events.push({kind:'hat',at,velocity:tick%4===0?.13:.22});
    }
    return events.map(event=>({...event,skin:this.skin,wave:profile.waves[event.kind==='lead'?0:event.kind==='bass'?1:2],cutoff:profile.cutoff,fm:['lead','arp'].includes(event.kind)?(profile.fm||0):0}));
  }
}
