import { track, trigger } from './effect.js'
import { TrackOpTypes, TriggerOptypes } from './operations.js'

export function ref(value) {
  return {
    get value() {
      track(this, TrackOpTypes.GET, 'value')
      return value
    },

    set value(newValue) {
      trigger(this, TriggerOptypes.SET, 'value')
      value = newValue
    }
  }
}
