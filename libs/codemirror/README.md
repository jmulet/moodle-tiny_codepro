# Build codemirror dependency

In order to generate the dependency on codemirror (version 6), we need to use rollup to convert the ES6 modules provided by the library into a UMD bundle. This process will basically generate a wrapper around the codemirror editor that will be imported by the plugin.

Simply install the npm dependencies

```
npm install
```

And run the job defined in the `rollup.config.js` file

```
npm run build
```

If everything runs smoothly, the file libs/codemirror/dist/cm6pro.min.js will be generated. This very same file will be lazy loaded by the codePro plugin.