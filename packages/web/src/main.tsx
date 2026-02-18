import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import App from "./App";
import { musicTheme } from "./theme";
import { SequencerDebugPage } from "./SequencerDebugPage";

const isSequencerDebugPage = window.location.pathname === "/sequencer-debug";
const RootComponent = isSequencerDebugPage ? SequencerDebugPage : App;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={musicTheme} defaultColorScheme="dark">
      <RootComponent />
    </MantineProvider>
  </React.StrictMode>
);
