const { normalizeQuestion } = require('../../../utils/questions')
const { getQuestionBank } = require('../../../utils/question-cache')

Page({
  data: {
    keyword: '',
    loading: true,
    allItems: [],
    items: [],
    total: 0
  },

  onLoad() {
    const app = getApp()
    app.restoreState()
    this.currentLevelId = app.globalData.currentLevelId || Number(wx.getStorageSync('currentLevelId')) || 1
    this.loadQuestions()
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onKeywordInput(e) {
    const keyword = e.detail.value
    clearTimeout(this.searchTimer)
    this.setData({
      keyword,
      items: this.filterItems(this.data.allItems, keyword)
    })
  },

  search() {
    this.setData({
      items: this.filterItems(this.data.allItems, this.data.keyword)
    })
  },

  clearKeyword() {
    clearTimeout(this.searchTimer)
    this.setData({
      keyword: '',
      items: this.data.allItems
    })
  },

  loadQuestions() {
    this.setData({ loading: true })
    getQuestionBank(this.currentLevelId).then((bank) => {
      const allItems = bank.items.map((item, index) => this.decorateQuestion(item, index))
      const items = this.filterItems(allItems, this.data.keyword)
      this.setData({
        loading: false,
        allItems,
        total: allItems.length,
        items
      })
    }).catch(() => this.setData({ loading: false }))
  },

  filterItems(items, keyword) {
    const value = String(keyword || '').trim()
    if (!value) return items
    return items.filter((item) => {
      const content = item.content || ''
      const analysis = item.analysis || ''
      return content.indexOf(value) >= 0 || analysis.indexOf(value) >= 0
    })
  },

  decorateQuestion(item, index) {
    const question = normalizeQuestion(item, index)
    return Object.assign({}, question, {
      answerText: this.formatAnswer(question)
    })
  },

  formatAnswer(question) {
    const answer = question.correctAnswer
    if (answer === 'true') return '正确'
    if (answer === 'false') return '错误'
    return answer || '-'
  },

  onUnload() {
    clearTimeout(this.searchTimer)
  }
})
