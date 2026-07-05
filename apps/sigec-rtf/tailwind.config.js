const preset = require('../../libs/theme/src/tailwind-preset.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: [
    'apps/sigec-rtf/src/**/*.{html,ts}',
    'libs/**/*.{html,ts}',
  ],
};
