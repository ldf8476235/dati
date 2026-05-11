const request = require('../../../utils/request')
const { normalizeQuestion } = require('../../../utils/questions')

const TYPES = [
  { label: '选择题', value: 'single_choice' },
  { label: '判断题', value: 'true_false' }
]

Page({
  data: {
    loading: true,
    levels: [],
    levelNames: [],
    levelIndex: 0,
    types: TYPES,
    type: 'single_choice',
    items: [],
    total: 0,
    active: null,
    selected: '',
    result: null
  },

  onLoad() {
    this.init()
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  init() {
    request({ url: '/api/home' }).then((home) => {
      const app = getApp()
      const levels = home.levels || []
      const levelId = app.globalData.currentLevelId
      const levelIndex = Math.max(0, levels.findIndex((item) => item.id === levelId))
      this.setData({
        levels,
        levelNames: levels.map((item) => item.name),
        levelIndex,
        type: app.globalData.currentQuestionType
      })
      this.loadItems()
    })
  },

  loadItems() {
    const level = this.data.levels[this.data.levelIndex]
    if (!level) return
    this.setData({ loading: true, active: null, result: null, selected: '' })
    request({
      url: `/api/wrong-questions?levelId=${level.id}&type=${this.data.type}&page=1&pageSize=50`
    }).then((data) => {
      this.setData({
        loading: false,
        total: data.total || 0,
        items: (data.items || []).map(normalizeQuestion)
      })
    }).catch(() => this.setData({ loading: false }))
  },

  onLevelChange(e) {
    this.setData({ levelIndex: Number(e.detail.value) })
    this.persistPrefs()
    this.loadItems()
  },

  onTypeTap(e) {
    this.setData({ type: e.currentTarget.dataset.type })
    this.persistPrefs()
    this.loadItems()
  },

  persistPrefs() {
    const level = this.data.levels[this.data.levelIndex]
    if (level) getApp().setStudyPrefs(level.id, this.data.type)
  },

  openQuestion(e) {
    const active = this.data.items[e.currentTarget.dataset.index]
    this.setData({ active, selected: '', result: null })
  },

  closeQuestion() {
    this.setData({ active: null, selected: '', result: null })
  },

  selectAnswer(e) {
    if (this.data.result) return
    this.setData({ selected: e.currentTarget.dataset.value })
  },

  submitAnswer() {
    if (!this.data.selected) {
      wx.showToast({ title: '请选择答案', icon: 'none' })
      return
    }
    request({
      url: `/api/questions/${this.data.active.id}/answer`,
      method: 'POST',
      data: { answer: this.data.selected, mode: 'wrong' }
    }).then((result) => this.setData({ result }))
  }
})
