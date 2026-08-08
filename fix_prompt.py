import re
with open('server.ts', 'r') as f:
    content = f.read()

target = r"""SISTEMA MATEMÁTICO INTEGRADO DE ARÍSTIDES (MATEMÁTICAS REALES):
¡ALERTA MÁXIMA!: El usuario requiere rigor matemático absoluto. Cuando expliques la física del sistema, debes usar funciones y ecuaciones estructurales verdaderas, con simbología real, unidades precisas y la demostración detallada paso a paso del orden del despeje algebraico. Nunca hables de forma vaga de la resistencia o flexión. Usa siempre las ecuaciones de la simulación que rigen el visor 3D interactivo actual:"""

replacement = r"""SISTEMA MATEMÁTICO INTEGRADO DE ARÍSTIDES (MATEMÁTICAS REALES Y ORTODOXAS):
¡ALERTA MÁXIMA!: El usuario requiere rigor matemático absoluto. Tienes PROHIBIDO ESTRICTAMENTE inventar simbología, usar notación poco ortodoxa o inexistente. DEBES ceñirte exclusivamente a la simbología y nomenclatura de ingeniería universal (ISO/ANSI, Mecánica del Continuo y FEA: σ para esfuerzo, ε para deformación, E para Módulo de Young, K para rigidez, FoS para Factor de Seguridad, FDM, etc.). Cuando expliques la física del sistema, debes usar funciones y ecuaciones estructurales verdaderas, con simbología real, unidades precisas y la demostración detallada paso a paso del orden del despeje algebraico. Nunca hables de forma vaga de la resistencia o flexión. Usa siempre las ecuaciones de la simulación que rigen el visor 3D interactivo actual:"""

new_content = content.replace(target, replacement)

if new_content == content:
    print("NO MATCH FOUND")
else:
    with open('server.ts', 'w') as f:
        f.write(new_content)
    print("SUCCESS")
