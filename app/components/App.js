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
	moving: false,
	stops: stops,
	doors: 'closed',
	message: ''
};

const ActionTypes = {
	CALLED_OUTSIDE: { type: 'CALLED OUTSIDE' }, // expects direction, fromFloor
	CALLED_INSIDE: { type: 'CALLED INSIDE' }, // expects action.toFloor
	START_MOVING: { type: 'START_MOVING' }, // expects no other action properties
	END_MOVING: { type: 'END_MOVING' }, // expects no other action properties
	SET_CURRENT_FLOOR: { type: 'SET_CURRENT_FLOOR' },  // expects action.toFloor
	HIT_TARGET_FLOOR: { type: 'HIT_TARGET_FLOOR' }, // expects no other action properties
	TARGET_FLOOR_STANDBY: { type: 'TARGET_FLOOR_STANDBY' }, // expects no other action properties
	RESET_NEXT_TARGET: { type: 'RESET_NEXT_TARGET' }, // expects no other action properties
	DECIDE_NEXT_TARGET: { type: 'DECIDE_NEXT_TARGET' }, // expects no other action properties
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
		case ActionTypes.CALLED_OUTSIDE.type: {
			// this calling from outside is not yet implemented
			// update stops queue
			const stops = state.stops.map((floor, index) =>
				index === action.fromFloor ? ({ ...floor, stop: action.direction }) : floor, state.stops);
			// check if requested direction is equal to the ongoing one 
			// in order to set this fromFloor as nextTargetFloor else this floor wont be the next stop
			// come back to this
			const nextTargetFloor = state.nextTargetFloor === null ?
				action.fromFloor : (action.direction === state.direction ? action.fromFloor : state.nextTargetFloor);
			const initialDirection = state.currentFloor < action.fromFloor ? 'UP' : 'DOWN';
			const direction = state.direction ? state.direction : initialDirection;

			const newState = {
				...state,
				stops,
				nextTargetFloor,
				direction,
				message: `Called from floor ${action.fromFloor} for direction ${action.direction}`
			};
			const nextAction = state.moving ? ActionTypes.DECIDE_NEXT_TARGET : ActionTypes.START_MOVING;
			const newCmd = Cmd.action(nextAction);
			return loop(newState, newCmd);
		}

		case ActionTypes.CALLED_INSIDE.type: {
			const nextTargetFloor = state.nextTargetFloor === null ? action.toFloor : state.nextTargetFloor;
			const initialDirection = action.toFloor > state.currentFloor ? 'UP' : 'DOWN'; // ADD conditions for same floor !!!
			const direction = state.nextTargetFloor === null ? initialDirection : state.direction;
			// update stops queue
			const stops = state.stops.map((floor, index) =>
				index === action.toFloor ? ({ ...floor, stop: true }) : floor, state.stops);
			const newState = {
				...state,
				stops,
				nextTargetFloor,
				direction,
				message: `Doors closing. Going ${direction}. Next floor ${nextTargetFloor}`
			};
			// if is moving already redecide NEXT TARGET !!!
			// else start moving
			const nextAction = state.moving ? ActionTypes.DECIDE_NEXT_TARGET : ActionTypes.START_MOVING;
			const newCmd = Cmd.action(nextAction);
			return loop(newState, newCmd);
		}
		case ActionTypes.DECIDE_NEXT_TARGET.type: {
			// if the new request is on my way (meaning has sto true or the same direction)
			// then nextTargetFloor will be the new floor requested 
			// else do nothing -> just return state
			const [nextTargetFloor, direction] = decideNextTarget(state);

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
			const nextAction = checkIfTargetHit(state, action.toFloor)
				? Cmd.action(ActionTypes.HIT_TARGET_FLOOR)
				: Cmd.action(ActionTypes.START_MOVING);
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

			return loop(newState, Cmd.action(ActionTypes.TARGET_FLOOR_STANDBY));
		}
		case ActionTypes.TARGET_FLOOR_STANDBY.type: {
			const newCmd = Cmd.run(delay, { // delay because we open doors
				successActionCreator: () => {
					// decide if end moving or reset next target
					const shouldContinue = state.stops.some(floor => floor.stop);
					const nextAction = shouldContinue ? ActionTypes.RESET_NEXT_TARGET : ActionTypes.END_MOVING;
					return nextAction;
				}
			});
			return loop(state, newCmd);
		}
		case ActionTypes.RESET_NEXT_TARGET.type: {
			// here we close the doors
			const [nextTargetFloor, direction] = decideNextTarget(state);
			const newState = {
				...state,
				doors: 'closed',
				message: `Doors closing. Going ${direction}. Next floor ${nextTargetFloor}`,
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
				direction: null,
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

function checkIfTargetHit({ direction, stops, nextTargetFloor }, toFloor) {
	if (toFloor === nextTargetFloor) {
		if (stops[toFloor].stop === true) { // if requested from inside
			return true;
		} else if (direction === stops[toFloor].stop) { // if requested from outside but on the way
			return true;
		} else {
			// check if there's no other target on the current way(direction)
			// then i don't care about the outside request direction means i hit the target
			return !checkIfAnotherTargetOnTheWay(toFloor, stops, direction);
		}
	} else {
		return false;
	}
}

function checkIfAnotherTargetOnTheWay(thisFloor, stops, direction) { // return BOOLEAN
	if (direction === 'UP') {
		// check if any target UP
		return stops.some(floor => (
			floor.number > thisFloor) && isRequestedFromInsideOrItsOnTheWay(floor, direction));

	} else if (direction === 'DOWN') {
		// check if any target DOWN
		return [...stops].reverse().some(floor =>
			(floor.number < thisFloor) && isRequestedFromInsideOrItsOnTheWay(floor, direction));
	} else {
		// eslint-disable-next-line no-console
		console.error('Big error if i arrive here.')
	}
}

function isRequestedFromInsideOrItsOnTheWay(floor, direction) {
	return (floor.stop === true) || (floor.stop === direction);
}

function decideNextTarget(state) { // returns nextTarget and (new)direction
	// this fn decides the next floor requested by users and changes direction if needed or just returns the same state
	const { nextTargetFloor, currentFloor, stops, direction } = state;
	if (direction === 'UP') {
		// check nearest UP
		const nearestUP = stops.find(floor =>
			(floor.number > currentFloor) && isRequestedFromInsideOrItsOnTheWay(floor, direction)
		);
		// if found return it
		if (nearestUP) {
			return [nearestUP.number, 'UP'];
		} else {
			// change direction to DOWN
			const nearestDOWN = [...stops].reverse().find(floor =>
				(floor.number < currentFloor) && isRequestedFromInsideOrItsOnTheWay(floor, 'DOWN')
			);
			if (nearestDOWN) {
				return [nearestDOWN.number, 'DOWN'];
			} else {
				return [nextTargetFloor, direction];
			}
		}
	} else if (direction === 'DOWN') {
		const nearestDOWN = [...stops].reverse().find(floor =>
			(floor.number < currentFloor) && isRequestedFromInsideOrItsOnTheWay(floor, direction)
		);
		// if found return it
		if (nearestDOWN) {
			return [nearestDOWN.number, 'DOWN'];
		} else {
			// change direction to UP
			const nearestUP = stops.find(floor =>
				(floor.number > currentFloor) && isRequestedFromInsideOrItsOnTheWay(floor, 'UP')
			);
			if (nearestUP) {
				return [nearestUP.number, 'UP'];
			} else {
				return [nextTargetFloor, direction];
			}

		}
	} else {
		return [nextTargetFloor, direction];
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
	// FLOORS OUTSIDE
	const btnOutSideStyle = (floor, direction) =>
		(state.stops[floor].stop === direction && state.currentFloor !== floor) ? { borderColor: '#00e600' } : {}

	const doorWidth = (floor) => {
		return (state.currentFloor === floor) && (state.doors == 'open') ? '0%' : '50%';
	}
	const elevator = floors.map(floor =>
		<div className="floor" key={floor}>
			<div id='doors'>
				<div id='left-door' style={{ width: doorWidth(floor) }} />
				<div id='right-door' style={{ width: doorWidth(floor) }} />
			</div>
			<div className={
				`floor-indicator ${state.currentFloor == floor ? 'current-floor ' : ''}
				${(state.nextTargetFloor === state.currentFloor) && (state.nextTargetFloor === floor) ? 'target-floor ' : ''}`
			}>{floor}</div>
			<div className='buttons'>
				<button
					className='btn'
					style={btnOutSideStyle(floor, 'UP')}
					onClick={() => onCallOutside(dispatch, floor, 'UP')}>UP</button>
				<button
					className='btn'
					style={btnOutSideStyle(floor, 'DOWN')}
					onClick={() => onCallOutside(dispatch, floor, 'DOWN')}>DOWN</button>
			</div>
		</div>
	);
	// PANEL INSIDE
	const buttons = floors.map(floor => {
		const btnInsideStyle = (state.stops[floor].stop === true && state.currentFloor != floor) ? { borderColor: '#00e600' } : {}
		return <button
			className='btn'
			key={floor}
			style={btnInsideStyle}
			onClick={() => onCallInside(dispatch, floor)}>{floor}</button>;
	}
	);

	return (
		<div id='page'>
			<div className='wrapper'>
				<div>
					<p className='logger'>{state.message}</p>
					<div className='panel'>
						{buttons}
						<p>INSIDE PANEL</p>
					</div>
				</div>
				<div className='floors'>{elevator}</div>
			</div>
		</div>

	);
}

View.propTypes = {
	dispatch: PropTypes.func,
	state: PropTypes.object
}