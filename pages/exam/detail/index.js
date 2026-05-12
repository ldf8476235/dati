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
    currentPane: null
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
    this.setData({
      exam,
      questions: markedQuestions,
      answers,
      answeredCount: this.countAnswered(answers),
      progressPercent: questions.length ? 100 / questions.length : 0,
      remaining: exam.durationSeconds || 3600,
      remainingText: formatDuration(exam.durationSeconds || 3600),
      currentAnswer: markedQuestions[0] ? markedQuestions[0].selected : ''
    }, () => this.syncCurrentPane())
    this.startTimer()
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
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
    const answer = e.currentTarget.dataset.value
    const answers = Object.assign({}, this.data.answers, { [question.id]: answer })
    const questions = this.data.questions.map((item, index) => (
      index === this.data.current ? Object.assign({}, item, { selected: answer, answered: true }) : item
    ))
    const exam = Object.assign({}, this.data.exam, { answers })
    wx.setStorageSync('activeExam', exam)
    this.setData({
      answers,
      exam,
      currentAnswer: answer,
      answeredCount: this.countAnswered(answers),
      questions
    }, () => this.syncCurrentPane())
  },

  goQuestion(e) {
    const current = Number(e.currentTarget.dataset.index)
    const question = this.data.questions[current]
    this.setData({
      current,
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
    const question = this.data.questions[current]
    this.setData({
      current,
      currentAnswer: question ? (question.selected || this.data.answers[question.id] || '') : '',
      progressPercent: this.data.questions.length ? (current + 1) * 100 / this.data.questions.length : 0
    }, () => this.syncCurrentPane())
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
    const question = this.data.questions[this.data.current]
    this.setData({
      currentPane: question ? {
        key: `${question.id}-${this.data.current}`,
        question,
        selected: this.data.currentAnswer,
        result: null,
        wrongText: ''
      } : null
    })
  }
})

function hasAnswer(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  return true
}
