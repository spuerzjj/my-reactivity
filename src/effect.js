import { TrackOpTypes, TriggerOptypes } from './operations.js'

// 对象和属性的关联
const targetMap = new WeakMap()
const ITERATE_KEY = Symbol('ITERATE')
let activeEffect = undefined
let effectStack = []
let shouldTrack = true

export function pauseTracking() {
  shouldTrack = false
}

export function resumeTracking() {
  shouldTrack = true
}

export function track(target, type, key) {
  if (!shouldTrack || !activeEffect) return

  // 如果是遍历，key指定为ITERATE_KEY
  if (type === TrackOpTypes.ITERATE) {
    key = ITERATE_KEY
  }
  // 建立对应关系

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  dep.add(activeEffect)
  activeEffect.deps.push(dep)
  //   console.log(targetMap)
  //   console.log(`%c依赖收集-${type}`, 'color:#0f0;', key, activeEffect)
}

export function trigger(target, type, key) {
  // 1. 找到依赖
  const effectFns = getEffectFns(target, type, key)

  if (effectFns.length) {
    // console.log(`%c派发更新-${type}`, 'color:#f00;', key)
  }
  // 2. 重新执行
  for (const effectFn of effectFns) {
    // 将要触发的函数，正是被依赖收集的函数，就不要再触发了，否则死循环了
    // 或者说是effect执行某个函数的过程中又触发了函数的重新执行
    if (effectFn === activeEffect) {
      continue
    }

    // 如果有调度器，则在派发更新的时候运行调度器
    if (effectFn.options.scheduler) {
      effectFn.options.scheduler(effectFn)
    } else {
      effectFn()
    }
  }
}

function getEffectFns(target, type, key) {
  const effectFns = new Set()
  const depsMap = targetMap.get(target)
  if (depsMap) {
    const keys = [key]
    // 新增和删除的操作类型需要引起遍历的重新执行
    if (type === TriggerOptypes.ADD || type === TriggerOptypes.DELETE) {
      keys.push(ITERATE_KEY)
    }

    for (const key of keys) {
      const dep = depsMap.get(key)
      if (!dep) {
        continue
      }
      for (const effectFn of dep) {
        effectFns.add(effectFn)
      }
    }
  }
  return effectFns
}

// 创建一个被依赖收集的函数
export function effect(fn, options = {}) {
  let result
  // effectFn是被依赖收集的函数 = 原函数+环境
  const effectFn = () => {
    try {
      activeEffect = effectFn
      effectStack.push(effectFn)
      cleanup(effectFn)
      result = fn()
    } finally {
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
    return result
  }
  effectFn.deps = []
  effectFn.options = options
  // lazy配置 首次执行延迟执行
  if (options && options.lazy) {
    return effectFn
  }
  effectFn()
}

// 清空effectFn之前的依赖关系
export function cleanup(effectFn) {
  const { deps } = effectFn
  if (!deps.length) {
    return
  }

  for (const dep of deps) {
    dep.delete(effectFn)
  }

  deps.length = 0
}
