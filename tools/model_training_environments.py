"""Blender art pass for the outdoor course, Qualification House and warehouse.
Imports the preserved gameplay blockouts; keeps every collider/navmesh/marker.
Explicit regeneration overwrites the three editable .blend sources and GLBs.
"""
import bpy, sys, math, random
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
root=Path(sys.argv[sys.argv.index('--')+1]).resolve()
sys.path.insert(0,str(root/'tools'))
from environment_shading import bake_vertex_lighting
from environment_textures import install_photo_material
def vec(p):return (p[0],-p[2],p[1])
def uv(o,scale=1.8):
    for layer in list(o.data.uv_layers):o.data.uv_layers.remove(layer)
    layer=o.data.uv_layers.new(name='Surface UV')
    albedo=next((n.image for n in o.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE' and n.image and 'albedo' in n.image.name),None)
    aspect=albedo.size[0]/albedo.size[1] if albedo else 1
    for face in o.data.polygons:
        axis=max(range(3),key=lambda i:abs(face.normal[i]));axes=[i for i in range(3) if i!=axis]
        for li in face.loop_indices:
            p=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;layer.data[li].uv=(p[axes[0]]/scale,p[axes[1]]/scale*aspect)
def box(name,p,size,mat,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=vec(p));o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        m=o.modifiers.new('Manufactured edge radius','BEVEL');m.width=bevel;m.segments=2;bpy.ops.object.modifier_apply(modifier=m.name)
    o.data.materials.append(mat);uv(o);visual.append(o);return o
def cylinder(name,p,r,depth,mat,axis='y',segments=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments,radius=r,depth=depth,location=vec(p));o=bpy.context.object;o.name=name
    if axis=='z':o.rotation_euler.x=math.pi/2
    if axis=='x':o.rotation_euler.y=math.pi/2
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    for face in o.data.polygons:face.use_smooth=abs(face.normal.z)<.6
    o.data.materials.append(mat);uv(o);visual.append(o);return o
def label(body,p,size=.3,yaw=0):
    bpy.ops.object.text_add(location=vec(p));o=bpy.context.object;o.name='Range signage '+body;o.data.body=body;o.data.size=size;o.data.resolution_u=3;o.data.align_x='CENTER';o.data.align_y='CENTER';o.rotation_euler=(math.pi/2,0,-yaw);o.data.materials.append(white);bpy.ops.object.convert(target='MESH');o=bpy.context.object;uv(o);visual.append(o)
def grid(name,x0,x1,z0,z1,mat,step=1,y=0):
    nx=round((x1-x0)/step);nz=round((z1-z0)/step);verts=[vec((x0+i*(x1-x0)/nx,y,z0+j*(z1-z0)/nz)) for j in range(nz+1) for i in range(nx+1)];faces=[]
    for j in range(nz):
        for i in range(nx):
            a=j*(nx+1)+i;faces.append((a,a+1,a+nx+2,a+nx+1)) # Game Z increases -> Blender Y decreases; reverse below.
    # X then game Z gives negative game Y. Face upward.
    faces=[tuple(reversed(f)) for f in faces]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat);uv(o);visual.append(o)
def derived(source,name,color,rough=None):
    m=source.copy();m.name=name;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    # Tint the packed original albedo itself; all texture maps stay self-contained.
    for node in m.node_tree.nodes:
        if node.type=='TEX_IMAGE' and node.image and 'albedo' in node.image.name:
            image=node.image.copy();image.name=name+' albedo';pixels=list(image.pixels)
            reference=(.48,.50,.52) if source==concrete else (.13,.15,.17)
            for i in range(0,len(pixels),4):
                for c in range(3):pixels[i+c]=min(1,pixels[i+c]*color[c]/reference[c])
            image.pixels.foreach_set(pixels);image.pack();node.image=image
    if rough is not None:
        for link in list(bs.inputs['Roughness'].links):m.node_tree.links.remove(link)
        bs.inputs['Roughness'].default_value=rough
    if name in ['Muted meadow ground','Tree foliage']:
        for link in list(bs.inputs['Normal'].links):m.node_tree.links.remove(link)
    return m
for scene_id in ['runthrough','qualification','warehouse']:
    bpy.ops.wm.read_factory_settings(use_empty=True);random.seed(83)
    with bpy.data.libraries.load(str(root/'assets/standard.blend'),link=False) as (src,dst):dst.materials=src.materials
    mats={m.name:m for m in bpy.data.materials}
    concrete=mats['Poured concrete'];floor=mats['Sealed concrete floor'];rubber=mats['Black rubber ballistic lining'];acoustic=mats['Woven acoustic insulation'];blue=mats['Powder coated range blue'];steel=mats['Brushed galvanized steel'];dark=mats['Black anodized fittings'];wood=mats['Oiled oak worktops'];white=mats['Warm white safety lettering'];amber=mats['Muted safety amber'];light=mats['LED diffuser']
    earth=derived(concrete,'Compacted range gravel',(.34,.29,.22),.95)
    install_photo_material(earth,root,'gravel')
    grass=derived(rubber,'Muted meadow ground',(.23,.29,.16),1)
    bark=derived(concrete,'Weathered timber bark',(.22,.16,.10),1)
    leaves=derived(rubber,'Tree foliage',(.12,.20,.10),1)
    bpy.ops.import_scene.gltf(filepath=str(root/'assets/blockouts'/f'{scene_id}.glb'))
    visual=[]
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH' or o.name.startswith(('COL_','NAV_')):continue
        name=o.name
        if name.startswith(('floor','ground')):
            bpy.data.objects.remove(o,do_unlink=True);continue
        mat=concrete
        if name.startswith(('ceiling','dock')):mat=rubber
        elif any(t in name for t in ['stripe','mark','station','route_dash']):mat=blue if scene_id=='qualification' else amber
        elif any(t in name for t in ['light','fixture']):mat=light
        elif any(t in name for t in ['wood','barricade','fence','crate']):mat=wood
        elif any(t in name for t in ['metal','beam','column','barrel','cap','header','post','gate','rack']):mat=steel
        if scene_id=='runthrough' and name.startswith('barrel'):
            p=o.matrix_world.translation; x,y,z=p.x,p.z,-p.y
            bpy.data.objects.remove(o,do_unlink=True)
            cylinder('Steel range drum',(x,y,z),.325,1,steel,segments=16)
            for h in [.03,.18,.82,.97]:cylinder('Drum rolled lip',(x,h,z),.339,.025,dark,segments=16)
            cylinder('Drum recessed lid',(x,1.008,z),.29,.012,dark,segments=16)
            continue
        if scene_id=='warehouse' and name.startswith('rack'):
            p=o.location; x,z=p.x,-p.y
            bpy.data.objects.remove(o,do_unlink=True)
            for dx in [-.94,.94]:
                for dz in [-2.44,2.44]:box('Warehouse upright',(x+dx,1.4,z+dz),(.1,2.8,.1),blue,.012)
            for h in [.13,1.02,1.91,2.8]:
                box('Galvanized rack shelf',(x,h,z),(2,.065,5),steel,.01)
                for dz in [-2.45,2.45]:box('Rack shelf edge',(x,h-.08,z+dz),(2,.16,.055),amber)
            for h in [.43,1.33,2.22]:
                for dz in [-1.5,.8]:
                    box('Stored timber case',(x,h,z+dz),(1.5,.55,1.6),wood,.025)
                    for dx in [-.77,.77]:box('Case steel strap',(x+dx,h,z+dz),(.025,.58,1.63),dark)
            continue
        o.data.materials.clear();o.data.materials.append(mat);uv(o)
        # Keep gameplay colliders untouched; soften only visible wall/prop edges.
        if len(o.data.vertices)<40 and not any(t in name for t in ['stripe','mark','station','route']):
            bpy.context.view_layer.objects.active=o;o.select_set(True)
            m=o.modifiers.new('Edge bevel','BEVEL');m.width=.016;m.segments=2;bpy.ops.object.modifier_apply(modifier=m.name);o.select_set(False)
        visual.append(o)
    if scene_id=='runthrough':
        grid('Outdoor meadow',-45,45,-97,23,grass,2)
        grid('Gravel exercise corridor',-9,9,-92.5,12.5,earth,.5,y=.014)
        # Earthen berms behind the fence; vertices are displaced in Blender.
        for x in [-14,14]:
            for z in range(8,-96,-10):
                bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=vec((x,1.05,z)));o=bpy.context.object;o.name='Sculpted earthen berm';o.scale=(3,6,2)
                for v in o.data.vertices:v.co*=random.uniform(.85,1.15)
                bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(earth)
                for face in o.data.polygons:face.use_smooth=True
                uv(o);visual.append(o)
        # Perimeter trees and shrubs are static, outside the gameplay corridor.
        for side in [-1,1]:
            for z in range(12,-100,-8):
                x=side*random.uniform(20,34);h=random.uniform(5,8)
                cylinder('Tree trunk',(x,h*.45,z),.19,h*.9,bark)
                for k in range(3):
                    p=(x+random.uniform(-1.1,1.1),h*.65+random.uniform(0,1.8),z+random.uniform(-1,1))
                    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=2.0,location=vec(p));o=bpy.context.object;o.name='Tree canopy';o.scale=(1,1,.9)
                    for v in o.data.vertices:v.co*=random.uniform(.92,1.08)
                    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(leaves)
                    for face in o.data.polygons:face.use_smooth=True
                    uv(o);visual.append(o)
        # Fence wire grid: slim geometry avoids alpha sorting in VR.
        for x in [-10,10]:
            for h in [.35,.7,1.05,1.75,2.1]:box('Fence wire',(x,h,-43),(.012,.012,96),dark)
            for z in range(5,-92,-2):box('Fence wire upright',(x,1.1,z),(.012,2.2,.012),dark)
        for i,z in enumerate([-7,-20,-34,-48,-63]):
            box('Station sign panel',(-7.2,1.9,z),(.9,.65,.06),blue,.02);label(f'0{i+1}',(-7.2,1.9,z+.04),.4)
            # Trim follows the preserved blockout obstacle positions, not trigger spacing.
            prop_z=-10-i*14
            for x in [-6,6]:
                for dx in [-.6,.6]:box('Barricade steel edge',(x+dx,1,prop_z),(.055,2.03,.055),dark)
        for x in [-5,5]:
            box('Ready area bench',(x,.48,9),(3.2,.12,.75),wood,.025)
            for dx in [-1.25,1.25]:box('Bench leg',(x+dx,.23,9),(.12,.46,.6),steel)
        box('Outdoor welcome sign',(0,3.2,6),(7,.65,.10),blue,.025);label('RANGE DAY / FIELD COURSE',(0,3.2,6.07),.34)
        # A segmented back berm gives the finish a believable range boundary.
        for x in range(-12,13,4):
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=vec((x,1,-91)));o=bpy.context.object;o.name='End earth berm';o.scale=(3,2,2.2);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(earth);uv(o);visual.append(o)
    elif scene_id=='qualification':
        grid('Training house concrete slab',-17,17,-29,7,floor,.5)
        # Door jambs fit around existing 4 metre openings; collision clearance unchanged.
        for x in [-5,5]:
            for z in [-9,-21]:
                for dz in [-1.98,1.98]:box('Door opening jamb',(x,1.35,z+dz),(.24,2.7,.08),blue,.015)
                box('Door opening transom',(x,2.68,z),(.24,.12,4.05),blue,.015)
        for x in [-10,10]:
            for dx in [-1.98,1.98]:box('Cross room jamb',(x+dx,1.35,-15),(.08,2.7,.24),blue,.015)
            box('Cross room transom',(x,2.68,-15),(4.05,.12,.24),blue,.015)
        # Modular wall joint battens and skirting, on existing solid walls.
        for x in [-5,5]:
            for z in [-27,-24,-18,-15,-3,0,3,6]:
                box('Wall joint batten',(x+.105,1.5,z),(.025,3,.055),steel)
                box('Wall joint batten',(x-.105,1.5,z),(.025,3,.055),steel)
        for x in [-16.8,16.8]:box('Perimeter wall skirting',(x,.1,-11),(.05,.2,35.5),rubber)
        # Ceiling is modeled but kept above sightlines and all navigation.
        box('Training house ceiling',(0,4.5,-11),(34,.14,36),acoustic)
        for z in [3,-8,-19,-28]:
            box('Overhead structural beam',(0,4.22,z),(34,.2,.16),steel)
            for x in [-10,0,10]:
                box('House LED enclosure',(x,4.07,z),(2.2,.10,.45),dark,.02)
                box('House LED diffuser',(x,4.005,z),(2.06,.015,.32),light)
        rooms=[(0,-13,'01 / ENTRY'),(10,-13,'02 / RIGHT'),(10,-27.8,'03 / REAR RIGHT'),(0,-27.8,'04 / CROSS'),(-10,-27.8,'05 / REAR LEFT'),(-10,5.8,'06 / RETURN')]
        for x,z,name in rooms:
            box('Room identification plaque',(x,2.4,z),(3,.45,.07),blue,.015);label(name,(x,2.4,z+.05),.24)
        # Recessed utility panels and conduit add detail without blocking the circuit.
        for x in [-16.7,16.7]:
            for z in [-23,-6,3]:
                box('Wall utility panel',(x,1.35,z),(.08,.65,.5),dark,.015)
                cylinder('Vertical electrical conduit',(x,2.8,z),.025,2.2,steel)
        for x in [-10,0,10]:
            for z in [-21,-9]:
                box('Ceiling cable tray',(x,4.25,z),(.32,.10,11),dark)
                box('Room threshold blue paint',(x,.008,z),(2,.008,.07),blue)
    else:
        grid('Warehouse slab',-20,20,-25,5,floor,.5)
        for z in [2,-5,-12,-19]:
            for x in [-15,-5,5,15]:
                box('Warehouse LED housing',(x,5.55,z),(2.6,.10,.45),dark,.018)
                box('Warehouse LED diffuser',(x,5.49,z),(2.45,.015,.32),light)
        for x in [-17,0,17]:
            for h in [.4,1,1.6,2.2,2.8,3.4]:box('Roller dock door slat',(x,h,-24.45),(3.9,.025,.025),steel)
            for dx in [-2.08,2.08]:box('Dock protection post',(x+dx,.7,-24),(.18,1.4,.18),amber,.02)
            box('Dock number plaque',(x,4,-24.45),(2.5,.4,.06),blue,.01);label(f'DOCK {[-17,0,17].index(x)+1:02}',(x,4,-24.40),.27)
        for x in [-18,18]:
            cylinder('Warehouse ventilation',(x,5.2,-10),.22,28,steel,'z')
        for z in [-22,-12,-2]:box('Pedestrian crossing',(0,.008,z),(4,.008,.10),amber)
    # Offline fixture/sun visibility plus AO. No exported runtime light objects.
    fixtures=[]
    if scene_id=='qualification':fixtures=[vec((x,3.97,z)) for z in [3,-8,-19,-28] for x in [-10,0,10]]
    if scene_id=='warehouse':fixtures=[vec((x,5.46,z)) for z in [2,-5,-12,-19] for x in [-15,-5,5,15]]
    bake_vertex_lighting(visual,fixtures,vec((-5,12,5)) if scene_id=='runthrough' else None)
    bpy.context.scene.world=bpy.data.worlds.new('Preview world');bpy.context.scene.world.color=(.3,.35,.4)
    bpy.ops.object.light_add(type='SUN',location=(0,0,12));bpy.context.object.data.energy=2;bpy.context.object.rotation_euler=(.4,-.3,.4)
    bpy.ops.object.camera_add(location=vec((0,1.65,5)));cam=bpy.context.object;cam.rotation_euler=(Vector(vec((0,1.65,-20)))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=22;bpy.context.scene.camera=cam
    bpy.context.scene['art_pass']='Quest 2 art pass v2: packed PBR tiles, baked vertex lighting and AO'
    bpy.ops.wm.save_as_mainfile(filepath=str(root/'assets'/f'{scene_id}.blend'))
    bpy.ops.export_scene.gltf(filepath=str(root/'public/models'/f'{scene_id}.glb'),export_format='GLB',export_extras=True,export_apply=True,export_yup=True,export_vertex_color='ACTIVE',export_cameras=False,export_lights=False)
    print('AUTHORED',scene_id,len(visual),'meshes',flush=True)
