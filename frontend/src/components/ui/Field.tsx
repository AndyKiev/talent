import { type FC, type ReactNode } from "react";
import "./Field.css";

interface FieldProps {
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    children: ReactNode;
}

const Field: FC<FieldProps> = ({ label, required = false, children, hint, error }) => (
    <div className="field">
        <label className="field__label">
            {label}
            {required && <span className="field__required">*</span>}
        </label>
        {children}
        {error && <span className="field__error">{error}</span>}
        {hint && !error && <span className="field__hint">{hint}</span>}
    </div>
);

export default Field;