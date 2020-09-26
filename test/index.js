import React from "../src/react.js";
import ReactDOM from '../src/react-dom.js'
import { element, element1, element2 } from './jsx-babel.js'

// console.log(element)
ReactDOM.render(element, document.getElementById('root'))

document.querySelector('button').onclick = function () {
  ReactDOM.render(element1, document.getElementById('root'))
  this.style.display = 'none'
}
