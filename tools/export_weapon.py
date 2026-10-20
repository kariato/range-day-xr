"""Export an editable Blender weapon to a batched, movable-part GLB without saving over the source."""
import bpy,sys
from pathlib import Path

def export_game_model(destination):
    meshes=[]
    for obj in list(bpy.context.scene.objects):
        if obj.type not in {'MESH','CURVE','FONT'}:continue
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        if obj.type!='MESH':bpy.ops.object.convert(target='MESH');obj=bpy.context.object
        for modifier in list(obj.modifiers):
            try:bpy.ops.object.modifier_apply(modifier=modifier.name)
            except RuntimeError:pass
        meshes.append(obj)
    groups={}
    for obj in meshes:
        material=obj.data.materials[0].name if obj.data.materials else 'default'
        groups.setdefault((obj.parent.name if obj.parent else 'Body',material),[]).append(obj)
    for (part,material),objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        bpy.context.object.name=part+'_'+material.replace(' ','_')
    destination=Path(destination);destination.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(destination),export_format='GLB',export_extras=True,export_yup=True,export_apply=True,export_cameras=False,export_lights=False)
    print('EXPORTED WEAPON',destination,flush=True)

if __name__=='__main__':export_game_model(sys.argv[sys.argv.index('--')+1])
