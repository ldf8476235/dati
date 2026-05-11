const request = require('./request')

function requirePaid(onPaid) {
  const app = getApp()
  if (app.globalData.hasPaid) {
    return Promise.resolve(true)
  }

  return new Promise((resolve) => {
    wx.showModal({
      title: '解锁完整题库',
      content: '一次购买后可使用顺序练习、随机练习、模拟考试、错题和搜索。',
      confirmText: '立即购买',
      cancelText: '稍后',
      success(res) {
        if (!res.confirm) {
          resolve(false)
          return
        }
        createOrder().then(() => refreshPaid(onPaid).then(resolve)).catch(() => resolve(false))
      }
    })
  })
}

function createOrder() {
  return request({
    url: '/api/pay/orders',
    method: 'POST',
    data: { product: 'full_access' }
  }).then((order) => new Promise((resolve, reject) => {
    const params = order.payParams || {}
    wx.requestPayment({
      timeStamp: params.timeStamp,
      nonceStr: params.nonceStr,
      package: params.package,
      signType: params.signType,
      paySign: params.paySign,
      success: resolve,
      fail(err) {
        if (params.paySign === 'DEV_PAY_SIGN') {
          request({
            url: '/api/pay/wechat/notify',
            method: 'POST',
            skipAuth: true,
            data: { orderNo: order.orderNo, transactionId: 'DEV_TRANSACTION' }
          }).then(resolve).catch(reject)
          return
        }
        wx.showToast({ title: '支付未完成', icon: 'none' })
        reject(err)
      }
    })
  }))
}

function refreshPaid(onPaid) {
  return request({ url: '/api/home' }).then((home) => {
    const app = getApp()
    const user = Object.assign({}, app.globalData.user || wx.getStorageSync('user') || {}, { hasPaid: home.hasPaid })
    app.syncUser(user)
    if (typeof onPaid === 'function') onPaid(home)
    return Boolean(home.hasPaid)
  })
}

module.exports = {
  requirePaid
}
