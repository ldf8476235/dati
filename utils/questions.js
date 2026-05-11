const TYPE_LABELS = {
  single_choice: '选择题',
  true_false: '判断题'
}

function normalizeQuestion(item, index) {
  const options = item.options || compactOptions(item)
  return Object.assign({}, item, {
    displayNo: item.order || index + 1,
    typeLabel: TYPE_LABELS[item.type] || item.type,
    optionItems: buildOptions(item.type, options)
  })
}

function compactOptions(item) {
  return [item.optionA, item.optionB, item.optionC, item.optionD].filter(Boolean)
}

function buildOptions(type, options) {
  if (type === 'true_false') {
    return [
      { value: 'true', label: '正确' },
      { value: 'false', label: '错误' }
    ]
  }
  return (options || []).map((text, index) => ({
    value: String.fromCharCode(65 + index),
    label: `${String.fromCharCode(65 + index)}. ${text}`
  }))
}

function formatDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0)
  const min = Math.floor(value / 60)
  const sec = value % 60
  return `${min}:${sec < 10 ? '0' : ''}${sec}`
}

module.exports = {
  normalizeQuestion,
  formatDuration
}
