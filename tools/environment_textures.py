"""Install the checked-in small PBR textures into an editable Blender material."""
import bpy
from pathlib import Path

def install_photo_material(material,root,kind):
    root=Path(root);nodes=material.node_tree.nodes;links=material.node_tree.links;bs=nodes.get('Principled BSDF')
    # Replace procedural tile nodes; keep the Principled output and material settings.
    for node in list(nodes):
        if node!=bs and node.type!='OUTPUT_MATERIAL':nodes.remove(node)
    images={}
    for channel in ['albedo','normal','roughness']:
        image=bpy.data.images.load(str(root/'assets/textures/environment'/f'{kind}_{channel}.png'),check_existing=True)
        image.name=f'{kind} CC0 • {channel}'
        if channel!='albedo':image.colorspace_settings.name='Non-Color'
        image.pack();node=nodes.new('ShaderNodeTexImage');node.image=image;images[channel]=node
    links.new(images['albedo'].outputs['Color'],bs.inputs['Base Color'])
    links.new(images['roughness'].outputs['Color'],bs.inputs['Roughness'])
    normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.32
    links.new(images['normal'].outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
    material.use_backface_culling=True
