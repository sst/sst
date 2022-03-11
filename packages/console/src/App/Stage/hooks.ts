import { atom, useAtom } from "jotai";
import { useParams } from "react-router-dom";
import { atomWithHash } from "jotai/utils";

const PanelAtom = atom(true);

export function usePanel() {
  const [isOpen, setIsOpen] = useAtom(PanelAtom);

  return {
    open: isOpen,
    set: setIsOpen,
    toggle: () => setIsOpen(!isOpen),
  };
}

export const prefixAtom = atomWithHash("prefix", "");
export const fileAtom = atomWithHash("file", "");

export function useStage() {
  const params = useParams();
  return {
    app: params.app!,
    stage: params.stage!,
  };
}
