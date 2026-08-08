import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

target = r'(<h5 className="text-\[11px\] font-black text-black font-display uppercase tracking-wide">\s*\{prod\.name\}\s*</h5>\s*<p className="text-\[9\.5px\] text-black/85 leading-relaxed">\s*\{prod\.description\}\s*</p>\s*)\{\/\* Price range indicator to emphasize variability\/fluctuation \*\/\}\s*<div className="pt-2">'

replacement = r'''\1
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1 py-1 text-[8px] font-mono text-black uppercase border-b-2 border-black/10 pb-2">
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Formato:</span> <span className="font-black">{prod.saleFormat}</span></div>
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Longitud:</span> <span className="font-black">{prod.length}</span></div>
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Grosor:</span> <span className="font-black">{prod.thickness}</span></div>
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Calibre:</span> <span className="font-black">{prod.caliber}</span></div>
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Tipo:</span> <span className="font-black">{prod.type}</span></div>
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Tamaño:</span> <span className="font-black">{prod.specificSize}</span></div>
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Color:</span> <span className="font-black">{prod.color}</span></div>
                                <div className="flex flex-col"><span className="text-gray-400 font-bold">Peso:</span> <span className="font-black">{prod.weightKg ? prod.weightKg.toFixed(2) : "0.00"} kg</span></div>
                              </div>
                              {/* Price range indicator to emphasize variability/fluctuation */}
                              <div className="pt-2">'''

new_content = re.sub(target, replacement, content, count=1)
if new_content == content:
    print("No change")
else:
    with open('src/App.tsx', 'w') as f:
        f.write(new_content)
    print("Changed")
