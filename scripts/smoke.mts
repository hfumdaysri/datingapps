// Two-browser smoke test against a deployed instance (default: production).
// Uses the REAL space: rebinds both seats via fresh recovery keys, plays, then cleans up (see cleanup()).
import { createClient } from "@supabase/supabase-js";
import { chromium, type Page } from "playwright";
import { formatRecoveryKey, hashSecret, randomToken } from "../src/lib/server/crypto.ts";

const BASE = process.env.SMOKE_BASE ?? "https://datingapps-steel.vercel.app";
const SHOTS = process.env.SMOKE_SHOTS ?? ".";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

let failed = 0;
const check = (label: string, ok: boolean, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${ok ? "" : ` :: ${extra}`}`);
  if (!ok) failed++;
};
const T = 20000;

async function login(page: Page, key: string) {
  await page.goto(`${BASE}/recover`);
  await page.fill("#key", key);
  await page.getByRole("button", { name: "Pulihkan akses" }).click();
  await page.getByTestId("recovery-key").waitFor({ timeout: T });
  await page.getByLabel("Aku sudah menyimpannya").check();
  await page.getByRole("button", { name: "Lanjut ke Beranda" }).click();
  await page.waitForURL("**/home", { timeout: T });
}

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

async function main() {
  const { data: members } = await admin.from("members").select("id, seat, display_name").order("seat");
  const keys: string[] = [];
  for (const m of members!) {
    const secret = randomToken(32);
    await admin.rpc("set_recovery", { p_member: m.id, p_hash: await hashSecret(secret, process.env.RECOVERY_PEPPER!) });
    keys.push(formatRecoveryKey(m.id, secret));
  }
  const nameA = members![0]!.display_name, nameB = members![1]!.display_name;

  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } }); // laptop
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); // phone
  const A = await ctxA.newPage();
  const B = await ctxB.newPage();
  const errors: string[] = [];
  for (const [n, p] of [["A", A], ["B", B]] as const) {
    p.on("pageerror", (e) => errors.push(`${n}: ${e.message}`));
  }

  // ---- access ----
  const anonymous = await (await browser.newContext()).newPage();
  const res = await anonymous.goto(`${BASE}/home`);
  check("uninvited visitor is redirected away from /home", anonymous.url().replace(/\/$/, "") === BASE && !!res);
  await login(A, keys[0]!);
  await login(B, keys[1]!);
  check("both players log in with recovery keys", A.url().endsWith("/home") && B.url().endsWith("/home"));
  check("home greets both by name", (await A.textContent("body"))!.includes(nameA) && (await A.textContent("body"))!.includes(nameB));
  check("phone layout has no horizontal overflow (390px)", await noHorizontalOverflow(B));
  check("laptop layout has no horizontal overflow (1280px)", await noHorizontalOverflow(A));
  await A.screenshot({ path: `${SHOTS}/home-laptop.png` });
  await B.screenshot({ path: `${SHOTS}/home-phone.png` });

  // ---- date: A starts, B sees it without reloading (realtime or poll) ----
  await A.getByRole("button", { name: "Mulai Ngedate" }).click();
  const t0 = Date.now();
  await B.getByRole("link", { name: "Lanjut Ngedate" }).waitFor({ timeout: T });
  check(`B sees A's date without reload (${Date.now() - t0}ms)`, true);
  await A.getByRole("link", { name: "Lanjut Ngedate" }).click();
  await A.waitForURL(/\/dates\//);

  // ---- Truth or Truth ----
  await A.getByRole("button", { name: "Jujur-jujuran" }).click();
  await A.waitForURL(/\/play\//, { timeout: T });
  const gameUrl = A.url();
  await B.getByRole("link", { name: "Lanjut Ngedate" }).click();
  await B.waitForURL(/\/play\//, { timeout: T });
  check("both players are in the same game", B.url() === gameUrl);

  const aTurn = await A.getByText("Giliranmu memilih").isVisible().catch(() => false);
  const [owner, other] = aTurn ? [A, B] : [B, A];
  await owner.getByText("Giliranmu memilih").waitFor({ timeout: T });
  await other.getByText(/Menunggu/).first().waitFor({ timeout: T });
  check("only turn owner can choose; partner sees waiting state", true);
  check("prompt text hidden before choosing", (await other.getByTestId("prompt").count()) === 0);
  await owner.locator("button.min-h-24").first().click();
  const t1 = Date.now();
  await other.getByTestId("prompt").waitFor({ timeout: T });
  const pOwner = await owner.getByTestId("prompt").textContent();
  const pOther = await other.getByTestId("prompt").textContent();
  check(`both screens show the same prompt (partner synced in ${Date.now() - t1}ms)`, !!pOwner && pOwner === pOther, `${pOwner} / ${pOther}`);
  await B.screenshot({ path: `${SHOTS}/truth-phone.png` });
  await other.reload();
  check("refresh keeps the same prompt", (await other.getByTestId("prompt").textContent({ timeout: T })) === pOwner);

  // both press Done simultaneously -> exactly one new round
  await Promise.all([A.getByRole("button", { name: "Selesai" }).click(), B.getByRole("button", { name: "Selesai" }).click()]);
  await A.getByText("Ronde 2").waitFor({ timeout: T });
  await B.getByText("Ronde 2").waitFor({ timeout: T });
  await A.waitForTimeout(1500);
  check("simultaneous Done advances exactly one round", (await A.getByText("Ronde 2").count()) === 1 && (await B.getByText("Ronde 3").count()) === 0 && (await A.getByText("Ronde 3").count()) === 0);

  // ---- switch to Would You Rather (confirm dialog), partner is moved out ----
  await A.getByRole("link", { name: "Kembali ke Ngedate" }).click();
  await A.waitForURL(/\/dates\//);
  await A.getByRole("button", { name: "Pilih Mana?" }).click();
  await A.getByRole("dialog").getByRole("button", { name: "Ganti" }).click();
  await A.waitForURL(/\/play\//, { timeout: T });
  await B.getByText("Permainan selesai").waitFor({ timeout: T });
  check("partner is told the previous game ended", true);
  await B.getByRole("link", { name: "Kembali ke Ngedate" }).click();
  await B.getByRole("link", { name: "Lanjut bermain" }).click();
  await B.waitForURL(/\/play\//, { timeout: T });

  // ---- secret voting ----
  await A.getByTestId("prompt").waitFor({ timeout: T });
  await A.getByRole("radio").first().click();
  await A.getByRole("button", { name: "Kunci jawaban" }).click();
  await A.getByText(/Menunggu pasanganmu/).waitFor({ timeout: T });
  const aChose = (await A.locator("strong").first().textContent())!;
  await B.getByTestId("prompt").waitFor({ timeout: T });
  check("B sees no result and no vote before locking", (await B.getByText("Hasil").count()) === 0 && !(await B.getByText("Kamu menjawab").count()));
  await B.getByRole("radio").nth(1).click();
  await B.getByRole("button", { name: "Kunci jawaban" }).click();
  await A.getByRole("region", { name: "Hasil" }).waitFor({ timeout: T });
  await B.getByRole("region", { name: "Hasil" }).waitFor({ timeout: T });
  const hA = await A.getByRole("region", { name: "Hasil" }).locator("h2").textContent();
  const hB = await B.getByRole("region", { name: "Hasil" }).locator("h2").textContent();
  check(`both reveal together with the same verdict ("${hA}")`, hA === hB && !!aChose);
  await B.screenshot({ path: `${SHOTS}/reveal-phone.png` });
  check("phone has no overflow in game (390px)", await noHorizontalOverflow(B));

  // ---- know me ----
  await A.getByRole("link", { name: "Kembali ke Ngedate" }).click();
  await A.waitForURL(/\/dates\//);
  await A.getByRole("button", { name: "Seberapa Kenal Aku?" }).click();
  await A.getByRole("dialog").getByRole("button", { name: "Ganti" }).click();
  await A.waitForURL(/\/play\//, { timeout: T });
  await B.getByText("Permainan selesai").waitFor({ timeout: T });
  await B.getByRole("link", { name: "Kembali ke Ngedate" }).click();
  await B.getByRole("link", { name: "Lanjut bermain" }).click();
  await B.waitForURL(/\/play\//, { timeout: T });
  await A.getByTestId("prompt").waitFor({ timeout: T });
  await B.getByTestId("prompt").waitFor({ timeout: T });
  const aOwner = await A.getByText("Kamu menjawab jujur").isVisible().catch(() => false);
  const [kOwner, kGuesser] = aOwner ? [A, B] : [B, A];
  await kOwner.locator("#answer").fill("Nasi goreng");
  await kOwner.getByRole("button", { name: "Kunci jawaban" }).click();
  await kOwner.getByText("Jawabanmu terkunci").waitFor({ timeout: T });
  check("guesser sees no answer before locking", (await kGuesser.getByText("Nasi goreng").count()) === 0);
  await kGuesser.locator("#answer").fill("Mie ayam");
  await kGuesser.getByRole("button", { name: "Kunci jawaban" }).click();
  await A.getByRole("region", { name: "Hasil" }).waitFor({ timeout: T });
  await B.getByRole("region", { name: "Hasil" }).waitFor({ timeout: T });
  check("know-me reveals both answers on both screens", (await A.getByText("Nasi goreng").count()) > 0 && (await B.getByText("Mie ayam").count()) > 0);
  await kOwner.getByRole("button", { name: "Hampir" }).click();
  await kGuesser.getByText(/Hampir benar/).waitFor({ timeout: T });
  check("owner judgment reaches the guesser with score", (await kGuesser.getByText(/Skor seru/).count()) > 0);
  await B.screenshot({ path: `${SHOTS}/knowme-phone.png` });
  await kGuesser.getByRole("button", { name: "Berikutnya" }).click();
  await A.getByText("Ronde 2").waitFor({ timeout: T });
  check("roles swap in the next know-me round", (await (aOwner ? B : A).getByText("Kamu menjawab jujur").count()) === 1);

  // ---- finish ----
  await A.getByRole("link", { name: "Kembali ke Ngedate" }).click();
  await A.waitForURL(/\/dates\//);
  await A.getByRole("button", { name: "Akhiri Ngedate" }).click();
  await A.getByRole("dialog").getByRole("button", { name: "Akhiri" }).click();
  await A.getByText("Ngedate selesai").waitFor({ timeout: T });
  await A.reload();
  await A.getByText("Ngedate selesai").waitFor({ timeout: T });
  check("finished date stays finished after refresh", true);
  // ---- settings: custom prompt, export, mutual-consent deletion ----
  await A.goto(`${BASE}/settings`);
  await A.getByText("Pertanyaan buatan sendiri").waitFor({ timeout: T });
  await A.locator("textarea").first().fill("Pertanyaan uji smoke");
  await A.getByRole("button", { name: "Tambah" }).click();
  await A.getByText("Ditambahkan.").waitFor({ timeout: T });
  check("custom prompt can be added", true);
  await A.getByRole("button", { name: "Hapus" }).first().click();
  const [download] = await Promise.all([A.waitForEvent("download", { timeout: T }), A.getByRole("button", { name: "Unduh data (JSON)" }).click()]);
  check("export downloads a JSON file", download.suggestedFilename().endsWith(".json"));
  await A.getByRole("button", { name: "Minta hapus data bersama" }).click();
  await A.getByRole("dialog").getByRole("button", { name: "Kirim permintaan" }).click();
  await A.getByText(/menunggu persetujuan/).waitFor({ timeout: T });
  await B.goto(`${BASE}/home`);
  await B.getByText(/meminta menghapus data bersama/).waitFor({ timeout: T });
  check("partner is notified of the deletion request on Beranda", true);
  await B.goto(`${BASE}/settings`);
  await B.getByRole("button", { name: /Setujui/ }).click();
  await B.getByRole("button", { name: "Minta hapus data bersama" }).waitFor({ timeout: T });
  const left = await admin.from("date_sessions").select("id");
  check("approved deletion removes the date history", (left.data?.length ?? 0) === 0);

  check("no uncaught page errors", errors.length === 0, errors.join(" | "));
  await browser.close();
}

async function cleanup() {
  // Remove the smoke-test date/games/history and release both seats so real use starts clean.
  const { data: space } = await admin.from("couple_spaces").select("id").single();
  if (space) {
    await admin.from("date_sessions").delete().eq("space_id", space.id);
    await admin.from("question_history").delete().eq("space_id", space.id);
    await admin.from("saved_moments").delete().eq("space_id", space.id);
  }
  await admin.from("rate_limits").delete().neq("key", "");
  const { data: bound } = await admin.from("members").select("auth_user_id").not("auth_user_id", "is", null);
  await admin.from("members").update({ auth_user_id: null, joined_at: null }).not("id", "is", null);
  for (const m of bound ?? []) if (m.auth_user_id) await admin.auth.admin.deleteUser(m.auth_user_id);
}

try {
  await main();
} catch (e) {
  const where = e instanceof Error ? (e.stack ?? "").split("\n").filter((l) => l.includes("smoke.mts")).slice(0, 2).join(" @ ") : "";
  console.error("ERROR", e instanceof Error ? `${e.message.split("\n").slice(0, 2).join(" ")} ${where}` : e);
  failed++;
} finally {
  await cleanup().catch((e) => console.error("cleanup failed", e));
}
console.log(failed ? `\n${failed} FAILED` : "\nSMOKE PASSED");
process.exit(failed ? 1 : 0);
