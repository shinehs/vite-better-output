import {
  patchPath,
  buildOutPutPath,
  rebuildChunkAssets,
  loaderConverter
} from './pathConverter';

const fs = require('fs');
const path = require('path');

const pluginName = 'vite-better-output';
const styleFileReg = `\\.(css)$`;
const defHTMLName = 'index.html';
const imgExtensions = /\.(png|jpg|jpeg|gif|svg)$/;
const viteAssetsReg = /__VITE_ASSET__(\w*)__/;

const defConfig = {
  js: 'js',
  css: 'css',
  img: 'images'
};

function betterOutput(options) {
  const opts = Object.assign(defConfig, options);
  const { css: configCssPath, js, img } = opts;
  return {
    name: pluginName,
    transform(code, id) {
      // 对模块中手动引入的图片等资源做重新匹配
      if (imgExtensions.test(id) && viteAssetsReg.test(code)) {
        const hash = code.match(new RegExp(viteAssetsReg, 'i'))[1];
        const fileName = id.match(
          new RegExp(/[^\/]*.(png|jpg|jpeg|gif|svg)$/, 'i')
        )[0];
        const newFileName = fileName.replace(
          new RegExp(/(.*).(png|jpg|jpeg|gif|svg)$/, 'i'),
          ($1, $2, $3) => {
            return `${$2}.${hash}.${$3}`;
          }
        );
        return `export default "./${img}/${newFileName}"`;
      }
    },
    outputOptions(outputOptions) {
      // 重置配置，否则动态模块的mapping会错误
      return Object.assign(outputOptions, {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js'
      });
    },
    generateBundle(_, bundle) {
      Object.keys(bundle).forEach((id) => {
        const replacementFileName = buildOutPutPath(bundle[id], opts);
        bundle[id].fileName = replacementFileName;

        // 异步模块资源路径
        if (bundle[id].isEntry || bundle[id].isDynamicEntry) {
          const { importedAssets, importedCss } = rebuildChunkAssets(
            bundle[id].viteMetadata,
            configCssPath
          );
          bundle[id].viteMetadata.importedAssets = importedAssets;
          bundle[id].viteMetadata.importedCss = importedCss;
        }

        // css文件处理
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
      fs.readdirSync(dir).forEach((file) => {
        const pathname = path.join(dir, file);
        if (!fs.statSync(pathname).isDirectory() && file.endsWith('.html')) {
          const fileContent = fs.readFileSync(pathname, 'utf-8');
          const htmlStr = loaderConverter(fileContent);
          fs.writeFileSync(pathname, htmlStr, 'utf-8');
        }
      });
    }
  };
}

export default betterOutput;
