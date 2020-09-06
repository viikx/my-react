import { TAG_TEXT, ELEMENT_TEXT, TAG_HOST, PLACEMENT } from "./constants.js";

/**
 * 从根节点开始渲染和调度
 * 两个阶段
 * 1. diff 对比新旧虚拟Dom，进行增量更新或创建，render阶段
 * 这个阶段可能比较花时间，所以我们要对任务进行拆分，拆分的维度是虚拟dom，此阶段可暂停
 * render阶段的成果是effect list 知道哪些节点删除了，哪些节点增加了
 * render阶段有两个任务 1. 根据虚拟dom生成fiber树 2.收集effectlist
 * 2. commit阶段 ，进行dom更新的阶段，不能暂停，
 * @param {*} rootFiber 
 */


let nextUnitOfWork = null // 下一个工作单元
let workInProgressRoot = null // 应用的根
export function scheduleRoot(rootFiber) {
  workInProgressRoot = rootFiber
  nextUnitOfWork = rootFiber
}

function performUnitWork() {
  beginWork(currentFiber)
  if (currentFiber.child) {
    return currentFiber.child
  }

  while (currentFiber) {
    completeUnitOfWork(currentFiber)
    if (currentFiber.sibling) {
      return currentFiber.sibling
    }
    currentFiber = currentFiber.return
  }
}
function completeUnitOfWork(currentFiber) {

}

/**
 * 开始工作
 * 1. 创建真实DOM元素 
 * 2. 创建子fiber
 * completeUnitOfWork 工作完成
 * 1. 收集 effect
 *
 */
function beginWork(currentFiber) {
  if (currentFiber.tag === TAG_ROOT) { //如果是根节点 rootFiber
    updateHostRoot(currentFiber)
  } else if (currentFiber.tag === TAG_TEXT) {
    updateHostText(currentFiber)
  }
}
function createDOM(currentFiber) {
  if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text)
  } else if (currentFiber.tag === TAG_HOST) {
    let stateNode = document.createElement(currentFiber.type)
    updateDOM(stateNode, {}, currentFiber.props)
    return stateNode
  }
}
function updateDOM(stateNode, oldProps, newProps) {

}
function updateHostText(currentFiber) {
  if (!currentFiber.stateNode) { //此fiber没有创建dom节点
    currentFiber.stateNode = createDOM(currentFiber)
  }
}

function updateHostRoot(currentFiber) {
  // 先处理自己，如果是一个原生dom节点，创建真实dom和子fiber
  let newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}
function reconcileChildren(currentFiber, newChildren) {
  let newChildIndex = 0; // 新子节点的索引
  let prevSibling; // 上一个新的子fiber
  while (newChildIndex < newChildren.length) {
    let newChild = newChildren[newChildIndex] // 取出虚拟dom节点
    let tag;
    if (newChild.type == ELEMENT_TEXT) {
      tag = TAG_TEXT
    } else if (typeof newChild.type === 'string') {
      tag = TAG_HOST
    }
    let newFiber = {
      tag,
      type: newChild.type,
      props: newChild.props,
      stateNode: null,
      return: currentFiber,
      effectTag: PLACEMENT, //副作用标识
      nextEffect: null,
      // effect list 和fiber节点的完成顺序一致
    }
    if (newFiber) {
      if (newChildIndex == 0) {
        currentFiber.child = newFiber
      }
      else {
        prevSibling.sibling = newFiber
      }
      prevSibling = newFiber
    }
    newChildIndex++
  }
}


// 循环执行工作 nextUnitOfWork
function wookLoop(deadline) {
  let shouldYield = false // 是否让出控制权
  while (nextUnitOfWork && !shouldYield) {
    performUnitWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1 //空余时间小于1ms ，需让出控制权
  }
  if (!nextUnitOfWork) { // 如果时间片到期后还有任务没有完成，就需要请求浏览器再次调度
    console.log('render 结束')
  }
  requestIdleCallback(wookLoop, { timeout: 500 })
}

// 有一个优先级的概念:expirationTime，这里简化为 超时500ms
requestIdleCallback(wookLoop, { timeout: 500 })