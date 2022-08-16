const postcss = require('postcss');

const prosReg = /^background(\-image){0,1}$|^font(\-face){0,1}$/i;
const imgExtensions = /(png|jpg|jpeg|webp|gif|svg)$/i;

const jsReg = `\\.js$`;
const jscssReg = `\\.(js|css)$`;
const fontReg = `(ttf|woff|woff2|eot)$`;
const imgReg = `(png|jpg|jpeg|webp|gif)`;
const fileTypeRef = /(?=\/).*(png|jpg|jpeg|webp|gif|svg|ttf|woff|woff2|eot)/i;

const allTypeReg = `^\\w+(\?=\/)`;

const replaceCfgPaths = (value, options) => {
  const { img, font } = options;

  return value.replace(fileTypeRef, ($1, $2) => {
    return `./${(imgExtensions.test($2) ? img : font) || 'assets'}${$1}`;
  });
};

export const patchPath = (code, opts) => {
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

export const buildOutPutPath = (bundle, opts) => {
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
export const rebuildChunkAssets = (viteMetadata, configCssPath) => {
  const { importedAssets = new Set([]), importedCss = new Set([]) } =
    viteMetadata;
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
  };
};

export const loaderConverter = (str) => {
  const reg = /\.\/[^>]+\.*\.css?/g;
  let pos = 0;
  let current;
  let arr = [];
  while ((current = reg.exec(str))) {
    let [matchUrl, g] = current;

    let last = reg.lastIndex - matchUrl.length;
    arr.push(str.slice(pos, last));
    pos = reg.lastIndex;
    arr.push(matchUrl.replace(/assets/, 'css'));
  }
  arr.push(str.slice(pos));
  return arr.join('');
};
