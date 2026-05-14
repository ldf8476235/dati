const { login } = require('../../../utils/auth')
const request = require('../../../utils/request')
const { refreshQuestionBank } = require('../../../utils/question-cache')

Page({
  data: {
    user: null,
    hasPaid: false,
    avatarText: '我',
    paidClass: 'warn',
    avatarUrl: '',
    nicknameInput: '',
    nicknameFocus: false,
    editingProfile: false,
    visible: true
  },

  onShow() {
    const app = getApp()
    app.restoreState()
    const user = app.globalData.user || wx.getStorageSync('user') || null
    const nickname = user && user.nickname ? user.nickname : ''
    this.setData({
      user,
      hasPaid: app.globalData.hasPaid,
      avatarText: nickname ? nickname.slice(0, 1) : '我',
      paidClass: app.globalData.hasPaid ? 'ok' : 'warn',
      avatarUrl: user && user.avatarUrl ? user.avatarUrl : '',
      nicknameInput: nickname,
      visible: true
    })
  },

  onHide() {
    this.setData({
      visible: false,
      editingProfile: false,
      nicknameFocus: false
    })
  },

  onChooseAvatar(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl })
  },

  toggleProfileEdit() {
    this.setData({
      editingProfile: !this.data.editingProfile,
      nicknameFocus: false
    })
  },

  onNicknameInput(e) {
    this.setData({ nicknameInput: e.detail.value })
  },

  saveProfile() {
    wx.hideKeyboard()
    const nickname = this.data.nicknameInput.trim()
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    this.setData({
      editingProfile: false,
      nicknameFocus: false
    })
    wx.showLoading({ title: '保存中' })
    login({
      nickname,
      avatarUrl: this.data.avatarUrl
    }).then((user) => {
      wx.hideLoading()
      wx.hideKeyboard()
      this.syncProfileView(user)
      wx.showToast({ title: '已保存', icon: 'success' })
    }).catch(() => {
      wx.hideLoading()
      wx.hideKeyboard()
    })
  },

  syncProfileView(user) {
    const app = getApp()
    const nickname = user && user.nickname ? user.nickname : ''
    this.setData({
      user,
      hasPaid: app.globalData.hasPaid,
      avatarText: nickname ? nickname.slice(0, 1) : '我',
      paidClass: app.globalData.hasPaid ? 'ok' : 'warn',
      avatarUrl: user && user.avatarUrl ? user.avatarUrl : '',
      nicknameInput: nickname,
      nicknameFocus: false
    })
  },

  goHome() {
    wx.hideKeyboard()
    this.setData({
      editingProfile: false,
      nicknameFocus: false
    }, () => {
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index',
          fail: () => wx.reLaunch({ url: '/pages/index/index' })
        })
      }, 30)
    })
  },

  clearWrongQuestions() {
    wx.showModal({
      title: '清理错题',
      content: '将清空当前账号的全部错题记录，清理后错题本会变为空。',
      confirmText: '清理',
      confirmColor: '#ba1a1a',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '清理中' })
        request({
          url: '/api/wrong-questions/clear',
          method: 'POST'
        }).then(() => {
          this.clearWrongPracticeStorage()
          wx.hideLoading()
          wx.showToast({ title: '已清理', icon: 'success' })
        }).catch(() => wx.hideLoading())
      }
    })
  },

  clearWrongPracticeStorage() {
    const info = wx.getStorageInfoSync()
    ;(info.keys || []).forEach((key) => {
      if (key.indexOf('wrongPracticeProgress:') === 0) {
        wx.removeStorageSync(key)
      }
    })
  },

  refreshQuestionCache() {
    if (!this.data.hasPaid) {
      wx.showToast({ title: '请先解锁题库', icon: 'none' })
      return
    }
    const app = getApp()
    app.restoreState()
    const levelId = app.globalData.currentLevelId || Number(wx.getStorageSync('currentLevelId')) || 1
    wx.showModal({
      title: '刷新题库缓存',
      content: '将重新获取当前等级题库，刷新期间请保持网络连接。',
      confirmText: '刷新',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '刷新中' })
        refreshQuestionBank(levelId).then((bank) => {
          wx.hideLoading()
          wx.showToast({ title: bank.stale ? '使用本地题库' : '已刷新', icon: bank.stale ? 'none' : 'success' })
        }).catch(() => wx.hideLoading())
      }
    })
  },

  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '将清除登录信息和本地答题缓存。',
      confirmText: '清除',
      success: (res) => {
        if (!res.confirm) return
        wx.clearStorageSync()
        getApp().restoreState()
        this.setData({
          user: null,
          hasPaid: false,
          avatarText: '我',
          paidClass: 'warn',
          avatarUrl: '',
          nicknameInput: '',
          nicknameFocus: false,
          editingProfile: false
        })
        wx.showToast({ title: '已清除', icon: 'success' })
      }
    })
  }
})
