import React, { useState, useRef, useEffect } from 'react';

/**
 * Custom 24-hour time input component
 * Replaces browser's native time picker which may show 12-hour format with AM/PM
 * This ensures consistent 24-hour format (00:00-23:59) across all browsers
 */
function TimeInput({ value = '', onChange, label = '', required = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const inputRef = useRef(null);
  const pickerRef = useRef(null);

  // Parse initial value
  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      setHours(h.padStart(2, '0'));
      setMinutes(m.padStart(2, '0'));
    }
  }, [value]);

  const handleHourChange = (e) => {
    let h = e.target.value;
    if (h === '') h = '00';
    h = Math.min(Math.max(parseInt(h) || 0, 0), 23);
    const newHours = String(h).padStart(2, '0');
    setHours(newHours);
    notifyChange(newHours, minutes);
  };

  const handleMinuteChange = (e) => {
    let m = e.target.value;
    if (m === '') m = '00';
    m = Math.min(Math.max(parseInt(m) || 0, 0), 59);
    const newMinutes = String(m).padStart(2, '0');
    setMinutes(newMinutes);
    notifyChange(hours, newMinutes);
  };

  const handleHourScroll = (direction) => {
    let h = parseInt(hours) || 0;
    h = direction === 'up' ? (h + 1) % 24 : (h - 1 + 24) % 24;
    const newHours = String(h).padStart(2, '0');
    setHours(newHours);
    notifyChange(newHours, minutes);
  };

  const handleMinuteScroll = (direction) => {
    let m = parseInt(minutes) || 0;
    m = direction === 'up' ? (m + 1) % 60 : (m - 1 + 60) % 60;
    const newMinutes = String(m).padStart(2, '0');
    setMinutes(newMinutes);
    notifyChange(hours, newMinutes);
  };

  const notifyChange = (h, m) => {
    const timeStr = `${h}:${m}`;
    onChange({ target: { value: timeStr } });
  };

  const togglePicker = () => {
    setIsOpen(!isOpen);
  };

  const closePicker = () => {
    setIsOpen(false);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        closePicker();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="custom-time-input-container">
      {label && <label>{label}</label>}
      <div className="time-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="time-display-input"
          value={`${hours}:${minutes}`}
          onClick={togglePicker}
          readOnly
          placeholder="HH:MM"
          required={required}
        />
        <button
          type="button"
          className="time-picker-button"
          onClick={togglePicker}
          title="Open 24-hour time picker"
        >
          🕐
        </button>

        {isOpen && (
          <div ref={pickerRef} className="time-picker-popup">
            <div className="time-picker-header">
              <h4>24-Hour Time Picker</h4>
              <button
                type="button"
                className="close-button"
                onClick={closePicker}
              >
                ✕
              </button>
            </div>

            <div className="time-picker-content">
              {/* Hours Column */}
              <div className="time-column">
                <button
                  type="button"
                  className="spin-button"
                  onClick={() => handleHourScroll('up')}
                >
                  ▲
                </button>

                <div className="time-display">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={hours}
                    onChange={handleHourChange}
                    className="time-number-input"
                  />
                </div>

                <button
                  type="button"
                  className="spin-button"
                  onClick={() => handleHourScroll('down')}
                >
                  ▼
                </button>
              </div>

              <div className="time-separator">:</div>

              {/* Minutes Column */}
              <div className="time-column">
                <button
                  type="button"
                  className="spin-button"
                  onClick={() => handleMinuteScroll('up')}
                >
                  ▲
                </button>

                <div className="time-display">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={handleMinuteChange}
                    className="time-number-input"
                  />
                </div>

                <button
                  type="button"
                  className="spin-button"
                  onClick={() => handleMinuteScroll('down')}
                >
                  ▼
                </button>
              </div>
            </div>

            <div className="time-picker-footer">
              <div className="time-example">
                {hours}:{minutes} (24-hour format)
              </div>
              <button
                type="button"
                className="confirm-button"
                onClick={closePicker}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TimeInput;
