module.exports = {
  root: true,
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true
  },
  extends: 'eslint:recommended',
  overrides: [
    {
      env: {
        node: true,
        browser: true,
        commonjs: true,
        es6: true
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script'
      }
    }
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    requireConfigFile: false
  },
  parser: '@babel/eslint-parser',
  rules: {
    'no-extra-semi': 'error',
  },
  globals: {}
}
