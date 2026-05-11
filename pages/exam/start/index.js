const request = require('../../../utils/request')

Page({
  data: {
    loading: true,
    starting: false,
    levels: [],
    levelNames: [],
    levelIndex: 0
  },

  onLoad() {
    request({ url: '/api/home' }).then((home) => {
      const app = getApp()
      const levels = home.levels || []
      const levelIndex = Math.max(0, levels.findIndex((item) => item.id === app.globalData.currentLevelId))
      this.setData({
        loading: false,
        levels,
        levelNames: levels.map((item) => item.name),
        levelIndex
      })
    }).catch(() => this.setData({ loading: false }))
  },

  onLevelChange(e) {
    const levelIndex = Number(e.detail.value)
    const level = this.data.levels[levelIndex]
    if (level) getApp().setStudyPrefs(level.id, getApp().globalData.currentQuestionType)
    this.setData({ levelIndex })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  startExam() {
    const level = this.data.levels[this.data.levelIndex]
    if (!level || this.data.starting) return
    this.setData({ starting: true })
    request({
      url: '/api/exams',
      method: 'POST',
      data: { levelId: level.id }
    }).then((exam) => {
      wx.setStorageSync('activeExam', Object.assign({}, exam, { levelName: level.name, answers: {} }))
      wx.navigateTo({ url: '/pages/exam/detail/index' })
      this.setData({ starting: false })
    }).catch(() => this.setData({ starting: false }))
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/exam/history/index' })
  }
})
