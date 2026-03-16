import { useState } from 'react'
export function useForm(initial, validate){
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  function set(name, val){ setValues(v => ({...v, [name]: val})) }
  function onChange(e){ set(e.target.name, e.target.type==='number' ? Number(e.target.value) : e.target.value) }
  function runValidate(){
    const res = validate ? validate(values) : {}
    setErrors(res||{})
    return Object.keys(res||{}).length===0
  }
  function reset(v=initial){ setValues(v); setErrors({}) }
  return { values, set, onChange, errors, setErrors, validate: runValidate, reset }
}
