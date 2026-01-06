let nextUniteWork = null
let wiproot = null
const createTextNode = (child) => {
  return {
    type: 'text',
    props: {
      nodeValue: child,
      children: []
    }
  }
}
const myCreateElement = (type, props, ...children) => {
    return {
      type: type,
      props: {
        ...props,
        children: children.map((child) => typeof child === 'object'? child: createTextNode(child))
      },
    }
  }
const createDom = (fiber) => {
    const dom = fiber.type === 'text'? document.createTextNode(fiber.props.nodeValue): document.createElement(fiber.type)
  return dom
}
const performUniteOfWork = (fiber) => {
  console.log('<<<<<<<<<<<<<<<<performUniteOfWork>>>>>>>>>>>>>')
  console.log('fiber>>>', fiber)
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  // if (fiber.parent) {
  //   fiber.parent.dom.appendChild(fiber.dom)
  // }
  const elements = fiber?.props?.children
  let preSibling = null
  elements?.forEach((childElement, index) => {
    const newFiber = {
      parent: fiber,
      props: childElement.props,
      type: childElement.type,
      dom: null
    }
    if (index === 0) {
      fiber.child = newFiber
    } else {
      preSibling.sibling = newFiber
    }
    preSibling = newFiber
  });
  if (fiber.child) {
    return fiber.child
  }

  let nextFiber = fiber
  while(nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }

}
const commitWorker = (fiber) => {
  if (!fiber) return
  const domParent = fiber.parent.dom
  domParent.appendChild(fiber.dom)
  commitWorker(fiber.child)
  commitWorker(fiber.sibling)
}
const commitRoot = () => {
  commitWorker(wiproot.child)
  wiproot = null
}
const workLoop = (deadline) => {
  let shouldYield = true
  console.warn('执行>>>loop')
  while (nextUniteWork && shouldYield) {
    console.log('执行>>>任务')
    nextUniteWork = performUniteOfWork(nextUniteWork)
    shouldYield = deadline.timeRemaining() > 100
  }
  if (!nextUniteWork && wiproot) {
    console.log('wiproot>>>>', wiproot)
    commitRoot()
  }
  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)

const myRender = (element, container) => {
  console.log('element>>', element)
  wiproot = {
    dom: container,
    props: {
      children: [element]
    }
  }
  nextUniteWork = wiproot
}