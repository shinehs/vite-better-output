const postcss = require('postcss');

const prosReg = /^background(\-image){0,1}$|^font(\-face){0,1}$/i;
const imgExtensions$1 = /(png|jpg|jpeg|webp|gif|svg)$/i;

const jsReg = `\\.js$`;
const jscssReg = `\\.(js|css)$`;
const fontReg = `(ttf|woff|woff2|eot)$`;
const imgReg = `(png|jpg|jpeg|webp|gif)`;
const fileTypeRef = /(?=\/).*(png|jpg|jpeg|webp|gif|svg|ttf|woff|woff2|eot)/i;

const allTypeReg = `^\\w+(\?=\/)`;

const replaceCfgPaths = (value, options) => {
  const { img, font } = options;

  return value.replace(fileTypeRef, ($1, $2) => {
    return `./${(imgExtensions$1.test($2) ? img : font) || 'assets'}${$1}`;
  });
};

const patchPath = (code, opts) => {
  const postCssAST = postcss.parse(code);

  postCssAST.walkAtRules((rule) => {
    rule.walkDecls((decl, i) => {
      decl.value = replaceCfgPaths(decl.value, opts);
    });
  });

  postCssAST.walkRules((rule) => {
    rule.walkDecls((decl, i) => {
      if (prosReg.test(decl.prop)) {
        decl.value = replaceCfgPaths(decl.value, opts);
      }
    });
  });

  return postcss.parse(postCssAST).source.input.css.toString();
};

const buildOutPutPath = (bundle, opts) => {
  const { fileName, viteMetadata } = bundle;
  const { js, css, img, font } = opts;
  let res = '';

  if (new RegExp(jscssReg, 'i').test(fileName)) {
    res = fileName.replace(
      new RegExp(allTypeReg, 'i'),
      ($1) => (new RegExp(jsReg, 'i').test(fileName) ? js : css) || $1
    );
  } else if (new RegExp(imgReg, 'i').test(fileName)) {
    res = fileName.replace(new RegExp(allTypeReg, 'i'), ($1) => img || $1);
  } else if (new RegExp(fontReg, 'i').test(fileName)) {
    res = fileName.replace(new RegExp(allTypeReg, 'i'), ($1) => font || $1);
  }
  return res;
};
const rebuildChunkAssets = (viteMetadata, configCssPath) => {
  const { importedAssets = new Set([]), importedCss = new Set([]) } = viteMetadata;
  const assetsArr = [];
  const cssArr = [];
  importedAssets.forEach((value) => {
    assetsArr.push(value.replace(new RegExp(allTypeReg, 'i'), configCssPath));
  });
  importedCss.forEach((value) => {
    cssArr.push(value.replace(new RegExp(allTypeReg, 'i'), configCssPath));
  });
  viteMetadata.importedAssets = new Set(assetsArr);
  viteMetadata.importedCss = new Set(cssArr);
  return {
    importedAssets: new Set(assetsArr),
    importedCss: new Set(cssArr)
  }
};

const fs = require('fs');

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
  const { css: configCssPath, js ,img } = opts;
  return {
    name: pluginName,
    transform(code, id){
      // ?????????????????????????????????????????????????????????
      if (imgExtensions.test(id) && viteAssetsReg.test(code)) {
        const hash = code.match(new RegExp(viteAssetsReg,'i'))[1];
        const fileName = id.match(new RegExp(/[^\/]*.(png|jpg|jpeg|gif|svg)$/,'i'))[0];
        const newFileName = fileName.replace(new RegExp(/(.*).(png|jpg|jpeg|gif|svg)$/,'i'), ($1,$2,$3)=>{
          return `${$2}.${hash}.${$3}`
        });
        return `export default "./${img}/${newFileName}"`
      }
    },
    outputOptions(outputOptions) {
      // ????????????????????????????????????mapping?????????
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
        
        // ????????????????????????
        if (bundle[id].isEntry || bundle[id].isDynamicEntry) {
          const {importedAssets, importedCss} = rebuildChunkAssets(bundle[id].viteMetadata,configCssPath);
          bundle[id].viteMetadata.importedAssets = importedAssets;
          bundle[id].viteMetadata.importedCss = importedCss;
        }

        // css????????????
        if (new RegExp(styleFileReg, 'i').test(id)) {
          const replacementStylesCode = patchPath(bundle[id].source, opts);
          bundle[id].source = replacementStylesCode;
        }
      });

      return bundle;
    },
    /**
     * ????????????????????????html????????????css?????????????????????this.emitFile?????????????????????
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

export { betterOutput as default };
