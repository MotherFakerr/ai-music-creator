import { useMemo } from "react";

const LOGO_CSS = `
.header-logo.logo-primary {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
}
.header-logo .icon-wrap {
  position: relative;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
}
.header-logo .icon-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #7b5cff, #3b9fff, #a855f7, #7b5cff);
  padding: 1.5px;
  animation: header-logo-spinRing 8s linear infinite;
}
.header-logo .icon-ring-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #0a0e18;
}
@keyframes header-logo-spinRing {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.header-logo .icon-bars {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.5px;
}
.header-logo .icon-bar {
  width: 2.5px;
  border-radius: 2px;
  background: linear-gradient(180deg, #a78bff, #60a5fa);
  animation: header-logo-iconPulse var(--d) ease-in-out infinite alternate;
  box-shadow: 0 0 6px rgba(167, 139, 255, 0.5);
}
@keyframes header-logo-iconPulse {
  from { transform: scaleY(0.3); opacity: 0.5; }
  to { transform: scaleY(1); opacity: 1; }
}
.header-logo .logo-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}
.header-logo .logo-name {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 1.35rem;
  letter-spacing: 0.5px;
  background: linear-gradient(105deg, #c4b5fd 0%, #818cf8 40%, #60a5fa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.1;
}
.header-logo .logo-sub {
  font-family: 'DM Sans', sans-serif;
  font-weight: 300;
  font-size: 9px;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.28);
  text-transform: uppercase;
  line-height: 1.2;
}
`;

const BAR_HEIGHTS = [28, 50, 70, 100, 70, 50, 28];
const BAR_DELAYS = [0, 0.15, 0.3, 0.0, 0.2, 0.1, 0.25];
const BAR_DURS = [0.9, 0.7, 1.1, 0.8, 1.0, 0.6, 0.95];
const BAR_MAX_H = 20;

export function HeaderLogo() {
  const iconBars = useMemo(
    () =>
      BAR_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="icon-bar"
          style={{
            width: "2.5px",
            height: `${(h / 100) * BAR_MAX_H}px`,
            ["--d" as string]: `${BAR_DURS[i]}s`,
            animationDelay: `${BAR_DELAYS[i]}s`,
          }}
        />
      )),
    []
  );

  return (
    <div className="header-logo logo-primary">
      <style dangerouslySetInnerHTML={{ __html: LOGO_CSS }} />
      <div className="icon-wrap">
        <div className="icon-ring">
          <div className="icon-ring-inner" />
        </div>
        <div className="icon-bars">{iconBars}</div>
      </div>
      <div className="logo-text">
        <div className="logo-name">MOTHERFAKER</div>
        <div className="logo-sub">AI Music Studio</div>
      </div>
    </div>
  );
}
