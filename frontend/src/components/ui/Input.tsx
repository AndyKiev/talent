import { type FC, useState } from "react";
import { useTheme } from "../theme/ThemeContext.tsx";
import "./Input.css";

interface InputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    disabled?: boolean;
    monospace?: boolean;
    error?: boolean;
}

const Input: FC<InputProps> = ({ value, onChange, placeholder, disabled = false, monospace = false, error = false }) => {
    const { t } = useTheme();
    const [focused, setFocused] = useState(false);

    return (
        <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`input ${monospace ? "input--mono" : ""} ${error ? "input--error" : ""}`}
            style={{
                background: disabled ? t.disabledBg : t.inputBg,
                border: `1.5px solid ${error ? "#e05c5c" : focused ? t.accent : t.border}`,
                color: disabled ? t.disabledText : t.text,
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        />
    );
};

export default Input;