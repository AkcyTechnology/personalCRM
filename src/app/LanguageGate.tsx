import { Fragment } from "react";
import { useEffect, useState } from "react";
import { loadSettings, subscribeSettings } from "../data/userSettings";
import { resolveLanguage, setLanguage, type Lang } from "../i18n";

/**
 * Applies the saved language before the first screen renders and remounts
 * the tree when it changes, so every t() call picks up the new language.
 */
export default function LanguageGate({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang | null>(null);

  useEffect(() => {
    const apply = (pref: string | undefined) => {
      const next = resolveLanguage(pref);
      setLanguage(next);
      setLang(next);
    };
    loadSettings().then((s) => apply(s.language));
    return subscribeSettings((s) => apply(s.language));
  }, []);

  if (!lang) return null;
  return <Fragment key={lang}>{children}</Fragment>;
}
