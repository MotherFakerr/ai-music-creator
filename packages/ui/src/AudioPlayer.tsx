/**
 * 音频播放器组件
 * 基于 wavesurfer.js 实现
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Checkbox, Group, Slider, Stack, Text } from "@mantine/core";
import WaveSurfer from "wavesurfer.js";

interface AudioPlayerProps {
  onReady?: (duration: number) => void;
}

export function AudioPlayer({ onReady }: AudioPlayerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const loopRef = useRef({ enabled: false, start: 0, end: 0 });

  const [fileName, setFileName] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isReady, setIsReady] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);

  // 初始化 wavesurfer
  useEffect(() => {
    if (!waveformRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#5c6bc0",
      progressColor: "#3949ab",
      cursorColor: "#fff",
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
      
      // 循环播放检测
      if (loopRef.current.enabled && time >= loopRef.current.end) {
        wavesurfer.setTime(loopRef.current.start);
      }
    });

    wavesurfer.on("seeking", () => {
      const time = wavesurfer.getCurrentTime();
      setCurrentTime(time);
    });

    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("finish", () => {
      if (!loopRef.current.enabled) {
        setIsPlaying(false);
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
    []
  );

  const handlePlayPause = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  const handleStop = useCallback(() => {
    wavesurferRef.current?.stop();
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const handleSeek = useCallback(
    (value: number) => {
      wavesurferRef.current?.setTime(value);
      setCurrentTime(value);
    },
    []
  );

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
    wavesurferRef.current?.setVolume(value);
  }, []);

  const handleLoopToggle = useCallback((checked: boolean) => {
    setLoopEnabled(checked);
    loopRef.current.enabled = checked;
    if (checked && wavesurferRef.current) {
      const currentTime = wavesurferRef.current.getCurrentTime();
      if (currentTime < loopRef.current.start || currentTime > loopRef.current.end) {
        wavesurferRef.current.setTime(loopRef.current.start);
      }
    }
  }, []);

  const handleLoopStartChange = useCallback((value: number) => {
    setLoopStart(value);
    loopRef.current.start = value;
  }, []);

  const handleLoopEndChange = useCallback((value: number) => {
    setLoopEnd(value);
    loopRef.current.end = value;
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

      {/* 波形显示 */}
      <Box
        ref={waveformRef}
        style={{
          cursor: "pointer",
          opacity: fileName ? (isReady ? 1 : 0.5) : 0.3,
          minHeight: 60,
        }}
      />

      {fileName && (
        <>
          {/* 播放控制 */}
          <Group justify="center" gap="md">
            <Button
              variant={isPlaying ? "filled" : "light"}
              color={isPlaying ? "red" : "blue"}
              onClick={handlePlayPause}
              disabled={!isReady}
            >
              {isPlaying ? "暂停" : "播放"}
            </Button>

            <Button variant="light" onClick={handleStop} disabled={!isReady}>
              停止
            </Button>
          </Group>

          {/* 进度条 */}
          <Box px="xs">
            <Slider
              value={currentTime}
              onChange={handleSeek}
              min={0}
              max={duration || 100}
              step={0.1}
              label={formatTime(currentTime)}
              disabled={!isReady}
              marks={
                loopEnabled
                  ? [
                      { value: loopStart, label: "A" },
                      { value: loopEnd, label: "B" },
                    ]
                  : undefined
              }
            />
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                {formatTime(currentTime)}
              </Text>
              <Text size="xs" c="dimmed">
                {formatTime(duration)}
              </Text>
            </Group>
          </Box>

          {/* 音量 */}
          <Group gap="sm" justify="space-between">
            <Text size="xs" c="dimmed">音量</Text>
            <Slider
              value={volume}
              onChange={handleVolumeChange}
              min={0}
              max={1}
              step={0.01}
              w={120}
              size="xs"
              disabled={!isReady}
            />
          </Group>

          {/* 循环控制 */}
          <Group gap="sm">
            <Checkbox
              checked={loopEnabled}
              onChange={(e) => handleLoopToggle(e.currentTarget.checked)}
              label="循环播放"
              size="xs"
              disabled={!isReady}
            />
          </Group>

          {loopEnabled && (
            <Stack gap="xs">
              <Group gap="sm" justify="space-between">
                <Text size="xs" c="dimmed">A点: {formatTime(loopStart)}</Text>
                <Slider
                  value={loopStart}
                  onChange={handleLoopStartChange}
                  min={0}
                  max={loopEnd}
                  step={0.1}
                  w={150}
                  size="xs"
                  disabled={!isReady}
                />
              </Group>
              <Group gap="sm" justify="space-between">
                <Text size="xs" c="dimmed">B点: {formatTime(loopEnd)}</Text>
                <Slider
                  value={loopEnd}
                  onChange={handleLoopEndChange}
                  min={loopStart}
                  max={duration}
                  step={0.1}
                  w={150}
                  size="xs"
                  disabled={!isReady}
                />
              </Group>
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
