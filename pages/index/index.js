const request = require('../../utils/request')
const { requirePaid } = require('../../utils/payment')

const DEFAULT_LEVEL_ID = 1

const ENTRIES = [
  { key: 'sequence', icon: '/assets/icons/sequence.svg', title: '顺序练习', desc: '按题库顺序稳定推进', url: '/pages/practice/sequence/index' },
  { key: 'random', icon: '/assets/icons/random.svg', title: '随机练习', desc: '随机抽题快速巩固', url: '/pages/practice/random/index' },
  { key: 'exam', icon: '/assets/icons/exam.svg', title: '模拟考试', desc: '100 题限时测评', url: '/pages/exam/start/index' },
  { key: 'wrong', icon: '/assets/icons/wrong.svg', title: '我的错题', desc: '回看历史失分题', url: '/pages/wrong/index/index' },
  { key: 'search', icon: '/assets/icons/search.svg', title: '试题搜索', desc: '按关键词定位题目', url: '/pages/search/index/index' }
]

Page({
  data: {
    loading: true,
    home: null,
    levels: [],
    levelNames: [],
    levelIndex: 0,
    currentType: 'single_choice',
    hasQuestionBank: true,
    entries: ENTRIES
  },

  onLoad() {
    this.loadHome()
  },

  onShow() {
    if (!this.data.loading && wx.getStorageSync('token')) {
      this.loadHome(false)
    }
  },

  loadHome(showLoading = true) {
    if (showLoading) this.setData({ loading: true })
    const app = getApp()
    const requestedLevelId = Number(wx.getStorageSync('currentLevelId')) || app.globalData.currentLevelId || DEFAULT_LEVEL_ID
    app.ensureLogin()
      .then(() => request({ url: `/api/home?levelId=${requestedLevelId}` }))
      .then((home) => {
        const levels = home.levels || []
        const preferredLevelId = levels.some((item) => item.id === requestedLevelId)
          ? requestedLevelId
          : (Number(home.currentLevelId) || DEFAULT_LEVEL_ID)
        const levelIndex = Math.max(0, levels.findIndex((item) => item.id === preferredLevelId))
        const currentLevelId = levels[levelIndex] ? levels[levelIndex].id : DEFAULT_LEVEL_ID
        const currentType = wx.getStorageSync('currentQuestionType') || 'single_choice'
        const totalQuestions = Number(home.stats && home.stats.totalQuestions) || 0
        app.setStudyPrefs(currentLevelId, currentType)
        app.syncUser(Object.assign({}, app.globalData.user || wx.getStorageSync('user') || {}, { hasPaid: home.hasPaid }))
        this.setData({
          loading: false,
          home: Object.assign({}, home, {
            progressPercent: this.progressPercent(home.stats),
            updateDate: '2026-05-11'
          }),
          levels,
          levelNames: levels.map((item) => item.name),
          levelIndex,
          currentType,
          hasQuestionBank: totalQuestions > 0
        })
      })
      .catch(() => this.setData({ loading: false }))
  },

  onLevelChange(e) {
    const levelIndex = Number(e.detail.value)
    const level = this.data.levels[levelIndex]
    if (!level) return
    getApp().setStudyPrefs(level.id, this.data.currentType)
    this.setData({
      levelIndex,
      hasQuestionBank: true
    })
    this.loadHome(false)
  },

  goEntry(e) {
    const item = this.data.entries.find((entry) => entry.key === e.currentTarget.dataset.key)
    if (!item) return
    if (!this.data.hasQuestionBank && ['sequence', 'random', 'exam', 'search'].includes(item.key)) {
      wx.showToast({ title: '当前等级暂无题库', icon: 'none' })
      return
    }
    requirePaid(() => this.loadHome(false)).then((paid) => {
      if (paid) wx.navigateTo({ url: item.url })
    })
  },

  goHistory() {
    requirePaid().then((paid) => {
      if (paid) wx.navigateTo({ url: '/pages/exam/history/index' })
    })
  },

  onShareAppMessage() {
    return {
      title: '我爱刷题',
      path: '/pages/index/index'
    }
  },

  progressPercent(stats) {
    const progress = (stats && stats.sequenceProgress) || '0/0'
    const parts = String(progress).split('/')
    const answered = Number(parts[0]) || 0
    const total = Number(parts[1]) || 0
    if (!total) return 0
    return Math.min(100, Math.round(answered * 100 / total))
  }
})
