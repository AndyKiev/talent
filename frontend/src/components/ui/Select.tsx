import { type FC } from "react";
import { useTheme } from "../theme/ThemeContext.tsx";
import "./Select.css";

interface SelectProps {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    placeholder: string;
    disabled?: boolean;
    error?: boolean;
}

const Select: FC<SelectProps> = ({ value, onChange, options, placeholder, disabled = false, error = false }) => {
    const { t } = useTheme();

    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className={`select ${disabled ? "select--disabled" : ""} ${error ? "select--error" : ""}`}
            style={{
                background: disabled ? t.disabledBg : t.inputBg,
                border: `1.5px solid ${error ? "#e05c5c" : t.border}`,
                color: value ? t.text : t.textMuted,
            }}
        >
            <option value="" disabled>{placeholder}</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    );
};

export default Select;