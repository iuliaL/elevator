'use strict';

import React, { Component} from 'react';
import ReactDOM from 'react-dom';

//import 'css/style.css'; /* this is not used*/

import scssStyles from './styles/main.scss';

console.log(JSON.stringify(scssStyles));

//Components
import App from './components/App'

ReactDOM.render(<App testProp={'Hey'}/>, document.getElementById('app'));