import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import boundaries from 'eslint-plugin-boundaries';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

// K-16 · 'I'.toLowerCase() → 'i' ama 'İ'.toLowerCase() → 'i' + U+0307. Slug ve karşılaştırmada sessizce bozar.
const NO_LOWERCASE = {
  selector: "CallExpression[callee.property.name='toLowerCase']",
  message: "toLowerCase() yasak (K-16). Slug için '@/lib/slugify', görünen metin için toLocaleLowerCase('tr'|'en') kullanın.",
};

const SUPABASE_IMPORTS = {
  patterns: [
    {
      group: ['@supabase/*'],
      message: "Supabase istemcisi yalnız src/core/db ve src/modules/*/data içinde kullanılır (MSSQL geçişi, K-02).",
    },
  ],
};

const eslintConfig = [
  { ignores: ['node_modules/**', '.next/**', 'out/**', 'next-env.d.ts', 'experiments/**', '_archive/**', 'playwright-report/**', 'test-results/**'] },

  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true } },
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/**', mode: 'full' },
        { type: 'middleware', pattern: 'src/middleware.ts', mode: 'full' },
        // modül içi alt katmanlar: capture ile modül adı yakalanır → "kendi modülüm" ayrımı yapılabilir
        { type: 'module-site', pattern: 'src/modules/*/components/site/**', mode: 'full', capture: ['module'] },
        { type: 'module-admin', pattern: 'src/modules/*/components/admin/**', mode: 'full', capture: ['module'] },
        // index.ts: istemciye de inebilen public API · server.ts: yalnız sunucu (next/headers, cookies) public API
        { type: 'module-entry', pattern: ['src/modules/*/index.ts', 'src/modules/*/server.ts'], mode: 'full', capture: ['module'] },
        { type: 'module', pattern: 'src/modules/*/**', mode: 'full', capture: ['module'] },
        { type: 'core', pattern: 'src/core/**', mode: 'full' },
        { type: 'i18n', pattern: 'src/i18n/**', mode: 'full' },
        { type: 'ui-site', pattern: 'src/ui/**', mode: 'full' },
        { type: 'ui-admin', pattern: 'src/components/ui/**', mode: 'full' },
        { type: 'lib', pattern: 'src/lib/**', mode: 'full' },
        { type: 'types', pattern: 'src/types/**', mode: 'full' },
      ],
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          message: '${file.type} → ${dependency.type} yönü yasak. Bkz. docs/architecture/01-OVERVIEW.md',
          rules: [
            // app → modules → core ✅
            { from: 'app', allow: ['module-entry', 'core', 'i18n', 'ui-site', 'ui-admin', 'lib', 'types'] },
            { from: 'middleware', allow: ['core', 'i18n', 'lib'] },

            // modül kendi içinde serbest; başka modüle YALNIZ index.ts üzerinden
            { from: ['module', 'module-site', 'module-admin', 'module-entry'], allow: ['module-entry', 'core', 'i18n', 'lib', 'types'] },
            { from: ['module', 'module-entry'], allow: [['module', { module: '${from.module}' }], ['module-site', { module: '${from.module}' }], ['module-admin', { module: '${from.module}' }]] },
            { from: 'module-site', allow: [['module', { module: '${from.module}' }], ['module-site', { module: '${from.module}' }], 'ui-site'] },
            // shadcn yalnız admin'e ait; site ↔ admin çapraz import yok (02-STYLE-ISOLATION)
            { from: 'module-admin', allow: [['module', { module: '${from.module}' }], ['module-admin', { module: '${from.module}' }], 'ui-admin'] },

            // core → modules ❌
            { from: 'core', allow: ['core', 'i18n', 'lib', 'types'] },
            { from: 'i18n', allow: ['i18n', 'lib', 'types'] },
            { from: 'ui-site', allow: ['ui-site', 'i18n', 'core', 'lib', 'types'] },
            { from: 'ui-admin', allow: ['ui-admin', 'lib', 'types'] },
            { from: 'lib', allow: ['lib', 'types'] },
            { from: 'types', allow: ['types'] },
          ],
        },
      ],
      'no-restricted-syntax': ['error', NO_LOWERCASE],
      'no-restricted-imports': ['error', SUPABASE_IMPORTS],
    },
  },

  // Supabase'e dokunmasına izin verilen iki yer
  {
    files: ['src/core/db/**/*.{ts,tsx}', 'src/modules/*/data/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
];

export default eslintConfig;
