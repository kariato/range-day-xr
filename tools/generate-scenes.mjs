import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {writeFile,mkdir} from 'node:fs/promises';
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}readAsDataURL(b){b.arrayBuffer().then(x=>{this.result=`data:${b.type};base64,${Buffer.from(x).toString('base64')}`;this.onloadend?.();});}};
const exporter=new GLTFExporter();await mkdir('public/models',{recursive:true});
function material(color){return new T.MeshStandardMaterial({color,roughness:.85});}
const mats={concrete:material('#72796d'),floor:material('#555d51'),dark:material('#202b25'),wood:material('#9b8054'),metal:material('#3c4c42'),sand:material('#a18e63'),orange:material('#d97838'),lime:material('#c4db68')};
function box(s,name,x,y,z,w,h,d,mat='concrete',collide=true){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mats[mat]);m.position.set(x,y,z);m.name=name;s.add(m);if(collide){const c=m.clone();c.name='COL_'+name;c.material=mats.dark;s.add(c);}return m;}
function marker(s,name,x,y,z,data={}){const g=new T.Object3D();g.name=name;g.position.set(x,y,z);g.userData=data;s.add(g);return g;}
function frame(s,z,w=24){box(s,'beam',0,5,z,w,.22,.3,'metal',false);for(const x of [-w/2,w/2])box(s,'column',x,2.5,z,.3,5,.3,'metal');}
for(const id of ['hub','standard','runthrough','warehouse']){
 const s=new T.Scene();s.name=id;marker(s,'SPAWN_player',0,0,id==='standard'?3:5);
 if(id==='standard'||id==='hub'){
 box(s,'floor',0,-.2,-21,32,.4,62,'floor');box(s,'backstop',0,3,-51,32,6,.8,'dark');box(s,'left_wall',-16,3,-21,.5,6,62);box(s,'right_wall',16,3,-21,.5,6,62);box(s,'ceiling',0,6,-21,32,.25,62,'dark',false);
 for(let lane=-4;lane<=5;lane++){const x=lane*3;box(s,'booth',x-1.45,1.4,2,.13,2.8,4,'metal');box(s,'bench',x,.88,.2,2.5,.13,.9,'wood');box(s,'rail',x,4,-24,.05,.08,53,'metal',false);box(s,'lane_stripe',x-1.45,.012,-25,.035,.015,51,'lime',false);marker(s,'TGT_paper_'+lane,x,1.8,-15);}
 for(let z=0;z>-51;z-=8){frame(s,z,32);for(let x=-12;x<=12;x+=6)box(s,'light_fixture',x,5.8,z,3,.04,.22,'lime',false);}
 }else if(id==='runthrough'){
 box(s,'ground',0,-.15,-37,90,.3,120,'sand');for(let z=0;z>-85;z-=5){box(s,'lane_mark_l',-6,.01,z,.06,.02,2,'lime',false);box(s,'lane_mark_r',6,.01,z,.06,.02,2,'lime',false);}
 for(let i=0;i<5;i++){const z=-10-i*14;for(let x of [-6,6]){box(s,'barricade',x,1,z,1.5,2,4,'wood');box(s,'barrel',x*.65,.5,z-3,.65,1,.65,'metal');}box(s,'station',0,.02,z+3,9,.025,.12,'lime',false);marker(s,'TRIG_station_'+i,0,1,z+3,{station:i,size:[12,3,2]});}
 for(let x of [-10,10])for(let z=0;z>-90;z-=10){box(s,'fence_post',x,1.1,z,.15,2.2,.15,'wood');box(s,'fence_rail',x,1.4,z-5,.1,.1,10,'wood',false);}
 box(s,'finish_gate',0,3,-79,12,.3,.3,'lime',false);for(let x of [-6,6])box(s,'finish_post',x,1.5,-79,.25,3,.25,'metal');
 }else{
 box(s,'floor',0,-.2,-10,40,.4,30,'floor');for(const x of [-20,20])box(s,'wall',x,3,-10,.5,6,30);for(const z of [-25,5.5])box(s,'wall',0,3,z,40,6,.5);box(s,'ceiling',0,6,-10,40,.2,30,'dark',false);
 for(let z=2;z>-25;z-=7){frame(s,z,40);for(let x=-15;x<=15;x+=10)box(s,'strip_light',x,5.7,z,3,.05,.2,'lime',false);}
 const obstacles=[];for(let x of [-12,-5,5,12])for(let z of [-5,-15]){box(s,'rack',x,1.4,z,2,2.8,5,'metal');box(s,'crate',x,2.9,z,1.8,.3,4.5,'wood',false);obstacles.push([x,z,2,5]);}
 for(let x of [-17,0,17]){box(s,'dock',x,1.7,-24.6,4,3.4,.15,'dark',false);marker(s,'SPAWN_dummy_'+x,x,0,-22);}
 marker(s,'SPAWN_dummy_left',-17,0,1);marker(s,'SPAWN_dummy_right',17,0,1);
 // Connected triangulated navigation grid; cells occupied by racks are excluded.
 const verts=[],indices=[];for(let z=-24;z<=4;z++)for(let x=-19;x<19;x++){if(obstacles.some(([ox,oz,w,d])=>Math.abs(x+.5-ox)<w/2+.7&&Math.abs(z+.5-oz)<d/2+.7))continue;const n=verts.length/3;verts.push(x,0,z,x+1,0,z,x+1,0,z+1,x,0,z+1);indices.push(n,n+2,n+1,n,n+3,n+2);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(indices);const nav=new T.Mesh(geo,mats.floor);nav.name='NAV_warehouse';s.add(nav);
 }
 const glb=await exporter.parseAsync(s,{binary:true});await writeFile(`public/models/${id}.glb`,Buffer.from(glb));console.log(id,Math.round(glb.byteLength/1024)+' KB');
}
