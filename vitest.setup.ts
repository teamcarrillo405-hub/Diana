import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
expect.extend(matchers);

// Product defaults stay fail-closed. The unit suite uses mocked providers, so
// make the normal mock path explicit and let hardening tests override a flag to
// false when they are verifying the disabled path.
process.env.DIANA_LMS_CANVAS_IMPORT_ENABLED ??= "true";
process.env.DIANA_LMS_CANVAS_SUBMISSION_ENABLED ??= "true";
process.env.DIANA_LMS_GOOGLE_IMPORT_ENABLED ??= "true";
process.env.DIANA_LMS_GOOGLE_SUBMISSION_ENABLED ??= "true";
