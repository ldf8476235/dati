const { baseUrl } = require('./config')

function request(options) {
  const token = wx.getStorageSync('token')

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: Object.assign({
        'content-type': 'application/json'
      }, token && !options.skipAuth ? { Authorization: `Bearer ${token}` } : {}, options.header || {}),
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }

        const message = (res.data && res.data.message) || '请求失败'
        if (res.statusCode === 401) {
          wx.removeStorageSync('token')
          wx.removeStorageSync('user')
        }
        wx.showToast({ title: message, icon: 'none' })
        reject(Object.assign(new Error(message), { response: res }))
      },
      fail(err) {
        const message = err && err.errMsg ? err.errMsg.replace('request:fail ', '') : '网络连接失败'
        wx.showToast({ title: message, icon: 'none' })
        reject(err)
      }
    })
  })
}

module.exports = request
