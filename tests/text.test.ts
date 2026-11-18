import { test } from "node:test";
import assert from "node:assert/strict";
import { clampText, graphemes, wrapText } from "../src/features/sharing/text.ts";

const mono = (s: string) => graphemes(s).length * 10; // every character 10 px wide

test("limits count user-perceived characters", () => {
  assert.equal(graphemes("지민👨‍👩‍👧").length, 3);
  assert.equal(clampText("가나다라마바", 4), "가나다라");
  assert.equal(clampText("한 줄\n로", 20, 1), "한 줄 로", "names stay on one line");
  assert.equal(clampText("a\nb\nc\nd", 99, 2), "a\nb");
});

test("wrapping keeps Korean words whole and explicit line breaks", () => {
  assert.deepEqual(wrapText("올해도 내 곁에 있어줘서 고마워", 90, mono), [
    "올해도 내 곁에",
    "있어줘서 고마워",
  ]);
  assert.deepEqual(wrapText("메리\n\n크리스마스", 100, mono), ["메리", "", "크리스마스"]);
});

test("runs without spaces break between characters", () => {
  assert.deepEqual(wrapText("メリークリスマス", 40, mono), ["メリーク", "リスマス"]);
  assert.deepEqual(wrapText("Merry supercalifragilistic", 80, mono), [
    "Merry",
    "supercal",
    "ifragili",
    "stic",
  ]);
});
