"""Run inside Blender: blender -b assets/standard.blend -P tools/export.py -- public/models/standard.glb"""
import bpy, sys, pathlib
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
out=pathlib.Path(args[0] if args else 'public/models/'+pathlib.Path(bpy.data.filepath).stem+'.glb').resolve()
out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_extras=True,export_animations=True,export_yup=True,export_apply=True,export_vertex_color='ACTIVE',export_cameras=False,export_lights=False)
print('Exported',out)
