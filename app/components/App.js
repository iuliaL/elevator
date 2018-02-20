'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { Cmd, loop } from 'redux-loop';

export { init, View, reducer };

const zero2six = [0, 1, 2, 3, 4, 5, 6];
const floors = [...zero2six].sort(() => 1); // reversed
const stops = zero2six.map((floor, index) => ({
	stop: false,
	number: index
}));

// MODEL

const init = {
	currentFloor: 0,
	nextTargetFloor: null,
	direction: 'UP',
	moving: false,
	stops: stops,
	doors: 'closed',
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
			// update stops queue
			const stops = state.stops.map((floor, index) =>
				index === action.toFloor ? ({ ...floor, stop: true }) : floor, state.stops);
			const nextTargetFloor = state.nextTargetFloor === null ? action.toFloor : state.nextTargetFloor;
			const newState = {
				...state,
				stops, // here we have to optimize the elevator ordering depending on direction
				nextTargetFloor
			};
			// if is moving already wait
			// else start moving
			const nextAction = state.moving ? Cmd.none : ActionTypes.START_MOVING;
			const newCmd = Cmd.action(nextAction);
			return loop(newState, newCmd);
		}

		case ActionTypes.START_MOVING.type: {
			const nextFloor = decideNextFloor(state.currentFloor, state.nextTargetFloor);
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
			// OPEN THE DOORS and let people go in / out
			// clear the old target from the stops queue
			const newStops = state.stops.map((floor, index) =>
				index === state.nextTargetFloor ? ({ ...floor, stop: false }) : floor, state.stops);
			const newState = { 
				...state,
				doors: 'open',
				message: 'Hit target floor: let people in/out',
				stops: newStops
			
			}
			const newCmd = Cmd.run(delay, { // delay because we open doors
				successActionCreator: () => {
					// decide if end moving or reset next target
					const shouldContinue = newStops.some(floor => floor.stop === true);
					const nextAction = shouldContinue ? ActionTypes.RESET_NEXT_TARGET : ActionTypes.END_MOVING;
					return nextAction;
				}
			});
			return loop( newState, newCmd);
		}
		case ActionTypes.RESET_NEXT_TARGET.type: {
			
			const nextTargetFloor =  decideNextTarget(state);
			const newState = {
				...state,
				message: '',
				doors: 'closed',
				// here i have to see which is the next target based on current floor AND direction
				nextTargetFloor
			}
			const nextAction = Cmd.action(ActionTypes.START_MOVING);
			return loop(newState, nextAction);
		}

		case ActionTypes.END_MOVING.type:
			return {
				...state,
				message: '',
				moving: false,
				doors: 'closed'
			};
		default: {
			return state;
		}
	}
}

function delay(data) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			//a promise that is resolved after "delay" milliseconds with the data provided
			resolve(data);
		}, 3000);
	});
}

function decideNextTarget({ currentFloor, stops, direction } ){
	// this fn decides the next floor requested by users
	// direction is set to 'UP' for now
	const floors = [...zero2six];
	if (direction === 'UP'){
		const nearestTarget = stops.find((floor, index) => index > currentFloor && floor.stop === true);
		const nextTarget = !nearestTarget ? -1 : nearestTarget.number;
		return nextTarget;
	} else {
		console.error('not going down already');
	}

}

function decideNextFloor(current, toFloor) {
	// this fn decides the next floor (+1 / -1) depending on nextTarget
	const floors = [...zero2six];
	if (current > toFloor) {
		return floors[current - 1];
	} else if (current < toFloor) {
		return floors[current + 1];
	} else { // if equals
		const message = 'You are now at floor ' + current + '. You called the elevator for going to the same floor as you are now.';
		console.error(message);
		return current;
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
		const btnStyle = (state.stops[floor].stop && state.currentFloor != floor) ? { borderColor: '#00e600' } : {}
		return <button key={floor}
				style={btnStyle}
				onClick={() => onCallInside(dispatch, floor)}>{floor}</button>;
		}
	);
	return (
		<div className='elevator'>
			<div>
				<p>Next target : {state.nextTargetFloor}</p>
				<p className='logger'>{state.message}</p>
				<div className='panel'>
					{panel}
				</div>
			</div>
			<div className='floors'>{floorsJSX}</div>
		</div>

	);
}


// TODO log case when calling elevator for the same floor