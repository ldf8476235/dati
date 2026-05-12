const { formatDuration, scoreToneClass } = require('../../../utils/questions')

Page({
  data: {
    result: null,
    usedText: '',
    scoreClass: '',
    correctCount: 0,
    wrongCount: 0,
    unansweredCount: 0,
    detailItems: []
  },

  onLoad() {
    const result = wx.getStorageSync('lastExamResult')
    if (!result) {
      wx.redirectTo({ url: '/pages/exam/start/index' })
      return
    }
    const detailMap = {}
    ;(result.details || []).forEach((item, index) => {
      const questionId = getField(item, 'questionId', 'questionid', 'question_id')
      if (questionId !== undefined && questionId !== null) detailMap[questionId] = item
      detailMap[`index:${index}`] = item
    })
    const detailItems = (result.questions || []).map((question, index) => {
      const detail = detailMap[question.id] || detailMap[`index:${index}`] || {}
      const detailAnswer = getField(detail, 'userAnswer', 'useranswer', 'user_answer')
      const localAnswer = getLocalAnswer(result.answers, question.id)
      const answer = getAnswerText(detailAnswer, localAnswer)
      const answered = hasAnswer(answer)
      const correctValue = getField(detail, 'correct', 'isCorrect', 'iscorrect', 'is_correct')
      const correctAnswer = getAnswerText(
        getField(detail, 'correctAnswer', 'correctanswer', 'correct_answer'),
        question.correctAnswer
      )
      const isCorrect = answered && (hasAnswer(correctValue)
        ? isTruthy(correctValue)
        : normalizeAnswer(answer) === normalizeAnswer(correctAnswer))
      return Object.assign({}, question, detail, {
        displayIndex: index + 1,
        userAnswerText: formatAnswer(answer),
        correctAnswerText: formatAnswer(correctAnswer),
        answered,
        statusText: answered ? (isCorrect ? '正确' : '错误') : '未答',
        statusClass: answered ? (isCorrect ? 'ok-text' : 'bad-text') : 'muted',
        isCorrect
      })
    })
    const correctCount = detailItems.filter((item) => item.answered && item.isCorrect).length
    const wrongCount = detailItems.filter((item) => item.answered && !item.isCorrect).length
    const unansweredCount = detailItems.filter((item) => !item.answered).length
    this.setData({
      result,
      usedText: formatDuration(result.usedSeconds || 0),
      scoreClass: scoreToneClass(result.score),
      correctCount,
      wrongCount,
      unansweredCount,
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

function getAnswerText(primary, fallback) {
  if (hasAnswer(primary)) return primary
  if (hasAnswer(fallback)) return fallback
  return ''
}

function getLocalAnswer(answers, questionId) {
  if (!answers) return ''
  const value = answers[questionId]
  if (value && typeof value === 'object') return value.answer || ''
  return value || ''
}

function getField(item, ...names) {
  for (let i = 0; i < names.length; i += 1) {
    if (item && item[names[i]] !== undefined) return item[names[i]]
  }
  return undefined
}

function normalizeAnswer(answer) {
  if (answer === '正确') return 'true'
  if (answer === '错误') return 'false'
  return hasAnswer(answer) ? String(answer).trim().toLowerCase() : ''
}

function isTruthy(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function hasAnswer(value) {
  if (value === null || value === undefined) return false
  if (value === false || value === 0) return false
  if (typeof value === 'string') return value.trim() !== ''
  return true
}
