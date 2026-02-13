/**
 * KeyboardModeSwitch Component
 * 键盘模式切换（QWERTY ↔ 钢琴键）
 */

import { SegmentedControl, Box } from "@mantine/core";

export type KeyboardMode = "qwerty" | "piano";

export interface KeyboardModeSwitchProps {
  value: KeyboardMode;
  onChange: (mode: KeyboardMode) => void;
}

export function KeyboardModeSwitch({
  value,
  onChange,
}: KeyboardModeSwitchProps) {
  return (
    <Box>
      <SegmentedControl
        value={value}
        onChange={(v) => onChange(v as KeyboardMode)}
        size="xs"
        radius="lg"
        data={[
          { label: "⌨️ 电脑键盘", value: "qwerty" },
          { label: "🎹 钢琴键盘", value: "piano" },
        ]}
        styles={{
          root: {
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          },
          label: {
            color: "rgba(255, 255, 255, 0.55)",
            fontWeight: 500,
            fontSize: 12,
            padding: "4px 12px",
          },
          indicator: {
            background:
              "linear-gradient(135deg, rgba(99, 102, 241, 0.35) 0%, rgba(79, 70, 229, 0.3) 100%)",
            boxShadow: "0 2px 8px rgba(99, 102, 241, 0.2)",
          },
        }}
      />
    </Box>
  );
}
