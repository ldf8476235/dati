const request = require('../../../utils/request')
const { formatDuration, scoreToneClass } = require('../../../utils/questions')

Page({
  data: {
    loading: true,
    levels: [],
    levelNames: [],
    levelIndex: 0,
    items: [],
    total: 0
  },

  onLoad() {
    request({ url: '/api/home' }).then((home) => {
      const levels = home.levels || []
      const levelIndex = Math.max(0, levels.findIndex((item) => item.id === getApp().globalData.currentLevelId))
      this.setData({ levels, levelNames: levels.map((item) => item.name), levelIndex })
      this.loadHistory()
    }).catch(() => this.setData({ loading: false }))
  },

  onLevelChange(e) {
    const levelIndex = Number(e.detail.value)
    const level = this.data.levels[levelIndex]
    if (level) getApp().setStudyPrefs(level.id, getApp().globalData.currentQuestionType)
    this.setData({ levelIndex })
    this.loadHistory()
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  loadHistory() {
    const level = this.data.levels[this.data.levelIndex]
    if (!level) return
    this.setData({ loading: true })
    request({ url: `/api/exams/history?levelId=${level.id}&page=1&pageSize=50` }).then((data) => {
      this.setData({
        loading: false,
        total: data.total || 0,
        items: (data.items || []).map((item) => Object.assign({}, item, {
          usedText: formatDuration(item.usedSeconds || 0),
          answeredCount: Number(item.correctCount || 0) + Number(item.wrongCount || 0),
          correctCount: Number(item.correctCount || 0),
          wrongCount: Number(item.wrongCount || 0),
          unansweredCount: Number(item.unansweredCount || 0),
          scoreClass: scoreToneClass(item.score),
          statusText: item.status === 'doing' ? '未交卷' : item.status === 'timeout' ? '超时提交' : '已提交'
        }))
      })
    }).catch(() => this.setData({ loading: false }))
  }
})
