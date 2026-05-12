const { login } = require('../../../utils/auth')
const request = require('../../../utils/request')

Page({
  data: {
    user: null,
    hasPaid: false,
    avatarText: '我',
    paidClass: 'warn',
    avatarUrl: '',
    nicknameInput: '',
    editingProfile: false
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
      nicknameInput: nickname
    })
  },

  onChooseAvatar(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl })
  },

  toggleProfileEdit() {
    this.setData({ editingProfile: !this.data.editingProfile })
  },

  onNicknameInput(e) {
    this.setData({ nicknameInput: e.detail.value })
  },

  saveProfile() {
    const nickname = this.data.nicknameInput.trim()
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    wx.showLoading({ title: '保存中' })
    login({
      nickname,
      avatarUrl: this.data.avatarUrl
    }).then(() => {
      wx.hideLoading()
      this.onShow()
      this.setData({ editingProfile: false })
      wx.showToast({ title: '已保存', icon: 'success' })
    }).catch(() => wx.hideLoading())
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
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
          editingProfile: false
        })
        wx.showToast({ title: '已清除', icon: 'success' })
      }
    })
  }
})
