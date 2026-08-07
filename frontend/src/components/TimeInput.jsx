import React, { useState, useMemo } from 'react';

/**
 * Dropdown-based 24-hour time input component
 * Allows user to select hours (01-24) and minutes (00-59) from dropdowns
 */
function TimeInput({ value = '', onChange, label = '', required = false }) {
  const [hours, setHours] = useState(() => {
    if (value && value.includes(':')) {
      return value.split(':')[0];
    }
    return '';
  });

  const [minutes, setMinutes] = useState(() => {
    if (value && value.includes(':')) {
      return value.split(':')[1];
    }
    return '';
  });

  // Generate hour options (01-24, but 00 is also valid)
  const hourOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i <= 23; i++) {
      const hour = i.toString().padStart(2, '0');
      options.push(hour);
    }
    return options;
  }, []);

  // Generate minute options (00-59)
  const minuteOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 60; i++) {
      const minute = i.toString().padStart(2, '0');
      options.push(minute);
    }
    return options;
  }, []);

  const handleHourChange = (e) => {
    const newHour = e.target.value;
    setHours(newHour);
    
    if (newHour && minutes) {
      const timeValue = `${newHour}:${minutes}`;
      onChange({ target: { value: timeValue } });
    }
  };

  const handleMinuteChange = (e) => {
    const newMinute = e.target.value;
    setMinutes(newMinute);
    
    if (hours && newMinute !== '') {
      const timeValue = `${hours}:${newMinute}`;
      onChange({ target: { value: timeValue } });
    }
  };

  return (
    <div className="simple-time-input-container">
      {label && <label className="time-label">{label}</label>}
      <div className="time-input-wrapper-dropdowns">
        <select
          className="time-select hours"
          value={hours}
          onChange={handleHourChange}
          required={required}
        >
          <option value="">HH</option>
          {hourOptions.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>
        <span className="time-separator">:</span>
        <select
          className="time-select minutes"
          value={minutes}
          onChange={handleMinuteChange}
          required={required}
        >
          <option value="">MM</option>
          {minuteOptions.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default TimeInput;
