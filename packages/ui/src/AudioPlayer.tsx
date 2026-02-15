/**
 * 音频播放器组件
 * 支持上传、播放、暂停、进度控制
 */

import { useCallback, useRef, useState } from "react";
import { Box, Button, Group, Slider, Stack, Text, rem } from "@mantine/core";
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

  const progressRef = useRef<number | null>(null);

  const updateProgress = useCallback(() => {
    progressRef.current = window.setInterval(() => {
      const time = audioEngine.getAudioCurrentTime();
      setCurrentTime(time);
      if (audioEngine.getAudioState() === "stopped") {
        setIsPlaying(false);
        if (progressRef.current) {
          clearInterval(progressRef.current);
          progressRef.current = null;
        }
      }
    }, 100);
  }, [audioEngine]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const dur = await audioEngine.loadAudioFile(file);
        setFileName(file.name);
        setDuration(dur);
        setCurrentTime(0);
        onReady?.(dur);
        console.log("[AudioPlayer] 已加载:", file.name);
      } catch (err) {
        console.error("[AudioPlayer] 加载失败:", err);
      }
    },
    [audioEngine, onReady]
  );

  const handlePlay = useCallback(() => {
    audioEngine.playAudio();
    setIsPlaying(true);
    updateProgress();
  }, [audioEngine, updateProgress]);

  const handlePause = useCallback(() => {
    audioEngine.pauseAudio();
    setIsPlaying(false);
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, [audioEngine]);

  const handleStop = useCallback(() => {
    audioEngine.stopAudio();
    setIsPlaying(false);
    setCurrentTime(0);
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, [audioEngine]);

  const handleSeek = useCallback(
    (value: number) => {
      audioEngine.seekAudio(value);
      setCurrentTime(value);
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
          disabled={isPlaying}
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

            <Button
              variant="light"
              onClick={handleStop}
              disabled={!isPlaying && currentTime === 0}
            >
              停止
            </Button>
          </Group>

          <Box px="xs">
            <Slider
              value={currentTime}
              onChange={handleSeek}
              min={0}
              max={duration}
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

          <Group gap="sm" justify="flex-end">
            <Text size="xs" c="dimmed">音量</Text>
            <Slider
              value={volume}
              onChange={handleVolumeChange}
              min={0}
              max={1}
              step={0.01}
              w={100}
              size="xs"
            />
          </Group>
        </>
      )}
    </Stack>
  );
}
