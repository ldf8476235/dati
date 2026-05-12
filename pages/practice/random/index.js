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
    result: null,
    answering: false,
    wrongCount: 0,
    slidePanes: [],
    slideTrackClass: ''
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
    clearTimeout(this.autoNextTimer)
    this.setData({ loading: true, result: null, selected: '', answering: false, slidePanes: [], slideTrackClass: '' })
    Promise.all(QUESTION_TYPES.map((type) => request({
      url: `/api/questions/sequence?levelId=${currentLevelId}&type=${type}&page=1&pageSize=${ALL_PAGE_SIZE}`
    }))).then((responses) => {
      const items = responses.reduce((list, data) => list.concat(data.items || []), [])
      this.setData({
        loading: false,
        questions: shuffle(items).map(decorateQuestion),
        current: 0
      }, () => this.syncSlidePanes())
    }).catch(() => this.setData({ loading: false, answering: false }))
  },

  selectAnswer(e) {
    if (this.data.result || this.data.answering) return
    const selected = e.currentTarget.dataset.value
    this.setData({ selected })
    this.submitAnswer(selected)
  },

  submitAnswer(answer) {
    const question = this.data.questions[this.data.current]
    if (!question || !answer) return
    this.setData({ answering: true })
    request({
      url: `/api/questions/${question.id}/answer`,
      method: 'POST',
      data: { answer, mode: 'random' }
    }).then((result) => {
      const wrongCount = result.correct ? this.data.wrongCount : this.data.wrongCount + 1
      this.setData({ result, answering: false, wrongCount }, () => this.syncSlidePanes())
      if (result.correct) {
        clearTimeout(this.autoNextTimer)
        this.autoNextTimer = setTimeout(() => this.nextQuestion(), 550)
      }
    }).catch(() => this.setData({ answering: false }))
  },

  prevQuestion() {
    if (this.data.current <= 0) return
    this.slideToQuestion(this.data.current - 1, 'prev')
  },

  nextQuestion() {
    if (this.data.current < this.data.questions.length - 1) {
      this.slideToQuestion(this.data.current + 1, 'next')
      return
    }
    this.loadQuestions()
  },

  slideToQuestion(index, direction) {
    if (this.data.slideTrackClass) return
    const currentPane = this.buildPane(this.data.current)
    const targetPane = this.buildPane(index)
    if (!currentPane || !targetPane) return
    const panes = direction === 'next' ? [currentPane, targetPane] : [targetPane, currentPane]
    const readyClass = direction === 'next' ? 'slide-ready-next' : 'slide-ready-prev'
    const moveClass = direction === 'next' ? 'slide-moving slide-move-next' : 'slide-moving slide-move-prev'
    clearTimeout(this.slideTimer)
    clearTimeout(this.slideResetTimer)
    clearTimeout(this.autoNextTimer)
    this.setData({ slidePanes: panes, slideTrackClass: readyClass })
    this.slideTimer = setTimeout(() => {
      this.setData({ slideTrackClass: moveClass })
      this.slideResetTimer = setTimeout(() => {
        this.goQuestion(index)
      }, 260)
    }, 20)
  },

  goQuestion(index) {
    this.setData({
      current: index,
      selected: '',
      result: null,
      answering: false
    }, () => this.syncSlidePanes())
  },

  buildPane(index) {
    const question = this.data.questions[index]
    if (!question) return null
    const result = index === this.data.current ? this.data.result : null
    return {
      key: `${question.id}-${index}`,
      question,
      selected: index === this.data.current ? this.data.selected : '',
      result,
      wrongText: result ? `本次累计错误：${this.data.wrongCount}` : ''
    }
  },

  syncSlidePanes() {
    const pane = this.buildPane(this.data.current)
    this.setData({
      slidePanes: pane ? [pane] : [],
      slideTrackClass: ''
    })
  },

  onTouchStart(e) {
    const touch = e.touches && e.touches[0]
    if (!touch) return
    this.touchStartX = touch.clientX || touch.pageX || 0
    this.touchStartY = touch.clientY || touch.pageY || 0
  },

  onTouchEnd(e) {
    const touch = e.changedTouches && e.changedTouches[0]
    if (!touch) return
    const endX = touch.clientX || touch.pageX || 0
    const endY = touch.clientY || touch.pageY || 0
    const deltaX = endX - (this.touchStartX || 0)
    const deltaY = endY - (this.touchStartY || 0)
    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY) * 1.4) return
    if (deltaX < 0) this.nextQuestion()
    else this.prevQuestion()
  },

  onUnload() {
    clearTimeout(this.autoNextTimer)
    clearTimeout(this.slideTimer)
    clearTimeout(this.slideResetTimer)
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

function decorateQuestion(item, index) {
  const question = normalizeQuestion(item, index)
  return Object.assign({}, question, {
    typeHint: question.type === 'single_choice' ? '单选题' : '判断题',
    optionItems: question.optionItems.map((option) => Object.assign({}, option, {
      displayLabel: option.label.replace(/^[A-D]\.\s*/, '')
    }))
  })
}
