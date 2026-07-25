(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.progressMigration = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const migrationVersion = 1;
  const migrationField = "course_identity_migration";
  const affectedPrograms = new Set([
    "catalog-human-sciences-and-design-bacheior-interior-design-and-furniture",
    "catalog-human-sciences-and-design-bachelor-of-science-b-sc-in-family-sciences",
    "catalog-human-sciences-and-design-bachelor-s-department-of-early-childhood-guide",
  ]);

  function legacyNormalize(code) {
    return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function currentNormalize(code) {
    const value = String(code || "").normalize("NFKC").toUpperCase();
    return /[A-Z]/.test(value)
      ? value.replace(/[^A-Z0-9]/g, "")
      : value
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/[^\p{L}\p{N}]/gu, "");
  }

  function identityMappings(courses) {
    const numericGroups = new Map();
    for (const course of courses || []) {
      const legacyIdentity = legacyNormalize(course.course_code);
      const currentIdentity = currentNormalize(course.course_code);
      if (!/^\d+$/.test(legacyIdentity)) continue;
      const candidates = numericGroups.get(legacyIdentity) || [];
      if (!candidates.some((candidate) => candidate.current_identity === currentIdentity)) {
        candidates.push({
          course_code: course.course_code,
          current_identity: currentIdentity,
          official_course_name: course.official_course_name || null,
        });
      }
      numericGroups.set(legacyIdentity, candidates);
    }
    const mappings = new Map();
    for (const [legacyIdentity, candidates] of numericGroups) {
      if (candidates.some((candidate) => candidate.current_identity !== legacyIdentity)) {
        mappings.set(legacyIdentity, candidates);
      }
    }
    return mappings;
  }

  function migrateProgress(programId, courses, savedProgress) {
    if (!savedProgress || typeof savedProgress !== "object" || Array.isArray(savedProgress)) {
      return { progress: savedProgress, changed: false, migration: null };
    }
    if (!affectedPrograms.has(programId)) {
      return { progress: savedProgress, changed: false, migration: null };
    }
    if (savedProgress[migrationField]?.version === migrationVersion) {
      return { progress: savedProgress, changed: false, migration: savedProgress[migrationField] };
    }

    const mappings = identityMappings(courses);
    const completed = Array.isArray(savedProgress.completed_codes)
      ? savedProgress.completed_codes
      : [];
    const preserved = [];
    const unambiguous = [];
    const ambiguous = [];
    const recordedUnambiguous = new Set();
    const recordedAmbiguous = new Set();

    for (const originalValue of completed) {
      const legacyIdentity = String(originalValue || "");
      const candidates = mappings.get(legacyIdentity);
      if (!/^\d+$/.test(legacyIdentity) || !candidates?.length) {
        if (!preserved.includes(originalValue)) preserved.push(originalValue);
        continue;
      }
      if (candidates.length === 1) {
        const currentIdentity = candidates[0].current_identity;
        if (!preserved.includes(currentIdentity)) preserved.push(currentIdentity);
        if (!recordedUnambiguous.has(legacyIdentity)) {
          unambiguous.push({
            legacy_value: originalValue,
            migrated_to: currentIdentity,
            course_code: candidates[0].course_code,
          });
          recordedUnambiguous.add(legacyIdentity);
        }
        continue;
      }
      if (!recordedAmbiguous.has(legacyIdentity)) {
        ambiguous.push({
          legacy_value: originalValue,
          candidates,
          resolution: null,
        });
        recordedAmbiguous.add(legacyIdentity);
      }
    }

    const migration = {
      version: migrationVersion,
      program_id: programId,
      status: ambiguous.length ? "pending_reconfirmation" : "complete",
      notice_pending: ambiguous.length > 0,
      unambiguous_mappings: unambiguous,
      ambiguous_legacy_values: ambiguous,
    };
    const progress = {
      ...savedProgress,
      completed_codes: preserved,
      [migrationField]: migration,
    };
    return { progress, changed: true, migration };
  }

  function reconfirmCourse(migration, currentIdentity) {
    if (!migration || migration.version !== migrationVersion) return migration;
    let changed = false;
    const ambiguous = (migration.ambiguous_legacy_values || []).map((entry) => {
      if (entry.resolution) return entry;
      const candidate = (entry.candidates || []).find(
        (item) => item.current_identity === currentIdentity,
      );
      if (!candidate) return entry;
      changed = true;
      return {
        ...entry,
        resolution: {
          current_identity: candidate.current_identity,
          course_code: candidate.course_code,
          reconfirmed: true,
        },
      };
    });
    if (!changed) return migration;
    const pending = ambiguous.some((entry) => !entry.resolution);
    return {
      ...migration,
      ambiguous_legacy_values: ambiguous,
      status: pending ? "pending_reconfirmation" : "complete",
      notice_pending: pending,
    };
  }

  return {
    affectedPrograms,
    currentNormalize,
    identityMappings,
    legacyNormalize,
    migrateProgress,
    migrationField,
    migrationVersion,
    reconfirmCourse,
  };
});
