const request = require('../../../utils/request')
const { normalizeQuestion, formatDuration } = require('../../../utils/questions')

Page({
  data: {
    exam: null,
    questions: [],
    current: 0,
    currentAnswer: '',
    answers: {},
    answeredCount: 0,
    progressPercent: 0,
    remaining: 0,
    remainingText: '60:00',
    submitting: false,
    currentPane: null,
    slidePanes: [],
    slideTrackClass: ''
  },

  onLoad() {
    const exam = wx.getStorageSync('activeExam')
    if (!exam || !exam.examId) {
      wx.redirectTo({ url: '/pages/exam/start/index' })
      return
    }
    const questions = (exam.questions || []).map(normalizeQuestion)
    const answers = exam.answers || {}
    const markedQuestions = this.markAnswered(questions, answers)
    const current = Math.min(Math.max(Number(exam.current) || 0, 0), Math.max(markedQuestions.length - 1, 0))
    const currentQuestion = markedQuestions[current]
    this.setData({
      exam,
      questions: markedQuestions,
      current,
      answers,
      answeredCount: this.countAnswered(answers),
      progressPercent: questions.length ? (current + 1) * 100 / questions.length : 0,
      remaining: exam.durationSeconds || 3600,
      remainingText: formatDuration(exam.durationSeconds || 3600),
      currentAnswer: currentQuestion ? currentQuestion.selected : ''
    }, () => this.syncCurrentPane())
    this.startTimer()
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
    clearTimeout(this.slideTimer)
    clearTimeout(this.slideResetTimer)
    clearTimeout(this.autoNextTimer)
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  startTimer() {
    this.timer = setInterval(() => {
      const remaining = this.data.remaining - 1
      this.setData({ remaining, remainingText: formatDuration(remaining) })
      if (remaining <= 0) {
        clearInterval(this.timer)
        this.submitExam()
      }
    }, 1000)
  },

  selectAnswer(e) {
    const question = this.data.questions[this.data.current]
    if (!question) return
    const answer = e.currentTarget.dataset.value
    const answers = Object.assign({}, this.data.answers, { [question.id]: answer })
    const questions = this.data.questions.map((item, index) => (
      index === this.data.current ? Object.assign({}, item, { selected: answer, answered: true }) : item
    ))
    const exam = Object.assign({}, this.data.exam, { answers, current: this.data.current })
    wx.setStorageSync('activeExam', exam)
    this.setData({
      answers,
      exam,
      currentAnswer: answer,
      answeredCount: this.countAnswered(answers),
      questions
    }, () => {
      this.syncCurrentPane()
      clearTimeout(this.autoNextTimer)
      if (this.data.current < this.data.questions.length - 1) {
        this.autoNextTimer = setTimeout(() => this.nextQuestion(), 300)
      }
    })
  },

  goQuestion(e) {
    const current = typeof e === 'number' ? e : Number(e.currentTarget.dataset.index)
    this.setQuestion(current)
  },

  setQuestion(current) {
    const question = this.data.questions[current]
    if (!question) return
    const exam = Object.assign({}, this.data.exam, { current })
    wx.setStorageSync('activeExam', exam)
    this.setData({
      current,
      exam,
      currentAnswer: question ? (question.selected || this.data.answers[question.id] || '') : '',
      progressPercent: this.data.questions.length ? (current + 1) * 100 / this.data.questions.length : 0
    }, () => this.syncCurrentPane())
  },

  prevQuestion() {
    if (this.data.current <= 0) return
    this.goByOffset(-1)
  },

  nextQuestion() {
    if (this.data.current >= this.data.questions.length - 1) return
    this.goByOffset(1)
  },

  goByOffset(offset) {
    const current = this.data.current + offset
    this.slideToQuestion(current, offset > 0 ? 'next' : 'prev')
  },

  slideToQuestion(index, direction) {
    if (index < 0 || index >= this.data.questions.length || this.data.slideTrackClass) return
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

  confirmSubmit() {
    wx.showModal({
      title: '确认交卷',
      content: `已作答 ${Object.keys(this.data.answers).length} / ${this.data.questions.length} 题，确认提交？`,
      success: (res) => {
        if (res.confirm) this.submitExam()
      }
    })
  },

  submitExam() {
    if (this.data.submitting) return
    this.setData({ submitting: true })
    const answers = this.collectAnswers()
    request({
      url: `/api/exams/${this.data.exam.examId}/submit`,
      method: 'POST',
      data: { answers }
    }).then((result) => {
      wx.removeStorageSync('activeExam')
      wx.setStorageSync('lastExamResult', Object.assign({}, result, {
        questions: this.data.questions,
        answers: this.data.answers,
        levelName: this.data.exam.levelName
      }))
      wx.redirectTo({ url: '/pages/exam/result/index' })
    }).catch(() => this.setData({ submitting: false }))
  },

  markAnswered(questions, answers) {
    return (questions || []).map((question) => Object.assign({}, question, {
      selected: answers[question.id] || '',
      answered: hasAnswer(answers[question.id])
    }))
  },

  countAnswered(answers) {
    return Object.keys(answers || {}).filter((id) => hasAnswer(answers[id])).length
  },

  collectAnswers() {
    return (this.data.questions || []).map((question) => {
      const answer = hasAnswer(question.selected) ? question.selected : this.data.answers[question.id]
      return hasAnswer(answer) ? { questionId: Number(question.id), answer } : null
    }).filter(Boolean)
  },

  syncCurrentPane() {
    const pane = this.buildPane(this.data.current)
    this.setData({
      currentPane: pane,
      slidePanes: pane ? [pane] : [],
      slideTrackClass: ''
    })
  },

  buildPane(index) {
    const target = this.data.questions[index]
    if (!target) return null
    return {
      key: `${target.id}-${index}`,
      question: target,
      selected: index === this.data.current ? this.data.currentAnswer : (target.selected || this.data.answers[target.id] || ''),
      result: null,
      wrongText: ''
    }
  }
})

function hasAnswer(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  return true
}
