'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { Cmd, loop } from 'redux-loop';

export {
	init,
	View,
	reducer
};

// MODEL

const init = {
	currentFloor: 0,
	targetFloor: 0,
	direction: 'UP',
	moving: false,
	stops: []
};

const ActionTypes = {
	CALLED_OUTSIDE: { type: 'CALLED OUTSIDE' }, // expects direction, fromFloor
	CALLED_INSIDE: { type: 'CALLED INSIDE' }, // expects toFloor
	START_MOVING: { type: 'START_MOVING' },
	END_MOVING: { type: 'END_MOVING' },
};

// UPDATE

function reducer(state = init, action) {
	switch (action.type) {
		case ActionTypes.CALLED_OUTSIDE.type: {
			// this calling from outside is not yet implemented
			const newState = {
				...state,
				targetFloor: action.fromFloor,
				// currentFloor: action.fromFloor,
				direction: action.direction
			};
			return loop(newState, Cmd.none);
		}

		case ActionTypes.CALLED_INSIDE.type: {
			const newState = {
				...state,
				stops: [...state.stops, action.toFloor],
				targetFloor: action.toFloor
				// here we'll have another logic on the order and direction
			};
			const newCmd = Cmd.action({
				...ActionTypes.START_MOVING,
				toFloor: action.toFloor
			});
			return loop(newState, newCmd);
		}

		case ActionTypes.START_MOVING.type: {
			const successAction = (toFloor) => {
				return {
					...ActionTypes.END_MOVING,
					toFloor
				}
			}
			const nextFloor = decideNextFloor(state.currentFloor, state.targetFloor);
			const newState = {
				...state,
				moving: true
			};
			const newCmd = Cmd.run(delay, {
				args: [nextFloor],
				successActionCreator: successAction
			});
			return loop(newState, newCmd);
		}

		case ActionTypes.END_MOVING.type:
			const nextAction = action.toFloor === state.targetFloor ?
				Cmd.none : Cmd.action({
					...ActionTypes.START_MOVING,
					toFloor: action.toFloor
			});
			const newState = {
				...state,
				moving: false,
				currentFloor: action.toFloor
			};
			return loop(newState, nextAction);

		default: {
			return state;
		}
	}
}

const floors = [0, 1, 2, 3, 4, 5, 6].reverse();

function delay(data) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			//a promise that is resolved after "delay" milliseconds with the data provided
			resolve(data);
		}, 3000);
	});

}

function decideNextFloor(current, toFloor, floorsArr = floors) {
	const floors = [...floorsArr];
	const reverse = floors.reverse();
	const currentIndex = floors.indexOf(current);
	if (current > toFloor) {
		return reverse[currentIndex - 1];
	} else if (current < toFloor) {
		return reverse[currentIndex + 1];
	} else { // if equals
		console.error('You are now at floor ' + current + '. You called the elevator for going to the same floor as you are now.')
	}
}

// HANDLERS


function onCallInside(dispatch, toFloor) {
	dispatch({
		type: ActionTypes.CALLED_INSIDE.type,
		toFloor
	})
}

function onCallOutside(dispatch, fromFloor, direction) {
	// this calling from outside is not yet implemented

	// the direction is used to discern if the elevator stops on call or not
	// the direction should be the same as the current moving direction
	dispatch({
		type: ActionTypes.CALLED_OUTSIDE.type,
		fromFloor,
		direction
	})
}

// VIEW

function View({ dispatch, state }) {
	const floorsJSX = floors.map(floor =>
		<div className="floor" key={floor}>
			<div className={
				`floor-indicator ${state.currentFloor == floor ? 'current-floor ' : ''}
				${(state.targetFloor === state.currentFloor) && (state.targetFloor === floor)? 'target-floor ' : ''}
			}`
			}>{floor}</div>
			<div className='buttons'>
				<button onClick={() => onCallOutside(dispatch, floor, 'UP')}>UP</button>
				<button onClick={() => onCallOutside(dispatch, floor, 'DOWN')}>DOWN</button>
			</div>
		</div>
	);
	const panel = floors.map(floor =>{
		const btnStyle = (state.targetFloor == floor && state.currentFloor != floor)? {borderColor: '#00e600'} : {}
		return <button key={floor}
			style={btnStyle}
			onClick={() => onCallInside(dispatch, floor)}>{floor}</button>;
	}
	)
	return (
		<div className='elevator'>
			<div className='panel'>{panel}</div>
			<div id='floors'>{floorsJSX}</div>
		</div>
	);
}


// TODO log case when calling elevator for the same floor