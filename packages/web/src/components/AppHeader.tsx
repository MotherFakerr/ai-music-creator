import { Badge, Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { HeaderLogo } from "./HeaderLogo";

interface AppHeaderProps {
  isInitialized: boolean;
  isInstrumentLoading: boolean;
  /** 页面标题，与 Sequencer 页统一为「Logo | 标题 | 操作」结构 */
  title?: string;
  /** 页面副标题 */
  subtitle?: string;
}

export function AppHeader({
  isInitialized,
  isInstrumentLoading,
}: AppHeaderProps) {
  return (
    <Paper
      radius="lg"
      p="md"
      style={{
        border: "1px solid rgba(148,163,184,0.2)",
        background: "rgba(10, 14, 24, 0.7)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <Group gap="md" align="center">
          <HeaderLogo />
          <Group gap={0} align="center">
            {/* 竖分割线 */}
            <Box
              style={{
                width: 1,
                height: 32,
                background: "rgba(147,197,253,0.2)",
                marginRight: 20,
                flexShrink: 0,
              }}
            />
            <Stack gap={3}>
              <Text
                style={{
                  color: "#dbeafe",
                  fontSize: 15,
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                演奏与跟奏
                <Text
                  component="span"
                  style={{
                    color: "rgba(147,197,253,0.5)",
                    fontSize: 12,
                    fontWeight: 400,
                    marginLeft: 6,
                  }}
                >
                  Performance
                </Text>
              </Text>
              <Text
                style={{
                  color: "rgba(147,197,253,0.45)",
                  fontSize: 11,
                  lineHeight: 1.3,
                }}
              >
                演奏 · 跟奏 · MIDI 记录 · AI 续写
              </Text>
            </Stack>
          </Group>
        </Group>
        <Group gap="sm">
          <Badge
            size="sm"
            color={isInitialized ? "teal" : "gray"}
            variant="light"
            styles={{
              root: {
                textTransform: "none",
                height: 30,
                borderRadius: 6,
              },
            }}
          >
            {isInitialized ? "音频引擎已就绪" : "音频引擎初始化中"}
          </Badge>
          <Badge
            size="sm"
            color={isInstrumentLoading ? "yellow" : "grape"}
            variant="light"
            styles={{
              root: {
                textTransform: "none",
                height: 30,
                borderRadius: 6,
              },
            }}
          >
            {isInstrumentLoading ? "音色加载中" : "可演奏"}
          </Badge>
          {/* 前往编曲工作台 */}
          <Button
            component="a"
            href="/sequencer"
            variant="subtle"
            size="xs"
            rightSection={
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M4.5 2L8.5 6L4.5 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            styles={{
              root: {
                height: 30,
                borderRadius: 6,
                color: "rgba(147,197,253,0.6)",
                paddingInline: 10,
                "&:hover": {
                  background: "rgba(96,165,250,0.08)",
                  color: "#dbeafe",
                },
              },
            }}
          >
            进入编曲工作台
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}
