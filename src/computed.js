import { effect, trigger, track } from './effect.js'
import { TrackOpTypes, TriggerOptypes } from './operations.js'

// 参数归一
function normalizeOptions(options) {
  let getter, setter
  if (typeof options === 'function') {
    getter = options
    setter = () => {}
  } else {
    getter = options.get
    setter = options.set
  }

  return { getter, setter }
}

export function computed(options) {
  let { setter, getter } = normalizeOptions(options)

  // get的返回值
  let value = undefined
  // 标识结果是否已经脏了，脏了在get value时就要重新运行effectFn去更新value
  let dirty = true

  // 将getter与里面的响应式数据进行关联
  const effectFn = effect(getter, {
    lazy: true,
    scheduler: () => {
      // 对getter内部的响应式数据变化除非的派发更新，不直接重新运行effectFn了，而是标记数据脏了即可，重新运行是由外部决定
      dirty = true
      // getter派发更新，向上冒泡派发更新
      trigger(obj, TriggerOptypes.SET, 'value')
    }
  })

  const obj = {
    get value() {
      // 在读取.value时运行effectFns
      if (dirty) {
        // 在读取.value时，对value进行依赖收集
        track(obj, TrackOpTypes.GET, 'value')
        dirty = false
        value = effectFn()
      }
      return value
    },
    set value(newValue) {
      setter(newValue)
    }
  }

  return obj
}
