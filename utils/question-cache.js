const request = require('./request')

const QUESTION_TYPES = ['single_choice', 'true_false']
const PAGE_SIZE = 10000
const CACHE_PREFIX = 'questionBank:'

function cacheKey(levelId) {
  return `${CACHE_PREFIX}${Number(levelId) || 1}`
}

function readQuestionBank(levelId) {
  const bank = wx.getStorageSync(cacheKey(levelId))
  if (!bank || !Array.isArray(bank.items)) return null
  return bank
}

function writeQuestionBank(levelId, bank) {
  wx.setStorageSync(cacheKey(levelId), bank)
  return bank
}

function fetchQuestionBank(levelId) {
  const resolvedLevelId = Number(levelId) || 1
  return Promise.all(QUESTION_TYPES.map((type) => request({
    url: `/api/questions/sequence?levelId=${resolvedLevelId}&type=${type}&page=1&pageSize=${PAGE_SIZE}`
  }))).then((responses) => {
    const items = responses.reduce((list, data) => list.concat(data.items || []), [])
    const total = responses.reduce((sum, data) => sum + (Number(data.total) || 0), 0)
    return writeQuestionBank(resolvedLevelId, {
      levelId: resolvedLevelId,
      items,
      total,
      updatedAt: Date.now()
    })
  })
}

function getQuestionBank(levelId) {
  const cached = readQuestionBank(levelId)
  if (cached) {
    return Promise.resolve(Object.assign({}, cached, { fromCache: true }))
  }
  return refreshQuestionBank(levelId)
}

function refreshQuestionBank(levelId) {
  const cached = readQuestionBank(levelId)
  return fetchQuestionBank(levelId).then((bank) => Object.assign({}, bank, { fromCache: false })).catch((err) => {
    if (cached) {
      wx.showToast({ title: '使用本地题库', icon: 'none' })
      return Object.assign({}, cached, { fromCache: true, stale: true })
    }
    throw err
  })
}

function clearQuestionBankCache(levelId) {
  if (levelId !== undefined && levelId !== null) {
    wx.removeStorageSync(cacheKey(levelId))
    return
  }
  const info = wx.getStorageInfoSync()
  ;(info.keys || []).forEach((key) => {
    if (key.indexOf(CACHE_PREFIX) === 0) {
      wx.removeStorageSync(key)
    }
  })
}

module.exports = {
  getQuestionBank,
  refreshQuestionBank,
  clearQuestionBankCache
}
