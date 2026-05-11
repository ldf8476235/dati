const request = require('./request')

function login(profile = {}) {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        request({
          url: '/api/auth/wechat-login',
          method: 'POST',
          skipAuth: true,
          data: {
            code: res.code,
            nickname: profile.nickname || profile.nickName || '微信用户',
            avatarUrl: profile.avatarUrl || ''
          }
        }).then((data) => {
          wx.setStorageSync('token', data.token)
          wx.setStorageSync('user', data.user)
          const app = getApp()
          app.globalData.token = data.token
          app.syncUser(data.user)
          resolve(data.user)
        }).catch(reject)
      },
      fail: reject
    })
  })
}

function clearLogin() {
  wx.removeStorageSync('token')
  wx.removeStorageSync('user')
  const app = getApp()
  app.globalData.token = ''
  app.globalData.user = null
  app.globalData.hasPaid = false
}

module.exports = {
  login,
  clearLogin
}
