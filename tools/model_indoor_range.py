"""Author the indoor range in Blender, with packed PBR tiles and baked vertex occlusion.
Run with Blender --background --factory-startup --python this_file -- /repo/root.
Coordinates in helpers use game metres: X right, Y up, Z toward entrance.
"""
import bpy, math, random, sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.noise import noise_vector
root=Path(sys.argv[sys.argv.index('--')+1]).resolve()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
random.seed(42)
visual=[]; materials={}
def vec(p): return (p[0],-p[2],p[1])
def material(name,color,rough=.7,metal=0,texture=None,emission=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough; bs.inputs['Metallic'].default_value=metal
    if emission:
        bs.inputs['Emission Color'].default_value=(*color,1); bs.inputs['Emission Strength'].default_value=emission
    if texture:
        size=256; values=[]; heights=[]
        for y in range(size):
            for x in range(size):
                # Seamless periodic texture: grain, aggregate, worn pores or wood fibres.
                u=x/size; v=y/size
                n=(math.sin(x*12.9898+y*78.233)*43758.5453)%1
                broad=math.sin(2*math.pi*u*5+math.sin(2*math.pi*v*3))*.35+math.cos(2*math.pi*v*7)*.2
                if texture=='wood': tone=.84+.09*math.sin(u*math.pi*64+math.sin(v*math.pi*4)*2)+n*.08; height=tone
                elif texture=='acoustic': tone=.72+.23*n-.15*(x%6==0 or y%6==0); height=n
                elif texture=='rubber': tone=.72+.30*n+.05*broad; height=n
                else: tone=.82+.15*n+.12*broad; height=n*.4+broad*.3
                heights.append(height); values.extend([min(1,max(0,c*tone)) for c in color]+[1])
        image=bpy.data.images.new(name+' • albedo',size,size); image.pixels.foreach_set(values); image.pack()
        node=m.node_tree.nodes.new('ShaderNodeTexImage'); node.image=image
        m.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color'])
        normals=[]
        for y in range(size):
            for x in range(size):
                dx=(heights[y*size+(x+1)%size]-heights[y*size+(x-1)%size])*.18
                dy=(heights[((y+1)%size)*size+x]-heights[((y-1)%size)*size+x])*.18
                n=Vector((-dx,-dy,1)).normalized(); normals.extend([n.x*.5+.5,n.y*.5+.5,n.z*.5+.5,1])
        image=bpy.data.images.new(name+' • normal',size,size); image.colorspace_settings.name='Non-Color'; image.pixels.foreach_set(normals); image.pack()
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
        normal=m.node_tree.nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value=.45
        m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
    materials[name]=m; return m
concrete=material('Poured concrete',(.48,.50,.52),texture='concrete')
floor=material('Sealed concrete floor',(.53,.55,.57),.62,texture='concrete')
rubber=material('Black rubber ballistic lining',(.13,.15,.17),.94,texture='rubber')
acoustic=material('Woven acoustic insulation',(.23,.27,.31),.96,texture='acoustic')
blue=material('Powder coated range blue',(.045,.20,.32),.48,.25)
steel=material('Brushed galvanized steel',(.46,.49,.52),.38,.7)
dark=material('Black anodized fittings',(.065,.08,.10),.48,.55)
wood=material('Oiled oak worktops',(.48,.31,.16),.57,texture='wood')
white=material('Warm white safety lettering',(.78,.82,.84),.8)
yellow=material('Muted safety amber',(.72,.46,.095),.72)
light=material('LED diffuser',(.82,.90,1),.4,emission=2)
glass=material('Observation glass',(.12,.22,.30),.18,.35)
def uv_project(o,scale=1):
    for layer in list(o.data.uv_layers): o.data.uv_layers.remove(layer)
    uv=o.data.uv_layers.new(name='Surface UV')
    for p in o.data.polygons:
        axis=max(range(3),key=lambda i:abs(p.normal[i]))
        axes=[i for i in range(3) if i!=axis]
        for li in p.loop_indices:
            co=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co
            uv.data[li].uv=(co[axes[0]]/scale,co[axes[1]]/scale)
def box(name,p,size,mat,bevel=0,collide=False):
    bpy.ops.mesh.primitive_cube_add(size=1,location=vec(p));o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    o.data.materials.append(mat); uv_project(o,.7 if mat==wood else 1.8)
    visual.append(o)
    if collide: collider(name,p,size)
    return o
def collider(name,p,size):
    bpy.ops.mesh.primitive_cube_add(size=1,location=vec(p));o=bpy.context.object;o.name='COL_'+name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.hide_render=True;o.display_type='WIRE'
    # Exported separately; game recognizes and hides COL_ meshes.
    o.data.materials.append(dark)
    return o
def cylinder(name,p,radius,length,mat,axis='y'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=radius,depth=length,location=vec(p));o=bpy.context.object;o.name=name
    if axis=='z':o.rotation_euler.x=math.pi/2
    if axis=='x':o.rotation_euler.y=math.pi/2
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    o.data.materials.append(mat);uv_project(o,1);visual.append(o);return o
def text(name,body,p,size,mat=white,flip=False):
    bpy.ops.object.text_add(location=vec(p));o=bpy.context.object;o.name=name;o.data.body=body;o.data.size=size;o.data.align_x='CENTER';o.data.align_y='CENTER';o.data.extrude=.0005
    # Face toward entrance (+game Z), or toward firing line for rear wall.
    o.rotation_euler=(math.pi/2,0,math.pi if flip else 0);o.data.materials.append(mat)
    bpy.ops.object.convert(target='MESH');visual.append(bpy.context.object)
    uv_project(bpy.context.object)
def slab_grid(name,y,mat):
    verts=[];faces=[];nx=44;nz=124
    for j in range(nz+1):
        for i in range(nx+1):verts.append(vec((-11+i*.5,y,10-j*.5)))
    for j in range(nz):
        for i in range(nx):
            a=j*(nx+1)+i;f=(a,a+nx+1,a+nx+2,a+1);faces.append(tuple(reversed(f)) if y==0 else f)
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat);visual.append(o);uv_project(o,2)
slab_grid('Polished range slab',0,floor);collider('floor',(0,-.15,-21),(22,.3,62))
slab_grid('Acoustic ceiling',4.6,acoustic)
for x in [-11,11]:
    box('Concrete perimeter',(x,2.3,-21),(.3,4.6,62),concrete,collide=True)
    box('Impact resistant lower wall',(x*.984,.54,-21),(.08,1.08,62),rubber)
    box('Wall skirting',(x*.978,.09,-21),(.06,.18,62),dark,.01)
    for z in range(6,-50,-3):
        box('Acoustic wall panel',(x*.981,2.5,z),(.09,2.2,2.72),acoustic,.015)
        box('Panel bottom rail',(x*.975,1.37,z),(.04,.04,2.76),steel)
# Rubber bullet-capture end wall and angled sacrificial baffles; decorative only.
box('Downrange end wall',(0,2.3,-51.6),(22,4.6,.6),rubber,collide=True)
for x in range(-10,11,2):
    box('Backstop steel seam',(x,2.05,-51.23),(.035,3.9,.04),dark)
for y in [.35,1.0,1.65,2.3,2.95,3.6]:
    box('Backstop rubber course',(0,y,-51.20),(21.8,.025,.025),dark)
box('Backstop catch trough',(0,.16,-50.9),(21.8,.3,.65),dark,.025)
# Rear lobby wall, observation window, and a modeled closed access door.
box('Rear wall',(0,2.3,9.8),(22,4.6,.3),concrete,collide=True)
box('Rear window surround',(-4,2.05,9.59),(6.3,1.8,.12),dark,.02)
box('Observation glazing',(-4,2.05,9.5),(6,1.5,.03),glass)
for x in [-6,-4,-2]:box('Glazing mullion',(x,2.05,9.44),(.045,1.55,.04),steel)
box('Rear door frame',(4,1.25,9.54),(1.65,2.5,.14),steel,.02)
box('Rear acoustic door',(4,1.19,9.42),(1.4,2.35,.08),blue,.025)
cylinder('Door pull',(3.5,1.1,9.32),.018,.3,steel)
box('Exit sign',(4,2.75,9.45),(1.2,.3,.055),blue,.01)
text('Exit lettering','EXIT',(4,2.75,9.40),.18,white,True)
text('Rear safety message','RANGE DAY  /  INDOOR PRECISION',(0,3.65,9.40),.29,white,True)
# Ten 1.8 metre lanes. Keep the central lane clear for locomotion.
for lane in range(-4,6):
    x=lane*1.8;boundary=x-.9
    box('Booth lower partition',(boundary,.56,2.1),(.12,1.12,3.6),blue,.025,True)
    box('Booth acoustic partition',(boundary,1.66,2.1),(.10,1.05,3.6),acoustic,.018)
    box('Booth steel cap',(boundary,2.21,2.1),(.16,.05,3.65),steel,.015)
    for z in [.28,3.92]:box('Partition end trim',(boundary,1.13,z),(.15,2.24,.07),steel,.012)
    # Narrow side bench leaves a continuous walking path straight down each lane.
    box('Oak equipment shelf',(x+.58,.92,.95),(.45,.075,1.12),wood,.022,True)
    for z in [.5,1.38]:box('Bench bracket',(x+.70,.69,z),(.16,.42,.055),steel,.01)
    box('Bench rubber mat',(x+.58,.963,.95),(.34,.012,.78),rubber,.01)
    # Lane number fascia and linear fixtures above each shooter.
    box('Lane number fascia',(x,2.72,.22),(1.64,.38,.12),blue,.025)
    text('Lane number '+str(lane+5),f'{lane+5:02}',(x,2.72,.29),.24)
    box('Shooter task light housing',(x,3.22,2.1),(.7,.08,1.7),dark,.018)
    box('Shooter task LED',(x,3.172,2.1),(.60,.015,1.55),light)
    # Twin extruded carrier rails, support hangers, and cable guides.
    for offset in [-.075,.075]:box('Target carrier rail',(x+offset,3.05,-24),(.035,.065,50),steel)
    for z in [-1,-9,-17,-25,-33,-41,-49]:
        cylinder('Rail ceiling suspension',(x,3.8,z),.012,1.45,steel)
        box('Rail hanger crosshead',(x,3.09,z),(.24,.035,.06),dark)
    box('Lane separation paint',(boundary,.004,-24),(.035,.006,50),white)
    box('Firing line',(x,.006,.02),(1.65,.008,.11),yellow)
    # Lane controller with screen, button and emergency stop.
    box('Lane controller',(boundary+.105,1.32,3.35),(.12,.25,.3),dark,.012)
    box('Controller blue display',(boundary+.17,1.36,3.36),(.008,.09,.16),blue)
    cylinder('Controller button',(boundary+.18,1.25,3.4),.022,.018,yellow,'x')
# Cross beams, ducts and visible linear fixtures; no per-fixture shadow lights needed.
for z in [6,-2,-10,-18,-26,-34,-42,-50]:
    box('Ceiling cross beam',(0,4.31,z),(22,.20,.18),dark,.01)
    for x in [-8,-4,0,4,8]:
        box('Luminaire enclosure',(x,4.18,z),(2.7,.08,.40),steel,.018)
        box('Warm neutral LED diffuser',(x,4.13,z),(2.54,.016,.30),light)
for x in [-9.8,9.8]:
    cylinder('Ventilation trunk',(x,4.14,-20),.22,58,steel,'z')
    for z in range(6,-49,-6):
        cylinder('Duct collar',(x,4.14,z),.235,.07,dark,'z')
        box('Vent grille',(x,3.91,z),(.4,.025,.7),dark)
# Overhead angled acoustic baffles, above target sightline.
for z in [-6,-14,-22,-30,-38,-46]:
    o=box('Suspended ballistic baffle',(0,3.73,z),(21.6,.11,1.30),rubber,.015)
    o.rotation_euler.x=math.radians(12)
    for x in [-10,10]:cylinder('Baffle drop rod',(x,4.13,z),.009,.65,steel)
# Concrete expansion joints and clearly labelled distance bands.
for z in [-5,-10,-15,-25,-50]:
    box('Distance line',(0,.008,z),(21.7,.008,.045),white)
    for x in [-8.1,-4.5,2.7,6.3]:
        # Small raised text plane lies on floor, readable when looking downrange.
        bpy.ops.object.text_add(location=vec((x,.012,z+.25)));o=bpy.context.object;o.name='Distance floor label';o.data.body=f'{abs(z)} m';o.data.size=.20;o.data.align_x='CENTER';o.data.materials.append(white);bpy.ops.object.convert(target='MESH');visual.append(bpy.context.object);uv_project(bpy.context.object)
for z in range(-48,9,4):
    box('Slab expansion joint',(0,.002,z),(21.8,.003,.012),dark)
box('Ready area blue band',(0,.005,5.05),(21.8,.008,.07),blue)
text('Wall range identifier','RANGE DAY  /  PRECISION',(0,3.65,-51.10),.55)
# Bake local ambient occlusion into vertex colour using the authored geometry BVH.
# This remains static and costs no real-time shadow maps on Quest.
bpy.context.view_layer.update()
verts=[];faces=[]
for o in visual:
    base=len(verts);verts.extend(o.matrix_world@v.co for v in o.data.vertices)
    faces.extend(tuple(base+i for i in p.vertices) for p in o.data.polygons)
bvh=BVHTree.FromPolygons(verts,faces)
random.seed(17)
for o in visual:
    attr=o.data.color_attributes.new(name='Baked ambient occlusion',type='FLOAT_COLOR',domain='CORNER')
    for p in o.data.polygons:
        normal=(o.matrix_world.to_3x3()@p.normal).normalized()
        tangent=normal.cross(Vector((.31,.51,.83))).normalized();bitangent=normal.cross(tangent)
        for li in p.loop_indices:
            pos=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co+normal*.006
            blocked=0
            for k in range(6):
                a=k*2.399963; r=math.sqrt((k+.5)/6)*.9
                direction=(normal*math.sqrt(1-r*r)+tangent*(math.cos(a)*r)+bitangent*(math.sin(a)*r)).normalized()
                hit=bvh.ray_cast(pos,direction,1.15)
                if hit[0] is not None:blocked+=(1-hit[3]/1.15)
            shade=max(.48,1-blocked/6*.72)
            attr.data[li].color=(shade,shade,shade,1)
    o.data.color_attributes.active_color=attr
print('Baked vertex occlusion:',len(visual),'meshes',len(verts),'vertices',flush=True)
# Editable source includes preview area lighting and a camera.
for z in [3,-10,-25,-40]:
    bpy.ops.object.light_add(type='AREA',location=vec((0,4,z)));o=bpy.context.object;o.name='Preview ceiling light';o.data.energy=1400;o.data.shape='RECTANGLE';o.data.size=18;o.data.size_y=6
bpy.ops.object.camera_add(location=vec((0,1.65,5.5)));cam=bpy.context.object;cam.name='Player eye preview';cam.rotation_euler=(Vector(vec((0,1.65,-20)))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=22;bpy.context.scene.camera=cam
bpy.context.scene.world.color=(.25,.28,.32)
bpy.context.scene['asset_version']='indoor-range-art-v1'
bpy.context.scene['notes']='Original Blender environment; packed PBR textures; baked vertex AO; game coordinates in helper script.'
source=root/'assets/standard.blend';source.parent.mkdir(exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(source))
# Vertex color export selection is explicit; lights and preview cameras stay in source only.
props=bpy.ops.export_scene.gltf.get_rna_type().properties
kwargs=dict(filepath=str(root/'public/models/standard.glb'),export_format='GLB',export_extras=True,export_yup=True,export_apply=True,export_cameras=False,export_lights=False)
if 'export_vertex_color' in props:kwargs['export_vertex_color']='ACTIVE'
if 'export_all_vertex_colors' in props:kwargs['export_all_vertex_colors']=False
bpy.ops.export_scene.gltf(**kwargs)
print('Saved editable indoor range and exported GLB',flush=True)
