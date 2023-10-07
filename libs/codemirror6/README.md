# CodeMirror6 Dependency

In order to generate the dependency on codeMirror6, we need to use rollup to convert the modules provided by the library into a UMD bundle.

Simply install the npm dependencies

```
npm install
```

And run the job defined in the `rollup.config.js` file

```
npm run build
```

If everything runs smoothly, the file vendor/codemirror6/dist/cm6pro.min.js will be generated. This very same file will be lazy loaded by the codePro plugin.