import { reactive } from './src/reactive'
import { effect } from './src/effect'
import { computed } from './src/computed'

const obj = {
  a: 1,
  b: 2,
  c: 3
}
const state = reactive(obj)

const doubleState = computed(() => {
  console.log('computed')
  return state.a * 2
})

// console.log(doubleState.value)

effect(() => {
  //   state.a = 2
  console.log(doubleState.value)
})

state.a = 4
