diff差异标识 + commit修改

let nextUnitOfWork = null;
let wipRoot = null;
let currentRoot = null; // 新增：保存已提交的旧 Fiber 树（current 树）
let deletions = [];     // 新增：保存需要删除的 Fiber 节点

// 1. 标记类型常量（精简版）
const Placement = 'PLACEMENT'; // 新增节点
const Update = 'UPDATE';       // 属性更新
const Deletion = 'DELETION';   // 删除节点

// 创建文本节点 Fiber
const createTextNode = (child) => ({
  type: 'text',
  props: { nodeValue: child, children: [] }
});

// 创建元素 Fiber（虚拟DOM）
const myCreateElement = (type, props, ...children) => ({
  type,
  props: { ...props, children: children.map(child => typeof child === 'object' ? child : createTextNode(child)) }
});

// 创建真实 DOM 节点
const createDom = (fiber) => 
  fiber.type === 'text' 
    ? document.createTextNode(fiber.props.nodeValue) 
    : document.createElement(fiber.type);

// 对比新旧 Fiber 节点的属性差异
const updateProps = (dom, oldProps, newProps) => {
  // 1. 删除旧属性（新props中没有的）
  Object.keys(oldProps).forEach(key => {
    if (key !== 'children' && !newProps[key]) delete dom[key];
  });
  // 2. 更新/新增属性（新props有变化的）
  Object.keys(newProps).forEach(key => {
    if (key !== 'children' && oldProps[key] !== newProps[key]) {
      dom[key] = newProps[key];
    }
  });
};

// Diff 核心 - 复用/创建/删除 Fiber 节点
const reconcileChildren = (wipFiber, elements) => {
  let oldFiber = wipFiber.alternate?.child; // 旧 Fiber 子节点
  let prevSibling = null;

  elements?.forEach((element, index) => {
    const sameType = oldFiber && element && element.type === oldFiber.type;
    let newFiber = null;

    // 1. 类型相同 - 复用旧 Fiber，标记更新
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber, // 关联旧 Fiber
        effectTag: Update
      };
    }
    // 2. 类型不同/无旧 Fiber - 新建 Fiber，标记新增
    if (!sameType && element) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: Placement
      };
    }
    // 3. 类型不同/无新元素 - 标记旧 Fiber 删除
    if (!sameType && oldFiber) {
      oldFiber.effectTag = Deletion;
      deletions.push(oldFiber);
    }

    if (oldFiber) oldFiber = oldFiber.sibling; // 移动到下一个旧 Fiber 兄弟节点

    // 建立 Fiber 树关联
    if (index === 0) wipFiber.child = newFiber;
    else if (element) prevSibling.sibling = newFiber;
    
    if (newFiber) prevSibling = newFiber;
  });

  // 剩余的旧 Fiber 全部标记删除
  while (oldFiber) {
    oldFiber.effectTag = Deletion;
    deletions.push(oldFiber);
    oldFiber = oldFiber.sibling;
  }
};

// 调和阶段：构建 Fiber 树 + Diff + 标记差异
const performUnitOfWork = (fiber) => {
  // 1. 创建 DOM（仅创建，不挂载）
  if (!fiber.dom && fiber.type) fiber.dom = createDom(fiber);

  // 2. Diff 对比子节点，标记差异
  reconcileChildren(fiber, fiber.props.children);

  // 3. 深度优先遍历：先处理子节点，再处理兄弟节点
  if (fiber.child) return fiber.child;
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling;
    nextFiber = nextFiber.parent;
  }
};

// 按标记执行 DOM 操作（提交阶段核心）
const commitWork = (fiber) => {
  if (!fiber) return;

  const domParent = fiber.parent.dom;
  // 1. 新增节点
  if (fiber.effectTag === Placement && fiber.dom) {
    domParent.appendChild(fiber.dom);
  }
  // 2. 更新节点属性
  else if (fiber.effectTag === Update && fiber.dom) {
    updateProps(fiber.dom, fiber.alternate.props, fiber.props);
  }
  // 3. 删除节点（单独收集，最后处理）

  // 递归处理子/兄弟节点
  commitWork(fiber.child);
  commitWork(fiber.sibling);
};

// 处理删除节点
const commitDeletions = (fiber, domParent) => {
  if (fiber.dom) domParent.removeChild(fiber.dom);
  else { // 非叶子节点，递归删除子节点
    commitDeletions(fiber.child, domParent);
  }
  if (fiber.sibling) commitDeletions(fiber.sibling, domParent);
};

// 提交阶段：按标记批量更新 DOM
const commitRoot = () => {
  // 1. 处理删除
  deletions.forEach(fiber => commitDeletions(fiber, fiber.parent.dom));
  // 2. 处理新增/更新
  commitWork(wipRoot.child);
  // 3. 保存当前 Fiber 树为旧树（供下次更新 Diff 使用）
  currentRoot = wipRoot;
  wipRoot = null;
  deletions = []; // 清空删除队列
};

// 触发渲染（初始化/更新都调用此方法）
const myRender = (element, container) => {
  wipRoot = {
    dom: container,
    props: { children: [element] },
    alternate: currentRoot // 关联旧 Fiber 树
  };
  nextUnitOfWork = wipRoot;
};

// 工作循环：可中断的调和阶段
const workLoop = (deadline) => {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1; // 剩余时间<1ms则让出主线程
  }

  // 调和完成，执行提交
  if (!nextUnitOfWork && wipRoot) commitRoot();
  requestIdleCallback(workLoop);
};

requestIdleCallback(workLoop);

// ============== 测试代码 ==============
// 1. 初始化渲染
const container = document.getElementById('root');
const initElement = myCreateElement('div', { id: 'box' }, 'Hello Fiber');
myRender(initElement, container);

// 2. 模拟数据更新（2秒后更新内容+属性，验证 Diff+标记+更新）
setTimeout(() => {
  const updateElement = myCreateElement('div', { id: 'new-box', style: 'color: red' }, 'Hello Updated');
  myRender(updateElement, container);
}, 2000);