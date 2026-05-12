const request = require('../../../utils/request')
const { normalizeQuestion } = require('../../../utils/questions')

const TYPES = [
  { label: '选择题', value: 'single_choice' },
  { label: '判断题', value: 'true_false' }
]

const PAGE_SIZE = 10000

Page({
  data: {
    keyword: '',
    loading: true,
    types: TYPES,
    type: 'single_choice',
    items: [],
    total: 0
  },

  onLoad() {
    const app = getApp()
    app.restoreState()
    this.currentLevelId = app.globalData.currentLevelId || Number(wx.getStorageSync('currentLevelId')) || 1
    this.setData({
      type: app.globalData.currentQuestionType || wx.getStorageSync('currentQuestionType') || 'single_choice'
    })
    this.loadQuestions()
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => this.loadQuestions(), 350)
  },

  onTypeTap(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.type) return
    this.setData({ type, items: [], total: 0 })
    getApp().setStudyPrefs(this.currentLevelId, type)
    this.loadQuestions()
  },

  search() {
    this.loadQuestions()
  },

  clearKeyword() {
    clearTimeout(this.searchTimer)
    this.setData({ keyword: '' })
    this.loadQuestions()
  },

  loadQuestions() {
    const keyword = this.data.keyword.trim()
    this.setData({ loading: true })
    request({
      url: `/api/questions/search?levelId=${this.currentLevelId}&type=${this.data.type}&keyword=${encodeURIComponent(keyword)}&page=1&pageSize=${PAGE_SIZE}`
    }).then((data) => {
      const items = (data.items || []).map((item, index) => this.decorateQuestion(item, index))
      this.setData({
        loading: false,
        total: data.total || items.length,
        items
      })
    }).catch(() => this.setData({ loading: false }))
  },

  decorateQuestion(item, index) {
    const question = normalizeQuestion(item, index)
    return Object.assign({}, question, {
      answerText: this.formatAnswer(question),
      analysisText: question.analysis || '',
      copyText: this.buildCopyText(question)
    })
  },

  formatAnswer(question) {
    const answer = question.correctAnswer
    if (answer === 'true') return '正确'
    if (answer === 'false') return '错误'
    const option = (question.optionItems || []).find((item) => item.value === answer)
    return option ? `${answer}. ${option.displayLabel}` : (answer || '-')
  },

  buildCopyText(question) {
    const lines = [
      `${question.content}（${question.typeHint}）`
    ]
    ;(question.optionItems || []).forEach((option) => {
      lines.push(`${option.value}. ${option.displayLabel}`)
    })
    lines.push(`答案：${this.formatAnswer(question)}`)
    return lines.join('\n')
  },

  copyQuestion(e) {
    const index = Number(e.currentTarget.dataset.index)
    const item = this.data.items[index]
    if (!item) return
    wx.setClipboardData({
      data: item.copyText,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },

  onUnload() {
    clearTimeout(this.searchTimer)
  }
})
