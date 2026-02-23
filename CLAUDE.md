# Quick Zap - Instrucciones para Claude Code

## Regla #1 — Cierre obligatorio de cada tarea
Al terminar CUALQUIER tarea, siempre escribe:
"✅ Listo. [resumen de cambios]. Commit: [hash]"
Esta regla es innegociable y aplica sin excepción.

## Al terminar cualquier tarea
Siempre termina con: "✅ Listo. [resumen de cambios]. Commit: [hash]"
## Stack
- Next.js 14, MongoDB Atlas, Web Push, PWA
- Deploy: Vercel (auto-deploy desde GitHub)
- Cron: cron-job.org cada minuto
## Push a GitHub
git remote set-url origin "https://TOKEN@github.com/cdgzkid-dotcom/wa-quick.git" && git push origin main && git remote set-url origin "https://github.com/cdgzkid-dotcom/wa-quick.git"
## Reglas importantes
- NO tocar archivos que no sean necesarios para la tarea
- NO cambiar estilos ni componentes fuera del scope pedido
- Siempre hacer npx tsc --noEmit antes de commit
