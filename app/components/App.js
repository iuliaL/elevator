'use strict';

import React from 'react';
import PropTypes from 'prop-types';

export {
	init,
	View,
	reducer
};

// MODEL

const init = {
	currentFloor: 0,
	targetFloor: 0,
	direction: 'UP'
};

const ActionTypes = {
	CALLED_OUTSIDE : { type: 'CALLED OUTSIDE' }, // expects direction, fromFloor
	CALLED_INSIDE: {type: 'CALLED INSIDE' } // expects toFloor
};

// UPDATE

function reducer(state = init, action) {
	switch (action.type){
		case ActionTypes.CALLED_OUTSIDE.type:
			return {
				...state,
				targetFloor: action.fromFloor,
				currentFloor: action.fromFloor,
				direction: action.direction
			};

		case ActionTypes.CALLED_INSIDE.type:
			return {
				...state,
				targetFloor: action.toFloor,
				currentFloor: action.toFloor,
			};
		default:
			return state;
	}
}

const floors = [0, 1, 2, 3, 4, 5, 6].sort((a,b) => b - a);

function onCallOutside(dispatch,fromFloor, direction){
	// the direction is used to discern if the elevator stops on call or not
	// the direction should be the same as the current moving direction

	dispatch({
		type: ActionTypes.CALLED_OUTSIDE.type,
		fromFloor,
		direction
	})
}

function onCallInside(dispatch, toFloor){
	dispatch({
		type: ActionTypes.CALLED_INSIDE.type,
		toFloor
	})
}

function View({ dispatch, state }){
	const floorsJSX = floors.map(floor =>
		<div className="floor" key={floor}>
			<div className={
				`floor-indicator + ${state.currentFloor == floor ? 'current-floor' : ''}`
			}>{floor}</div>
			<div className='buttons'>
				<button onClick={()=> onCallOutside(dispatch, floor, 'UP')}>UP</button>
				<button onClick={()=> onCallOutside(dispatch, floor, 'DOWN')}>DOWN</button>
			</div>
		</div>
	);
	const panel = floors.map(floor=>
		<button key={floor} onClick={()=> onCallInside(dispatch, floor)}>{floor}</button>
	)
	return (
		<div className='elevator'>
			<div className='panel'>{panel}</div>
			<div id='floors'>{floorsJSX}</div>
		</div>
	);
}
