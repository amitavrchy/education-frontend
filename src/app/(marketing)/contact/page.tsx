import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactPage } from "@/components/marketing/pages";

export const metadata: Metadata = { title: "যোগাযোগ" };

async function WithTopic({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  return <ContactPage initialTopic={topic} />;
}

export default function Page(props: PageProps<"/contact">) {
  return (
    <Suspense fallback={<ContactPage />}>
      <WithTopic searchParams={props.searchParams as Promise<{ topic?: string }>} />
    </Suspense>
  );
}
