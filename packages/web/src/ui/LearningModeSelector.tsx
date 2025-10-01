import React from 'react';
import { profiles } from '@motor/tsa-policy';

type ProfileId = keyof typeof profiles;

export interface LearningModeSelectorProps {
  value: ProfileId;
  onChange: (value: ProfileId) => void;
}

export const LearningModeSelector: React.FC<LearningModeSelectorProps> = ({ value, onChange }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontWeight: 600 }}>Learning mode</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ProfileId)}
      style={{ padding: '6px 8px', borderRadius: 6 }}
    >
      {(Object.keys(profiles) as ProfileId[]).map(id => (
        <option key={id} value={id}>
          {profiles[id].label}
        </option>
      ))}
    </select>
  </label>
);

export default LearningModeSelector;
