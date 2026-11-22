import { MarketingLayout } from "@/components/layouts/marketing-layout";

export default function Layout({ children }: LayoutProps<"/">) {
  return <MarketingLayout>{children}</MarketingLayout>;
}
