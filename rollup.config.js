const pkg = require('./package.json');

export default {
  input: 'src/index.js',
  output: [
    { file : pkg['main'], format: 'cjs', exports : 'named' },
    { file : pkg['module'] ,format: 'es'}
  ],
  external: ['fs', 'path'],
  plugins: []
}