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

If everything runs smoothly, the file amd/src/cm6pro-lazy.js will be generated. Then, you must compile it using the command `npx grunt amd`. The resulting minified version of this file will be lazy loaded on demand when the code editor is opened.