// One destination per source point. Spatial ordering keeps neighbouring bits
// travelling together instead of shuffling every point across the entire word.
export function pairPointSets(source,target){
  if(source.length!==target.length||source.length%3!==0)throw new Error('Point sets must have equal counts');
  const count=source.length/3;
  function order(points){
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(let i=0;i<count;i++){minX=Math.min(minX,points[i*3]);maxX=Math.max(maxX,points[i*3]);minY=Math.min(minY,points[i*3+1]);maxY=Math.max(maxY,points[i*3+1]);}
    const spread=x=>{x=(x|(x<<8))&0x00ff00ff;x=(x|(x<<4))&0x0f0f0f0f;x=(x|(x<<2))&0x33333333;return (x|(x<<1))&0x55555555;};
    const codes=new Uint32Array(count),indices=Array.from({length:count},(_,i)=>i);
    for(let i=0;i<count;i++){const x=Math.round((points[i*3]-minX)/Math.max(.00001,maxX-minX)*1023),y=Math.round((points[i*3+1]-minY)/Math.max(.00001,maxY-minY)*1023);codes[i]=spread(x)|(spread(y)<<1);}
    return indices.sort((a,b)=>codes[a]-codes[b]||a-b);
  }
  const a=order(source),b=order(target),pairs=new Uint32Array(count);
  for(let i=0;i<count;i++)pairs[a[i]]=b[i];
  return pairs;
}
