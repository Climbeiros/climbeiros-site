import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.climbeiros.com.br',
  output: 'static',
  integrations: [sitemap()],
});
