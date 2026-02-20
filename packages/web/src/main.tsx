import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import App from "./App";
import { musicTheme } from "./theme";
import { SequencerPage } from "./SequencerPage";

const pathname = window.location.pathname;
const isSequencerPage = pathname === "/sequencer" || pathname === "/sequencer-debug";
const RootComponent = isSequencerPage ? SequencerPage : App;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={musicTheme} defaultColorScheme="dark">
      <RootComponent />
    </MantineProvider>
  </React.StrictMode>
);
