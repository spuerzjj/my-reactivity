export function isObject(value) {
  return typeof value === 'object' && value !== null
}

export function hasChanged(value1, value2) {
  return !Object.is(value1, value2)
}
