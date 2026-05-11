Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    backHome: {
      type: Boolean,
      value: false
    }
  },

  data: {
    navStyle: '',
    titleStyle: '',
    leftStyle: ''
  },

  lifetimes: {
    attached() {
      const system = wx.getSystemInfoSync()
      const menu = wx.getMenuButtonBoundingClientRect()
      const statusBarHeight = system.statusBarHeight || 0
      const menuTop = menu.top || statusBarHeight
      const menuHeight = menu.height || 32
      const navHeight = menuTop + menuHeight + 8

      this.setData({
        navStyle: `height:${navHeight}px;padding-top:${menuTop}px;`,
        titleStyle: `height:${menuHeight}px;line-height:${menuHeight}px;`,
        leftStyle: `top:${menuTop}px;height:${menuHeight}px;`
      })
    }
  },

  methods: {
    goHome() {
      wx.switchTab({ url: '/pages/index/index' })
    }
  }
})
