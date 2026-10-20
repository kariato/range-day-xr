import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Pathfinding} from 'three-pathfinding';
export class World {
 root=new T.Group();physics!:RAPIER.World;path=new Pathfinding();hasNav=false; colliders:T.Mesh[]=[];spawns:T.Vector3[]=[];cache=new Map<string,T.Group>();
 loader=new GLTFLoader();
 async init(renderer:T.WebGLRenderer){await RAPIER.init();this.loader.setDRACOLoader(new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/'));this.loader.setKTX2Loader(new KTX2Loader().setTranscoderPath('https://unpkg.com/three@0.180.0/examples/jsm/libs/basis/').detectSupport(renderer));}
 async load(id:string){
  this.physics?.free();this.physics=new RAPIER.World({x:0,y:-9.81,z:0});this.root.clear();this.colliders=[];this.spawns=[];this.hasNav=false;
  let model=this.cache.get(id);if(!model){const gltf=await this.loader.loadAsync(`${import.meta.env.BASE_URL}models/${id}.glb`);model=gltf.scene;this.cache.set(id,model);}
  const src=model.clone(true);src.updateMatrixWorld(true);const groups=new Map<T.Material,{geos:T.BufferGeometry[];mat:T.Material}>();
  src.traverse(o=>{
   if(o.name.startsWith('SPAWN_dummy'))this.spawns.push(o.getWorldPosition(new T.Vector3()));
   if(o.name.startsWith('NAV_')&&o instanceof T.Mesh){const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);this.path.setZoneData('warehouse',Pathfinding.createZone(geo));this.hasNav=true;return;}
   if(o.name.startsWith('COL_')&&o instanceof T.Mesh){const bounds=new T.Box3().setFromObject(o),size=bounds.getSize(new T.Vector3()),p=bounds.getCenter(new T.Vector3());this.physics.createCollider(RAPIER.ColliderDesc.cuboid(size.x/2,size.y/2,size.z/2).setTranslation(p.x,p.y,p.z));const collider=o.clone();collider.visible=false;collider.position.copy(p);collider.rotation.set(0,0,0);this.colliders.push(collider);return;}
   if(o instanceof T.Mesh){const mat=o.material as T.Material;const entry=groups.get(mat)||{geos:[],mat};entry.geos.push(o.geometry.clone().applyMatrix4(o.matrixWorld));groups.set(mat,entry);}
  });
  for(const {geos,mat} of groups.values()){const geo=mergeGeometries(geos);if(geo){const mesh=new T.Mesh(geo,mat);this.root.add(mesh);}geos.forEach(g=>g.dispose());}
 }
 blocked(x:number,z:number){for(const m of this.colliders){const box=new T.Box3().setFromObject(m);if(box.max.y<.35||box.min.y>1.7)continue;if(x>box.min.x-.27&&x<box.max.x+.27&&z>box.min.z-.27&&z<box.max.z+.27)return true;}return false;}
 move(pos:T.Vector3,dx:number,dz:number){if(!this.blocked(pos.x+dx,pos.z))pos.x+=dx;if(!this.blocked(pos.x,pos.z+dz))pos.z+=dz;}
 findPath(start:T.Vector3,end:T.Vector3){if(!this.hasNav)return [end.clone()];const a=start.clone().setY(0),b=end.clone().setY(0);const group=this.path.getGroup('warehouse',a);if(group==null)return [];return this.path.findPath(a,b,'warehouse',group)||[];}
 occluded(origin:T.Vector3,direction:T.Vector3,distance:number){return !!this.physics.castRay(new RAPIER.Ray(origin,direction),distance,true);}
}
export function box(w:number,h:number,d:number,color:number){return new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.65}));}
export function textBoard(text:string,w=3,h=.6,color='#d8ed8b'){
 const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#17221b';ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#516444';ctx.lineWidth=6;ctx.strokeRect(3,3,1018,250);ctx.fillStyle=color;ctx.font='bold 75px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,128,980);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));
}
export function paperTexture(type:string,noShoot=false){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d')!;ctx.fillStyle=noShoot?'#e8e9df':type==='popup'?'#447ba0':'#e4dfc6';ctx.fillRect(0,0,512,512);ctx.strokeStyle=type==='popup'?'#b7d6e8':'#394139';ctx.lineWidth=2;for(let i=10;i>=1;i--){ctx.beginPath();ctx.arc(256,256,i*23,0,Math.PI*2);ctx.stroke();if(i>5){ctx.fillStyle='#455044';ctx.font='12px sans-serif';ctx.fillText(String(11-i),259,256-i*23+13);}}ctx.fillStyle=noShoot?'#999f95':type==='popup'?'#b6d0d7':'#293b2f';ctx.beginPath();ctx.arc(256,256,45,0,Math.PI*2);ctx.fill();if(noShoot){ctx.strokeStyle='#b55b42';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(70,70);ctx.lineTo(442,442);ctx.moveTo(442,70);ctx.lineTo(70,442);ctx.stroke();}const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return texture;}
