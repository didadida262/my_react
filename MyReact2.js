// fiber优化版
let nextUniteWork = null
const myCreateElement = (type, props, ...children) => {
  return {
    type: type,
    props: {
      ...props,
      children: children.map((child) => typeof child === 'object'? child: createTextNode(child))
    },
  }
}
const createTextNode = (child) => {
  return {
    type: 'text',
    props: {
      nodeValue: child,
      children: []
    }
  }
}
const createDom = (fiber) => {
  const dom = fiber.type === 'text'? document.createTextNode(fiber.props.nodeValue): document.createElement(fiber.type)
  return dom
}
const performUniteOfWork = (fiber) => {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
    console.log('fiber>>>',fiber)
    console.log('fiber.dom>>>',fiber.dom)
  }
  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom)
  }
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
const myRender = (element, container) => {
    console.warn('element>>', element)
    nextUniteWork = {
      dom: container,
      props: {
        children: [element]
      }
    }
  }
  
const workLoop = (deadline) => {
  let shouldYield = true
  console.warn('workLoop>>>loop')
  while (nextUniteWork && shouldYield) {
    console.log('执行>>>任务')
    nextUniteWork = performUniteOfWork(nextUniteWork)
    shouldYield = deadline.timeRemaining() > 100
  }
  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)
