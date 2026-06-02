const defaultCounterId = "109588087";
const rawCounterId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID?.trim() || defaultCounterId;

export const yandexMetrikaId = /^\d+$/.test(rawCounterId) ? rawCounterId : "";

export const yandexMetrikaGoals = {
  read50: "read_50",
  read100: "read_100",
  searchUsed: "search_used",
  telegramClick: "telegram_click"
} as const;

export type YandexMetrikaGoal =
  (typeof yandexMetrikaGoals)[keyof typeof yandexMetrikaGoals];

type YandexMetrikaFunction = {
  (counterId: number, methodName: string, ...params: unknown[]): void;
};

declare global {
  interface Window {
    __YANDEX_METRIKA_PENDING__?: YandexMetrikaCall[];
    __YANDEX_METRIKA_READY__?: boolean;
    ym?: YandexMetrikaFunction;
  }
}

type YandexMetrikaCall = [number, string, ...unknown[]];

export function sendYandexMetrikaHit(
  url: string,
  title: string,
  params: Record<string, unknown> = {}
): void {
  const options: {
    params?: Record<string, unknown>;
    title: string;
  } = { title };

  if (Object.keys(params).length > 0) {
    options.params = params;
  }

  callYandexMetrika("hit", url, options);
}

export function reachYandexMetrikaGoal(
  goal: YandexMetrikaGoal,
  params: Record<string, unknown> = {}
): void {
  callYandexMetrika("reachGoal", goal, params);
}

function callYandexMetrika(methodName: string, ...params: unknown[]): void {
  if (!yandexMetrikaId || typeof window === "undefined") return;

  const call: YandexMetrikaCall = [Number(yandexMetrikaId), methodName, ...params];
  if (window.__YANDEX_METRIKA_READY__ && typeof window.ym === "function") {
    window.ym(...call);
    return;
  }

  window.__YANDEX_METRIKA_PENDING__ = window.__YANDEX_METRIKA_PENDING__ || [];
  window.__YANDEX_METRIKA_PENDING__.push(call);
}
