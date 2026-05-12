const TYPE_LABELS = {
  single_choice: '选择题',
  true_false: '判断题'
}

const TYPE_HINTS = {
  single_choice: '单选题',
  true_false: '判断题'
}

function normalizeQuestion(item, index) {
  const options = item.options || compactOptions(item)
  return Object.assign({}, item, {
    displayNo: item.order || index + 1,
    typeLabel: TYPE_LABELS[item.type] || item.type,
    typeHint: TYPE_HINTS[item.type] || item.type,
    optionItems: buildOptions(item.type, options)
  })
}

function compactOptions(item) {
  return [item.optionA, item.optionB, item.optionC, item.optionD].filter(Boolean)
}

function buildOptions(type, options) {
  if (type === 'true_false') {
    return [
      { value: 'true', label: '正确', displayLabel: '正确' },
      { value: 'false', label: '错误', displayLabel: '错误' }
    ]
  }
  return (options || []).map((text, index) => ({
    value: String.fromCharCode(65 + index),
    label: `${String.fromCharCode(65 + index)}. ${text}`,
    displayLabel: text
  }))
}

function formatDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0)
  const min = Math.floor(value / 60)
  const sec = value % 60
  return `${min}:${sec < 10 ? '0' : ''}${sec}`
}

function scoreToneClass(score) {
  const value = Number(score) || 0
  if (value >= 80) return 'score-good'
  if (value >= 60) return 'score-warn'
  return 'score-bad'
}

module.exports = {
  normalizeQuestion,
  formatDuration,
  scoreToneClass
}
