"""Offline Blender vertex AO and direct-light visibility bake for mobile WebXR.
No runtime lights, shadow maps, lightmap textures, or custom shaders are added.
"""
import math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def bake_vertex_lighting(objects, light_positions=(), sun_direction=None):
    import bpy
    bpy.context.view_layer.update()
    verts=[];faces=[]
    for o in objects:
        base=len(verts);verts.extend(o.matrix_world@v.co for v in o.data.vertices)
        faces.extend(tuple(base+i for i in p.vertices) for p in o.data.polygons)
    bvh=BVHTree.FromPolygons(verts,faces)
    lights=[Vector(p) for p in light_positions]
    sun=Vector(sun_direction).normalized() if sun_direction else None
    sun_t=sun.cross(Vector((.31,.51,.83))).normalized() if sun else None
    for o in objects:
        for attr in list(o.data.color_attributes):o.data.color_attributes.remove(attr)
        attr=o.data.color_attributes.new(name='Baked mobile lighting',type='FLOAT_COLOR',domain='CORNER')
        normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
        cache={}
        for p in o.data.polygons:
            for li in p.loop_indices:
                vi=o.data.loops[li].vertex_index
                n=(normal_matrix@(o.data.vertices[vi].normal if p.use_smooth else p.normal)).normalized();t=n.cross(Vector((.31,.51,.83))).normalized();b=n.cross(t)
                key=(vi,tuple(round(c,3) for c in n))
                if key not in cache:
                    pos=o.matrix_world@o.data.vertices[vi].co+n*.008;blocked=0
                    for k in range(4):
                        a=k*2.399963;r=math.sqrt((k+.5)/4)*.85
                        d=(n*math.sqrt(1-r*r)+t*(math.cos(a)*r)+b*(math.sin(a)*r)).normalized()
                        hit=bvh.ray_cast(pos,d,1.05)
                        if hit[0] is not None:blocked+=1-hit[3]/1.05
                    ao=max(.5,1-blocked/4*.7)
                    if sun:
                        lit=.5
                        if n.dot(sun)>0:
                            lit=0
                            for offset in [-.025,0,.025]:
                                d=(sun+sun_t*offset).normalized()
                                if bvh.ray_cast(pos,d,24)[0] is None:lit+=1/3
                        intensity=.70+.30*lit
                        color=(ao*intensity,ao*intensity*.992,ao*intensity*.972,1)
                    else:
                        energy=0
                        nearest=sorted(lights,key=lambda l:(l-pos).length_squared)[:3]
                        for l in nearest:
                            d=l-pos;distance=d.length
                            if distance<.02:continue
                            d/=distance;cosine=max(0,n.dot(d))
                            if cosine<=0:continue
                            hit=bvh.ray_cast(pos,d,max(.001,distance-.09))
                            if hit[0] is None:energy+=cosine*28/(distance*distance+4)
                        intensity=.62+.38*(1-math.exp(-energy*.55))
                        # Gentle warm spill; no time-varying or per-fragment lighting cost.
                        color=(ao*intensity,ao*intensity*.985,ao*intensity*.96,1)
                    cache[key]=color
                attr.data[li].color=cache[key]
        o.data.color_attributes.active_color=attr
    print('Baked mobile lighting:',len(objects),'meshes',len(verts),'vertices',flush=True)
