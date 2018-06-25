module.exports = (api, opts) => {
  api.extendPackage({
    scripts: {
      'serve:bs': 'vue-cli-service serve:bs'
    }
  })
}
