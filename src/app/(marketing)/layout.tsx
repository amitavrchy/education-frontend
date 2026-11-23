import { MarketingLayout } from "@/components/marketing/marketing-layout";

export default function Layout({ children }: LayoutProps<"/">) {
  return <MarketingLayout>{children}</MarketingLayout>;
}
