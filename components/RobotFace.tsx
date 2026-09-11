export default function RobotFace({ size = 40, happy = false, label }: { size?: number; happy?: boolean; label?: string }) {
  return (
    <svg
      className={`robot-face${happy ? " happy" : ""}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id="rf-head" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b3575" />
          <stop offset="1" stopColor="#12173f" />
        </linearGradient>
        <radialGradient id="rf-eye" cx="0.5" cy="0.45" r="0.65">
          <stop offset="0" stopColor="#d9fbff" />
          <stop offset="0.45" stopColor="#4de8ff" />
          <stop offset="1" stopColor="#1e9fc4" />
        </radialGradient>
      </defs>
      {/* side ears */}
      <rect x="6" y="26" width="7" height="13" rx="3.5" fill="#232a68" stroke="#4de8ff" strokeWidth="1.6" opacity="0.9" />
      <rect x="51" y="26" width="7" height="13" rx="3.5" fill="#232a68" stroke="#4de8ff" strokeWidth="1.6" opacity="0.9" />
      {/* head */}
      <rect x="12" y="9" width="40" height="46" rx="13" fill="url(#rf-head)" stroke="#4de8ff" strokeWidth="2.6" />
      {/* eyes */}
      <g className="r-eye">
        <ellipse cx="25" cy="31" rx="5.2" ry="6.6" fill="url(#rf-eye)" />
      </g>
      <g className="r-eye r-eye-r">
        <ellipse cx="39" cy="31" rx="5.2" ry="6.6" fill="url(#rf-eye)" />
      </g>
      {/* happy smile */}
      <path className="r-smile" d="M26 43 Q32 48 38 43" fill="none" stroke="#4de8ff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
