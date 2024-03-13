import { track, trigger, pauseTracking, resumeTracking } from './effect.js'
import { reactive } from './reactive.js'
import { hasChanged, isObject } from './utils.js'
import { TrackOpTypes, TriggerOptypes } from './operations.js'
const RAW = Symbol('raw')
const arrayInstrumentations = {}

;['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
  arrayInstrumentations[key] = function (...args) {
    // 1. 正常找
    const res = Array.prototype[key].apply(this, args) // 这里的this是代理对象
    // 2. 找不到，在原始对象里面再找一遍
    if (res < 0 || res === false) {
      return Array.prototype[key].apply(this[RAW], args)
    }
    return res
  }
})
;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
  arrayInstrumentations[key] = function (...args) {
    // 暂停依赖收集
    pauseTracking()
    const res = Array.prototype[key].apply(this, args)
    // 恢复依赖收集
    resumeTracking()
    return res
  }
})

// 监听属性的读取
function get(target, key, receiver) {
  // 通过RAW来读取原始对象，不需要依赖收集
  if (key === RAW) return target
  // 依赖收集
  track(target, TrackOpTypes.GET, key)

  // 对数组方法的特殊处理
  if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
    return arrayInstrumentations[key]
  }

  // receiver是指定内部的this指向的
  const result = Reflect.get(target, key, receiver)

  // 如果是对象，进行深度代理
  if (isObject(result)) {
    return reactive(result)
  }
  return result
}

// 为了监听到 in 的操作
function has(target, key) {
  track(target, TrackOpTypes.HAS, key)
  return Reflect.has(target, key)
}

// 为了监听遍历，for in, object.keys
function ownKeys(target) {
  track(target, TrackOpTypes.ITERATE)
}

// 写和新增属性
function set(target, key, value, receiver) {
  // 操作类型
  const type = target.hasOwnProperty(key)
    ? TriggerOptypes.SET
    : TriggerOptypes.ADD
  const oldValue = target[key]
  const oldLen = Array.isArray(target) ? target.length : undefined
  const result = Reflect.set(target, key, value, receiver)
  // 设置失败直接返回
  if (!result) return result
  const newLen = Array.isArray(target) ? target.length : undefined
  // 修改成功，并且值发生变化或者是新增属性
  if (hasChanged(oldValue, value) || type === TriggerOptypes.ADD) {
    trigger(target, type, key)
    // 如果目标是数组，且length发生了变化
    if (Array.isArray(target) && oldLen !== newLen) {
      // 没有直接设置length
      if (key !== 'length') {
        trigger(target, TriggerOptypes.SET, 'length')
      } else {
        // 手动触发删除
        for (let i = newLen; i < oldLen; i++) {
          trigger(target, TriggerOptypes.DELETE, i.toString())
        }
      }
    }
  }
  return result
}

// 删除属性
function deleteProperty(target, key) {
  const hasKey = target.hasOwnProperty(key)
  const result = Reflect.defineProperty(target, key)
  // 有这个属性并且删除成功才需要派发更新
  if (hasKey && result) {
    trigger(target, TriggerOptypes.DELETE, key)
  }
  return result
}

export const handler = {
  get,
  has,
  set,
  ownKeys,
  deleteProperty
}
