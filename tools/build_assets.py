"""Export authored .blend scenes, or regenerate the included blockout GLBs."""
from pathlib import Path
import subprocess,shutil
sources=list(Path('assets').glob('*.blend'))
if sources:
    blender=shutil.which('blender')
    if not blender: raise SystemExit('Blender is required to export assets/*.blend. Install Blender or use the included public/models/*.glb files.')
    for source in sources:
        subprocess.run([blender,'-b',str(source),'-P','tools/export.py','--',f'public/models/{source.stem}.glb'],check=True)
else:
    subprocess.run(['node','tools/generate-scenes.mjs'],check=True)
