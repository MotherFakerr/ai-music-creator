/**
 * 音频播放器组件
 * 基于 wavesurfer.js 实现
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Checkbox, Group, Stack, Text } from "@mantine/core";
import WaveSurfer from "wavesurfer.js";

interface AudioPlayerProps {
  onReady?: (duration: number) => void;
}

export function AudioPlayer({ onReady }: AudioPlayerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const loopRef = useRef({ enabled: false, start: 0, end: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"start" | "end" | "cursor" | null>(null);
  const isDraggingLoopRef = useRef(false);

  const [fileName, setFileName] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isReady, setIsReady] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);

  // 将时间转换为百分比
  const timeToPercent = (time: number) =>
    duration > 0 ? (time / duration) * 100 : 0;
  const percentToTime = (percent: number) => (percent / 100) * duration;

  // 处理波形上的拖动
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current || !isReady) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      const time = percentToTime(percent);

      // 判断点击位置 - 光标有独立区域，循环点有独立区域
      const cursorPercent = timeToPercent(currentTime);
      const loopStartPercent = timeToPercent(loopStart);
      const loopEndPercent = timeToPercent(loopEnd);

      // 光标检测区域（较大，方便选中）
      const cursorDist = Math.abs(percent - cursorPercent);
      const cursorZone = 5; // 5% 范围

      // 循环点检测区域
      const loopPointZone = 2; // 2% 范围
      const loopStartDist = Math.abs(percent - loopStartPercent);
      const loopEndDist = Math.abs(percent - loopEndPercent);

      if (
        loopEnabled &&
        (loopStartDist < loopPointZone || loopEndDist < loopPointZone)
      ) {
        // 点击靠近循环点
        if (loopStartDist < loopEndDist) {
          dragRef.current = "start";
        } else {
          dragRef.current = "end";
        }
      } else if (cursorDist < cursorZone || !loopEnabled) {
        // 点击靠近光标 或者 循环未启用
        dragRef.current = "cursor";
      }
    },
    [isReady, currentTime, loopStart, loopEnd, loopEnabled, duration],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragRef.current || !containerRef.current || !isReady) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = (x / rect.width) * 100;
      const time = Math.max(0, Math.min(percentToTime(percent), duration));

      if (dragRef.current === "start") {
        const newStart = Math.min(time, loopRef.current.end - 0.1);
        loopRef.current.start = newStart;
        setLoopStart(newStart);
      } else if (dragRef.current === "end") {
        const newEnd = Math.max(time, loopRef.current.start + 0.1);
        loopRef.current.end = newEnd;
        setLoopEnd(newEnd);
      } else if (dragRef.current === "cursor") {
        wavesurferRef.current?.setTime(time);
        setCurrentTime(time);
      }
    },
    [isReady, duration],
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    isDraggingLoopRef.current = false;
  }, []);

  // 添加全局 mouse 事件监听
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // 初始化 wavesurfer
  useEffect(() => {
    if (!waveformRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#5c6bc0",
      progressColor: "#3949ab",
      cursorColor: "transparent",
      barWidth: 2,
      barGap: 1,
      height: 60,
      normalize: true,
    });

    wavesurfer.on("ready", () => {
      setIsReady(true);
      const dur = wavesurfer.getDuration();
      setDuration(dur);
      setLoopEnd(dur);
      loopRef.current.end = dur;
      onReady?.(dur);
    });

    wavesurfer.on("audioprocess", () => {
      const time = wavesurfer.getCurrentTime();
      setCurrentTime(time);

      if (loopRef.current.enabled && time >= loopRef.current.end) {
        wavesurfer.setTime(loopRef.current.start);
      }
    });

    wavesurfer.on("seeking", () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("finish", () => {
      if (!loopRef.current.enabled) {
        setIsPlaying(false);
      }
    });

    // 点击波形设置循环区域
    wavesurfer.on("click", () => {
      if (!loopRef.current.enabled || isDraggingLoopRef.current) return;
      const time = wavesurfer.getCurrentTime();
      const { start, end } = loopRef.current;

      const distToStart = Math.abs(time - start);
      const distToEnd = Math.abs(time - end);

      if (distToStart < distToEnd) {
        if (time < end) {
          loopRef.current.start = time;
          setLoopStart(time);
        }
      } else {
        if (time > start) {
          loopRef.current.end = time;
          setLoopEnd(time);
        }
      }
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
    };
  }, [onReady]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !wavesurferRef.current) return;

      wavesurferRef.current.stop();
      setIsPlaying(false);
      setLoopEnabled(false);
      setLoopStart(0);
      loopRef.current.enabled = false;
      loopRef.current.start = 0;

      const url = URL.createObjectURL(file);
      await wavesurferRef.current.load(url);
      setFileName(file.name);
      setCurrentTime(0);

      event.target.value = "";
    },
    [],
  );

  const handlePlayPause = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  const handleStop = useCallback(() => {
    wavesurferRef.current?.stop();
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
    wavesurferRef.current?.setVolume(value);
  }, []);

  const handleLoopToggle = useCallback((checked: boolean) => {
    setLoopEnabled(checked);
    loopRef.current.enabled = checked;
    if (checked && wavesurferRef.current) {
      const currentTime = wavesurferRef.current.getCurrentTime();
      if (
        currentTime < loopRef.current.start ||
        currentTime > loopRef.current.end
      ) {
        wavesurferRef.current.setTime(loopRef.current.start);
      }
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return secs < 10 ? `${mins}:0${secs}` : `${mins}:${secs}`;
  };

  return (
    <Stack gap="sm">
      <input
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
        id="audio-file-input"
      />

      <Group justify="space-between">
        <Button
          variant="light"
          size="sm"
          component="label"
          htmlFor="audio-file-input"
        >
          上传音频
        </Button>

        <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
          {fileName || "未选择文件"}
        </Text>
      </Group>

      {/* 波形显示 + 拖动控制 */}
      <Box
        ref={containerRef}
        style={{
          position: "relative",
          cursor: dragRef.current ? "ew-resize" : "pointer",
          userSelect: "none",
        }}
        onMouseDown={handleMouseDown}
      >
        <Box
          ref={waveformRef}
          style={{
            opacity: fileName ? (isReady ? 1 : 0.5) : 0.3,
            minHeight: 60,
          }}
        />

        {/* 当前播放位置指示器 - 可拖动 */}
        {fileName && isReady && (
          <Box
            onMouseDown={(e) => {
              e.stopPropagation();
              dragRef.current = "cursor";
            }}
            style={{
              position: "absolute",
              top: -10,
              left: `${timeToPercent(currentTime)}%`,
              transform: "translateX(-50%)",
              zIndex: 10,
              cursor: "ew-resize",
            }}
          >
            {/* 光标线 - 超出波形区域 */}
            <Box
              style={{
                width: "3px",
                height: "80px",
                background: "#fff",
                borderRadius: "2px",
              }}
            />
          </Box>
        )}

        {/* 循环区域 */}
        {fileName && loopEnabled && duration > 0 && (
          <Box
            style={{
              position: "absolute",
              top: 0,
              left: `${timeToPercent(loopStart)}%`,
              width: `${timeToPercent(loopEnd) - timeToPercent(loopStart)}%`,
              height: "60px",
              background: "rgba(255, 193, 7, 0.3)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* A 点拖动柄 - 左右箭头 */}
        {fileName && loopEnabled && isReady && (
          <Box
            onMouseDown={(e) => {
              e.stopPropagation();
              isDraggingLoopRef.current = true;
              dragRef.current = "start";
            }}
            style={{
              position: "absolute",
              top: 0,
              left: `${timeToPercent(loopStart)}%`,
              width: "6px",
              height: "60px",
              background: "#ffc107",
              cursor: "ew-resize",
              transform: "translateX(-50%)",
              borderRadius: "2px",
              pointerEvents: "none",
              zIndex: 10,
            }}
          />
        )}

        {/* B 点拖动柄 - 左右箭头 */}
        {fileName && loopEnabled && isReady && (
          <Box
            onMouseDown={(e) => {
              e.stopPropagation();
              isDraggingLoopRef.current = true;
              dragRef.current = "end";
            }}
            style={{
              position: "absolute",
              top: 0,
              left: `${timeToPercent(loopEnd)}%`,
              width: "6px",
              height: "60px",
              background: "#ffc107",
              cursor: "ew-resize",
              transform: "translateX(-50%)",
              borderRadius: "2px",
              pointerEvents: "none",
              zIndex: 10,
            }}
          />
        )}
      </Box>

      {/* 时间显示 */}
      {fileName && isReady && (
        <Group justify="space-between" px="xs">
          <Text size="xs" c="dimmed">
            {formatTime(currentTime)}
          </Text>
          <Text size="xs" c="dimmed">
            {formatTime(duration)}
          </Text>
        </Group>
      )}

      {fileName && (
        <>
          {/* 播放控制 + 音量 */}
          <Group justify="space-between">
            <Group gap="md">
              <Button
                variant={isPlaying ? "filled" : "light"}
                color={isPlaying ? "red" : "blue"}
                onClick={handlePlayPause}
                disabled={!isReady}
                size="xs"
              >
                {isPlaying ? "暂停" : "播放"}
              </Button>

              <Button
                variant="light"
                onClick={handleStop}
                disabled={!isReady}
                size="xs"
              >
                停止
              </Button>
            </Group>

            <Group gap="xs">
              <Text size="xs" c="dimmed">
                音量
              </Text>
              <Box w={80}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) =>
                    handleVolumeChange(parseFloat(e.target.value))
                  }
                  disabled={!isReady}
                  style={{ width: "100%" }}
                />
              </Box>
            </Group>
          </Group>

          {/* 循环开关 */}
          <Checkbox
            checked={loopEnabled}
            onChange={(e) => handleLoopToggle(e.currentTarget.checked)}
            label="循环播放"
            size="xs"
            disabled={!isReady}
          />
        </>
      )}
    </Stack>
  );
}
