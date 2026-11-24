import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { configureMockRuntime } from "@/services/core/mock-runtime";

// Mock services simulate latency; tests run them instantly.
configureMockRuntime({ latencyScale: 0, failureRate: 0, offline: false });

afterEach(() => cleanup());
