// Read Word 97–2003 text through its OLE compound streams and CLX piece table.
export function readWordBinary(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const invalid = () => new Error('This Word document is damaged or uses an unsupported format.');
  if (view.byteLength < 512 || view.getUint32(0) !== 0xd0cf11e0) throw invalid();
  const sectorSize = 2 ** view.getUint16(30, true);
  if (![512,4096].includes(sectorSize) || view.getUint16(32,true) !== 6) throw invalid();
  const sectors = Math.floor(bytes.length / sectorSize) - 1;
  const end = 0xfffffffe;
  function sector(id: number) {
    if (id >= sectors) throw invalid();
    return new DataView(buffer,(id+1)*sectorSize,sectorSize);
  }
  function words(v:DataView) {
    return Array.from({length:v.byteLength/4},(_,i)=>v.getUint32(i*4,true));
  }
  const fatIds = words(new DataView(buffer,76,436)).filter(id=>id<sectors);
  let next = view.getUint32(68,true);
  const seen = new Set<number>();
  while (next<sectors) {
    if(seen.has(next)) throw invalid();
    seen.add(next);
    const ids=words(sector(next));
    next=ids.pop()!;
    fatIds.push(...ids.filter(id=>id<sectors));
  }
  if(fatIds.length!==view.getUint32(44,true)) throw invalid();
  const fat=fatIds.flatMap(id=>words(sector(id)));
  function chain(start:number,table:number[],size:number,pool:Uint8Array,offset:number,limit:number) {
    const chunks:Uint8Array[]=[];
    const visited=new Set<number>();
    let total=0;
    for(let id=start;id!==end && total<limit;id=table[id]){
      const pos=offset+id*size;
      if(!Number.isInteger(id) || visited.has(id) || id>=table.length || pos+size>pool.length) throw invalid();
      visited.add(id);
      const part=pool.subarray(pos,pos+Math.min(size,limit-total));
      chunks.push(part);total+=part.length;
    }
    if(Number.isFinite(limit) && total!==limit) throw invalid();
    const out=new Uint8Array(total);
    let pos=0;
    for(const part of chunks){out.set(part,pos);pos+=part.length;}
    return out;
  }
  const read=(id:number,length=Infinity)=>chain(id,fat,sectorSize,bytes,sectorSize,length);
  const directory=read(view.getUint32(48,true));
  const entries=new Map<string,{id:number;size:number}>();
  const utf16=new TextDecoder('utf-16le');
  for(let i=0;i+128<=directory.length;i+=128){
    const entry=new DataView(directory.buffer,i,128);
    const len=entry.getUint16(64,true);
    if(len<2 || len>64 || ![2,5].includes(entry.getUint8(66)))continue;
    entries.set(utf16.decode(directory.subarray(i,i+len-2)),{id:entry.getUint32(116,true),size:entry.getUint32(120,true)});
  }
  const root=entries.get('Root Entry');
  if(!root) throw invalid();
  const miniPool=read(root.id,root.size);
  const miniFat=words(new DataView(read(view.getUint32(60,true),view.getUint32(64,true)*sectorSize).buffer));
  function stream(name:string){
    const entry=entries.get(name);
    if(!entry)throw invalid();
    const data=entry.size<view.getUint32(56,true)?chain(entry.id,miniFat,64,miniPool,0,entry.size):read(entry.id,entry.size);
    return new DataView(data.buffer);
  }
  const word=stream('WordDocument');
  const flags=word.getUint16(10,true);
  if(flags & 0x8100)throw new Error('Unlock this Word document before importing it.');
  const table=stream(flags & 0x0200?'1Table':'0Table');
  const start=word.getUint32(0x1a2,true);
  const limit=start+word.getUint32(0x1a6,true);
  if(limit>table.byteLength)throw invalid();
  let pos=start;
  while(pos<limit && table.getUint8(pos)===1)pos+=3+table.getUint16(pos+1,true);
  if(pos+5>limit || table.getUint8(pos)!==2) throw invalid();
  const length=table.getUint32(pos+1,true);
  const pieces=(length-4)/12;
  pos+=5;
  if(!Number.isInteger(pieces)||pieces<1||pos+length>limit)throw invalid();
  const result:string[]=[];
  const bodyLength=word.getUint32(0x4c,true);
  for(let i=0;i<pieces;i++){
    const from=table.getUint32(pos+i*4,true);
    if(from>=bodyLength)break;
    const count=Math.min(bodyLength,table.getUint32(pos+(i+1)*4,true))-from;
    const encoded=table.getUint32(pos+4*(pieces+1)+8*i+2,true);
    const compressed=Boolean(encoded & 0x40000000);
    const index=(encoded & 0x3fffffff)/(compressed?2:1);
    const size=count*(compressed?1:2);
    if(count<0 || index+size>word.byteLength)throw invalid();
    result.push(new TextDecoder(compressed?'windows-1252':'utf-16le').decode(new Uint8Array(word.buffer,index,size)));
  }
  return result.join('').replace(/[\r\x07\x0b\x0c]/g,'\n').replace(/[\x00-\x08\x0e-\x1f]/g,'');
}
