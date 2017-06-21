import React, {Component, PropTypes} from 'react';
import {getSelection, setSelection} from './domElementSelection';
import abstractNumberInput from './abstract-number-format-input/index';

const TAB = 9;
const ENTER = 13;

export default class NumberFormatInput extends Component {
  componentDidUpdate() {
    if (this.nextSelection) {
      const input = this.refs.input;
      const nextSelection = this.nextSelection;
      // NOTE: Need to wait for the UI thread to catch up before setting selection in some environments
      // *cough* *cough* Android software keyboards *cough*
      setTimeout(() => setSelection(input, nextSelection), 0);
    }
    delete this.nextSelection;
  }

  getAbstractNumInput() {
    return abstractNumberInput(this.props.numberFormat);
  }

  handleKeyEvent(handlerName, e) {
    if (e.metaKey || e.altKey || e.ctrlKey) { return }

    const charCode = e.which || e.charCode || e.keyCode;
    if (charCode === TAB || charCode === ENTER) { return }
    // BeforeInput events (for software keyboards) don't have charCode, but do have the character type in
    // a `data` property
    const charData = e.data;

    const pasteText = e.clipboardData && e.clipboardData.getData('text') || '';
    const {value: inputValue} = this.refs.input;
    const selection = getSelection(this.refs.input);
    const { metaKey, altKey, ctrlKey } = e;
    const {maxLength, value, onChange} = this.props;

    const next = this.getAbstractNumInput()[handlerName]({charData, charCode, metaKey, altKey, ctrlKey, value: inputValue, selection, maxLength, pasteText});

    if (next.value !== value) onChange(next.value);
    this.nextSelection = next.selection;
    if (next.preventDefault) e.preventDefault();
    if (next.stopPropagation) e.stopPropagation();
    if (next.clipboardText) e.clipboardData.setData('text', next.clipboardText);

    return e;
  }

  eventHandlers() {
    if (!this._eventHandlers) {
      // NOTE: Android software keyboards do not trigger KeyPress events (the event has actually been
      // deprecated in the W3C Dom Level 3 Spec: https://www.w3.org/TR/DOM-Level-3-Events/#event-type-keypress
      //
      // BeforeInput events replace the absent KeyPress events on android devices (though these events aren't
      // uniformly supported, so we're still using both)
      this._eventHandlers = {
        onBeforeInput: this.handleKeyEvent.bind(this, 'handleKeyPress'),
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

NumberFormatInput.PropTypes = {
  value: PropTypes.number,
  numberFormat: PropTypes.shape({
    format: PropTypes.func.isRequired,
    resolvedOptions: PropTypes.func.isRequired,
  }),
  onChange: PropTypes.func,
  maxLength: PropTypes.number,
};

NumberFormatInput.defaultProps = {
  maxLength: undefined,
  numberFormat: new Intl.NumberFormat('en-US', {}),
  onChange: () => {},
};

NumberFormatInput.propTypes = {
  maxLength: PropTypes.number,
  // An instance of Intl.NumberFormat.
  numberFormat: PropTypes.shape({
    format: PropTypes.func.isRequired,
    resolvedOptions: PropTypes.func.isRequired,
  }),
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
