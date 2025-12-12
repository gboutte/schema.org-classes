const { defineConfig, globalIgnores } = require('eslint/config');

const tsParser = require('@typescript-eslint/parser');
const typescriptEslintEslintPlugin = require('@typescript-eslint/eslint-plugin');
const globals = require('globals');
const js = require('@eslint/js');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

module.exports = defineConfig([
    {

        files: ['**/*.ts'],
        ignores: [
            'dist/**',
        ],
        languageOptions: {
            parser: tsParser,
            sourceType: 'module',

            parserOptions: {
                project: 'tsconfig.json',
                tsconfigRootDir: __dirname,
            },

            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },

        plugins: {
            '@typescript-eslint': typescriptEslintEslintPlugin,
        },

        extends: compat.extends(
            'plugin:@typescript-eslint/recommended',
            'plugin:prettier/recommended',
        ),

        rules: {
            '@typescript-eslint/interface-name-prefix': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/typedef': [
                'error',
                {
                    arrayDestructuring: true,
                    arrowParameter: true,
                    memberVariableDeclaration: true,
                    objectDestructuring: true,
                    parameter: true,
                    propertyDeclaration: true,
                    variableDeclaration: true,
                    variableDeclarationIgnoreFunction: true,
                },
            ],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/explicit-member-accessibility': [
                'error',
                {
                    accessibility: 'explicit', // require explicit visibility
                    overrides: {
                        accessors: 'explicit',
                        constructors: 'off', // you may set to "explicit" if you want for constructors too
                        methods: 'explicit',
                        properties: 'explicit', // set to "explicit" if you want for class properties too
                        parameterProperties: 'explicit',
                    },
                },
            ],
            'prettier/prettier': [
                'error',
                {
                    useTabs: false,
                    tabWidth: 2,
                    trailingComma: 'all',
                    semi: true,
                    singleQuote: true,
                    printWidth: 80,
                    bracketSameLine: false,
                    bracketSpacing: true,
                    plugins: ['prettier-plugin-organize-imports'],
                },
            ],
        },
    },
    {
        files: ['out/**'],
        rules: {
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            'prettier/prettier': [
                'error',
                {
                    useTabs: false,
                    tabWidth: 2,
                    trailingComma: 'all',
                    semi: true,
                    singleQuote: true,
                    printWidth: 200,
                    bracketSameLine: false,
                    bracketSpacing: true,
                },
            ],
        },
    },
    globalIgnores(['**/.eslintrc.js']),
]);
