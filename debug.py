with open('src/App.tsx', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "h5 className=\"text-[11px] font-black text-black font-display uppercase tracking-wide\"" in line:
        for j in range(5):
            print(repr(lines[i+j]))
