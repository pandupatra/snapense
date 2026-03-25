"use client";

import { useI18n, Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import * as React from "react";

interface LanguageOption {
  code: Locale;
  name: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: "id", name: "Indonesia", flag: "🇮🇩" },
  { code: "en", name: "English", flag: "🇺🇸" },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const currentLanguage = languages.find((lang) => lang.code === locale);

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="sm"
        className="h-9 px-3"
        aria-label={t.language.select}
      >
        <span className="text-xl leading-none">{currentLanguage?.flag}</span>
      </Button>

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-1 min-w-[140px] bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="p-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLocale(lang.code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                locale === lang.code
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-accent/50"
              }`}
            >
              <span className="text-lg leading-none">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
