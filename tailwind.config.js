/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            colors: {
                bg: 'rgb(var(--color-bg) / <alpha-value>)',
                surface: 'rgb(var(--color-surface) / <alpha-value>)',
                'surface-light': 'rgb(var(--color-surface-light) / <alpha-value>)',
                primary: 'rgb(var(--color-primary) / <alpha-value>)',
                danger: 'rgb(var(--color-danger) / <alpha-value>)',
                warning: 'rgb(var(--color-warning) / <alpha-value>)',
                success: 'rgb(var(--color-success) / <alpha-value>)',
                text: 'rgb(var(--color-text) / <alpha-value>)',
                'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
                'text-tertiary': 'rgb(var(--color-text-tertiary) / <alpha-value>)',
                muted: 'rgb(var(--color-muted) / <alpha-value>)',
                border: 'rgb(var(--color-border) / <alpha-value>)',
                'review-bg': 'rgb(var(--color-review-bg) / <alpha-value>)',
                'review-text': 'rgb(var(--color-review-text) / <alpha-value>)',
                'archive-bg': 'rgb(var(--color-archive-bg) / <alpha-value>)',
                'archive-text': 'rgb(var(--color-archive-text) / <alpha-value>)',
            },
        },
    },
    plugins: [],
};