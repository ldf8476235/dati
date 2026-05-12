const request = require('../../../utils/request')
const { normalizeQuestion } = require('../../../utils/questions')

const QUESTION_TYPES = ['single_choice', 'true_false']
const ALL_PAGE_SIZE = 10000
const FONT_SIZES = {
  small: '小号',
  normal: '标准',
  large: '大号',
  xlarge: '特大'
}

Page({
  data: {
    title: '顺序练习',
    loading: true,
    total: 0,
    questions: [],
    current: 0,
    selected: '',
    result: null,
    answers: {},
    rightCount: 0,
    wrongCount: 0,
    showSheet: false,
    showSettings: false,
    autoNext: true,
    darkMode: false,
    optionOrder: false,
    fontSize: 'normal',
    fontSizeLabel: FONT_SIZES.normal,
    slidePanes: [],
    slideTrackClass: ''
  },

  onLoad() {
    this.loadSettings()
    this.loadQuestions()
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  loadSettings() {
    const settings = wx.getStorageSync('sequenceSettings') || {}
    const fontSize = settings.fontSize || 'normal'
    this.setData({
      autoNext: settings.autoNext !== false,
      darkMode: false,
      optionOrder: Boolean(settings.optionOrder),
      fontSize,
      fontSizeLabel: FONT_SIZES[fontSize] || FONT_SIZES.normal
    })
  },

  saveSettings(next) {
    wx.setStorageSync('sequenceSettings', {
      autoNext: next.autoNext,
      optionOrder: next.optionOrder,
      fontSize: next.fontSize
    })
  },

  loadQuestions() {
    const app = getApp()
    const { currentLevelId } = app.globalData
    this.currentLevelId = currentLevelId
    this.setData({ loading: true, result: null, selected: '', answers: {}, rightCount: 0, wrongCount: 0, slidePanes: [], slideTrackClass: '' })
    Promise.all(QUESTION_TYPES.map((type) => request({
      url: `/api/questions/sequence?levelId=${currentLevelId}&type=${type}&page=1&pageSize=${ALL_PAGE_SIZE}`
    }))).then((responses) => {
      const items = responses.reduce((list, data) => list.concat(data.items || []), [])
      const total = responses.reduce((sum, data) => sum + (Number(data.total) || 0), 0)
      const questions = items.map((item, index) => this.decorateQuestion(item, index))
      const progress = this.loadProgress(currentLevelId, questions)
      this.setData({
        loading: false,
        total,
        questions,
        current: progress.current,
        selected: progress.selected,
        result: progress.result,
        answers: progress.answers,
        rightCount: progress.rightCount,
        wrongCount: progress.wrongCount
      }, () => this.syncSlidePanes())
    }).catch(() => this.setData({ loading: false }))
  },

  progressKey(levelId) {
    return `sequenceProgress:${levelId || this.currentLevelId || 1}`
  },

  loadProgress(levelId, questions) {
    const saved = wx.getStorageSync(this.progressKey(levelId)) || {}
    const answers = saved.answers || {}
    const current = Math.min(Math.max(Number(saved.current) || 0, 0), Math.max(questions.length - 1, 0))
    const question = questions[current]
    const record = question ? answers[question.id] : null
    return {
      current,
      answers,
      selected: record ? record.answer : '',
      result: record && question ? this.resultFromRecord(question, record) : null,
      rightCount: Object.keys(answers).filter((id) => answers[id] && answers[id].correct).length,
      wrongCount: Object.keys(answers).filter((id) => answers[id] && answers[id].correct === false).length
    }
  },

  saveProgress(next = {}) {
    wx.setStorageSync(this.progressKey(), {
      current: next.current !== undefined ? next.current : this.data.current,
      answers: next.answers || this.data.answers
    })
  },

  resultFromRecord(question, record) {
    return {
      correct: Boolean(record.correct),
      correctAnswer: record.correctAnswer || question.correctAnswer || '',
      analysis: record.analysis || question.analysis || '',
      wrongCount: record.wrongCount || 0
    }
  },

  buildPane(index, overrides = {}) {
    const question = this.data.questions[index]
    if (!question) return null
    const record = this.data.answers[question.id]
    const selected = overrides.selected !== undefined
      ? overrides.selected
      : (index === this.data.current ? this.data.selected : (record ? record.answer : ''))
    const result = overrides.result !== undefined
      ? overrides.result
      : (index === this.data.current
        ? this.data.result
        : (this.data.darkMode ? {
          correct: true,
          correctAnswer: question.correctAnswer || '',
          analysis: question.analysis || '',
          wrongCount: 0
        } : (record ? this.resultFromRecord(question, record) : null)))
    return {
      key: `${question.id}-${index}`,
      question,
      selected,
      result,
      wrongText: ''
    }
  },

  syncSlidePanes() {
    const pane = this.buildPane(this.data.current)
    this.setData({
      slidePanes: pane ? [pane] : [],
      slideTrackClass: ''
    })
  },

  decorateQuestion(item, index, optionOrder = this.data.optionOrder) {
    const question = normalizeQuestion(item, index)
    const optionItems = question.type === 'single_choice' && optionOrder
      ? shuffleOptions(question.optionItems)
      : question.optionItems
    return Object.assign({}, question, {
      typeBadge: question.type === 'single_choice' ? '单选' : '判断',
      typeHint: question.type === 'single_choice' ? '单选题' : '判断题',
      optionItems: optionItems.map((option) => Object.assign({}, option, {
        displayLabel: option.label.replace(/^[A-D]\.\s*/, '')
      }))
    })
  },

  selectAnswer(e) {
    if (this.data.result) return
    const selected = e.currentTarget.dataset.value
    this.setData({ selected })
    this.submitAnswer(selected)
  },

  submitAnswer(answer) {
    const question = this.data.questions[this.data.current]
    if (!question || !answer) return

    request({
      url: `/api/questions/${question.id}/answer`,
      method: 'POST',
      data: { answer, mode: 'sequence' }
    }).then((result) => {
      const previous = this.data.answers[question.id]
      const answers = Object.assign({}, this.data.answers, {
        [question.id]: {
          answer,
          correct: result.correct,
          status: result.correct ? 'right' : 'wrong',
          correctAnswer: result.correctAnswer || question.correctAnswer || '',
          analysis: result.analysis || question.analysis || '',
          wrongCount: result.wrongCount || 0
        }
      })
      let rightCount = this.data.rightCount
      let wrongCount = this.data.wrongCount
      if (!previous) {
        if (result.correct) rightCount += 1
        else wrongCount += 1
      }

      this.setData({ result, answers, rightCount, wrongCount }, () => this.syncSlidePanes())
      this.saveProgress({ answers })

      if (result.correct && this.data.autoNext) {
        setTimeout(() => this.nextQuestion(), 550)
      }
    })
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
    wx.showToast({ title: '已经是最后一题', icon: 'none' })
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
    this.setData({ slidePanes: panes, slideTrackClass: readyClass })
    this.slideTimer = setTimeout(() => {
      this.setData({ slideTrackClass: moveClass })
      this.slideResetTimer = setTimeout(() => {
        this.goQuestion(index)
      }, 260)
    }, 20)
  },

  onTouchStart(e) {
    const touch = e.touches && e.touches[0]
    if (!touch) return
    this.touchStartX = touch.clientX || touch.pageX || 0
    this.touchStartY = touch.clientY || touch.pageY || 0
  },

  onTouchEnd(e) {
    if (this.data.showSheet || this.data.showSettings) return
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

  goQuestion(index) {
    const question = this.data.questions[index]
    const record = question ? this.data.answers[question.id] : null
    const result = this.data.darkMode && question ? {
      correct: true,
      correctAnswer: question.correctAnswer || '',
      analysis: question.analysis || '',
      wrongCount: 0
    } : (record && question ? this.resultFromRecord(question, record) : null)
    this.setData({
      current: index,
      selected: record ? record.answer : '',
      result,
      showSheet: false
    }, () => this.syncSlidePanes())
    this.saveProgress({ current: index })
  },

  onQuestionTap(e) {
    this.goQuestion(Number(e.currentTarget.dataset.index))
  },

  toggleSheet() {
    this.setData({ showSheet: !this.data.showSheet, showSettings: false })
  },

  toggleSettings() {
    this.setData({ showSettings: !this.data.showSettings, showSheet: false })
  },

  closePanels() {
    this.setData({ showSheet: false, showSettings: false })
  },

  resetAnswers() {
    wx.removeStorageSync(this.progressKey())
    this.setData({
      answers: {},
      rightCount: 0,
      wrongCount: 0,
      current: 0,
      selected: '',
      result: null,
      showSheet: false
    }, () => this.syncSlidePanes())
    this.saveProgress({ current: 0, answers: {} })
  },

  toggleAutoNext(e) {
    const autoNext = e.detail.value
    this.setData({ autoNext })
    this.saveSettings(Object.assign({}, this.data, { autoNext }))
  },

  toggleDarkMode(e) {
    const darkMode = e.detail.value
    const question = this.data.questions[this.data.current]
    this.setData({
      darkMode,
      result: darkMode && question ? {
        correct: true,
        correctAnswer: question.correctAnswer || '',
        analysis: question.analysis || '',
        wrongCount: 0
      } : null
    }, () => this.syncSlidePanes())
    this.saveSettings(Object.assign({}, this.data, { darkMode }))
  },

  toggleOptionOrder(e) {
    const optionOrder = e.detail.value
    const questions = this.data.questions.map((question, index) => this.decorateQuestion(Object.assign({}, question), index, optionOrder))
    this.setData({ optionOrder, questions }, () => this.syncSlidePanes())
    this.saveSettings(Object.assign({}, this.data, { optionOrder }))
  },

  chooseFontSize(e) {
    const fontSize = e.currentTarget.dataset.size
    this.setData({
      fontSize,
      fontSizeLabel: FONT_SIZES[fontSize] || FONT_SIZES.normal
    })
    this.saveSettings(Object.assign({}, this.data, { fontSize }))
  },

  onUnload() {
    this.saveProgress()
    clearTimeout(this.slideTimer)
    clearTimeout(this.slideResetTimer)
  },

  onHide() {
    this.saveProgress()
  }

})

function shuffleOptions(items) {
  const list = items.slice()
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = list[i]
    list[i] = list[j]
    list[j] = temp
  }
  return list
}
