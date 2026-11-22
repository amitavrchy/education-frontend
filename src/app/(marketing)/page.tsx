import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { ROUTES } from "@/lib/constants";

/** Minimal landing hero. The full marketing page is built in a later phase. */
export default function HomePage() {
  return (
    <section className="container mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6 lg:py-32">
      <span className="rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
        বাংলাদেশের শিক্ষার্থীদের জন্য
      </span>
      <h1 className="text-display">
        AI দিয়ে শেখা হোক <span className="text-primary">সহজ ও স্মার্ট</span>
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">{siteConfig.tagline}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" asChild>
          <Link href={ROUTES.register}>
            বিনামূল্যে শুরু করুন <ArrowRight />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href={ROUTES.features}>ফিচারসমূহ দেখুন</Link>
        </Button>
      </div>
    </section>
  );
}
