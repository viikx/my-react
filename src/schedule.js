import { TAG_TEXT, ELEMENT_TEXT, TAG_ROOT, TAG_HOST, PLACEMENT, UPDATE, DELETION } from "./constants.js";
import { setProps } from './utils.js'
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
let currentRoot = null // 渲染成功后当前根root
let deletions = []; //删除的节点我们并不放在effect list 里，所以需要单独记录并执行

export function scheduleRoot(rootFiber) {

  if (currentRoot && currentRoot.alternate) { // 双缓冲,第二次以后的更新
    workInProgressRoot = currentRoot.alternate; // 第一次渲染出来的那个 fiber tree
  }
  else if (currentRoot) { // 说明至少渲染过一次，第一次更新
    rootFiber.alternate = currentRoot
    workInProgressRoot = rootFiber
  }
  else { // 第一次渲染
    workInProgressRoot = rootFiber
  }
  workInProgressRoot.firstEffect = workInProgressRoot.lastEffect = workInProgressRoot.nextEffect = null
  nextUnitOfWork = workInProgressRoot
}

function performUnitWork(currentFiber) {
  beginWork(currentFiber)
  if (currentFiber.child) {
    return currentFiber.child
  }

  while (currentFiber) {
    completeUnitOfWork(currentFiber) // 没有儿子，让自己完成
    if (currentFiber.sibling) { // 看有没有弟弟
      return currentFiber.sibling // 有弟弟返回弟弟
    }
    currentFiber = currentFiber.return // 找父亲，让父亲完成
  }
}
// 在完成的时候收集有副作用的fiber ，组成effect list
// 每个fiber有两个属性 
// firstEffect 指向第一个有副作用的子fiber 
// lastEffect 指向最后一个有副作用的子fiber 
// 中间用nextEffect做成一个单链表
function completeUnitOfWork(currentFiber) {
  let returnFiber = currentFiber.return;
  if (returnFiber) {
    // 把 自己儿子的effect list 挂到父亲身上
    if (!returnFiber.firstEffect) {
      returnFiber.firstEffect = currentFiber.firstEffect
    }
    if (!!currentFiber.lastEffect) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber.firstEffect
      }
      returnFiber.lastEffect = currentFiber.lastEffect

    }
    // 把自己挂到父亲身上
    const effectTag = currentFiber.effectTag
    if (effectTag) { // 第一次渲染都会有
      if (!!returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber
      } else {
        returnFiber.firstEffect = currentFiber
      }
      returnFiber.lastEffect = currentFiber

    }
  }
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
  else if (currentFiber.tag === TAG_HOST) {
    updateHost(currentFiber)
  }
}
function updateHost(currentFiber) {
  if (!currentFiber.stateNode) { //此fiber没有创建dom节点
    currentFiber.stateNode = createDOM(currentFiber)
  }
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}
function createDOM(currentFiber) {
  if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text)
  } else if (currentFiber.tag === TAG_HOST) {
    let stateNode = document.createElement(currentFiber.type)
    updateDOM(stateNode, {}, currentFiber.props) // 处理属性
    return stateNode
  }
}
function updateDOM(stateNode, oldProps, newProps) {
  setProps(stateNode, oldProps, newProps)
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
  // 如果当前的fiber有alternate属性，并且alternate有child属性 
  let oldFiber = currentFiber.alternate && currentFiber.alternate.child;
  let prevSibling; // 上一个新的子fiber
  while (newChildIndex < newChildren.length || oldFiber) {
    let newChild = newChildren[newChildIndex] // 取出虚拟dom节点
    let newFiber;
    const sameType = oldFiber && newChild && oldFiber.type === newChild.type
    let tag;
    // debugger;
    if (newChild.type == ELEMENT_TEXT) {
      tag = TAG_TEXT
    } else if (typeof newChild.type === 'string') {
      tag = TAG_HOST
    }
    if (sameType) { // 老fiber和新的vdom类型一样，可以复用老的dom节点
      newFiber = {
        tag: oldFiber.tag,
        type: oldFiber.type,
        props: newChild.props,
        stateNode: oldFiber.stateNode,
        return: currentFiber,
        alternate: oldFiber,
        effectTag: UPDATE, //副作用标识
        nextEffect: null,
        // effect list 和fiber节点的完成顺序一致
      }
    }
    else {
      if (newChild) {
        newFiber = {
          tag,
          type: newChild.type,
          props: newChild.props,
          stateNode: null,
          return: currentFiber,
          effectTag: PLACEMENT, //副作用标识
          nextEffect: null,
          // effect list 和fiber节点的完成顺序一致
        }
      }
      if (oldFiber) {
        oldFiber.effectTag = DELETION;
        deletions.push(oldFiber)
      }
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling // oldFiber 指针向后移动
    }

    // 最小的儿子是没有弟弟的
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
    nextUnitOfWork = performUnitWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1 //空余时间小于1ms ，需让出控制权
  }
  if (!nextUnitOfWork && workInProgressRoot) { // 如果时间片到期后还有任务没有完成，就需要请求浏览器再次调度
    console.log('render 结束')
    commitRoot()
  }
  requestIdleCallback(wookLoop, { timeout: 500 })
}

function commitRoot() {
  deletions.forEach(commitWork) // 执行effect list 之前先把改删的元素删掉
  let currentFiber = workInProgressRoot.firstEffect
  while (currentFiber) {
    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect
  }
  deletions.length = 0
  currentRoot = workInProgressRoot //把当前渲染成功的根fiber 赋给currentRoot
  workInProgressRoot = null
}

function commitWork(currentFiber) {
  if (!currentFiber) return;
  let returnFiber = currentFiber.return;
  let domReturn = returnFiber.stateNode;
  if (currentFiber.effectTag === PLACEMENT) { // 新增节点
    domReturn.appendChild(currentFiber.stateNode)
  }
  else if (currentFiber.effectTag === DELETION) {// 删除节点
    domReturn.removeChild(currentFiber.stateNode)
  }
  else if (currentFiber.effectTag === UPDATE) {
    if (currentFiber.type === ELEMENT_TEXT) {
      if (currentFiber.alternate.props.text !== currentFiber.props.text)
        currentFiber.stateNode.textContent = currentFiber.props.text
    }
    else {
      updateDOM(currentFiber.stateNode, currentFiber.alternate.props, currentFiber.props)
    }
  }
  currentFiber.effectTag = null
}
// 有一个优先级的概念:expirationTime，这里简化为 超时500ms
requestIdleCallback(wookLoop, { timeout: 500 })