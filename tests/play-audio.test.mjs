import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
const source=await readFile(new URL('../public/experiments/bit-instrument/synth.js',import.meta.url),'utf8')
const {MechanicalSynth}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))

// Web Audio is a browser API; model only the device boundary used to resume it.
function device(state) {
  const events=[];
  const context={state,sampleRate:48000,destination:{},
    resume(){events.push('resume');return Promise.resolve()},
    createBuffer(channels,length,rate){assert.equal(channels,1);assert.equal(length,1);assert.equal(rate,48000);return {}},
    createBufferSource(){return {connect(output){assert.equal(output,context.destination);events.push('connect')},start(){events.push('start')},disconnect(){}}}
  };
  const synth=new MechanicalSynth();synth.ctx=context;
  return {synth,events};
}

test('an interrupted iPhone AudioContext is resumed on the next interaction',()=>{
  const {synth,events}=device('interrupted');
  synth.unlock();
  assert.deepEqual(events,['resume']);
});

test('a suspended context resumes but a running context is left alone',()=>{
  for(const [state,want] of [['suspended',['resume']],['running',[]]]){
    const {synth,events}=device(state);synth.unlock();assert.deepEqual(events,want);
  }
});

test('music playback is requested before resuming to avoid iPhone ambient mute behavior',t=>{
  const {synth,events}=device('suspended');let type='auto';
  const session={get type(){return type},set type(value){type=value;events.push(value)}};
  const prior=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{value:{audioSession:session},configurable:true});
  t.after(()=>Object.defineProperty(globalThis,'navigator',prior));
  synth.unlock();
  assert.deepEqual(events,['playback','resume']);
});

test('an unsupported audio session does not prevent normal audio startup',t=>{
  const prior=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
  t.after(()=>Object.defineProperty(globalThis,'navigator',prior));
  const {synth,events}=device('suspended');synth.unlock();assert.deepEqual(events,['resume']);
});

test('a user gesture immediately starts a silent buffer on the output',()=>{
  const {synth,events}=device('suspended');
  synth.unlockFromGesture();
  assert.deepEqual(events,['resume','connect','start']);
});
