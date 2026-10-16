# Manual two-device test (laptop + phone, with a video call running)

Prereqs: app deployed (or reachable on LAN over HTTPS), space provisioned, both invites issued.

1. **Join.** Laptop opens invite A, phone opens invite B. Each taps *Terima undangan* and saves the recovery key. Re-open the same link: must fail.
2. **Start.** Laptop: *Start Our Date*. Phone: *Continue Our Date* shows within a few seconds. Both see Online next to each name.
3. **Truth or Truth.** Laptop picks a game. Phone lands in the same game. The turn owner sees two themes only (no prompt text). Pick one: both screens show the same prompt. Hit *Selesai* on both screens at once: only one round advances.
4. **Refresh.** Reload the phone mid-round: same question. Close the laptop tab and reopen: same question.
5. **Deep Talk.** Open card from the phone: laptop shows the same card. *Simpan pertanyaan* creates a pending moment; the partner sees it in *Memories* and must approve.
6. **Would You Rather.** Laptop locks a choice: phone shows "Menunggu pasanganmu" and must not reveal it. Phone locks: both reveal together with Same/Different.
7. **Who's More Likely.** Same flow; options are the two members' names.
8. **Disconnect.** Put the phone in airplane mode 20s, vote on the laptop, restore: banner "Koneksi terputus…" appears then clears and state catches up.
9. **Switch game.** Pick another game mid-round: confirm dialog; the other device ends up in the new game or sees "Permainan selesai".
10. **Recovery.** Clear site data on the phone, open `/recover`, paste the key. Seat restored; the old browser profile (if still open) loses access. The pasted key no longer works afterwards: save the new one.
11. **Finish.** *Finish Date*: summary shown on both; refresh keeps it finished; no game restarts by itself.
