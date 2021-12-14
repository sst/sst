import { Route, Routes } from "react-router-dom";
import { useDarkMode } from "~/data/theme";
import { darkTheme } from "~/stitches.config";
import { Stage } from "./Stage";

export function App() {
  const darkMode = useDarkMode();
  return (
    <div className={darkMode.enabled ? darkTheme : ""}>
      <Routes>
        <Route path=":stage/*" element={<Stage />} />
      </Routes>
    </div>
  );
}
