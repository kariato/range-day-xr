"""Export existing .blend sources; --generate explicitly rebuilds the original authored sources."""
from pathlib import Path
import os,shutil,subprocess,sys
root=Path(__file__).resolve().parent.parent
blender=os.environ.get('BLENDER_BIN') or shutil.which('blender')
if not blender:
    candidate=Path('/Applications/Blender.app/Contents/MacOS/Blender')
    if candidate.exists():blender=str(candidate)
if not blender:raise SystemExit('Blender is required. Set BLENDER_BIN to its executable. Exported GLBs are already included for playing/building the app.')
if '--generate' in sys.argv:
    subprocess.run([blender,'--background','--factory-startup','--python',str(root/'tools/model_weapons.py'),'--',str(root)],cwd=root,check=True)
else:
    for source in sorted((root/'assets/weapons').glob('*.blend')):
        subprocess.run([blender,'--background',str(source),'--python',str(root/'tools/export_weapon.py'),'--',str(root/'public/models/weapons'/f'{source.stem}.glb')],cwd=root,check=True)
