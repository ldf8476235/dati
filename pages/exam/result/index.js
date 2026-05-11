const { formatDuration } = require('../../../utils/questions')

Page({
  data: {
    result: null,
    usedText: '',
    correctCount: 0,
    wrongCount: 0,
    detailItems: []
  },

  onLoad() {
    const result = wx.getStorageSync('lastExamResult')
    if (!result) {
      wx.redirectTo({ url: '/pages/exam/start/index' })
      return
    }
    const detailMap = {}
    ;(result.details || []).forEach((item) => { detailMap[item.questionId] = item })
    const detailItems = (result.questions || []).map((question, index) => {
      const detail = detailMap[question.id] || {}
      const answer = result.answers ? result.answers[question.id] : ''
      return Object.assign({}, question, detail, {
        displayIndex: index + 1,
        userAnswerText: formatAnswer(answer),
        correctAnswerText: formatAnswer(detail.correctAnswer)
      })
    })
    const correctCount = (result.details || []).filter((item) => item.correct).length
    this.setData({
      result,
      usedText: formatDuration(result.usedSeconds || 0),
      correctCount,
      wrongCount: (result.totalScore || 100) - correctCount,
      detailItems
    })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goHistory() {
    wx.redirectTo({ url: '/pages/exam/history/index' })
  }
})

function formatAnswer(answer) {
  if (answer === 'true') return '正确'
  if (answer === 'false') return '错误'
  return answer || '未答'
}
