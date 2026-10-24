export class LogoMorphState {
  constructor(){this.from=0;this.target=0;this.started=0;this.duration=1.4;}
  value(now){const t=Math.max(0,Math.min(1,(now-this.started)/this.duration)),s=t*t*(3-2*t);return this.from+(this.target-this.from)*s;}
  toggle(now){this.from=this.value(now);this.target=1-this.target;this.started=now;return this.target;}
  reset(){this.from=0;this.target=0;this.started=0;}
  active(now){return this.target===1||this.value(now)>.00001;}
}
