/**
 * Keyboard Component
 * 键盘演奏界面
 */

// TODO: 实现键盘组件
export interface KeyboardProps {
  onNoteOn?: (pitch: number, velocity: number) => void;
  onNoteOff?: (pitch: number) => void;
}

export function Keyboard({ onNoteOn, onNoteOff }: KeyboardProps) {
  return {
    // TODO: 实现键盘渲染
    render: () => '<div>Keyboard Component</div>'
  };
}
