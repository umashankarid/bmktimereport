import React, { useState, useRef } from 'react';

/**
 * Simple 24-hour time input component
 * Auto-formats input: user types "0130" → displays "01:30"
 * Accepts numbers only, auto-adds colon separator
 */
function TimeInput({ value = '', onChange, label = '', required = false }) {
  const [inputValue, setInputValue] = useState(value || '');
  const inputRef = useRef(null);

  const formatTimeInput = (input) => {
    // Remove any non-digit characters
    const digits = input.replace(/\D/g, '');
    
    // Limit to 4 digits (HHMM)
    const limited = digits.slice(0, 4);
    
    if (limited.length === 0) {
      return '';
    }
    
    if (limited.length <= 2) {
      return limited;
    }
    
    // Format as HH:MM
    return `${limited.slice(0, 2)}:${limited.slice(2, 4)}`;
  };

  const validateTime = (timeStr) => {
    if (!timeStr || timeStr.length !== 5) {
      return false; // Invalid format
    }

    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);

    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };

  const handleChange = (e) => {
    const input = e.target.value;
    const formatted = formatTimeInput(input);
    
    setInputValue(formatted);
    
    // Only trigger onChange if valid time or user is still typing
    if (validateTime(formatted) || formatted.length < 5) {
      onChange({ target: { value: formatted } });
    }
  };

  const handleKeyPress = (e) => {
    // Only allow digits
    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
      e.preventDefault();
    }
  };

  const handleBlur = () => {
    // If incomplete, clear it
    if (inputValue && !validateTime(inputValue)) {
      setInputValue('');
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div className="simple-time-input-container">
      {label && <label className="time-label">{label}</label>}
      <div className="time-input-wrapper-simple">
        <input
          ref={inputRef}
          type="text"
          className="time-input-simple"
          value={inputValue}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          onBlur={handleBlur}
          placeholder="HH:MM"
          maxLength="5"
          required={required}
          inputMode="numeric"
          autoComplete="off"
        />
        <span className="time-hint">24h format</span>
      </div>
    </div>
  );
}

export default TimeInput;
