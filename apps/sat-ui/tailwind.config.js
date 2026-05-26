const preset = require('../../libs/theme/src/tailwind-preset.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: [
    'apps/sat-ui/src/**/*.{html,ts}',
    'libs/**/*.{html,ts}', // escanea las clases de @agroideas/ui y demás libs
  ],
};
