interface SpeedTrailSpinnerProps {
  size?: number;
  className?: string;
}

/**
 * SpeedTrail loading spinner — F1-themed redirect feedback.
 * Variant #04 from the spinner design library: a logo glides through
 * three horizontal speed lines with a soft mask fade on both sides.
 *
 * Styles live in app/globals.css (search "SpeedTrail spinner").
 */
export function SpeedTrailSpinner({
  size = 48,
  className,
}: SpeedTrailSpinnerProps) {
  const wrapClass = className ? `sp-wrap ${className}` : "sp-wrap";
  return (
    <div className={wrapClass}>
      <div className="sp-speed" style={{ width: size * 2, height: size }}>
        <span className="sp-speed-line sp-speed-line--1" />
        <span className="sp-speed-line sp-speed-line--2" />
        <span className="sp-speed-line sp-speed-line--3" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt=""
          width={size}
          height={size}
          className="sp-speed-logo block"
        />
      </div>
    </div>
  );
}
