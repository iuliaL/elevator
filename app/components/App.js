'use strict';

import React, { Component } from 'react';
import PropTypes from 'prop-types';


const floors = [0,1,2,3,4,5,6];

const floorsJSX = floors.map(floor=>
	<div className="floor" key={floor}>
		<div className='floor-indicator'>{floor}</div>
	</div>
	);

export default class App extends Component {
	render() {
		return (
			<div id='floors'>{floorsJSX}</div>
		);
	}
}

App.propTypes = {
	testProp: PropTypes.string.isRequired
};


// ELEVATOR

/* 

6 floors

- each floor has a panel with 2 buttons up/down
- elevator panel 0 -> 6
- max weight 600kg
- one person 60 kg
- status logger (overweight, going up, going down)
- time floor  to floor 3 seconds
- the lift should stop if requested for same direction on its way to target floor

*/
