const request = require('../../../utils/request')
const { normalizeQuestion } = require('../../../utils/questions')

const TYPES = [
  { label: '选择题', value: 'single_choice' },
  { label: '判断题', value: 'true_false' }
]

Page({
  data: {
    keyword: '',
    searching: false,
    levels: [],
    levelNames: [],
    levelIndex: 0,
    types: TYPES,
    type: 'single_choice',
    items: [],
    total: 0,
    active: null,
    selected: '',
    result: null,
    activePane: null
  },

  onLoad() {
    request({ url: '/api/home' }).then((home) => {
      const app = getApp()
      const levels = home.levels || []
      const levelIndex = Math.max(0, levels.findIndex((item) => item.id === app.globalData.currentLevelId))
      this.setData({
        levels,
        levelNames: levels.map((item) => item.name),
        levelIndex,
        type: app.globalData.currentQuestionType
      })
    })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onLevelChange(e) {
    this.setData({ levelIndex: Number(e.detail.value), active: null, selected: '', result: null, activePane: null })
    this.persistPrefs()
    if (this.data.keyword.trim()) {
      this.search()
    } else {
      this.setData({ items: [], total: 0 })
    }
  },

  onTypeTap(e) {
    this.setData({ type: e.currentTarget.dataset.type, active: null, selected: '', result: null, activePane: null })
    this.persistPrefs()
    if (this.data.keyword.trim()) {
      this.search()
    } else {
      this.setData({ items: [], total: 0 })
    }
  },

  persistPrefs() {
    const level = this.data.levels[this.data.levelIndex]
    if (level) getApp().setStudyPrefs(level.id, this.data.type)
  },

  search() {
    const keyword = this.data.keyword.trim()
    const level = this.data.levels[this.data.levelIndex]
    if (!keyword) {
      wx.showToast({ title: '请输入关键词', icon: 'none' })
      return
    }
    this.setData({ searching: true, active: null, activePane: null })
    request({
      url: `/api/questions/search?levelId=${level.id}&type=${this.data.type}&keyword=${encodeURIComponent(keyword)}&page=1&pageSize=50`
    }).then((data) => {
      this.setData({
        searching: false,
        total: data.total || 0,
        items: (data.items || []).map(normalizeQuestion)
      })
    }).catch(() => this.setData({ searching: false }))
  },

  openQuestion(e) {
    this.setData({ active: this.data.items[e.currentTarget.dataset.index], selected: '', result: null }, () => this.syncActivePane())
  },

  closeQuestion() {
    this.setData({ active: null, selected: '', result: null, activePane: null })
  },

  selectAnswer(e) {
    if (this.data.result) return
    this.setData({ selected: e.currentTarget.dataset.value }, () => this.syncActivePane())
  },

  submitAnswer() {
    if (!this.data.selected) {
      wx.showToast({ title: '请选择答案', icon: 'none' })
      return
    }
    request({
      url: `/api/questions/${this.data.active.id}/answer`,
      method: 'POST',
      data: { answer: this.data.selected, mode: 'search' }
    }).then((result) => this.setData({ result }, () => this.syncActivePane()))
  },

  syncActivePane() {
    const active = this.data.active
    this.setData({
      activePane: active ? {
        key: `${active.id}`,
        question: active,
        selected: this.data.selected,
        result: this.data.result,
        wrongText: ''
      } : null
    })
  }
})
