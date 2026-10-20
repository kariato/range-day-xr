"""Blender exterior game-prop authoring. No functional internals or fabrication drawings.
Run: blender --background --factory-startup --python tools/model_weapons.py -- <project-root>
Editable .blend sources are saved before export meshes are merged by part/material.
Game coordinates are +Y up, muzzle -Z; Blender maps (x,y,z) to (x,-z,y).
"""
import bpy, math, sys, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(sys.argv[sys.argv.index('--')+1]).resolve()
SOURCE=ROOT/'assets/weapons'; OUTPUT=ROOT/'public/models/weapons'
SOURCE.mkdir(parents=True,exist_ok=True); OUTPUT.mkdir(parents=True,exist_ok=True)
ASSETS=[]; PART=None; M={}
def g(p): return (p[0],-p[2],p[1])
def mat(name,color,metal=0,rough=.5):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 return m
def empty(name,parent=None,pos=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=g(pos);ASSETS.append(o);return o
def setup(identifier,title):
 global ASSETS,PART,M
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);ASSETS=[]
 M={'steel':mat('Parkerized steel',(.105,.12,.14),.8,.32),'slide':mat('Black nitrided steel',(.055,.065,.08),.7,.29),'poly':mat('Matte black polymer',(.025,.032,.042),.05,.72),'edge':mat('Machined edge',(.22,.245,.28),.85,.3),'rubber':mat('Rubber grip',(.013,.017,.023),0,.92),'dark':mat('Recess',(.004,.007,.012),.1,.85),'white':mat('Sight markings',(.87,.91,.92),.05,.3),'red':mat('Optic emitter',(.8,.035,.018),.2,.3),'glass':mat('Optic lens',(.025,.14,.18),.55,.18)}
 root=empty('Weapon');root['id']=identifier;root['displayName']=title;root['origin']='Blender 4.5 exterior model';root['units']='metres';root['notForManufacturing']=True
 PART=empty('Body',root);return root
def finish(o,name,material='steel',bevel=0,parent=None):
 o.name=name;o.data.materials.append(M[material]);o.parent=parent or PART;ASSETS.append(o)
 if bevel:
  mod=o.modifiers.new('Small edge bevels','BEVEL');mod.width=bevel;mod.segments=2
  mod=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');mod.keep_sharp=True
 return o
def box(name,pos,size,material='steel',bevel=.001,parent=None,rx=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=g(pos));o=bpy.context.object;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler.x=rx
 return finish(o,name,material,bevel,parent)
def profile(name,points,width,material='poly',bevel=.0015,parent=None):
 vertices=[g((x,y,z)) for x in [-width/2,width/2] for z,y in points];n=len(points)
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return finish(o,name,material,bevel,parent)
def cyl(name,pos,radius,length,material='steel',axis='z',parent=None,vertices=24):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=length,location=g(pos));o=bpy.context.object
 vector={'x':(1,0,0),'y':(0,1,0),'z':(0,0,1)}[axis];o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(Vector(g(vector)))
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 return finish(o,name,material,.0005,parent)
def tube(name,pos,radius,length,thickness=.002,parent=None):
 # Annular muzzle rim with a recessed dark visual bore. Cosmetic surface only.
 o=cyl(name,pos,radius,length,'steel',parent=parent);front=pos[2]-length/2
 cyl(name+' bore',(pos[0],pos[1],front-.0006),radius-thickness,.001,'dark',parent=parent)
 return o
def curve(name,points,radius=.0025,material='poly',parent=None,closed=False):
 data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=2;data.bevel_depth=radius;data.bevel_resolution=2;s=data.splines.new('POLY');s.points.add(len(points)-1)
 for p,v in zip(s.points,points):p.co=(*g(v),1)
 s.use_cyclic_u=closed;o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(M[material]);o.parent=parent or PART;ASSETS.append(o);return o
def guard(front=-.055,back=.015,y=-.03,width=.028):
 curve('Rounded trigger guard',[(0,y,back),(0,y-.022,back-.004),(0,y-.028,front+.01),(0,y-.017,front),(0,y,front)],.003,'poly',closed=False)
 curve('Curved trigger',[(0,y+.002,back-.018),(0,y-.008,back-.022),(0,y-.014,back-.03)],.002,'steel')
def rail(start,end,y,width=.022):
 box('Picatinny base',(0,y,(start+end)/2),(width,.006,abs(end-start)),'steel',.0007)
 for i in range(int(abs(end-start)/.01)):
  z=min(start,end)+i*.01+.004;box('Rail tooth',(0,y+.005,z),(width+.006,.005,.005),'edge',.0004)
def sight(z,y,front=False,parent=None):
 if front:
  box('Front sight base',(0,y,z),(.017,.006,.017),'steel',parent=parent);box('Front sight post',(0,y+.01,z),(.004,.018,.004),'steel',parent=parent);box('White front dot',(0,y+.012,z+.0025),(.0025,.003,.001),'white',.0002,parent)
 else:
  box('Rear sight bridge',(0,y,z),(.026,.006,.016),'steel',parent=parent)
  for x in [-.009,.009]:box('Rear sight ear',(x,y+.009,z),(.006,.017,.014),'steel',parent=parent)
def adjustable_stock(root,back=.35):
 cyl('Receiver extension',(0,.012,.18),.014,.24,'steel');
 profile('Stock upper',[(.10,.025),(back-.01,.035),(back,.018),(back,-.025),(.1,-.025)],.044,'poly')
 profile('Stock angled brace',[(.13,-.015),(.18,-.035),(back,-.108),(back-.02,-.125),(.15,-.058)],.034,'poly')
 box('Stock buttpad',(0,-.045,back),(.049,.145,.017),'rubber',.004)
 profile('Stock cheekpiece',[(.19,.026),(back-.01,.03),(back,-.10),(back-.05,-.105),(.22,-.055),(.19,-.03)],.045,'poly',.002)
 box('Stock adjustment lever',(0,-.055,.20),(.025,.014,.07),'poly',.002)
 for i in range(8):box('Buttpad tread',(0,-.105+i*.017,back+.01),(.046,.004,.002),'poly',.0005)
def pistol_grip(z=.045):
 profile('Pistol grip',[(z-.022,-.027),(z+.017,-.027),(z+.047,-.142),(z+.012,-.152),(z-.008,-.08)],.032,'poly',.003)
 for side in [-1,1]:
  box('Grip textured panel',(side*.0165,-.095,z+.018),(.0015,.06,.024),'rubber',.002,rx=-.22)
  for i in range(7):box('Grip rib',(side*.0175,-.065-i*.009,z+.012+i*.002),(.0018,.002,.021),'steel',.0004)
 guard(front=z-.055,back=z+.003,y=-.035)
def save_export(identifier,root):
 bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1
 empty('Muzzle',root,MUZZLE)
 empty('Grip',root,(0,-.045,.02));empty('Foregrip',root,FOREGRIP)
 bpy.ops.object.select_all(action='DESELECT')
 for o in ASSETS:o.select_set(True)
 bpy.context.view_layer.objects.active=root
 bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(identifier+'.blend')))
 sys.path.insert(0,str(ROOT/'tools'))
 from export_weapon import export_game_model
 export_game_model(OUTPUT/(identifier+'.glb'))

def glock():
 global PART,MUZZLE,FOREGRIP
 root=setup('glock-19-gen5','Glock 19 Gen5');root.scale.z=.85;body=PART;slide=empty('Slide',root);mag=empty('Magazine',root)
 profile('Polymer frame',[(-.116,-.001),(-.116,-.017),(-.057,-.023),(-.029,-.012),(.038,-.012),(.035,.003)],.031,'poly',.0018)
 profile('G19 grip',[(.012,-.013),(.038,-.015),(.056,-.108),(.022,-.112),(-.002,-.038)],.031,'poly',.002)
 for side in [-1,1]:
  box('Grip stippling pad',(side*.016,-.073,.028),(.001,.057,.024),'rubber',.001)
  for row in range(10):
   for col in range(4):box('Grip stipple',(side*.0168,-.048-row*.005,.014+col*.007+row*.001),(.0008,.0015,.002),'poly',.0001)
 guard(-.062,.009,-.024)
 profile('Magazine body',[(.014,-.017),(.036,-.017),(.05,-.105),(.021,-.109)],.023,'steel',.001,parent=mag)
 box('Magazine floorplate',(0,-.113,.037),(.036,.007,.036),'poly',.0015,mag)
 profile('Chamfered slide',[(-.145,.005),(-.145,.025),(-.138,.033),(.033,.033),(.04,.025),(.04,.005)],.0255,'slide',.0014,slide)
 tube('Barrel muzzle',(0,.016,-.14),.0067,.013,.0013,slide)
 for side in [-1,1]:
  for z in [-.121,-.116,-.111,.005,.010,.015,.020,.025]:box('Slide serration',(side*.0132,.018,z),(.0012,.019,.0018),'dark',.0002,slide)
  cyl('Frame pin',(side*.016,-.013,-.003),.0025,.0015,'edge','x',body,12)
  box('Slide stop',(side*.017,-.007,.007),(.003,.004,.017),'steel',.0005,body)
  box('Magazine catch',(side*.017,-.04,.01),(.002,.007,.007),'steel',.0005,body)
 box('Ejection port',(0.013,.024,-.036),(.001,.011,.024),'dark',.0005,slide)
 box('Barrel hood',(0,.0335,-.033),(.017,.001,.023),'edge',.0003,slide)
 box('Pistol rear sight base',(0,.035,.025),(.014,.003,.005),'steel',.0004,slide)
 for x in [-.0055,.0055]:box('Pistol rear notch',(x,.038,.025),(.003,.005,.005),'steel',.0003,slide)
 box('Pistol front sight',(0,.036,-.126),(.0025,.006,.004),'steel',.0003,slide)
 box('Pistol front white dot',(0,.037,-.1238),(.0016,.002,.0005),'white',.0001,slide)
 MUZZLE=(0,.016,-.15);FOREGRIP=(0,-.03,-.05);save_export('glock-19-gen5',root)

def rifle():
 global PART,MUZZLE,FOREGRIP
 root=setup('mp15-sport-iii','Smith & Wesson M&P15 Sport III');body=PART;mag=empty('Magazine',root);bolt=empty('Bolt',root)
 profile('Upper receiver',[(-.145,.005),(-.145,.042),(-.105,.056),(.07,.056),(.09,.038),(.09,.002)],.041,'slide',.002)
 profile('Lower receiver',[(-.124,.012),(.075,.012),(.066,-.035),(.008,-.045),(-.035,-.021),(-.12,-.032)],.036,'steel',.002)
 pistol_grip(.035);adjustable_stock(root,.35)
 # Floating octagonal handguard, long top rail and visible recessed slot surfaces.
 cyl('Free float handguard',(0,.025,-.31),.032,.36,'slide','z',vertices=8)
 cyl('Barrel',(0,.027,-.33),.009,.39,'steel')
 for side in [-1,1]:
  for z in [-.17,-.218,-.266,-.314,-.362,-.41,-.458]:
   box('M-LOK recessed slot',(side*.031,.024,z),(.001,.01,.031),'dark',.002)
   box('Slot lower edge',(side*.0315,.0175,z),(.001,.002,.03),'edge',.0004)
 rail(-.48,.075,.062,.022)
 tube('Muzzle device',(0,.027,-.525),.012,.041,.003)
 for i in range(6):
  a=i*math.pi/3;box('Muzzle vent',(math.sin(a)*.011,.027+math.cos(a)*.011,-.523),(.004,.003,.02),'dark',.0004)
 profile('Curved thirty-round magazine',[(-.112,-.02),(-.052,-.02),(-.055,-.09),(-.077,-.155),(-.115,-.202),(-.161,-.181),(-.13,-.12)],.025,'poly',.002,mag)
 for side in [-1,1]:
  for i in range(7):box('Magazine side rib',(side*.0132,-.048-i*.019,-.082-i*.007),(.002,.003,.05),'steel',.0005,mag)
 cyl('Forward assist',(.028,.021,.057),.008,.021,'steel','x')
 box('Ejection port',(.0215,.027,-.02),(.0015,.02,.061),'dark',.0007)
 box('Bolt carrier face',(.0225,.025,-.015),(.002,.014,.04),'edge',.0007,bolt)
 box('Dust cover',(.026,.009,-.018),(.003,.018,.061),'steel',.0008,rx=.25)
 for z in [-.115,.056]:cyl('Receiver pin',(-.02,-.006,z),.0035,.003,'edge','x')
 cyl('Selector switch',(-.023,-.008,.025),.005,.004,'steel','x');box('Selector lever',(-.025,-.005,.028),(.003,.007,.017),'steel',.0007)
 # Range build with simple flip-up sights; no scope blocks the first-person sight picture.
 sight(.045,.073);sight(-.466,.073,True)
 MUZZLE=(0,.027,-.548);FOREGRIP=(0,-.005,-.28);save_export('mp15-sport-iii',root)

def shotgun():
 global PART,MUZZLE,FOREGRIP
 root=setup('mossberg-590r','Mossberg 590R');body=PART;pump=empty('Pump',root);bolt=empty('Bolt',root)
 profile('590 receiver',[(-.17,-.014),(-.17,.044),(-.135,.062),(.065,.062),(.087,.037),(.075,-.025),(-.09,-.025)],.045,'slide',.003)
 pistol_grip(.038);adjustable_stock(root,.36)
 tube('Shotgun barrel',(0,.035,-.353),.013,.421,.003)
 cyl('Magazine tube',(0,.004,-.337),.012,.35,'steel')
 cyl('Magazine cap',(0,.004,-.515),.014,.016,'edge')
 for z in [-.19,-.46]:box('Barrel band',(0,.019,z),(.03,.052,.01),'steel',.001)
 cyl('Heat shield',(0,.035,-.34),.016,.35,'slide','z',vertices=20)
 for side in [-1,1]:
  for i in range(14):box('Heat shield vent',(side*.0155,.04,-.19-i*.023),(.001,.009,.011),'dark',.001)
 profile('Compact pump',[(-.20,-.005),(-.20,-.032),(-.36,-.039),(-.39,-.025),(-.38,.009),(-.22,.009)],.048,'poly',.003,pump)
 for i in range(12):box('Pump gripping rib',(0,-.017,-.22-i*.013),(.052,.044,.004),'rubber',.001,pump)
 for side in [-1,1]:box('Action bar',(side*.017,-.01,-.18),(.004,.006,.15),'steel',.0007,pump)
 box('Ejection port',(.0235,.021,-.055),(.001,.025,.068),'dark',.001)
 box('Bolt',(.024,.02,-.052),(.002,.017,.048),'edge',.0008,bolt)
 rail(-.125,.06,.068);sight(.045,.08);sight(-.53,.058,True)
 box('Shell loading gate',(0,-.026,-.045),(.027,.002,.075),'dark',.001)
 MUZZLE=(0,.035,-.565);FOREGRIP=(0,-.017,-.3);save_export('mossberg-590r',root)

glock();rifle();shotgun()
