const {
  info,
  hasYarn,
  openBrowser,
  IpcMessenger
} = require('@vue/cli-shared-utils')

const defaults = {
  host: '0.0.0.0',
  port: 8080,
  https: false
}

module.exports = (api, options) => {
  api.registerCommand('serve:bs', {
    description: 'start development server',
    usage: 'vue-cli-service serve:bs [options] [entry]',
    options: {
      '--open': `open browser on server start`,
      '--copy': `copy url to clipboard on server start`,
      '--mode': `specify env mode (default: development)`,
      '--host': `specify host (default: ${defaults.host})`,
      '--port': `specify port (default: ${defaults.port})`,
      '--https': `use https (default: ${defaults.https})`
    }
  }, async args => {
    info('Starting development server...')

    // although this is primarily a dev server, it is possible that we
    // are running it in a mode with a production env, e.g. in E2E tests.
    const isProduction = process.env.NODE_ENV === 'production'

    const chalk = require('chalk')
    const webpack = require('webpack')
    const BrowserSync = require('browser-sync')
    const WebpackDevMiddleware = require('webpack-dev-middleware')
    const WebpackHotMiddleware = require('webpack-hot-middleware')
    const portfinder = require('portfinder')
    const prepareURLs = require('@vue/cli-service/lib/util/prepareURLs')

    // load user devServer options
    const projectDevServerOptions = options.devServer || {}

    // load user BrowserSync options
    const projectBSOptions = options.pluginOptions && options.pluginOptions.browserSync || {}

    // resolve webpack config
    const webpackConfig = api.resolveWebpackConfig();

    // entry arg
    const entry = args._[0]
    if (entry) {
      webpackConfig.entry = {
        app: api.resolve(entry)
      }
    }

    // resolve server options
    const useHttps = args.https || projectBSOptions.https || projectDevServerOptions.https || defaults.https
    const protocol = useHttps ? 'https' : 'http'
    const host = args.host || process.env.HOST || projectDevServerOptions.host || defaults.host
    portfinder.basePort = args.port || process.env.PORT || projectBSOptions.port || projectDevServerOptions.port || defaults.port
    const proxy = projectBSOptions.proxy || projectDevServerOptions.proxy
    const port = await portfinder.getPortPromise()
    const serveStatic = projectBSOptions.serveStatic

    const urls = prepareURLs(
      protocol,
      host,
      port,
      options.baseUrl
    )

    // inject dev & hot-reload middleware entries
    if (!isProduction) {
      const devClients = [
        // hmr client
        'webpack-hot-middleware/client?noInfo=true&quiet=true&reload=true&name='
      ]
      // inject dev/hot client
      addDevClientToEntry(webpackConfig, devClients)
    }

    // Gets user defined middlewares in use
    const userMiddlewares = projectBSOptions.middleware || [];

    // create compiler
    const compiler = webpack(webpackConfig)

    // Sets up webpack middlewares
    const webpackMiddlewares = [];
    const devMiddleware = WebpackDevMiddleware(compiler, {
      publicPath: projectBSOptions.baseUrl || options.baseUrl,
      quiet: true,
      noInfo: true,
      stats: false,
      reporter() { }
    })
    webpackMiddlewares.push(devMiddleware)

    // Sets up hot reloading middleware
    const hotMiddleware = WebpackHotMiddleware(compiler, {
      log: () => { }
    });
    webpackMiddlewares.push(hotMiddleware);

    const middleware = [ ...webpackMiddlewares, ...userMiddlewares ];

    // create server
    const server = BrowserSync.create();

    // create server config
    const serverConfig = Object.assign({}, {
      host,
      https: useHttps,
      logLevel: 'silent',
      reloadOnRestart: true,
      server: !proxy && api.resolve('public') || null
    }, projectBSOptions, {
      middleware,
      open: false,
      port,
      proxy,
      serveStatic
    });

    ;['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, () => {
        server.exit()
        process.exit(0)
      })
    })

    // on appveyor, killing the process with SIGTERM causes execa to
    // throw error
    if (process.env.VUE_CLI_TEST) {
      process.stdin.on('data', data => {
        if (data.toString() === 'close') {
          console.log('got close signal!')
          server.exit()
          process.exit(0)
        }
      })
    }

    return new Promise((resolve, reject) => {
      // log instructions & open browser on first compilation complete
      let isFirstCompile = true
      compiler.hooks.done.tap('vue-cli-service serve:bs', stats => {
        if (stats.hasErrors()) {
          return
        }

        let copied = ''
        if (isFirstCompile && args.copy) {
          require('clipboardy').write(urls.localUrlForBrowser)
          copied = chalk.dim('(copied to clipboard)')
        }

        console.log()
        console.log([
          `  App running at:`,
          `  - Local:   ${chalk.cyan(urls.localUrlForTerminal)} ${copied}`,
          `  - Network: ${chalk.cyan(urls.lanUrlForTerminal)}`
        ].join('\n'))
        console.log()

        if (isFirstCompile) {
          isFirstCompile = false

          if (!isProduction) {
            const buildCommand = hasYarn() ? `yarn build` : `npm run build`
            console.log(`  Note that the development build is not optimized.`)
            console.log(`  To create a production build, run ${chalk.cyan(buildCommand)}.`)
          } else {
            console.log(`  App is served in production mode.`)
            console.log(`  Note this is for preview or E2E testing only.`)
          }
          console.log()

          if (args.open || projectBSOptions.open || projectDevServerOptions.open) {
            openBrowser(urls.localUrlForBrowser)
          }

          // Send final app URL
          if (args.dashboard) {
            const ipc = new IpcMessenger()
            ipc.connect()
            ipc.send({
              vueServe: {
                url: urls.localUrlForBrowser
              }
            })
          }

          // resolve returned Promise
          // so other commands can do api.service.run('serve').then(...)
          resolve({
            server,
            url: urls.localUrlForBrowser
          })
        } else if (process.env.VUE_CLI_TEST) {
          // signal for test to check HMR
          console.log('App updated')
        }
      })

      server.init(serverConfig, err => {
        if (err) {
          reject(err)
        }
      })
    })
  })
}

function addDevClientToEntry(config, devClient) {
  const { entry } = config
  if (typeof entry === 'object' && !Array.isArray(entry)) {
    Object.keys(entry).forEach((key) => {
      entry[key] = devClient.concat(entry[key])
    })
  } else if (typeof entry === 'function') {
    config.entry = entry(devClient)
  } else {
    config.entry = devClient.concat(entry)
  }
}

module.exports.defaultModes = {
  'serve:bs': 'development'
}
