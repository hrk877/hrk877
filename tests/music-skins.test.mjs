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
