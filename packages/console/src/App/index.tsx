import { Route, Routes } from "react-router-dom";
import { Stage } from "./Stage";

export function App() {
  return (
    <Routes>
      <Route path=":stage/*" element={<Stage />} />
    </Routes>
  );
}
