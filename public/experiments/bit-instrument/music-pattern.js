export class MusicPattern {
  constructor(){this.bpm=112;this.step=60/this.bpm/4;this.stop();}
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
    const events=[],chords=[[60,64,67,69,74],[57,60,64,67,71],[57,60,64,65,67],[55,57,60,62,67]],roots=[36,33,29,31];
    // Resume from the current clock instead of dumping missed beats after a slow frame.
    const earliest=Math.max(0,Math.ceil((now-.15-this.origin)/this.step));
    if(this.cursor<earliest){for(const tick of this.pending.keys())if(tick<earliest)this.pending.delete(tick);this.cursor=earliest;}
    while(this.origin+this.cursor*this.step<=Math.min(now+.09,this.until)){
      const tick=this.cursor++,at=this.origin+tick*this.step,chordIndex=Math.floor(tick/32)%4,chord=chords[chordIndex];
      if(this.pending.has(tick)){
        const hash=this.pending.get(tick);let midi=chord[(hash+Math.floor(tick/4))%chord.length]+(hash%3===0?12:0);if(midi>84)midi-=12;
        events.push({kind:'lead',midi,at,velocity:.65,duration:.30});this.pending.delete(tick);
      }
      if(tick%4===0)events.push({kind:'bass',midi:roots[chordIndex]+(tick%16===8?7:0),at,velocity:.48,duration:.38});
      if(tick%4===2)events.push({kind:'arp',midi:chord[Math.floor(tick/2)%5],at,velocity:.20,duration:.22});
      if(tick%8===0)events.push({kind:'kick',at,velocity:.65});
      if(tick%16===4||tick%16===12)events.push({kind:'snare',at,velocity:.25});
      if(tick%2===0)events.push({kind:'hat',at,velocity:tick%4===0?.13:.22});
    }
    return events;
  }
}
