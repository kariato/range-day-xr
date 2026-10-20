"""Export edited Blender scenes; retain included blockouts for unauthored ranges."""
from pathlib import Path
import os, subprocess, shutil
root=Path(__file__).resolve().parent.parent
sources=list((root/'assets').glob('*.blend'))
if sources:
    blender=os.environ.get('BLENDER_BIN') or shutil.which('blender')
    if not blender: raise SystemExit('Set BLENDER_BIN to Blender to export edited assets/*.blend. Included GLBs work without Blender.')
    for source in sources:
        subprocess.run([blender,'--python-exit-code','1','-b',str(source),'-P',str(root/'tools/export.py'),'--',str(root/'public/models'/f'{source.stem}.glb')],cwd=root,check=True)
else:
    subprocess.run(['node',str(root/'tools/generate-scenes.mjs')],cwd=root,check=True)
