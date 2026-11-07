// Mockup licence gate. Each licensed frame shows source, licence type,
// licence date, and where the licence is stored. A frame with no licence
// record must not be enabled. An in house frame built by the product
// itself needs a licence record too, stating it was built in house, so
// the gate never has to guess whether a licence is required.

export interface LicenceRecord {
  source: string | null;
  licenceType: string | null;
  licenceDate: string | null;
  licenceStorageLocation: string | null;
}

export interface LicenceCheck {
  canEnable: boolean;
  missing: string[];
  message: string;
}

export function checkLicence(licence: LicenceRecord | null, qualityLabel: "basic" | "premium", crispTestStatus: "not_tested" | "pass" | "fail"): LicenceCheck {
  const missing: string[] = [];
  if (!licence) {
    missing.push("licence record");
  } else {
    if (!licence.source) missing.push("licence source");
    if (!licence.licenceType) missing.push("licence type");
    if (!licence.licenceDate) missing.push("licence date");
    if (!licence.licenceStorageLocation) missing.push("licence storage location");
  }
  if (crispTestStatus !== "pass") missing.push("crisp render test pass");
  const canEnable = missing.length === 0;
  return {
    canEnable,
    missing,
    message: canEnable
      ? "Licence record complete and crisp test passed. This " + qualityLabel + " frame can be enabled."
      : "This frame must not be enabled. Missing: " + missing.join(", ") + ".",
  };
}

// Easy add flow validation, in order: upload a frame, mark the screen
// area, set allowed orientations and niche packs, preview with a real
// product render, then enable. Enable also needs the licence gate.
export interface AddFlowInput {
  frameUploaded: boolean;
  screenAreaMarked: boolean;
  orientationsSet: boolean;
  nichePacksSet: boolean;
  previewedWithRealRender: boolean;
  licence: LicenceRecord | null;
  qualityLabel: "basic" | "premium";
  crispTestStatus: "not_tested" | "pass" | "fail";
}

export function validateMockupAddFlow(input: AddFlowInput): { readyToEnable: boolean; missingSteps: string[]; licence: LicenceCheck } {
  const missingSteps: string[] = [];
  if (!input.frameUploaded) missingSteps.push("Upload a frame.");
  if (!input.screenAreaMarked) missingSteps.push("Mark the screen area.");
  if (!input.orientationsSet) missingSteps.push("Set allowed orientations.");
  if (!input.nichePacksSet) missingSteps.push("Set niche packs.");
  if (!input.previewedWithRealRender) missingSteps.push("Preview it with a real product render.");
  const licence = checkLicence(input.licence, input.qualityLabel, input.crispTestStatus);
  if (!licence.canEnable) missingSteps.push(licence.message);
  return { readyToEnable: missingSteps.length === 0, missingSteps, licence };
}
