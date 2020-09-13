import { ELEMENT_TEXT } from './constants.js'
/**
 * 创建元素（虚拟dom）的方法
 * @param {*} type 元素的类型
 * @param {*} config 配置对象 属性 key ref
 * @param  {...any} children 子元素（简化为数组）
 */
function createElement(type, config, ...children) {
  if (config) {
    delete config.__self;
    delete config.__source; // 表示这个元素是在那行那列那个文件生成的
  }
  return {
    type,
    props: {
      ...config,
      children: children.map(child => { // 兼容文本节点
        return typeof child === 'object' ? child : {
          type: ELEMENT_TEXT,
          props: { text: child, children: [] }
        }
      })
    }
  }
}

const React = {
  createElement
}
export default React;