/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                zerain: {
                    blue: {
                        light: '#3B82F6', // Draft / Info
                        DEFAULT: '#1E40AF', // Planned
                    },
                    orange: '#F97316', // In Progress
                    green: '#22C55E', // Completed
                    red: '#EF4444', // Incident
                }
            }
        },
    },
    plugins: [],
}
