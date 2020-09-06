import { TAG_ROOT } from "./constants";
/**
 * 
 * @param {*} element 虚拟dom
 * @param {*} container 容器
 */
function render(element, container) {
  let rootFiber = {
    tag: TAG_ROOT, // 每个fiber会有一个tag标识，此元素的类型
    stateNode: container, //如果是原生节点的话stateNode指向真实dom
    props: {
      children: [element]
    }
  }
  scheduleRoot(rootFiber)
}

const ReactDOM = {
  render
}
export default ReactDOM;