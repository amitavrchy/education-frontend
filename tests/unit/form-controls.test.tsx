import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Field } from "@/components/forms/field";
import { PasswordInput } from "@/components/forms/password-input";
import { SegmentedControl } from "@/components/forms/segmented-control";
import { Input } from "@/components/ui/input";

describe("Field", () => {
  it("labels its control and announces errors", () => {
    render(
      <Field label="Email" error="Enter a valid email" required>
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText(/Email/);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const alert = screen.getByRole("alert");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("links hints when there is no error", () => {
    render(
      <Field label="Name" hint="As on your certificate">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Name");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toBe("As on your certificate");
  });
});

describe("PasswordInput", () => {
  it("keeps the label on the real input and toggles visibility", async () => {
    render(
      <Field label="Password">
        <PasswordInput />
      </Field>,
    );
    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input.type).toBe("password");
    const toggle = screen.getByRole("button", { name: /পাসওয়ার্ড দেখুন|Show password/ });
    await userEvent.click(toggle);
    expect(input.type).toBe("text");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("SegmentedControl", () => {
  function Harness() {
    const [v, setV] = useState<"a" | "b" | "c">("a");
    return <SegmentedControl label="Pick" value={v} onChange={setV} options={[{ value: "a", label: "A" }, { value: "b", label: "B" }, { value: "c", label: "C" }]} />;
  }
  it("is a radiogroup with roving tabindex and arrow-key navigation", async () => {
    render(<Harness />);
    expect(screen.getByRole("radiogroup", { name: "Pick" })).toBeTruthy();
    const [a, b, c] = screen.getAllByRole("radio");
    expect(a.getAttribute("tabindex")).toBe("0");
    expect(b.getAttribute("tabindex")).toBe("-1");
    a.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(b.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(b);
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(c.getAttribute("aria-checked")).toBe("true");
  });
});
