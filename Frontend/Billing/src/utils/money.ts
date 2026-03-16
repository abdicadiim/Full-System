export function fmt(amount=0, currency='USD'){
  try{
    return new Intl.NumberFormat(undefined, { style:'currency', currency }).format(amount)
  }catch{
    return `${currency} ${amount.toFixed(2)}`
  }
}
