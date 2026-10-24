// Local synthesis only. No microphone, files, permissions or external audio.
export class MechanicalSynth {
  constructor(){this.ctx=null;this.muted=false;this.volume=.22;this.voices=0;this.lastFrequency=0;this.peak=0;}
  unlock(){
    // Web Audio defaults to ambient on iPhone, which obeys the silent switch.
    try{const session=globalThis.navigator?.audioSession;if(session&&session.type!=='playback')session.type='playback';}catch{}
    if(!this.ctx){
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw new Error('Web Audio is unavailable');
      this.ctx=new Context({latencyHint:'interactive'});const a=this.ctx;
      this.bus=a.createGain();this.bus.gain.value=.65;
      this.compressor=a.createDynamicsCompressor();this.compressor.threshold.value=-18;this.compressor.knee.value=12;this.compressor.ratio.value=8;this.compressor.attack.value=.002;this.compressor.release.value=.12;
      this.master=a.createGain();this.master.gain.value=this.volume;
      this.analyser=a.createAnalyser();this.analyser.fftSize=256;this.samples=new Uint8Array(256);
      this.capture=a.createMediaStreamDestination();
      this.bus.connect(this.compressor);this.compressor.connect(this.master);this.master.connect(this.analyser);this.analyser.connect(a.destination);this.analyser.connect(this.capture);
      this.delay=a.createDelay(.3);this.delay.delayTime.value=.105;this.feedback=a.createGain();this.feedback.gain.value=.16;this.wet=a.createGain();this.wet.gain.value=.19;
      this.bus.connect(this.delay);this.delay.connect(this.feedback);this.feedback.connect(this.delay);this.delay.connect(this.wet);this.wet.connect(this.compressor);
      this.noise=a.createBuffer(1,Math.floor(a.sampleRate*.05),a.sampleRate);const data=this.noise.getChannelData(0);let s=877;for(let i=0;i<data.length;i++){s=(s*1664525+1013904223)>>>0;data[i]=(s/4294967296*2-1)*(1-i/data.length);}
    }
    if(this.ctx.state==='suspended'||this.ctx.state==='interrupted')this.ctx.resume().catch(()=>{});
    return this.ctx;
  }
  unlockFromGesture(){
    const a=this.unlock(),source=a.createBufferSource();
    source.buffer=a.createBuffer(1,1,a.sampleRate);source.connect(a.destination);
    source.onended=()=>source.disconnect();source.start();
    return a;
  }
  setVolume(v){this.volume=v;if(this.master)this.master.gain.setTargetAtTime(this.muted?0:v,this.ctx.currentTime,.015);}
  mute(){this.muted=!this.muted;this.setVolume(this.volume);return this.muted;}
  play(index,accent=false){
    const a=this.unlock();if(this.voices>=28)return;
    const scale=[0,2,4,7,9],midi=45+scale[index%5]+12*Math.floor(index/5),freq=440*2**((midi-69)/12),t=a.currentTime+.005;
    this.lastFrequency=freq;this.voices++;
    const env=a.createGain(),filter=a.createBiquadFilter(),pan=a.createStereoPanner();
    pan.pan.value=(index%13/12-.5)*1.4;filter.type='lowpass';filter.Q.value=2.2;filter.frequency.setValueAtTime(Math.min(10000,freq*8),t);filter.frequency.exponentialRampToValueAtTime(Math.max(250,freq*1.6),t+.18);
    env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(accent?.3:.21,t+.003);env.gain.exponentialRampToValueAtTime(.0001,t+.21);
    const osc=a.createOscillator(),fm=a.createOscillator(),fmGain=a.createGain();
    osc.type=index%3===0?'square':'sawtooth';osc.frequency.setValueAtTime(freq*(accent?3:1.5),t);osc.frequency.exponentialRampToValueAtTime(freq,t+.035);
    fm.type='square';fm.frequency.value=freq*2.01;fmGain.gain.setValueAtTime(freq*.55,t);fmGain.gain.exponentialRampToValueAtTime(.1,t+.09);fm.connect(fmGain);fmGain.connect(osc.frequency);
    osc.connect(filter);filter.connect(env);env.connect(pan);pan.connect(this.bus);osc.start(t);fm.start(t);osc.stop(t+.23);fm.stop(t+.23);
    const click=a.createBufferSource(),clickGain=a.createGain(),high=a.createBiquadFilter();click.buffer=this.noise;high.type='highpass';high.frequency.value=2800;clickGain.gain.setValueAtTime(accent?.11:.045,t);clickGain.gain.exponentialRampToValueAtTime(.0001,t+.025);click.connect(high);high.connect(clickGain);clickGain.connect(pan);click.start(t);click.stop(t+.04);
    osc.onended=()=>{this.voices--;osc.disconnect();fm.disconnect();fmGain.disconnect();filter.disconnect();env.disconnect();pan.disconnect();click.disconnect();high.disconnect();clickGain.disconnect()};
  }
  music(event){
    const a=this.unlock();if(this.voices>=40)return;
    const t=Math.max(a.currentTime+.002,event.at),drum=['kick','snare','hat'].includes(event.kind);
    const duration=drum?(event.kind==='kick'?.19:event.kind==='snare'?.12:.045):event.duration;
    const env=a.createGain(),filter=a.createBiquadFilter();let source,mod,modGain;
    this.voices++;
    if(event.kind==='snare'||event.kind==='hat'){
      source=a.createBufferSource();source.buffer=this.noise;source.loop=true;
      filter.type='highpass';filter.frequency.value=event.kind==='hat'?7000:1400;
    }else{
      source=a.createOscillator();const freq=event.kind==='kick'?135:440*2**((event.midi-69)/12);
      source.type=event.kind==='kick'?'sine':event.wave||(event.kind==='arp'?'sine':event.kind==='bass'?'triangle':'square');
      source.frequency.setValueAtTime(freq,t);
      if(event.fm){mod=a.createOscillator();modGain=a.createGain();mod.frequency.value=freq*2.73;modGain.gain.setValueAtTime(freq*event.fm,t);modGain.gain.exponentialRampToValueAtTime(.1,t+duration);mod.connect(modGain);modGain.connect(source.frequency);mod.start(t);mod.stop(t+duration+.02);}
      if(event.kind==='kick')source.frequency.exponentialRampToValueAtTime(42,t+.13);
      filter.type='lowpass';filter.Q.value=event.kind==='lead'?1.3:.5;
      filter.frequency.setValueAtTime(event.kind==='bass'?650:event.kind==='kick'?500:(event.cutoff||3800),t);
      filter.frequency.exponentialRampToValueAtTime(event.kind==='lead'?700:400,t+duration);
      this.lastFrequency=freq;
    }
    const gain=(event.kind==='kick'?.55:event.kind==='hat'?.24:event.kind==='snare'?.40:.24)*event.velocity;
    env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(gain,t+.004);env.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(filter);filter.connect(env);env.connect(this.bus);source.start(t);source.stop(t+duration+.02);
    source.onended=()=>{this.voices--;source.disconnect();filter.disconnect();env.disconnect();mod?.disconnect();modGain?.disconnect();};
  }
  waveform(){if(!this.analyser)return null;this.analyser.getByteTimeDomainData(this.samples);let sum=0;for(const x of this.samples)sum+=((x-128)/128)**2;this.peak=Math.sqrt(sum/this.samples.length);return this.samples;}
  react(name,strength=1){
    if(['spikes','tremor','fury'].includes(name)){this.scream(strength,name);return;}
    const a=this.unlock(),at=a.currentTime+.008;
    const notes=name==='happy'?[72,76,79,84]:name==='surprise'?[84,72]:[60,67];
    notes.forEach((midi,i)=>this.music({kind:'arp',midi,at:at+i*(name==='calm'?.19:.085),velocity:name==='calm'?.22:.7,duration:name==='calm'?1.2:.28}));
  }
  scream(strength=1,kind='impact'){
    const a=this.unlock();if(this.voices>=24)return;
    const low=kind==='peel'||kind==='fury',stutter=kind==='tremor';
    const t=a.currentTime+.005,duration=low?1.12:stutter?.95:.72;
    this.voices++;this.lastFrequency=kind==='peel'?240:510;
    const source=a.createOscillator(),mod=a.createOscillator(),fm=a.createGain(),env=a.createGain(),drive=a.createWaveShaper();
    source.type=stutter?'square':'sawtooth';source.frequency.setValueAtTime(low?95:stutter?410:260,t);source.frequency.exponentialRampToValueAtTime(low?540:stutter?980:1380,t+.11);source.frequency.exponentialRampToValueAtTime(low?70:170,t+duration);
    mod.type='square';mod.frequency.setValueAtTime(low?29:stutter?123:73,t);mod.frequency.exponentialRampToValueAtTime(19,t+duration);fm.gain.value=150+strength*230;mod.connect(fm);fm.connect(source.frequency);
    const curve=new Float32Array(256);for(let i=0;i<256;i++){const x=i/127.5-1;curve[i]=Math.tanh(x*4);}drive.curve=curve;drive.oversample='2x';source.connect(drive);
    const bands=[720,1650,2900].map((freq,i)=>{const f=a.createBiquadFilter();f.type='bandpass';f.Q.value=4+i;f.frequency.setValueAtTime(freq,t);f.frequency.exponentialRampToValueAtTime(freq*.6,t+duration);drive.connect(f);f.connect(env);return f;});
    env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(.13+Math.min(1,strength)*.10,t+.012);env.gain.setValueAtTime(.17,t+duration*.38);env.gain.exponentialRampToValueAtTime(.0001,t+duration);env.connect(this.bus);
    if(stutter){for(let i=1;i<7;i++){env.gain.setValueAtTime(.01,t+i*.115);env.gain.linearRampToValueAtTime(.19,t+i*.115+.035);}}
    source.start(t);mod.start(t);source.stop(t+duration+.03);mod.stop(t+duration+.03);
    source.onended=()=>{this.voices--;source.disconnect();mod.disconnect();fm.disconnect();drive.disconnect();env.disconnect();bands.forEach(f=>f.disconnect());};
  }
}
