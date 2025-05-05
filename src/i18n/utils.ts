import {ui} from "./ui";

export function getLangFromUrl(url: URL): string {
  const pathSegments = url.pathname.split("/");
  const lang = pathSegments[1];
  if (lang in ui) return lang;
  return "en";
}

export function useTranslations(lang: string) {
  return function t(key: keyof (typeof ui)["en"]) {
    return ui[lang as keyof typeof ui][key] || ui["en"][key];
  };
}

export function getRouteFromUrl(url: URL, lang: string): string {
  const pathSegments = url.pathname.split("/");
  const rest = pathSegments.slice(2);
  if (lang === "en") {
    return "/" + rest.join("/");
  }
  return `/${lang}/` + rest.join("/");
}
