// 原始粗暴版
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
    console.log('children>>>', children)
    return {
        type: type,
        props: {
        ...props,
        children: children.map((child) => typeof child === 'object'? child: createTextNode(child))
        },
    }
}

const myRender = (element, container) => {
    const dom = element.type === 'text'? document.createTextNode(element.props.nodeValue): document.createElement(element.type)
    Object.keys(element.props).filter((item) => item !== 'children').forEach((item) => dom[item] = element.props[item])
    element?.props?.children?.forEach((child) => myRender(child, dom))
    container.appendChild(dom)
}