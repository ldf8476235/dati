const request = require('../../../utils/request')

Page({
  data: {
    loading: true,
    starting: false,
    currentLevelName: '初级'
  },

  onLoad() {
    const app = getApp()
    request({ url: '/api/home' }).then((home) => {
      const levels = home.levels || []
      const currentLevelId = Number(app.globalData.currentLevelId) || 1
      const level = levels.find((item) => item.id === currentLevelId) || levels[0]
      this.setData({
        loading: false,
        currentLevelName: level ? level.name : '初级'
      })
    }).catch(() => this.setData({ loading: false }))
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  startExam() {
    const levelId = Number(getApp().globalData.currentLevelId) || 1
    this.setData({ starting: true })
    request({
      url: '/api/exams',
      method: 'POST',
      data: { levelId }
    }).then((exam) => {
      wx.setStorageSync('activeExam', Object.assign({}, exam, { levelName: this.data.currentLevelName, answers: {} }))
      wx.navigateTo({ url: '/pages/exam/detail/index' })
      this.setData({ starting: false })
    }).catch(() => this.setData({ starting: false }))
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/exam/history/index' })
  }
})
