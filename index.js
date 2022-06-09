'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const postcss = require('postcss');

const prosReg = /^background(\-image){0,1}$|^font(\-face){0,1}$/i;
const imgExtensions = /(png|jpg|jpeg|webp|gif|svg)$/i;

const jsReg = `\\.js$`;
const jscssReg = `\\.(js|css)$`;
const fontReg = `(ttf|woff|woff2|eot)$`;
const imgReg = `(png|jpg|jpeg|webp|gif)`;

const allTypeReg = `^\\w+(\?=\/)`;

const replaceCfgPaths = (value, options) => {
  const { img, font } = options;

  return value.replace(fileTypeRef, ($1, $2) => {
    return `./${(imgExtensions.test($2) ? img : font) || 'assets'}${$1}`;
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

const buildOutPutPath = (fileName, opts) => {
  const { js, css, img, font } = opts;
  let res = '';
  if (new RegExp(jscssReg, 'i').test(fileName)) {
    res = fileName.replace(new RegExp(allTypeReg, 'i'), ($1) =>
      (new RegExp(jsReg, 'i').test(fileName) ? js : css) || $1
    );
  } else if (new RegExp(imgReg, 'i').test(fileName)) {
    res = fileName.replace(new RegExp(allTypeReg, 'i'), ($1) => img || $1);
  } else if (new RegExp(fontReg, 'i').test(fileName)) {
    res = fileName.replace(new RegExp(allTypeReg, 'i'), ($1) => font || $1);
  }
  return res;
};

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

exports["default"] = betterOutput;
