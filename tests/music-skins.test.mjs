import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const source=await readFile(new URL('../public/experiments/bit-instrument/music-pattern.js',import.meta.url),'utf8')
const {MusicPattern}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))

function phrase(skin){
  const p=new MusicPattern();p.setSkin(skin);const events=[];
  for(let t=0;t<2;t+=.05){if(Math.round(t*20)%4===0)p.hit('a',t);events.push(...p.drain(t));}
  return {p,events};
}
test('the same input produces four different musical phrases and lead timbres',()=>{
  const signatures=[];
  for(let skin=0;skin<4;skin++){
    const {events}=phrase(skin);assert.ok(events.some(e=>e.kind==='lead'));
    signatures.push(JSON.stringify(events.map(e=>[e.kind,e.midi,e.at,e.wave,e.fm])));
  }
  assert.equal(new Set(signatures).size,4);
  assert.equal(phrase(1).events.find(e=>e.kind==='lead').wave,'triangle');
  assert.equal(phrase(2).events.find(e=>e.kind==='lead').wave,'square');
  assert.ok(phrase(3).events.find(e=>e.kind==='lead').fm>0);
});
test('switching skins clears the old phrase and starts at the new interaction',()=>{
  const p=new MusicPattern();p.hit('a',0);p.drain(0);p.setSkin(2);
  assert.deepEqual(p.drain(10),[]);
  p.hit('b',10);const events=p.drain(10);
  assert.ok(events.length>0);assert.ok(events.every(e=>e.skin===2&&e.at>=10));
});
test('each skin stops after inactivity and keeps finite, bounded musical events',()=>{
  for(let skin=0;skin<4;skin++){
    const {p,events}=phrase(skin);
    assert.ok(events.every(e=>Number.isFinite(e.at)&&e.velocity>0&&e.velocity<=1));
    assert.ok(events.filter(e=>e.midi!==undefined).every(e=>e.midi>=24&&e.midi<=84));
    assert.deepEqual(p.drain(20),[]);
  }
});

test('the natural skin plays sustained chord pads without a drum machine',()=>{
  const {events}=phrase(1);
  assert.ok(!events.some(e=>['kick','snare','hat'].includes(e.kind)));
  const pads=events.filter(e=>e.kind==='pad');
  assert.ok(pads.length>=3);
  assert.ok(pads.every(e=>e.duration>=1.5&&e.attack>=.15));
  assert.ok(events.find(e=>e.kind==='lead').attack>phrase(2).events.find(e=>e.kind==='lead').attack);
});

test('1BIT has a rapid, short square-wave arpeggio rather than a soft sustained backing',()=>{
  const notes=phrase(2).events.filter(e=>e.kind==='arp');
  assert.ok(notes.length>=12);
  assert.ok(notes.every(e=>e.wave==='square'&&e.duration<=.12&&e.filterEnd>=3000));
});

test('wireframe uses distorted low bass and strongly inharmonic metal voices',()=>{
  const {events}=phrase(3);
  assert.ok(events.some(e=>e.kind==='bass'&&e.midi<36&&e.drive>1));
  assert.ok(events.some(e=>e.fm>1&&e.fmRatio>3));
});

test('points has syncopated kick placement distinct from the four-on-the-floor wire groove',()=>{
  const {p,events}=phrase(0);
  assert.ok(events.filter(e=>e.kind==='kick').some(e=>Math.round((e.at-p.origin)/p.step)%4!==0));
  assert.ok(events.filter(e=>e.kind==='lead').every(e=>e.duration<=.22));
});
