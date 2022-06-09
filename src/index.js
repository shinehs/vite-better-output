import { patchPath, buildOutPutPath } from './pathConverter';

const fs = require('fs');

const pluginName = 'vite-better-output';
const styleFileReg = `\\.(css)$`;
const defHTMLName = 'index.html';
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
    generateBundle(_, bundle) {
      Object.keys(bundle).forEach((id) => {
        const replacementFileName = buildOutPutPath(
          bundle[id].fileName,
          opts
        );
        bundle[id].fileName = replacementFileName;

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
    writeBundle(options, _) {
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
