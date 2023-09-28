import React from 'react';
import ReactDOM from 'react-dom';
import App from './App.js';
import style from './theme.less';

ReactDOM.render(
    <div className={style._import}>
        <App />
    </div>,
    document.getElementById('root')
);
