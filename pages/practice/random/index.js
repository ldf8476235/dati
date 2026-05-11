const request = require('../../../utils/request')
const { normalizeQuestion } = require('../../../utils/questions')

const QUESTION_TYPES = ['single_choice', 'true_false']
const ALL_PAGE_SIZE = 10000

Page({
  data: {
    title: '随机练习',
    loading: true,
    questions: [],
    current: 0,
    selected: '',
    result: null
  },

  onLoad() {
    this.loadQuestions()
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  loadQuestions() {
    const app = getApp()
    const { currentLevelId } = app.globalData
    this.setData({ loading: true, result: null, selected: '' })
    Promise.all(QUESTION_TYPES.map((type) => request({
      url: `/api/questions/sequence?levelId=${currentLevelId}&type=${type}&page=1&pageSize=${ALL_PAGE_SIZE}`
    }))).then((responses) => {
      const items = responses.reduce((list, data) => list.concat(data.items || []), [])
      this.setData({
        loading: false,
        questions: shuffle(items).map(normalizeQuestion),
        current: 0
      })
    }).catch(() => this.setData({ loading: false }))
  },

  selectAnswer(e) {
    if (this.data.result) return
    this.setData({ selected: e.currentTarget.dataset.value })
  },

  submitAnswer() {
    const question = this.data.questions[this.data.current]
    if (!question || !this.data.selected) {
      wx.showToast({ title: '请选择答案', icon: 'none' })
      return
    }
    request({
      url: `/api/questions/${question.id}/answer`,
      method: 'POST',
      data: { answer: this.data.selected, mode: 'random' }
    }).then((result) => this.setData({ result }))
  },

  nextQuestion() {
    if (this.data.current < this.data.questions.length - 1) {
      this.setData({ current: this.data.current + 1, selected: '', result: null })
    } else {
      this.loadQuestions()
    }
  }
})

function shuffle(items) {
  const list = items.slice()
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = list[i]
    list[i] = list[j]
    list[j] = temp
  }
  return list
}
