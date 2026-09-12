import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameApp } from "./components/musca/GameApp";
import { StudioApp } from "./editor/StudioApp";
import "./styles.css";
import "./visual.css";
import "./editor/studio.css";

const params = new URLSearchParams(window.location.search);
const studioMode = params.get("studio") === "1" || params.has("studio");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {studioMode ? <StudioApp /> : <GameApp />}
  </StrictMode>,
);
