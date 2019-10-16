module.exports = {
    extends: [
        'plugin:import/typescript'
    ],
    env: {
        browser: true,
        es6: true
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
        ecmaFeatures: {
            jsx: true // Allows for the parsing of JSX
        }
    },
    plugins: [
        "@typescript-eslint",
        //"@typescript-eslint/tslint",
        "react",
        "react-hooks",
        "import"
    ],
    rules: {
        'react/jsx-filename-extension': [2, { extensions: ['.js', '.jsx', '.ts', '.tsx'] }],
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/class-name-casing": "error",
        "import/no-extraneous-dependencies": [
            "error",
            { "devDependencies": ["**/webpack.*", "**/test/*", "**/*.test.js", "**/*.spec.js"] }
        ],
        "brace-style": "off",
        "@typescript-eslint/brace-style": [
            "error",
            "1tbs",
            {
                allowSingleLine: true
            }
        ],
        curly: "error",
        eqeqeq: [
            "error",
            "always"
        ],
        "semi": "off",
        "@typescript-eslint/semi": ["error", "always"],
        "no-throw-literal": "error",
    },
    settings: {
        react: {
            version: 'detect' // Tells eslint-plugin-react to automatically detect the version of React to use
        },
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/resolver': {
            typescript: {},
        },
    }
};
