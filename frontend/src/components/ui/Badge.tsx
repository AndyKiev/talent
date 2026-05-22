import { type FC } from "react";
import "./Badge.css";

interface BadgeProps {
    label: string;
    color: string;
}

const Badge: FC<BadgeProps> = ({ label, color }) => (
    <span className="badge" style={{ "--badge-color": color } as React.CSSProperties}>
    <span className="badge__dot" />
        {label}
  </span>
);

export default Badge;