import React, { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

const choices = [['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'Follow system', Monitor]];

export default function Settings() {
    const [preference, setPreference] = useState(localStorage.getItem('hrms-theme') || 'light');
    useEffect(() => {
        const sync = () => setPreference(localStorage.getItem('hrms-theme') || 'light');
        window.addEventListener('hrms-theme-change', sync);
        return () => window.removeEventListener('hrms-theme-change', sync);
    }, []);

    return <section className="ui-panel">
        <div className="ui-heading"><h2>Appearance</h2></div>
        <p className="ui-muted">Choose how WorkHub looks on this device.</p>
        <div className="ui-choice-row">
            {choices.map(([value, label, Icon]) => <button key={value} className="ui-button"
                aria-pressed={preference === value} onClick={() => {
                    localStorage.setItem('hrms-theme', value);
                    window.dispatchEvent(new Event('hrms-theme-change'));
                }}><Icon size={17} />{label}</button>)}
        </div>
    </section>;
}
