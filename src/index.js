import { patchPath, buildOutPutPath, rebuildChunkAssets } from './pathConverter';

const fs = require('fs');

const pluginName = 'vite-better-output';
const styleFileReg = `\\.(css)$`;
const defHTMLName = 'index.html';
const imgExtensions = /\.(png|jpg|jpeg|gif|svg)$/;
const viteAssetsReg = /__VITE_ASSET__(\w*)__/

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
    transform(code, id){
      // 对模块中手动引入的图片等资源做重新匹配
      if (imgExtensions.test(id) && viteAssetsReg.test(code)) {
        const hash = code.match(new RegExp(viteAssetsReg,'i'))[1];
        const fileName = id.match(new RegExp(/[^\/]*.(png|jpg|jpeg|gif|svg)$/,'i'))[0]
        const newFileName = fileName.replace(new RegExp(/(.*).(png|jpg|jpeg|gif|svg)$/,'i'), ($1,$2,$3)=>{
          return `${$2}.${hash}.${$3}`
        })
        return `export default "./${img}/${newFileName}"`
      }
    },
    outputOptions(outputOptions) {
      // 重置配置，否则动态模块的mapping会错误
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
        
        // 异步模块资源路径
        if (bundle[id].isEntry || bundle[id].isDynamicEntry) {
          const {importedAssets, importedCss} = rebuildChunkAssets(bundle[id].viteMetadata,configCssPath)
          bundle[id].viteMetadata.importedAssets = importedAssets
          bundle[id].viteMetadata.importedCss = importedCss
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
