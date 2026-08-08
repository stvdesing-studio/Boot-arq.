import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

target = r'''    if (savedProducts) {
      try {
        setProducts(JSON.parse(savedProducts));
      } catch (e) {
        console.error(e);
      }
    } else {'''

replacement = r'''    if (savedProducts) {
      try {
        const parsed = JSON.parse(savedProducts);
        // Force refresh if old schema detected
        if (parsed.length > 0 && parsed[0].family === undefined) {
          setProducts(comprehensiveMaterialsDB);
          localStorage.setItem("stv_catalog_products", JSON.stringify(comprehensiveMaterialsDB));
        } else {
          setProducts(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    } else {'''

content = content.replace(target, replacement)
with open('src/App.tsx', 'w') as f:
    f.write(content)
