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
	DECIDE_NEXT_TARGET: { type: 'DECIDE_NEXT_TARGET' },
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
				stops,
				nextTargetFloor,
				message: `Going to floor ${nextTargetFloor}. Doors closing`
			};
			// if is moving already redecide NEXT TARGET !!!
			// else start moving
			const nextAction = state.moving ? ActionTypes.DECIDE_NEXT_TARGET : ActionTypes.START_MOVING;
			const newCmd = Cmd.action(nextAction);
			return loop(newState, newCmd);
		}
		case ActionTypes.DECIDE_NEXT_TARGET.type: {
			// if the new request is on my way then nextTargetFloor will be the new floor requested 
			// else do nothing -> just return state
			const [ nextTargetFloor, direction ] = decideNextTarget(state);

			const newState = {
				...state,
				nextTargetFloor,
				message: `Next floor ${nextTargetFloor}`,
				direction
			};
			return newState;
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
				message: `Hit target floor ${state.nextTargetFloor}. Doors opening`,
				stops: newStops
			}
			const newCmd = Cmd.run(delay, { // delay because we open doors
				successActionCreator: () => {
					// decide if end moving or reset next target
					const shouldContinue = state.stops.some(floor => floor.stop === true);
					const nextAction = shouldContinue ? ActionTypes.RESET_NEXT_TARGET : ActionTypes.END_MOVING;
					return nextAction;
				}
			});
			return loop( newState, newCmd);
		}
		case ActionTypes.RESET_NEXT_TARGET.type: {
			const [ nextTargetFloor, direction ] =  decideNextTarget(state);
			const newState = {
				...state,
				doors: 'closed',
				message: `Going to floor ${nextTargetFloor}. Doors closing`,
				nextTargetFloor,
				direction
			}
			const nextAction = Cmd.action(ActionTypes.START_MOVING);
			return loop(newState, nextAction);
		}

		case ActionTypes.END_MOVING.type:
			return {
				...state,
				message: '',
				moving: false,
				doors: 'closed',
				nextTargetFloor: null
			};
		default: {
			return state;
		}
	}
}

function delay(data) {
	return new Promise(function (resolve) {
		setTimeout(function () {
			//a promise that is resolved after "delay" milliseconds with the data provided
			resolve(data);
		}, 3000);
	});
}

function decideNextTarget({ currentFloor, stops, direction }){
	// this fn decides the next floor requested by users and changes direction if needed
	if (direction === 'UP'){
		// check if any target UP
		const nearestUP = stops.find(floor => (floor.number > currentFloor) && floor.stop );
		// if found return it
		if (nearestUP) {
			return [ nearestUP.number, 'UP' ];
		} else {
			// change direction to DOWN
			const nearestDOWN = [...stops].reverse().find(floor => (floor.number < currentFloor) && floor.stop );
			if (nearestDOWN) {
				return [ nearestDOWN.number, 'DOWN'];
			} else {
				// eslint-disable-next-line no-console
				console.error('We shouldn`t have arrived here in the 1st place, because there is no next target');
			}
		}
	} else { // direction is DOWN
		const nearestDOWN = [...stops].reverse().find(floor => {
			// console.log('current floor', currentFloor,'floor.number',floor.number, 'floor.stop', floor.stop);
			// console.log(floor.number < currentFloor);
			return (floor.number < currentFloor) && floor.stop; 
		});
		// if found return it
		if (nearestDOWN) {
			return [ nearestDOWN.number, 'DOWN' ];
		} else {
			// change direction to UP
			const nearestUP = stops.find(floor => (floor.number > currentFloor) && floor.stop );
			if (nearestUP) {
				return [ nearestUP.number, 'UP'];
			} else {
				// eslint-disable-next-line no-console
				console.error('We shouldn`t have arrived here in the 1st place, because there is no next target');
			}
		}
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
		// eslint-disable-next-line no-console
		console.warn(message);
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
				<p className='logger'>{state.message}</p>
				<div className='panel'>
					{panel}
				</div>
			</div>
			<div className='floors'>{floorsJSX}</div>
		</div>

	);
}

View.propTypes = {
	dispatch: PropTypes.func,
	state: PropTypes.object
}