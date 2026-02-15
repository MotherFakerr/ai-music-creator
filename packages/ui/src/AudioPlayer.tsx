/**
 * 音频播放器组件
 * 支持上传、播放、暂停、进度控制、循环播放、速度控制、录音
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Checkbox, Group, Slider, Stack, Text } from "@mantine/core";
import { getAudioEngine } from "@ai-music-creator/audio";

interface AudioPlayerProps {
  onReady?: (duration: number) => void;
}

export function AudioPlayer({ onReady }: AudioPlayerProps) {
  const audioEngine = getAudioEngine();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const isSeekingRef = useRef(false);
  const isSyncingRef = useRef(false);

  // 同步音频状态
  useEffect(() => {
    const syncState = () => {
      if (isSyncingRef.current || isSeekingRef.current) return;
      
      const state = audioEngine.getAudioState();
      const time = audioEngine.getAudioCurrentTime();
      
      setCurrentTime(time);
      setIsPlaying(state === "playing");
    };

    const interval = setInterval(syncState, 100);
    return () => clearInterval(interval);
  }, [audioEngine]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // 先停止当前播放
      isSyncingRef.current = true;
      audioEngine.stopAudio();
      
      try {
        const dur = await audioEngine.loadAudioFile(file);
        setFileName(file.name);
        setDuration(dur);
        setCurrentTime(0);
        setLoopEnd(dur);
        setLoopStart(0);
        setIsPlaying(false);
        onReady?.(dur);
        console.log("[AudioPlayer] 已加载:", file.name);
      } catch (err) {
        console.error("[AudioPlayer] 加载失败:", err);
      }

      isSyncingRef.current = false;
      event.target.value = "";
    },
    [audioEngine, onReady]
  );

  const handlePlay = useCallback(() => {
    isSyncingRef.current = true;
    audioEngine.playAudio();
    setIsPlaying(true);
    setTimeout(() => { isSyncingRef.current = false; }, 200);
  }, [audioEngine]);

  const handlePause = useCallback(() => {
    isSyncingRef.current = true;
    audioEngine.pauseAudio();
    setIsPlaying(false);
    setTimeout(() => { isSyncingRef.current = false; }, 200);
  }, [audioEngine]);

  const handleStop = useCallback(() => {
    isSyncingRef.current = true;
    audioEngine.stopAudio();
    setIsPlaying(false);
    setCurrentTime(0);
    setTimeout(() => { isSyncingRef.current = false; }, 200);
  }, [audioEngine]);

  const handleSeek = useCallback(
    (value: number) => {
      setCurrentTime(value);
    },
    []
  );

  const handleSeekStart = useCallback(() => {
    isSeekingRef.current = true;
    isSyncingRef.current = true;
    // 保持当前播放状态，避免被覆盖
  }, []);

  const handleSeekEnd = useCallback(
    (value: number) => {
      audioEngine.seekAudio(value);
      // seek 完成后立即同步状态
      const state = audioEngine.getAudioState();
      setIsPlaying(state === "playing");
      isSeekingRef.current = false;
      isSyncingRef.current = false;
    },
    [audioEngine]
  );

  const handleVolumeChange = useCallback(
    (value: number) => {
      setVolume(value);
      audioEngine.setAudioVolume(value);
    },
    [audioEngine]
  );

  const handleRateChange = useCallback(
    (value: number) => {
      setPlaybackRate(value);
      audioEngine.setPlaybackRate(value);
    },
    [audioEngine]
  );

  const handleLoopToggle = useCallback(
    (checked: boolean) => {
      setLoopEnabled(checked);
      audioEngine.setLoopEnabled(checked);
    },
    [audioEngine]
  );

  const handleLoopStartChange = useCallback(
    (value: number) => {
      setLoopStart(value);
      audioEngine.setLoopPoints(value, loopEnd);
    },
    [audioEngine, loopEnd]
  );

  const handleLoopEndChange = useCallback(
    (value: number) => {
      setLoopEnd(value);
      audioEngine.setLoopPoints(loopStart, value);
    },
    [audioEngine, loopStart]
  );

  const handleRecord = useCallback(async () => {
    if (isRecording) {
      const blob = await audioEngine.stopRecording();
      setIsRecording(false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recording.webm";
      a.click();
      URL.revokeObjectURL(url);
      console.log("[AudioPlayer] 录音已下载");
    } else {
      await audioEngine.startRecording();
      setIsRecording(true);
    }
  }, [audioEngine, isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return secs < 10 ? `${mins}:0${secs}` : `${mins}:${secs}`;
  };

  return (
    <Stack gap="sm">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <Group justify="space-between">
        <Button
          variant="light"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          上传音频
        </Button>

        <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
          {fileName || "未选择文件"}
        </Text>
      </Group>

      {fileName && (
        <>
          <Group justify="center" gap="md">
            <Button
              variant={isPlaying ? "filled" : "light"}
              color={isPlaying ? "red" : "blue"}
              onClick={isPlaying ? handlePause : handlePlay}
            >
              {isPlaying ? "暂停" : "播放"}
            </Button>

            <Button variant="light" onClick={handleStop}>
              停止
            </Button>

            <Button
              variant={isRecording ? "filled" : "light"}
              color={isRecording ? "red" : "gray"}
              onClick={handleRecord}
            >
              {isRecording ? "录音中..." : "录音"}
            </Button>
          </Group>

          <Box px="xs">
            <Slider
              value={currentTime}
              onChange={handleSeek}
              onChangeEnd={handleSeekEnd}
              onMouseDown={handleSeekStart}
              min={0}
              max={duration || 100}
              step={0.1}
              label={formatTime(currentTime)}
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
            />
          </Group>

          <Group gap="sm" justify="space-between">
            <Text size="xs" c="dimmed">速度 {playbackRate}x</Text>
            <Slider
              value={playbackRate}
              onChange={handleRateChange}
              min={0.5}
              max={2}
              step={0.1}
              w={120}
              size="xs"
              marks={[
                { value: 0.5, label: "0.5x" },
                { value: 1, label: "1x" },
                { value: 2, label: "2x" },
              ]}
            />
          </Group>

          <Group gap="sm">
            <Checkbox
              checked={loopEnabled}
              onChange={(e) => handleLoopToggle(e.currentTarget.checked)}
              label="循环播放"
              size="xs"
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
                />
              </Group>
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
