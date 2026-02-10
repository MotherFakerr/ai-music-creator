/**
 * Timeline Component
 * 时间轴 / 谱面显示
 */

// TODO: 实现时间轴组件
export interface TimelineProps {
  notes: Array<{ pitch: number; startTime: number; duration: number }>;
  duration: number;
}

export function Timeline({ notes, duration }: TimelineProps) {
  return {
    // TODO: 实现时间轴渲染
    render: () => '<div>Timeline Component</div>'
  };
}
