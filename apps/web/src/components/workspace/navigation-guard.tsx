"use client";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Protection = {
  active: boolean;
  uncertain: boolean;
  noun: string;
  locked: boolean;
};
type Reason = "page" | "switch";
const NavigationContext = createContext<{
  register: (protection: Protection | null) => void;
  confirmLeave: (reason?: Reason) => boolean;
  commitNavigation: (href: string) => void;
  navigate: (href: string) => void;
  locked: boolean;
} | null>(null);

export function NavigationGuard({ children }: { children: ReactNode }) {
  const [protection, register] = useState<Protection | null>(null);
  const allowed = useRef(false);
  const confirmLeave = useCallback(
    (reason: Reason = "page") => {
      if (!protection?.active) return true;
      return window.confirm(
        protection.uncertain
          ? "Discard local edits? The save may already have completed."
          : reason === "switch"
            ? `Discard unsaved ${protection.noun} changes?`
            : `Discard unsaved ${protection.noun} changes and leave this page?`,
      );
    },
    [protection],
  );
  const commitNavigation = useCallback((href: string) => {
    allowed.current = true;
    window.location.assign(href);
  }, []);
  const navigate = useCallback(
    (href: string) => {
      if (confirmLeave()) commitNavigation(href);
    },
    [confirmLeave, commitNavigation],
  );
  useEffect(() => {
    if (!protection?.active) return;
    const unload = (event: BeforeUnloadEvent) => {
      if (allowed.current) {
        allowed.current = false;
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      )
        return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const url = new URL(link.href, location.href);
      if (
        url.href === location.href ||
        (url.pathname === location.pathname &&
          url.search === location.search &&
          url.hash)
      )
        return;
      if (!confirmLeave()) {
        event.preventDefault();
        event.stopPropagation();
      } else allowed.current = true;
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [protection?.active, confirmLeave]);
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) {
        allowed.current = true;
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);
  const value = useMemo(
    () => ({
      register,
      confirmLeave,
      commitNavigation,
      navigate,
      locked: protection?.locked ?? false,
    }),
    [confirmLeave, commitNavigation, navigate, protection?.locked],
  );
  return <NavigationContext value={value}>{children}</NavigationContext>;
}
export function useNavigationGuard() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("Workspace navigation requires its shell");
  return context;
}
export function useLeaveProtection({
  active,
  uncertain,
  noun,
  locked,
}: Protection) {
  const { register } = useNavigationGuard();
  useEffect(() => {
    register({ active, uncertain, noun, locked });
    return () => register(null);
  }, [register, active, uncertain, noun, locked]);
}
