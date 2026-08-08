with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
found = False
for line in lines:
    if 'import { comprehensiveMaterialsDB }' in line:
        if not found:
            new_lines.append(line)
            found = True
    else:
        new_lines.append(line)

with open('src/App.tsx', 'w') as f:
    f.writelines(new_lines)
