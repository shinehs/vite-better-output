# 这是一个vite插件 ✿
## betterOutput 输出更好的目录结构
补足vite打包后assets目录仅有一层的尴尬，解决rollup配置assetFileNames: '[ext]/[name]-[hash].[ext]' 会导致css内部引入的资源路径错误的问题。

## 更美观和符合直觉的输出目录
    - dist
    - - css
    - - fonts
    - - images
    - - js
    - index.html
使用方式/通用配置
yarn add vite-plugin-better-output
```js
import betterOutput from 'vite-plugin-better-output'

return defineConfig({
    base: './',
    plugins: [
      betterOutput({
        css: 'css', // 默认值css
        font: 'fonts', // 默认值fonts
        js: 'js', // 默认值js
        img: 'images' // 默认值images
      })
    ]
    ...
})
```
#### 1.0.6 开始 兼容动态模块
#### 有任何疑问或者意见，欢迎来撩v:k489561227。