const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { execSync } = require('child_process');
const fs = require('fs');
const { Packer } = require('roadroller');
const { strict } = require('assert'); 

module.exports = {
  mode: 'production',
  entry: './main.js',  // Your main entry file
  output: {
    filename: 'bundle.js',  // Intermediate bundle output
    path: path.resolve(__dirname, 'dist'),  // Output directory
  },
  resolve: {
    extensions: ['.js'],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 2021,  // Modern JavaScript (ES6+)
          compress: {
            drop_console: true,
            drop_debugger: true,
            passes: 3,
            toplevel: true,
            unsafe: true,
            pure_funcs: ['console.log'],
          },
          output: {
            comments: false,
          },
          mangle: {
            toplevel: true,
            properties: {
              regex: /^[a-zA-Z_]\w*$/,  // Mangle all properties that match this regex
            },
          },
        },
      }),
    ],
    usedExports: true,  // Enable tree-shaking
    sideEffects: false,  // Assume no side effects in modules for better tree-shaking
  },
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tapAsync('AfterBuildPlugin', async (compilation, callback) => {
          try {
            console.log('Running Closure Compiler...');
            execSync('npx google-closure-compiler --js dist/bundle.js --js_output_file dist/bundle.cc.js --compilation_level ADVANCED --language_out=ECMASCRIPT_2021 --jscomp_off=* --assume_function_wrapper --externs externs.js', { maxBuffer: 1024 * 1024 * 10 });
            console.log('Closure Compiler step complete.');

            console.log('Running UglifyJS...');
            execSync('npx uglify-js dist/bundle.cc.js -o dist/bundle.min.js --compress --mangle', { maxBuffer: 1024 * 1024 * 10 });
            console.log('UglifyJS step complete.');

            console.log('Running Roadroller...');
            const inputFile = fs.readFileSync('dist/bundle.min.js', 'utf-8');

            const inputs = [
              {
                data: inputFile,
                type: 'js',
                action: 'eval',
              },
            ];

            const options = {
              dictionarySize: 8192, 
              usedDictionary: 8192, 
            };

            const packer = new Packer(inputs, options);
            await packer.optimize(2);

            const { firstLine, secondLine } = packer.makeDecoder();
            fs.writeFileSync('dist/bundle.roadrolled.js', firstLine + secondLine);
            console.log('Roadroller compression complete.');
            callback();
          } catch (error) {
            console.error('An error occurred during the build process:', error);
            callback(error);
          }
        });
      },
    },
  ],
};