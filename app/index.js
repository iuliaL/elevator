'use strict';

import React, { Component } from 'react';
import { render } from 'react-dom';

//REDUX imports
import { Provider, connect } from 'react-redux';
import { createStore, compose } from 'redux';
import * as reduxLoop from 'redux-loop';

// Styles
import scssStyles from './styles/main.scss';

//Components
import { View, reducer, init } from './components/App';

// REDUX BOILERPLATE

function mapStateToProps(state) {
    return { state: state };
}

function mapDispatchToProps(dispatch) {
    return { dispatch: dispatch };
}

const ConnectedView = connect(mapStateToProps, mapDispatchToProps)(View);

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store = createStore(reducer, init, composeEnhancers(reduxLoop.install()));

render(
    <Provider store={store}>
        <ConnectedView />
    </Provider>, document.getElementById('app')
    );