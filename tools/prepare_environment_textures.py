"""Run in Blender; reduce CC0 source archives to the mobile texture sizes we ship.
Usage: blender -b --python this_file -- /repo /tmp/concrete.zip /tmp/gravel.zip
Archives are source data only; no archive content is executed.
"""
import bpy,sys,zipfile,hashlib,json,tempfile
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:];root=Path(args[0]);out=root/'assets/textures/environment';out.mkdir(parents=True,exist_ok=True)
records=[]
for kind,asset,archive in [('concrete','Concrete034',args[1]),('gravel','Gravel023',args[2])]:
    archive=Path(archive)
    with zipfile.ZipFile(archive) as z,tempfile.TemporaryDirectory(prefix='range-texture-') as tmp:
        for channel,suffix,limit in [('albedo','_Color.jpg',512),('normal','_NormalGL.jpg',256),('roughness','_Roughness.jpg',256)]:
            names=[n for n in z.namelist() if n.endswith(suffix)];assert len(names)==1,names
            source=Path(tmp)/Path(names[0]).name;source.write_bytes(z.read(names[0]))
            image=bpy.data.images.load(str(source))
            if channel!='albedo':image.colorspace_settings.name='Non-Color'
            w,h=image.size;scale=min(1,limit/max(w,h));image.scale(round(w*scale),round(h*scale))
            if channel=='albedo':
                tint=(.55,.57,.60) if kind=='concrete' else (.36,.30,.22)
                pixels=list(image.pixels)
                for i in range(0,len(pixels),4):
                    for c in range(3):pixels[i+c]*=tint[c]
                image.pixels.foreach_set(pixels)
            image.file_format='PNG';image.filepath_raw=str(out/f'{kind}_{channel}.png');image.save();bpy.data.images.remove(image)
    records.append({'asset':asset,'source':f'https://ambientcg.com/a/{asset}','license':'CC0-1.0','archive':archive.name,'archiveSHA256':hashlib.sha256(archive.read_bytes()).hexdigest(),'albedoMaxDimension':512,'normalRoughnessMaxDimension':256,'albedoLinearTint':([.55,.57,.60] if kind=='concrete' else [.36,.30,.22])})
(out/'sources.json').write_text(json.dumps(records,indent=2)+'\n')
print('Saved bounded mobile PBR textures',flush=True)
