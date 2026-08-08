import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add import at the top
if 'comprehensiveMaterialsDB' not in content:
    content = content.replace('import { STVBlueprintData, STVMaterialItem } from "./types";', 'import { STVBlueprintData, STVMaterialItem } from "./types";\nimport { comprehensiveMaterialsDB } from "./data/materialsDB";')

# Replace the initialProducts block
target = r'''      const initialProducts: ProductItem\[\] = \[.*?\];'''

replacement = r'''      const initialProducts: ProductItem[] = comprehensiveMaterialsDB;'''

new_content = re.sub(target, replacement, content, flags=re.DOTALL)
with open('src/App.tsx', 'w') as f:
    f.write(new_content)
