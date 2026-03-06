---
description: Deploy to production VM server (torrecontrolz.duckdns.org)
---

# /deploy - Despliegue al Servidor de Producción

## ⚠️ REGLAS IMPORTANTES

1. **NUNCA usar `deploy_gcp.ps1`** — ese script despliega en Cloud Run, que NO es el servidor de producción.
2. **SIEMPRE usar `deploy_vm_easy.ps1`** — ese script despliega en la VM (34.175.130.229) que es donde apunta `torrecontrolz.duckdns.org`.
3. **El deploy tarda ~10 minutos** — no cancelar el proceso.
4. **Probar en local primero** — solo desplegar cuando el usuario lo pida explícitamente.

## Servidor de Producción

| Dato | Valor |
|------|-------|
| VM | `instance-20260206-232504` |
| Zona | `europe-southwest1-c` |
| IP | `34.175.130.229` |
| Dominio | `torrecontrolz.duckdns.org` |
| Script | `deploy_vm_easy.ps1` |

## Comando de Deploy

// turbo
```powershell
.\deploy_vm_easy.ps1 -InstanceName instance-20260206-232504
```

## Verificación Post-Deploy

Después de que aparezca `SUCCESS: SISTEMA ONLINE Y SEGURO!`:
1. Abrir `https://torrecontrolz.duckdns.org` en ventana de incógnito (evita caché)
2. Verificar que los cambios están visibles
