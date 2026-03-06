
import os
import sys

# Add backend to path to import services
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from dotenv import load_dotenv
from services.odoo_service import OdooClient
import re

load_dotenv('backend/.env')

def cleanup_notes():
    client = OdooClient()
    print("Conectando a Odoo para limpieza de notas...")
    
    # 1. Buscar todos los partners que sean clientes
    partner_ids = client.execute('res.partner', 'search', [('customer_rank', '>', 0)])
    print(f"Encontrados {len(partner_ids)} clientes.")
    
    if not partner_ids:
        return

    # 2. Leer comentarios
    partners = client.execute('res.partner', 'read', partner_ids, ['name', 'comment'])
    
    cleaned_count = 0
    for p in partners:
        original_comment = p.get('comment')
        if not original_comment or original_comment == 'False':
            continue
            
        new_comment = original_comment
        
        # 1. Quitar HTML tags si existen
        new_comment = re.sub(r'<[^>]+>', '', str(new_comment))
        
        # 2. Quitar variaciones de "Importado desde Excel" y códigos asociados
        # Removes "Importado desde Excel", "Importado desde Excel (Código: 123)", etc.
        new_comment = re.sub(r'Importado desde Excel.*(\n|$)', '', new_comment, flags=re.IGNORECASE)
        
        # 3. Quitar bloques de error de IA previos o duplicados
        # Buscamos el bloque completo si contiene "Error en análisis" o "Fallo técnico"
        if "--- [INTELIGENCIA AI" in new_comment or "--- [INVESTIGACION AI]" in new_comment:
            if "Error en análisis" in new_comment or "Fallo técnico" in new_comment or "Permission denied" in new_comment:
                # Usamos regex para quitar desde el inicio del bloque hasta el final del separador
                new_comment = re.sub(r'--- \[(INTELIGENCIA|INVESTIGACION) AI.*?-------------------------------', '', new_comment, flags=re.DOTALL)
                new_comment = re.sub(r'--- \[(INTELIGENCIA|INVESTIGACION) AI.*?--------------------------', '', new_comment, flags=re.DOTALL)
            
            # 4. Eliminar duplicados exactos del bloque de INVESTIGACION AI
            if new_comment.count("--- [INVESTIGACION AI] ---") > 1:
                blocks = re.split(r'(--- \[INVESTIGACION AI\] ---.*?--------------------------)', new_comment, flags=re.DOTALL)
                seen_blocks = set()
                final_parts = []
                for part in blocks:
                    if part.startswith("--- [INVESTIGACION AI] ---"):
                        if part not in seen_blocks:
                            seen_blocks.add(part)
                            final_parts.append(part)
                    else:
                        final_parts.append(part)
                new_comment = "".join(final_parts)
        
        new_comment = new_comment.strip()
        
        # 3. Guardar si ha cambiado
        if new_comment != original_comment:
            client.execute('res.partner', 'write', [p['id']], {'comment': new_comment})
            cleaned_count += 1
            
    print(f"✅ Limpieza completada. Se han modificado {cleaned_count} clientes.")

if __name__ == "__main__":
    cleanup_notes()
