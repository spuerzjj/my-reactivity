import { isObject } from './utils.js'
import { handler } from './handlers.js'
const targetMap = new WeakMap()

export function reactive(target) {
  if (!isObject(target)) return target

  if (targetMap.has(target)) {
    return targetMap.get(target)
  }
  return new Proxy(target, handler)
}
