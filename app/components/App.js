'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { Cmd, loop } from 'redux-loop';

export { init, View, reducer };

const zero2six = [0, 1, 2, 3, 4, 5, 6];
const stops = zero2six.map(floor => ({
	stop: false
}));

// MODEL

const init = {
	currentFloor: 0,
	nextTargetFloor: null,
	direction: 'UP',
	moving: false,
	stops: stops,
	message: ''
};

const ActionTypes = {
	// CALLED_OUTSIDE: { type: 'CALLED OUTSIDE' }, // expects direction, fromFloor
	CALLED_INSIDE: { type: 'CALLED INSIDE' }, // expects toFloor
	START_MOVING: { type: 'START_MOVING' },
	END_MOVING: { type: 'END_MOVING' },
	SET_CURRENT_FLOOR: { type: 'SET_CURRENT_FLOOR' },
	HIT_TARGET_FLOOR: { type: 'HIT_TARGET_FLOOR' },
	RESET_NEXT_TARGET: { type: 'RESET_NEXT_TARGET' },
	LOG_MESSAGE: { type: 'LOG_MESSAGE' } // expects message
};

// UPDATE

function reducer(state = init, action) {
	switch (action.type) {
		case ActionTypes.LOG_MESSAGE.type: {
			return {
				...state,
				message: action.message
			};
		}
		// case ActionTypes.CALLED_OUTSIDE.type: {
		// 	// this calling from outside is not yet implemented
		// 	const newState = {
		// 		...state,
		// 		nextTargetFloor: action.fromFloor,
		// 		direction: action.direction
		// 	};
		// 	return loop(newState, Cmd.none);
		// }

		case ActionTypes.CALLED_INSIDE.type: {
			const stops = state.stops.map((floor, index) =>
				index === action.toFloor ? ({ stop: true }) : floor, state.stops);
			const nextTargetFloor = state.nextTargetFloor === null ? action.toFloor : state.nextTargetFloor;
			const newState = {
				...state,
				stops, // here we have to optimize the elevator ordering depending on direction
				nextTargetFloor
			};
			// if is moving already wait
			if (state.moving) {

			}
			// else start moving
			const newCmd = Cmd.action({
				...ActionTypes.START_MOVING
			});
			return loop(newState, newCmd);
		}

		case ActionTypes.START_MOVING.type: {
			const nextFloor = decideNextFloor(state.currentFloor, state.stops, zero2six);
			const newState = {
				...state,
				moving: true
			};
			const newCmd = Cmd.run(delay, {
				args: [nextFloor],
				successActionCreator: (toFloor) => {
					return {
						...ActionTypes.SET_CURRENT_FLOOR,
						toFloor
					}
				}
			});
			return loop(newState, newCmd);
		}
		case ActionTypes.SET_CURRENT_FLOOR.type: {
			const newState = {
				...state,
				currentFloor: action.toFloor
			}
			const nextAction = action.toFloor === state.nextTargetFloor ?
				Cmd.action(ActionTypes.HIT_TARGET_FLOOR) :
				Cmd.action(ActionTypes.START_MOVING);
			return loop(newState, nextAction);
		}
		case ActionTypes.HIT_TARGET_FLOOR.type: {
			// open the doors and let people go in / out

			const newCmd = Cmd.run(delay, {
				successActionCreator: () => {
					// decide if end moving or reset next target
					const shouldContinue = state.stops.some(floor => floor.stop === true);
					const nextAction = shouldContinue ? ActionTypes.RESET_NEXT_TARGET : ActionTypes.END_MOVING;
					return nextAction;
				}
			});
			const message = 'Hit target floor: let people in/out';
			return loop({ ...state, message }, newCmd);
		}
		case ActionTypes.RESET_NEXT_TARGET.type: {
			const newStops = state.stops.map((floor, index) =>
				index === state.nextTargetFloor ? ({ stop: false }) : floor, state.stops);
			const newState = {
				...state,
				message: '',
				// here i have to see which is the next target based on current floor and direction
				nextTargetFloor: 'something',
				stops: newStops
			}
			const nextAction = Cmd.none;
			return loop(newState, nextAction);

		}

		case ActionTypes.END_MOVING.type:
			return {
				...state,
				message: '',
				moving: false
			};
		default: {
			return state;
		}
	}
}

const floors = [...zero2six].sort(() => 1);

function delay(data) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			//a promise that is resolved after "delay" milliseconds with the data provided
			resolve(data);
		}, 4000);
	});
}

function decideNextTarget(current, stops){

}

function decideNextFloor(current, stops, zero2six = zero2six) {
	// this fn decides the next floor (+1 / -1) depending on nextTarget
	// direction is set to up
	// i am at 0 , stops[2].stop == true
	const floors = [...zero2six];
	const nearestTarget = stops.find((floor, index) => index > current && floor.stop === true);
	const toFloor = stops.indexOf(nearestTarget);
	// const currentIndex = floors.indexOf(current);
	if (current > toFloor) {
		return floors[current - 1];
	} else if (current < toFloor) {
		return floors[current + 1];
	} else { // if equals
		const message = 'You are now at floor ' + current + '. You called the elevator for going to the same floor as you are now.';
		console.error(message);
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
				${(state.nextTargetFloor === state.currentFloor) && (state.nextTargetFloor === floor) ? 'target-floor ' : ''}
			}`
			}>{floor}</div>
			<div className='buttons'>
				<button onClick={() => onCallOutside(dispatch, floor, 'UP')}>UP</button>
				<button onClick={() => onCallOutside(dispatch, floor, 'DOWN')}>DOWN</button>
			</div>
		</div>
	);
	const panel = floors.map(floor => {
		const btnStyle = (state.nextTargetFloor == floor && state.currentFloor != floor) ? { borderColor: '#00e600' } : {}
		return <button key={floor}
			style={btnStyle}
			onClick={() => onCallInside(dispatch, floor)}>{floor}</button>;
	}
	)
	return (
		<div className='elevator'>
			<div>
				<p className='logger'>{state.message}</p>
				<div className='panel'>
					{panel}
				</div>
			</div>
			<div id='floors'>{floorsJSX}</div>

		</div>

	);
}


// TODO log case when calling elevator for the same floor