// All user-facing copy (Korean) lives here.
import type { GiftId, HouseId } from "@/features/village/game";

/** 을/를 depending on whether the last Hangul syllable has a final consonant. */
function objectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0 ? "을" : "를";
}

export const COPY = {
  meta: {
    title: "크리스마스가 도착하는 마을",
    description: "잠든 마을에 작은 선물을 전해주세요. 선물 하나마다 마을이 조금씩 따뜻해져요.",
  },
  landing: {
    titleLines: ["크리스마스가 도착하는", "마을"],
    description: "잠든 마을에 작은 선물을 전해주세요.",
    cta: "선물 배달 시작하기",
  },
  village: {
    title: "크리스마스를 기다리는 마을",
    progress: (n: number, total: number) => `선물 배달 ${n}/${total}`,
    taskOpen: "새 선물이 도착했어요. 상자를 열어볼까요?",
    open: "선물 열어보기",
    restart: "처음부터",
  },
  opening: {
    title: "어떤 선물이 들어 있을까요?",
    hint: "선물을 열어보세요.",
    boxLabel: "선물 상자 열기",
    found: "선물이 들어 있었어요",
    go: "이 선물을 전하러 가기",
  },
  selecting: {
    title: "어느 집에 선물을 전할까요?",
    hint: "아직 불이 꺼진 집을 골라주세요.",
    confirm: "여기에 선물 놓기",
    delivered: (house: string, gift: string) =>
      `${house}에 ${gift}${objectParticle(gift)} 전했어요.`,
  },
  complete: {
    title: "마을에 크리스마스가 도착했어요.",
    description: "당신이 전한 다섯 개의 선물로 마을의 밤이 따뜻해졌어요.",
    save: "크리스마스 카드 저장하기",
    share: "친구에게 공유하기",
    again: "다시 배달하기",
    saving: "카드를 그리는 중…",
    saved: "크리스마스 카드를 저장했어요.",
    shared: "카드를 전했어요.",
    fallback: "카드를 저장하고 마을 주소를 복사했어요.",
    copied: "마을 주소를 복사했어요.",
    failed: "카드를 만들지 못했어요. 잠시 후 다시 시도해주세요.",
    shareTitle: "크리스마스가 도착하는 마을",
    shareText: "잠든 마을에 크리스마스를 전했어요. 당신의 마을에도 선물을 전해보세요.",
  },
  restart: {
    title: "처음부터 다시 배달할까요?",
    body: "지금까지 전한 선물과 밝혀진 불빛이 모두 사라져요.",
    confirm: "처음부터 하기",
    cancel: "계속 배달하기",
  },
  postcard: {
    greeting: "Merry Christmas",
    message: "당신에게도 따뜻한 크리스마스가 찾아오길.",
    brand: "크리스마스가 도착하는 마을",
  },
} as const;

export const HOUSE_NAMES: Record<HouseId, string> = {
  "red-cottage": "빨간 지붕 오두막",
  "woodland-cabin": "숲속 통나무집",
  townhouse: "높다란 골목집",
  bakery: "마을 빵집",
  "stone-cottage": "눈 덮인 돌집",
};

export const GIFTS: Record<GiftId, { name: string; note: string }> = {
  "teddy-bear": { name: "곰 인형", note: "포근하게 안아줄 작은 친구" },
  gingerbread: { name: "진저브레드 쿠키", note: "계피 향이 솔솔 나는 쿠키" },
  stocking: { name: "크리스마스 양말", note: "밤사이 선물이 채워질 양말" },
  "snow-globe": { name: "스노우볼", note: "흔들면 작은 마을에 눈이 내려요" },
  scarf: { name: "털실 목도리", note: "한 코 한 코 정성껏 뜬 목도리" },
  "candy-cane": { name: "캔디케인", note: "달콤한 줄무늬 지팡이 사탕" },
  "mini-tree": { name: "작은 트리", note: "창가에 놓을 반짝이는 트리" },
  "golden-star": { name: "황금 별", note: "트리 꼭대기에 달 빛나는 별" },
};
