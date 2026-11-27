"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Loader2, Swords, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RichText } from "@/components/content/rich-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurriculum } from "@/hooks/use-curriculum";
import { useFormat, useL } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { socialService, type Challenge } from "@/services/social.service";

/** Weekly leaderboard of real, opted-in classmates (XP from the last 7 days of study). */
export function LiveLeaderboard() {
  const l = useL();
  const f = useFormat();
  const [scope, setScope] = useState<"class" | "school">("class");
  const q = useQuery({ queryKey: ["leaderboard", scope], queryFn: () => socialService.leaderboard(scope) });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="size-4" /> {l("সাপ্তাহিক লিডারবোর্ড (ঐচ্ছিক)", "Weekly leaderboard (optional)")}
        </CardTitle>
        <CardDescription>{l("গত ৭ দিনের XP। শুধু যারা গোপনীয়তা সেটিংসে লিডারবোর্ডে দেখাতে সম্মত, নাম সংক্ষিপ্ত।", "XP from the last 7 days. Only students who allow it in their privacy settings; names are shortened.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex gap-1">
          {(["class", "school"] as const).map((s) => (
            <Button key={s} size="sm" variant={scope === s ? "secondary" : "ghost"} onClick={() => setScope(s)}>
              {s === "class" ? l("আমার শ্রেণি", "My class") : l("আমার প্রতিষ্ঠান", "My school")}
            </Button>
          ))}
        </div>
        {q.isPending ? (
          <Loader2 className="mx-auto my-8 animate-spin text-muted-foreground" />
        ) : q.isError ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{errorText(q.error, l)}</p>
        ) : (
          <ol className="space-y-1">
            {q.data.rows.map((row) => (
              <li key={`${row.rank}-${row.name}`} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", row.me && "bg-primary/10 font-semibold")}>
                <span className="w-6 text-center tabular-nums">{row.rank <= 3 ? ["🥇", "🥈", "🥉"][row.rank - 1] : f.digits(row.rank)}</span>
                <span className="flex-1">{row.me ? l("তুমি", "You") : row.name}</span>
                <span className="tabular-nums text-muted-foreground">{f.number(row.xp)} XP</span>
              </li>
            ))}
            {q.data.rows.length <= 1 && <p className="py-4 text-center text-xs text-muted-foreground">{l("এই সপ্তাহে এখানে আর কেউ নেই।", "Nobody else here this week yet.")}</p>}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/** Friend challenges: a 5-question MCQ quiz of a subject against a classmate. */
export function LiveChallenges() {
  const l = useL();
  const f = useFormat();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["challenges"], queryFn: socialService.challenges });
  const [creating, setCreating] = useState(false);
  const [playing, setPlaying] = useState<Challenge | null>(null);
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["challenges"] });
  const respond = useMutation({ mutationFn: (v: { id: string; accept: boolean }) => socialService.respond(v.id, v.accept), onSuccess: invalidate, onError: (e) => toast.error(errorText(e, l)) });
  const status = (c: Challenge) =>
    c.status === "done"
      ? { won: l("জিতেছ", "Won"), lost: l("হেরেছ", "Lost"), draw: l("ড্র", "Draw") }[c.outcome ?? "draw"]
      : c.status === "declined"
        ? l("ফিরিয়ে দিয়েছে", "Declined")
        : c.status === "expired"
          ? l("মেয়াদ শেষ", "Expired")
          : c.played
            ? l("বন্ধুর অপেক্ষায়", "Waiting for friend")
            : c.status === "pending" && c.incoming
              ? l("নতুন", "New")
              : l("চলমান", "Active");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Swords className="size-4" /> {l("বন্ধুর সাথে চ্যালেঞ্জ", "Friend challenges")}
        </CardTitle>
        <CardDescription>{l("সহপাঠীকে ৫ প্রশ্নের কুইজে চ্যালেঞ্জ করো — হার-জিতে কোনো পয়েন্ট কাটা যায় না।", "Challenge a classmate to a 5-question quiz — no points are lost.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.isPending && <Loader2 className="mx-auto my-6 animate-spin text-muted-foreground" />}
        {list.data?.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">{l("এখনো কোনো চ্যালেঞ্জ নেই।", "No challenges yet.")}</p>}
        {list.data?.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <Users className="size-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.title}</p>
              <p className="text-xs text-muted-foreground">
                {l("বনাম", "vs")} {c.friend}
                {c.myScore !== undefined && ` · ${f.digits(c.myScore)}${c.theirScore !== undefined ? `–${f.digits(c.theirScore)}` : ""}/${f.digits(c.questionIds.length)}`}
              </p>
            </div>
            <Badge variant={c.outcome === "won" ? "default" : "outline"}>{status(c)}</Badge>
            {c.incoming && c.status === "pending" && !c.played && (
              <Button size="sm" variant="ghost" disabled={respond.isPending} onClick={() => respond.mutate({ id: c.id, accept: false })}>
                {l("না", "Decline")}
              </Button>
            )}
            {!c.played && (c.status === "active" || c.status === "pending") && (
              <Button size="sm" onClick={() => setPlaying(c)}>
                {l("খেলো", "Play")}
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" className="w-full" onClick={() => setCreating(true)}>
          <Swords /> {l("নতুন চ্যালেঞ্জ", "New challenge")}
        </Button>
      </CardContent>
      {creating && <NewChallengeDialog onClose={() => setCreating(false)} onDone={invalidate} />}
      {playing && <QuizDialog challenge={playing} onClose={() => setPlaying(null)} onDone={invalidate} />}
    </Card>
  );
}

function NewChallengeDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const l = useL();
  const f = useFormat();
  const { index: cur } = useCurriculum();
  const mates = useQuery({ queryKey: ["challenges", "classmates"], queryFn: socialService.classmates });
  const [friendId, setFriendId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const create = useMutation({
    mutationFn: () => socialService.create(friendId, subjectId),
    onSuccess: () => (toast.success(l("চ্যালেঞ্জ পাঠানো হয়েছে — বন্ধু নোটিফিকেশন পাবে", "Challenge sent — your friend gets a notification")), onDone(), onClose()),
    onError: (e) => toast.error(errorText(e, l)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{l("নতুন চ্যালেঞ্জ", "New challenge")}</DialogTitle>
          <DialogDescription>{l("তোমার প্রতিষ্ঠানের একজন সহপাঠী ও একটি বিষয় বেছে নাও।", "Pick a classmate from your institution and a subject.")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label>{l("সহপাঠী", "Classmate")}</Label>
          <Select value={friendId} onValueChange={setFriendId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={mates.isPending ? l("লোড হচ্ছে…", "Loading…") : l("বেছে নাও", "Choose")} />
            </SelectTrigger>
            <SelectContent>
              {(mates.data ?? []).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mates.data?.length === 0 && <p className="text-xs text-muted-foreground">{l("তোমার প্রতিষ্ঠানে চ্যালেঞ্জ করার মতো কেউ নেই।", "Nobody in your institution to challenge yet.")}</p>}
        </div>
        <div className="space-y-1">
          <Label>{l("বিষয়", "Subject")}</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={l("বেছে নাও", "Choose")} />
            </SelectTrigger>
            <SelectContent>
              {(cur?.subjects ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {f.pick(s.name)} · {s.levelCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button disabled={!friendId || !subjectId || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? <Loader2 className="animate-spin" /> : <Swords />} {l("চ্যালেঞ্জ পাঠাও", "Send challenge")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuizDialog({ challenge, onClose, onDone }: { challenge: Challenge; onClose: () => void; onDone: () => void }) {
  const l = useL();
  const f = useFormat();
  const quiz = useQuery({ queryKey: ["challenges", challenge.id, "quiz"], queryFn: () => socialService.quiz(challenge.id) });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const submit = useMutation({
    mutationFn: () => socialService.submit(challenge.id, answers),
    onSuccess: (c) => {
      toast.success(c.status === "done" ? l(`ফলাফল: ${c.myScore}–${c.theirScore}`, `Result: ${c.myScore}–${c.theirScore}`) : l(`তোমার স্কোর ${c.myScore}/${c.questionIds.length} — বন্ধুর অপেক্ষায়`, `You scored ${c.myScore}/${c.questionIds.length} — waiting for your friend`));
      onDone();
      onClose();
    },
    onError: (e) => toast.error(errorText(e, l)),
  });
  const qs = quiz.data ?? [];
  return (
    <Dialog open onOpenChange={(o) => !o && !submit.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{challenge.title}</DialogTitle>
          <DialogDescription>
            {l("বনাম", "vs")} {challenge.friend}
          </DialogDescription>
        </DialogHeader>
        {quiz.isPending && <Loader2 className="mx-auto my-8 animate-spin text-muted-foreground" />}
        {qs.map((q, i) => (
          <fieldset key={q.id} className="space-y-2 rounded-lg border p-3">
            <legend className="px-1 text-xs text-muted-foreground">{l(`প্রশ্ন ${f.digits(i + 1)}`, `Question ${i + 1}`)}</legend>
            <RichText className="text-sm">{q.stem}</RichText>
            <div className="grid gap-1.5">
              {q.options.map((o) => (
                <button key={o.id} type="button" onClick={() => setAnswers({ ...answers, [q.id]: o.id })} className={cn("rounded-md border px-3 py-2 text-left text-sm hover:bg-accent", answers[q.id] === o.id && "border-primary bg-primary/10")}>
                  <RichText inline>{o.text}</RichText>
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        <DialogFooter>
          <Button disabled={!qs.length || Object.keys(answers).length < qs.length || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending && <Loader2 className="animate-spin" />} {l("জমা দাও", "Submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
