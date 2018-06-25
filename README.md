# Vue CLI Plugin Browser Sync

A Vue Cli 3 plugin for BrowserSync with no required configuration that uses [Browser Sync](https://browsersync.io/) with [webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware) and [webpack-hot-middleware](https://github.com/webpack-contrib/webpack-hot-middleware).

## Install

Open a terminal in the directory of your app created with Vue-CLI 3.

Then, install `vue-cli-plugin-browser-sync` by running:

```ps
vue add browser-sync
```

That's It! You're ready to go!

## Starting a development server

If you use [Yarn](https://yarnpkg.com/en/) (strongly recommended):

```ps
yarn serve:bs
```

or if you use NPM:

```ps
npm run serve:bs
```

## BrowserSync Configuration

To see avalible options, check out [Browsersync options](https://browsersync.io/docs/options)

Configuration options can be specified via the optional [`vue.config.js`](https://cli.vuejs.org/config/#vue-config-js) file in the `pluginOptions.browserSync` property.

```javascript
// vue.config.js
module.exports = {
  pluginOptions: {
    browserSync: {
      // ... BrowserSync options
    }
  }
};
```
