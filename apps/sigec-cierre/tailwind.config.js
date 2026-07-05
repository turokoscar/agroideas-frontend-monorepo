const preset = require('../../libs/theme/src/tailwind-preset.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: [
    'apps/sigec-cierre/src/**/*.{html,ts}',
    'libs/**/*.{html,ts}',
  ],
};
