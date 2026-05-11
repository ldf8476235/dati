const { login } = require('./utils/auth')

App({
  onLaunch() {
    this.restoreState()
  },

  restoreState() {
    this.globalData.token = wx.getStorageSync('token') || ''
    this.globalData.user = wx.getStorageSync('user') || null
    this.globalData.hasPaid = Boolean(this.globalData.user && this.globalData.user.hasPaid)
    this.globalData.currentLevelId = Number(wx.getStorageSync('currentLevelId')) || 1
    this.globalData.currentQuestionType = wx.getStorageSync('currentQuestionType') || 'single_choice'
  },

  ensureLogin() {
    if (wx.getStorageSync('token')) {
      this.restoreState()
      return Promise.resolve(this.globalData.user)
    }
    return login()
  },

  setStudyPrefs(levelId, type) {
    this.globalData.currentLevelId = Number(levelId) || 1
    this.globalData.currentQuestionType = type
    wx.setStorageSync('currentLevelId', this.globalData.currentLevelId)
    wx.setStorageSync('currentQuestionType', type)
  },

  syncUser(user) {
    this.globalData.user = user
    this.globalData.hasPaid = Boolean(user && user.hasPaid)
    wx.setStorageSync('user', user)
  },

  globalData: {
    token: '',
    user: null,
    hasPaid: false,
    currentLevelId: 1,
    currentQuestionType: 'single_choice'
  }
})
