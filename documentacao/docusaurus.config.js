// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'SuínoNutri',
  tagline: 'Ração de custo mínimo para suínos com Programação Linear',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: 'https://luizfelipedev19.github.io',
  baseUrl: '/Programacao-Linear/',
  organizationName: 'luizfelipedev19',
  projectName: 'Programacao-Linear',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],
  clientModules: ['./src/clientModules/d3-transition.js'],

  i18n: {
    defaultLocale: 'pt-BR',
    locales: ['pt-BR'],
  },

  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
      type: 'text/css',
    },
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          // a documentação é o site inteiro: abre direto na introdução
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'SuínoNutri',
        logo: {alt: 'SuínoNutri', src: 'img/logo.png'},
        items: [
          {
            href: 'https://github.com/luizfelipedev19/Programacao-Linear',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: 'Fatec Mococa · Programação Linear · SuínoNutri',
      },
      docs: {
        sidebar: {hideable: true},
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'sql', 'json'],
      },
    }),
};

export default config;
