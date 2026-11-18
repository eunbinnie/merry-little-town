// All user-facing copy (Korean) lives here.
import type { GiftId, HouseId } from "@/features/village/game";
import type { BuildingId } from "@/game/world";

/** 을/를 depending on whether the last Hangul syllable has a final consonant. */
export function objectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0 ? "을" : "를";
}

export const COPY = {
  meta: {
    title: "크리스마스가 도착하는 마을",
    description:
      "산타가 되어 눈 내리는 마을을 걸어요. 선물을 하나씩 전할 때마다 마을에 불이 켜져요.",
  },
  loading: "마을로 날아가는 중…",
  landing: {
    titleLines: ["크리스마스가 도착하는", "마을"],
    description: "오늘 밤, 당신이 산타예요.",
    cta: "썰매 타고 출발하기",
  },
  intro: { skip: "건너뛰기" },
  hud: {
    progress: (n: number, total: number) => `선물 ${n}/${total}`,
    progressLabel: (n: number, total: number) => `${total}집 중 ${n}집에 선물을 전했어요`,
    sack: "선물 자루",
    sackEmpty: "선물 자루가 비어 있어요",
    sackLabel: (names: string[]) => `선물 자루: ${names.join(", ")}`,
    photo: "사진",
    menu: "처음부터",
    goTo: "바로 가기",
    sleigh: "루돌프의 썰매",
    goToLabel: (name: string) => `${name}(으)로 걷기`,
  },
  hint: {
    move: "화면을 눌러 산타를 움직여요",
    moveKeys: "방향키·WASD로 걷고 Space로 말을 걸어요",
    load: "썰매 짐칸을 눌러 선물을 챙겨요",
    deliver: "불 꺼진 집을 찾아 문 앞에 선물을 놓아요",
    reload: "자루가 비었어요. 썰매에서 선물을 더 챙겨요",
    explore: "트리 앞에서 사진을 남겨보세요",
    busy: "",
  },
  toast: {
    loaded: "선물을 챙겼어요",
    sackFull: "자루가 가득 찼어요",
    sackFullBody: "먼저 선물을 전하고 와요.",
    allLoaded: "남은 선물은 모두 자루에 있어요",
    noGift: "선물 자루가 비었어요",
    noGiftBody: "썰매에서 선물을 챙겨 와요.",
    already: "이미 선물을 받은 집이에요",
    delivered: (house: string, gift: string) =>
      `${house}에 ${gift}${objectParticle(gift)} 전했어요`,
    chimney: "문이 눈에 꽁꽁 막혔어요",
    chimneyBody: "루돌프! 굴뚝으로 가자!",
    complete: "마을에 크리스마스가 도착했어요",
    completeBody: "마을을 더 걸어보고, 마음에 드는 곳에서 사진을 찍어보세요.",
    unreachable: "그곳으로는 갈 수 없어요",
    tree: "광장의 큰 트리",
    treeWaiting: "모든 집에 선물을 전하면 불이 켜질 거예요.",
    treeLit: "반짝반짝. 여기서 사진을 남겨보세요.",
  },
  near: {
    sleigh: "Space · 선물 챙기기",
    deliver: "Space · 선물 놓기",
    look: "Space · 살펴보기",
  },
  photo: {
    title: "크리스마스 사진",
    making: "사진을 인화하는 중…",
    save: "이미지 저장",
    share: "공유하기",
    close: "닫기",
    saved: "사진을 저장했어요.",
    shared: "사진을 보냈어요.",
    fallback: "사진을 저장하고 마을 주소를 복사했어요.",
    failed: "사진을 만들지 못했어요. 잠시 후 다시 시도해주세요.",
    shareTitle: "크리스마스가 도착하는 마을",
    shareText: "오늘 밤 산타가 되어 마을에 크리스마스를 전했어요. 당신도 걸어보세요.",
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

export const BUILDING_NAMES: Record<BuildingId, string> = {
  workshop: "산타의 선물 창고",
  chapel: "언덕 위 작은 예배당",
  bakery: "마을 빵집",
  "tea-house": "모퉁이 찻집",
  townhouse: "높다란 골목집",
  "red-cottage": "빨간 지붕 오두막",
  shed: "장작 헛간",
  "stone-cottage": "눈 덮인 돌집",
  "woodland-cabin": "숲속 통나무집",
  "a-frame": "강 건너 세모집",
  "blue-cottage": "파란 지붕 이웃집",
  "rose-cottage": "연못가 이웃집",
};

/** What Santa notices at buildings that aren't waiting for a gift. */
export const BUILDING_NOTES: Partial<Record<BuildingId, string>> = {
  workshop: "요정들이 밤새 포장한 선물이 선반 가득 쌓여 있어요.",
  chapel: "종탑 위로 별빛이 내려앉았어요.",
  shed: "잘 마른 장작 냄새가 나요. 썰매도 한 대 기대어 있네요.",
  "blue-cottage": "이웃들은 벌써 꿈나라예요. 마을이 밝아지면 깨어날지도 몰라요.",
  "rose-cottage": "창가에 작은 양말 하나가 걸려 있어요.",
};

export const HOUSE_NAMES: Record<HouseId, string> = BUILDING_NAMES;

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
