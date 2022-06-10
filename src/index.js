import { patchPath, buildOutPutPath } from './pathConverter';

const fs = require('fs');
const path = require('path');

const pluginName = 'vite-better-output';
const chunkFileReg = `\\.js$`
const styleFileReg = `\\.(css)$`;
const defHTMLName = 'index.html';

const allTypeReg = `^\\w+(\?=\/)`;
const defConfig = {
  js: 'js',
  css: 'css',
  img: 'images'
};

function betterOutput(options) {
  const opts = Object.assign(defConfig, options);
  const { css: configCssPath, js ,img } = opts;
  return {
    name: pluginName,
    outputOptions(outputOptions) {
      return Object.assign(outputOptions, {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js'
      })
    },
 
    generateBundle(_, bundle) {
      Object.keys(bundle).forEach((id) => {
        const replacementFileName = buildOutPutPath(
          bundle[id],
          opts
        );

        bundle[id].fileName = replacementFileName;
        
        // 异步模块
        if (bundle[id].isEntry || bundle[id].isDynamicEntry) {
          const {importedAssets = new Set([]), importedCss = new Set([])} = bundle[id].viteMetadata
          const assetsArr = [];
          const cssArr = []
          importedAssets.forEach(value => {
            assetsArr.push(value.replace(new RegExp(allTypeReg, 'i'), configCssPath))
          })
          importedCss.forEach(value => {
            cssArr.push(value.replace(new RegExp(allTypeReg, 'i'), configCssPath))
          })
          bundle[id].viteMetadata.importedAssets = new Set(assetsArr)
          bundle[id].viteMetadata.importedCss = new Set(cssArr)
        }
        
        if (new RegExp(styleFileReg, 'i').test(id)) {
          const replacementStylesCode = patchPath(bundle[id].source, opts);
          bundle[id].source = replacementStylesCode;
        }
      });

      return bundle;
    },
    /**
     * 在输出文件后，给html中引入的css文件修正路径，this.emitFile无效，无法覆盖
     */
    writeBundle(options, bundle) {
      const { dir } = options;
      const fileContent = fs.readFileSync(`${dir}/index.html`, 'utf-8');
      const data = fileContent.replace(
        /.(\/assets)\/(.*.css)/,
        ($1, $2, $3) => {
          return `./${configCssPath}/${$3}`;
        }
      );
      fs.writeFileSync(`${dir}/${defHTMLName}`, data, 'utf-8');
    }
  };
}

export default betterOutput;
