import React, {Component } from 'react';
import { string, number, shape, func, oneOfType } from 'prop-types';
import {getSelection, setSelection} from './domElementSelection';
import abstractNumberInput from './abstract-number-format-input/index';

const TAB = 9;
const ENTER = 13;

export default class NumberFormatInput extends Component {
  componentDidUpdate() {
    if (this.nextSelection) setSelection(this.refs.input, this.nextSelection);
    delete this.nextSelection;
  }

  getAbstractNumInput() {
    return abstractNumberInput(this.props.numberFormat);
  }

  handleKeyEvent(handlerName, e) {
    if (e.metaKey || e.altKey || e.ctrlKey) { return }

    const charCode = e.which || e.charCode || e.keyCode;
    if (charCode === TAB || charCode === ENTER) { return }

    const pasteText = e.clipboardData && e.clipboardData.getData('text') || '';
    const {value: inputValue} = this.refs.input;
    const selection = getSelection(this.refs.input);
    const { metaKey, altKey, ctrlKey } = e;
    const {maxLength, value, onChange} = this.props;

    const next = this.getAbstractNumInput()[handlerName]({charCode, metaKey, altKey, ctrlKey, value: inputValue, selection, maxLength, pasteText});

    if (next.value !== value) onChange(next.value);
    this.nextSelection = next.selection;
    if (next.preventDefault) e.preventDefault();
    if (next.stopPropagation) e.stopPropagation();
    if (next.clipboardText) e.clipboardData.setData('text', next.clipboardText);

    return e;
  }

  eventHandlers() {
    if (!this._eventHandlers) {
      this._eventHandlers = {
        onKeyPress: this.handleKeyEvent.bind(this, 'handleKeyPress'),
        onKeyDown: this.handleKeyEvent.bind(this, 'handleKeyDown'),
        onCut: this.handleKeyEvent.bind(this, 'handleCut'),
        onPaste: this.handleKeyEvent.bind(this, 'handlePaste'),
        onBlur: () =>
          // Some libraries like redux-form (v3.0.2) grab the value from the blur event.
          // Intercept and pass the numeric value and not the input's string value.
          this.props.value,
        onChange: () =>
          // Changes are detected and bubbled up via key event handlers.
          null,
      };

      Object.keys(this._eventHandlers).forEach(key => {
        const handler = this._eventHandlers[key];
        this._eventHandlers[key] = e => {
          const result = handler(e);
          this.props[key] && this.props[key](result);
        };
      });
    }
    return this._eventHandlers;
  }

  render() {
    const {value, ...inputProps} = this.props;
    delete inputProps.numberFormat;
    inputProps.value = this.getAbstractNumInput().format(value);
    return (
        <input ref="input" type="text" {...inputProps} {...this.eventHandlers()}/>
    );
  }
}

NumberFormatInput.defaultProps = {
  maxLength: undefined,
  numberFormat: new Intl.NumberFormat('en-US', {}),
  onChange: () => {},
};

NumberFormatInput.propTypes = {
  maxLength: number,
  // An instance of Intl.NumberFormat.
  numberFormat: shape({
    format: func.isRequired,
    resolvedOptions: func.isRequired,
  }),
  onChange: func,
  onBlur: func,
  value: oneOfType([number, string]),
};
