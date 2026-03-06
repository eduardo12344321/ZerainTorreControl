# Zerain Frontend - React + TypeScript + Vite

Este proyecto utiliza una configuración mínima para hacer funcionar React en Vite con HMR (Hot Module Replacement) y reglas de ESLint.

## Tecnologías Principales

- **React**: Biblioteca para la interfaz de usuario.
- **TypeScript**: Tipado estático para mayor seguridad.
- **Vite**: Herramienta de construcción ultra rápida.
- **Tailwind CSS**: Framework de estilos (configurado para Zerain).

## Plugins Oficiales Utilizados

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react): utiliza [Babel](https://babeljs.io/) para Fast Refresh.
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc): utiliza [SWC](https://swc.rs/) para Fast Refresh.

## Configuración de Desarrollo

Para ejecutar el frontend localmente:

```bash
cd frontend
npm install
npm run dev
```

El servidor se iniciará por defecto en el puerto `7500` (configurado en `STARTUP_GUIDE.md`).

## Reglas de Estilo y Calidad

El proyecto incluye configuraciones de ESLint para asegurar un código limpio y consistente, especialmente enfocado en reglas de tipos de TypeScript y mejores prácticas de React.

