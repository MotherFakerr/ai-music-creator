import {
  Box,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { PatternEditor } from "@ai-music-creator/sequencer";
import { HeaderLogo } from "./components/HeaderLogo";

export function SequencerPage() {
  return (
    <Box
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 12% 8%, #1a2455 0%, transparent 42%), radial-gradient(circle at 86% 88%, #0d3f5a 0%, transparent 36%), #090b12",
      }}
    >
      <Container size="xl" py={20}>
        <Stack gap={14}>
          <Card
            radius="lg"
            padding="md"
            style={{
              border: "1px solid rgba(147,197,253,0.2)",
              background: "rgba(10, 15, 28, 0.78)",
            }}
          >
            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              {/* 左侧：Logo + 分割线 + 页面标题 */}
              <Group gap={0} align="center">
                <HeaderLogo />

                {/* 竖分割线 */}
                <Box
                  style={{
                    width: 1,
                    height: 32,
                    background: "rgba(147,197,253,0.2)",
                    marginInline: 20,
                    flexShrink: 0,
                  }}
                />

                {/* 页面标题区 */}
                <Stack gap={3}>
                  <Text
                    style={{
                      color: "#dbeafe",
                      fontSize: 15,
                      fontWeight: 600,
                      lineHeight: 1.2,
                    }}
                  >
                    编曲工作台
                    <Text
                      component="span"
                      style={{
                        color: "rgba(147,197,253,0.5)",
                        fontSize: 12,
                        fontWeight: 400,
                        marginLeft: 6,
                      }}
                    >
                      Sequencer
                    </Text>
                  </Text>
                  <Text
                    style={{
                      color: "rgba(147,197,253,0.45)",
                      fontSize: 11,
                      lineHeight: 1.3,
                    }}
                  >
                    Channel Rack + Piano Roll
                  </Text>
                </Stack>
              </Group>

              {/* 右侧：返回按钮 */}
              <Button
                component="a"
                href="/"
                variant="subtle"
                size="xs"
                leftSection={
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M7.5 2L3.5 6L7.5 10"
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
                返回演奏与跟奏
              </Button>
            </Group>
          </Card>
          <PatternEditor />
        </Stack>
      </Container>
    </Box>
  );
}
